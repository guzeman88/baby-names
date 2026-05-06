import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/db.js'
import { authenticate } from '../middleware/auth.js'

const createListSchema = z.object({ name: z.string().min(1).max(128) })
const updateListSchema = z.object({ name: z.string().min(1).max(128) })
const addEntrySchema = z.object({ nameId: z.number().int().positive() })

export const listRoutes: FastifyPluginAsync = async (app) => {
  // GET /v1/lists
  app.get('/', { preHandler: authenticate }, async (req, reply) => {
    const userId = req.user!.sub
    const lists = await prisma.list.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { entries: true } } },
    })
    return reply.send({
      lists: lists.map((l) => ({
        id: l.id, name: l.name, type: l.type,
        entryCount: l._count.entries,
        createdAt: l.createdAt, updatedAt: l.updatedAt,
      })),
    })
  })

  // POST /v1/lists
  app.post('/', { preHandler: authenticate }, async (req, reply) => {
    const body = createListSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.issues[0].message } })
    }
    const userId = req.user!.sub
    const list = await prisma.list.create({
      data: { userId, name: body.data.name, type: 'CUSTOM' },
    })
    return reply.status(201).send({
      list: { id: list.id, name: list.name, type: list.type, entryCount: 0, createdAt: list.createdAt, updatedAt: list.updatedAt },
    })
  })

  // GET /v1/lists/:listId
  app.get('/:listId', { preHandler: authenticate }, async (req, reply) => {
    const { listId } = req.params as { listId: string }
    const userId = req.user!.sub
    const query = req.query as Record<string, string>
    const limit = Math.min(parseInt(query.limit ?? '100', 10), 500)
    const sortField = query.sort === 'alpha' ? 'name' : query.sort === 'added_at' ? 'addedAt' : 'position'

    const list = await prisma.list.findFirst({ where: { id: listId, userId } })
    if (!list) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'List not found.' } })
    }

    const entries = await prisma.listEntry.findMany({
      where: { listId },
      orderBy: sortField === 'name'
        ? { name: { name: 'asc' } }
        : sortField === 'addedAt'
        ? { addedAt: 'desc' }
        : { position: 'asc' },
      take: limit,
      include: {
        name: {
          select: {
            id: true, name: true, gender: true,
            popularityRank: true, popularityPercentile: true,
            peakRank: true, peakYear: true,
          },
        },
      },
    })

    const totalCount = await prisma.listEntry.count({ where: { listId } })

    return reply.send({
      list: { id: list.id, name: list.name, type: list.type, entryCount: totalCount },
      entries: entries.map((e) => ({
        entryId: e.id, position: e.position, addedAt: e.addedAt, name: e.name,
      })),
      nextCursor: null,
      hasMore: false,
    })
  })

  // PATCH /v1/lists/:listId
  app.patch('/:listId', { preHandler: authenticate }, async (req, reply) => {
    const { listId } = req.params as { listId: string }
    const userId = req.user!.sub
    const list = await prisma.list.findFirst({ where: { id: listId, userId } })
    if (!list) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'List not found.' } })
    if (list.type !== 'CUSTOM') {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Cannot rename system lists.' } })
    }
    const body = updateListSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.issues[0].message } })
    }
    const updated = await prisma.list.update({ where: { id: listId }, data: { name: body.data.name } })
    return reply.send({ list: { id: updated.id, name: updated.name, type: updated.type } })
  })

  // DELETE /v1/lists/:listId
  app.delete('/:listId', { preHandler: authenticate }, async (req, reply) => {
    const { listId } = req.params as { listId: string }
    const userId = req.user!.sub
    const list = await prisma.list.findFirst({ where: { id: listId, userId } })
    if (!list) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'List not found.' } })
    if (list.type !== 'CUSTOM') {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Cannot delete system lists.' } })
    }
    await prisma.list.delete({ where: { id: listId } })
    return reply.status(204).send()
  })

  // POST /v1/lists/:listId/entries
  app.post('/:listId/entries', { preHandler: authenticate }, async (req, reply) => {
    const { listId } = req.params as { listId: string }
    const userId = req.user!.sub
    const body = addEntrySchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.issues[0].message } })
    }
    const { nameId } = body.data
    const list = await prisma.list.findFirst({ where: { id: listId, userId } })
    if (!list) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'List not found.' } })

    const count = await prisma.listEntry.count({ where: { listId } })
    const entry = await prisma.listEntry.upsert({
      where: { listId_nameId: { listId, nameId } },
      update: {},
      create: { listId, nameId, position: (count + 1) * 1000 },
    })
    return reply.status(201).send({
      entry: { entryId: entry.id, nameId: entry.nameId, position: entry.position, addedAt: entry.addedAt },
    })
  })

  // DELETE /v1/lists/:listId/entries/:nameId
  app.delete('/:listId/entries/:nameId', { preHandler: authenticate }, async (req, reply) => {
    const { listId, nameId } = req.params as { listId: string; nameId: string }
    const userId = req.user!.sub
    const list = await prisma.list.findFirst({ where: { id: listId, userId } })
    if (!list) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'List not found.' } })
    await prisma.listEntry.deleteMany({ where: { listId, nameId: parseInt(nameId, 10) } })
    return reply.status(204).send()
  })

  // PATCH /v1/lists/:listId/entries/reorder
  app.patch('/:listId/entries/reorder', { preHandler: authenticate }, async (req, reply) => {
    const { listId } = req.params as { listId: string }
    const userId = req.user!.sub
    const list = await prisma.list.findFirst({ where: { id: listId, userId } })
    if (!list) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'List not found.' } })

    const { entries } = (req.body as any) ?? {}
    if (!Array.isArray(entries)) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'entries array required.' } })
    }

    await prisma.$transaction(
      entries.map((e: { entryId: string; position: number }) =>
        prisma.listEntry.update({
          where: { id: e.entryId },
          data: { position: e.position },
        })
      )
    )

    return reply.send({ updated: entries.length })
  })
}
