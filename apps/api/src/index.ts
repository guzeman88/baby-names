import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit'
import * as Sentry from '@sentry/node'
import { spawn } from 'child_process'
import { authRoutes } from './routes/auth.js'
import { nameRoutes } from './routes/names.js'
import { swipeRoutes } from './routes/swipes.js'
import { listRoutes } from './routes/lists.js'
import { userRoutes } from './routes/users.js'
import { errorHandler } from './middleware/errorHandler.js'
import { prisma } from './lib/db.js'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  })
}

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:8081'

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  })

  await app.register(fastifyHelmet, { contentSecurityPolicy: false })
  await app.register(fastifyCors, {
    origin: [FRONTEND_URL, /\.vercel\.app$/, /^https?:\/\/localhost/],
    credentials: true,
  })
  await app.register(fastifyCookie, {
    secret: process.env.JWT_REFRESH_SECRET ?? 'cookie-secret',
  })
  await app.register(fastifyRateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
  })

  app.setErrorHandler(errorHandler)

  // Health check
  app.get('/v1/health', async () => ({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }))

  await app.register(authRoutes, { prefix: '/v1/auth' })
  await app.register(nameRoutes, { prefix: '/v1/names' })
  await app.register(swipeRoutes, { prefix: '/v1/swipes' })
  await app.register(listRoutes, { prefix: '/v1/lists' })
  await app.register(userRoutes, { prefix: '/v1/users' })

  return app
}

if (process.env.NODE_ENV !== 'test') {
  buildApp().then(app => {
    app.listen({ port: PORT, host: '0.0.0.0' }, async (err) => {
      if (err) {
        app.log.error(err)
        process.exit(1)
      }

      // After server is up, spawn SSA data pipeline in the background if DB is sparse
      try {
        const count = await prisma.name.count()
        if (count < 10000) {
          app.log.info(`Only ${count} names in DB — spawning SSA data pipeline in background`)
          const child = spawn('npx', ['tsx', 'scripts/maybe-run-pipeline.ts'], {
            cwd: process.cwd(),
            detached: true,
            stdio: 'ignore',
          })
          child.unref()
        } else {
          app.log.info(`${count.toLocaleString()} names in DB — skipping pipeline`)
        }
      } catch (e) {
        app.log.warn('Could not check name count for pipeline trigger: ' + e)
      }
    })
  })
}
