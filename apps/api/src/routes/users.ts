import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/db.js'
import { authenticate } from '../middleware/auth.js'

const updateMeSchema = z.object({
  lastName: z.string().max(64).regex(/^[A-Za-z' -]*$/).optional(),
  genderPref: z.enum(['BOY', 'GIRL', 'BOTH']).optional(),
})

export const userRoutes: FastifyPluginAsync = async (app) => {
  // GET /v1/users/me
  app.get('/me', { preHandler: authenticate }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { id: true, email: true, emailVerified: true, lastName: true, genderPref: true, createdAt: true },
    })
    if (!user) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found.' } })
    return reply.send(user)
  })

  // PATCH /v1/users/me
  app.patch('/me', { preHandler: authenticate }, async (req, reply) => {
    const body = updateMeSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.issues[0].message } })
    }
    const data: any = {}
    if (body.data.lastName !== undefined) data.lastName = body.data.lastName.trim() || null
    if (body.data.genderPref !== undefined) data.genderPref = body.data.genderPref

    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data,
      select: { id: true, email: true, emailVerified: true, lastName: true, genderPref: true },
    })
    return reply.send(user)
  })

  // PATCH /v1/users/me/email
  app.patch('/me/email', { preHandler: authenticate }, async (req, reply) => {
    const { currentPassword, newEmail } = (req.body as any) ?? {}
    const emailResult = z.string().email().safeParse(newEmail)
    if (!currentPassword || !emailResult.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Valid new email and current password required.' } })
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } })
    if (!user) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found.' } })
    const match = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!match) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Current password is incorrect.' } })
    }
    const conflict = await prisma.user.findUnique({ where: { email: emailResult.data } })
    if (conflict) {
      return reply.status(409).send({ error: { code: 'CONFLICT', message: 'That email is already in use.' } })
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { email: emailResult.data, emailVerified: false },
      select: { id: true, email: true, emailVerified: true, lastName: true, genderPref: true },
    })
    return reply.send(updated)
  })

  // PATCH /v1/users/me/password
  app.patch('/me/password', { preHandler: authenticate }, async (req, reply) => {    const { currentPassword, newPassword } = (req.body as any) ?? {}
    if (!currentPassword || !newPassword) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Both passwords required.' } })
    }
    const pwResult = z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).safeParse(newPassword)
    if (!pwResult.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'New password does not meet requirements.' } })
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } })
    if (!user) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found.' } })

    const match = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!match) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Current password is incorrect.' } })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revoked: true } }),
    ])
    return reply.send({ message: 'Password updated. All other sessions have been signed out.' })
  })

  // DELETE /v1/users/me
  app.delete('/me', { preHandler: authenticate }, async (req, reply) => {
    const { password, confirm } = (req.body as any) ?? {}
    if (confirm !== true || !password) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Must send password and confirm: true.' } })
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } })
    if (!user) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found.' } })
    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Password is incorrect.' } })
    }
    await prisma.user.delete({ where: { id: user.id } })
    return reply.status(204).send()
  })
}
