import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/db.js'
import { authenticate } from '../middleware/auth.js'

const swipeSchema = z.object({
  nameId: z.number().int().positive(),
  decision: z.enum(['LIKED', 'PASSED']),
})

const batchSchema = z.object({
  swipes: z
    .array(
      z.object({
        nameId: z.number().int().positive(),
        decision: z.enum(['LIKED', 'PASSED']),
        swipedAt: z.string().optional(),
      })
    )
    .max(500),
})

async function updateSystemList(userId: string, nameId: number, decision: 'LIKED' | 'PASSED') {
  const listType = decision
  const oppositeType = decision === 'LIKED' ? 'PASSED' : 'LIKED'

  const [targetList, oppositeList] = await Promise.all([
    prisma.list.findFirst({ where: { userId, type: listType } }),
    prisma.list.findFirst({ where: { userId, type: oppositeType } }),
  ])

  if (oppositeList) {
    await prisma.listEntry.deleteMany({ where: { listId: oppositeList.id, nameId } })
  }

  if (targetList) {
    const count = await prisma.listEntry.count({ where: { listId: targetList.id } })
    await prisma.listEntry.upsert({
      where: { listId_nameId: { listId: targetList.id, nameId } },
      update: {},
      create: { listId: targetList.id, nameId, position: (count + 1) * 1000 },
    })
  }
}

export const swipeRoutes: FastifyPluginAsync = async (app) => {
  // GET /v1/swipes/history
  app.get('/history', { preHandler: authenticate }, async (req, reply) => {
    const userId = req.user!.sub
    const query = req.query as Record<string, string>
    const decision = query.decision as 'LIKED' | 'PASSED' | undefined

    const history = await prisma.swipeHistory.findMany({
      where: { userId, ...(decision ? { decision } : {}) },
      select: { nameId: true, decision: true },
    })

    const swipedNameIds = history.map((h) => h.nameId)
    const decisions: Record<string, string> = {}
    for (const h of history) {
      decisions[h.nameId] = h.decision
    }

    return reply.send({ swipedNameIds, decisions })
  })

  // POST /v1/swipes
  app.post('/', { preHandler: authenticate }, async (req, reply) => {
    const body = swipeSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.issues[0].message } })
    }
    const { nameId, decision } = body.data
    const userId = req.user!.sub

    const swipe = await prisma.swipeHistory.upsert({
      where: { userId_nameId: { userId, nameId } },
      update: { decision, swipedAt: new Date() },
      create: { userId, nameId, decision },
    })

    await updateSystemList(userId, nameId, decision)

    return reply.status(201).send({
      swipe: { nameId: swipe.nameId, decision: swipe.decision, swipedAt: swipe.swipedAt },
    })
  })

  // POST /v1/swipes/batch
  app.post('/batch', { preHandler: authenticate }, async (req, reply) => {
    const body = batchSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid batch data.' } })
    }
    const userId = req.user!.sub
    const { swipes } = body.data

    let processed = 0
    const errors: string[] = []

    for (const swipe of swipes) {
      try {
        await prisma.swipeHistory.upsert({
          where: { userId_nameId: { userId, nameId: swipe.nameId } },
          update: { decision: swipe.decision },
          create: { userId, nameId: swipe.nameId, decision: swipe.decision },
        })
        await updateSystemList(userId, swipe.nameId, swipe.decision)
        processed++
      } catch {
        errors.push(`Failed for nameId ${swipe.nameId}`)
      }
    }

    return reply.send({ processed, errors })
  })

  // DELETE /v1/swipes/:nameId
  app.delete('/:nameId', { preHandler: authenticate }, async (req, reply) => {
    const { nameId } = req.params as { nameId: string }
    const id = parseInt(nameId, 10)
    const userId = req.user!.sub
    await prisma.swipeHistory.deleteMany({ where: { userId, nameId: id } })
    return reply.status(204).send()
  })

  // DELETE /v1/swipes (reset all)
  app.delete('/', { preHandler: authenticate }, async (req, reply) => {
    const { confirm } = (req.body as any) ?? {}
    if (confirm !== true) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Must send confirm: true to reset.' } })
    }
    const userId = req.user!.sub
    await prisma.swipeHistory.deleteMany({ where: { userId } })
    // Also clear system lists
    const systemLists = await prisma.list.findMany({
      where: { userId, type: { in: ['LIKED', 'PASSED'] } },
    })
    for (const list of systemLists) {
      await prisma.listEntry.deleteMany({ where: { listId: list.id } })
    }
    return reply.status(204).send()
  })
}
