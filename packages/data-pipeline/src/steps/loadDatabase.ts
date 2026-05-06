import { PrismaClient } from '@prisma/client'
import type { ProcessedName } from './computeRanks.js'

const CHUNK_SIZE = 500

export async function loadToDatabase(prisma: PrismaClient, names: ProcessedName[], dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[DRY RUN] Would load ${names.length} names and their yearly stats`)
    return
  }

  console.log('Clearing existing name data (preserves user data)...')
  // Must delete in order due to FK constraints
  await prisma.nameYearlyStat.deleteMany({})
  await prisma.name.deleteMany({})

  console.log(`Loading ${names.length.toLocaleString()} names...`)

  // Insert names first (without yearly stats)
  const nameData = names.map(n => ({
    name: n.name,
    gender: n.gender,
    popularityRank: n.popularityRank,
    popularityPercentile: n.popularityPercentile,
    totalBirths: n.totalBirths,
    recentBirths: n.recentBirths,
    peakRank: n.peakRank,
    peakYear: n.peakYear,
    firstYear: n.firstYear,
    lastYear: n.lastYear,
  }))

  for (let i = 0; i < nameData.length; i += CHUNK_SIZE) {
    await prisma.name.createMany({ data: nameData.slice(i, i + CHUNK_SIZE) })
    process.stdout.write(`\r  Names: ${Math.min(i + CHUNK_SIZE, nameData.length)}/${nameData.length}`)
  }
  console.log()

  // Fetch inserted names to get their IDs
  console.log('Fetching IDs for yearly stat insertion...')
  const insertedNames = await prisma.name.findMany({ select: { id: true, name: true, gender: true } })
  const nameIdMap = new Map<string, number>()
  for (const n of insertedNames) {
    nameIdMap.set(`${n.name}:${n.gender}`, n.id)
  }

  // Build yearly stats
  const allYearlyStats: Array<{ nameId: number; year: number; births: number; rankThatYear: number | null }> = []
  for (const n of names) {
    const nameId = nameIdMap.get(`${n.name}:${n.gender}`)
    if (!nameId) continue
    for (const stat of n.yearlyStats) {
      allYearlyStats.push({
        nameId,
        year: stat.year,
        births: stat.births,
        rankThatYear: (stat as any).rankThatYear ?? null,
      })
    }
  }

  console.log(`Loading ${allYearlyStats.length.toLocaleString()} yearly stats...`)
  for (let i = 0; i < allYearlyStats.length; i += CHUNK_SIZE) {
    await prisma.nameYearlyStat.createMany({ data: allYearlyStats.slice(i, i + CHUNK_SIZE) })
    if (i % (CHUNK_SIZE * 20) === 0) {
      process.stdout.write(`\r  Yearly stats: ${Math.min(i + CHUNK_SIZE, allYearlyStats.length).toLocaleString()}/${allYearlyStats.length.toLocaleString()}`)
    }
  }
  console.log('\nDatabase load complete.')
}
