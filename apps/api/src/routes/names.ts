import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/db.js'
import { getRedis } from '../lib/redis.js'

const CACHE_TTL = 86400 // 24 hours

async function getCachedOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const redis = getRedis()
    const cached = await redis.get(key)
    if (cached) return JSON.parse(cached) as T
    const data = await fetcher()
    await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL)
    return data
  } catch {
    return fetcher()
  }
}

export const nameRoutes: FastifyPluginAsync = async (app) => {
  // GET /v1/names
  app.get('/', async (req, reply) => {
    const query = req.query as Record<string, string>
    const gender = query.gender as string | undefined
    const sort = (query.sort as string) ?? 'alpha'
    const limit = Math.min(parseInt(query.limit ?? '1000', 10), 2000)
    const cursor = query.cursor ? parseInt(Buffer.from(query.cursor, 'base64').toString(), 10) : undefined
    const percentileMin = query.percentileMin !== undefined ? parseFloat(query.percentileMin) : undefined
    const percentileMax = query.percentileMax !== undefined ? parseFloat(query.percentileMax) : undefined

    const where: Record<string, any> = {}
    if (gender === 'M' || gender === 'F') where.gender = gender
    if (percentileMin !== undefined || percentileMax !== undefined) {
      where.popularityPercentile = {
        ...(percentileMin !== undefined ? { gte: percentileMin } : {}),
        ...(percentileMax !== undefined ? { lte: percentileMax } : {}),
      }
    }

    const cacheKey = `names:list:${gender ?? 'both'}:${sort}:${cursor ?? 0}:${limit}:${percentileMin ?? ''}:${percentileMax ?? ''}`
    
    const result = await getCachedOrFetch(cacheKey, async () => {
      const orderBy = sort === 'rank'
        ? [{ popularityRank: 'asc' as const }]
        : [{ name: 'asc' as const }]

      const names = await prisma.name.findMany({
        where,
        orderBy,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true, name: true, gender: true,
          popularityRank: true, popularityPercentile: true,
          totalBirths: true, recentBirths: true,
          peakRank: true, peakYear: true, firstYear: true, lastYear: true,
        },
      })

      const hasMore = names.length > limit
      const data = hasMore ? names.slice(0, limit) : names
      const nextCursor = hasMore
        ? Buffer.from(String(data[data.length - 1].id)).toString('base64')
        : null

      const totalCount = await prisma.name.count({ where })

      return { data, nextCursor, hasMore, totalCount }
    })

    return reply.send(result)
  })

  // GET /v1/names/distribution
  app.get('/distribution', async (req, reply) => {
    const query = req.query as Record<string, string>
    const gender = query.gender as string | undefined

    const cacheKey = `names:dist:v3:${gender ?? 'both'}`
    const result = await getCachedOrFetch(cacheKey, async () => {
      const where = gender && gender !== 'both'
        ? { gender: gender as 'M' | 'F' }
        : undefined

      const names = await prisma.name.findMany({
        where,
        select: { popularityPercentile: true, totalBirths: true },
      })

      // Sum births per percentile bucket — this gives the real distribution shape
      // (popular names have many more births than rare ones)
      const birthsPerBucket = new Array(100).fill(0)
      for (const { popularityPercentile, totalBirths } of names) {
        const bucket = Math.min(Math.floor(popularityPercentile), 99)
        birthsPerBucket[bucket] += totalBirths ?? 0
      }
      const buckets = birthsPerBucket.map((births: number, i: number) => ({
        bucketIndex: i,
        count: births,
        percentileStart: i,
        percentileEnd: i + 1,
      }))

      const currentYear = new Date().getFullYear()
      return {
        gender: gender ?? 'both',
        totalNames: names.length,
        buckets,
        referenceWindow: { startYear: currentYear - 10, endYear: currentYear - 1 },
      }
    })

    return reply.send(result)
  })

  // GET /v1/names/:nameId
  app.get('/:nameId', async (req, reply) => {
    const { nameId } = req.params as { nameId: string }
    const id = parseInt(nameId, 10)
    if (isNaN(id)) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid name ID.' } })
    }

    const cacheKey = `names:detail:${id}`
    const result = await getCachedOrFetch(cacheKey, async () => {
      const name = await prisma.name.findUnique({
        where: { id },
        include: {
          yearlyStats: {
            orderBy: { year: 'asc' },
            select: { year: true, births: true, rankThatYear: true },
          },
        },
      })
      if (!name) return null
      return {
        id: name.id, name: name.name, gender: name.gender,
        popularityRank: name.popularityRank,
        popularityPercentile: name.popularityPercentile,
        totalBirths: name.totalBirths, recentBirths: name.recentBirths,
        peakRank: name.peakRank, peakYear: name.peakYear,
        firstYear: name.firstYear, lastYear: name.lastYear,
        yearlyStats: name.yearlyStats,
      }
    })

    if (!result) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Name not found.' } })
    }
    return reply.send(result)
  })
}
