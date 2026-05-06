import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/db.js'
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiresAt,
} from '../lib/jwt.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email.js'
import { authenticate } from '../middleware/auth.js'
import crypto from 'crypto'

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  localHistory: z
    .array(
      z.object({
        nameId: z.number().int().positive(),
        decision: z.enum(['LIKED', 'PASSED']),
        swipedAt: z.string().optional(),
      })
    )
    .max(5000)
    .optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().optional(),
})

function setRefreshCookie(reply: any, token: string) {
  reply.setCookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/v1/auth/refresh',
    maxAge: 60 * 60 * 24 * 30,
  })
}

async function createSystemLists(userId: string) {
  await prisma.list.createMany({
    data: [
      { userId, name: 'Liked', type: 'LIKED' },
      { userId, name: 'Passed', type: 'PASSED' },
    ],
  })
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /v1/auth/register
  app.post('/register', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = registerSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: body.error.issues[0].message },
      })
    }
    const { email, password, localHistory } = body.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({
        error: { code: 'CONFLICT', message: 'An account with this email already exists.' },
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, passwordHash },
    })

    await createSystemLists(user.id)

    // Migrate guest history
    if (localHistory && localHistory.length > 0) {
      const likedList = await prisma.list.findFirst({ where: { userId: user.id, type: 'LIKED' } })
      const passedList = await prisma.list.findFirst({ where: { userId: user.id, type: 'PASSED' } })

      for (const swipe of localHistory) {
        await prisma.swipeHistory.upsert({
          where: { userId_nameId: { userId: user.id, nameId: swipe.nameId } },
          update: { decision: swipe.decision },
          create: { userId: user.id, nameId: swipe.nameId, decision: swipe.decision },
        })
        const targetListId = swipe.decision === 'LIKED' ? likedList?.id : passedList?.id
        if (targetListId) {
          const count = await prisma.listEntry.count({ where: { listId: targetListId } })
          await prisma.listEntry.upsert({
            where: { listId_nameId: { listId: targetListId, nameId: swipe.nameId } },
            update: {},
            create: { listId: targetListId, nameId: swipe.nameId, position: (count + 1) * 1000 },
          })
        }
      }
    }

    // Email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(verifyToken)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.emailVerification.create({ data: { userId: user.id, tokenHash, expiresAt } })
    await sendVerificationEmail(email, verifyToken)

    // Tokens
    const accessToken = signAccessToken({ sub: user.id, email: user.email })
    const refreshToken = generateRefreshToken()
    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: refreshTokenExpiresAt() },
    })
    setRefreshCookie(reply, refreshToken)

    return reply.status(201).send({
      user: { id: user.id, email: user.email, emailVerified: false, createdAt: user.createdAt },
      accessToken,
      message: `Verification email sent to ${email}`,
    })
  })

  // POST /v1/auth/login
  app.post('/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = loginSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input.' } })
    }
    const { email, password } = body.data

    const user = await prisma.user.findUnique({ where: { email } })
    const passwordMatch = user ? await bcrypt.compare(password, user.passwordHash) : false
    if (!user || !passwordMatch) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' } })
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email })
    const refreshToken = generateRefreshToken()
    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: refreshTokenExpiresAt() },
    })
    setRefreshCookie(reply, refreshToken)

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        lastName: user.lastName,
        genderPref: user.genderPref,
      },
      accessToken,
    })
  })

  // POST /v1/auth/refresh
  app.post('/refresh', async (req, reply) => {
    const cookieToken = (req.cookies as any)?.refresh_token
    const bodyToken = (refreshSchema.safeParse(req.body).data)?.refreshToken
    const token = cookieToken ?? bodyToken
    if (!token) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No refresh token.' } })
    }

    const tokenHash = hashToken(token)
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } })
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token.' } })
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } })
    if (!user) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'User not found.' } })
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email })
    return reply.send({ accessToken })
  })

  // POST /v1/auth/logout
  app.post('/logout', { preHandler: authenticate }, async (req, reply) => {
    const cookieToken = (req.cookies as any)?.refresh_token
    if (cookieToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(cookieToken) },
        data: { revoked: true },
      })
      reply.clearCookie('refresh_token', { path: '/v1/auth/refresh' })
    }
    return reply.status(204).send()
  })

  // POST /v1/auth/verify-email
  app.post('/verify-email', async (req, reply) => {
    const { token } = (req.body as any) ?? {}
    if (!token) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Token required.' } })
    const tokenHash = hashToken(token)
    const record = await prisma.emailVerification.findUnique({ where: { tokenHash } })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid or expired token.' } })
    }
    await prisma.$transaction([
      prisma.emailVerification.update({ where: { tokenHash }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    ])
    return reply.send({ message: 'Email verified successfully.' })
  })

  // POST /v1/auth/forgot-password
  app.post('/forgot-password', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { email } = (req.body as any) ?? {}
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = hashToken(resetToken)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      await prisma.emailVerification.create({ data: { userId: user.id, tokenHash, expiresAt } })
      await sendPasswordResetEmail(email, resetToken)
    }
    return reply.send({ message: 'If that email exists, a reset link has been sent.' })
  })

  // POST /v1/auth/reset-password
  app.post('/reset-password', async (req, reply) => {
    const { token, newPassword } = (req.body as any) ?? {}
    if (!token || !newPassword) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Token and new password required.' } })
    }
    const result = z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).safeParse(newPassword)
    if (!result.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Password does not meet requirements.' } })
    }
    const tokenHash = hashToken(token)
    const record = await prisma.emailVerification.findUnique({ where: { tokenHash } })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid or expired reset token.' } })
    }
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.emailVerification.update({ where: { tokenHash }, data: { usedAt: new Date() } }),
      prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revoked: true } }),
    ])
    return reply.send({ message: 'Password updated. All other sessions have been signed out.' })
  })
}
