import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../lib/jwt.js'

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    })
  }
  const token = authHeader.slice(7)
  try {
    const payload = verifyAccessToken(token)
    req.user = payload
  } catch {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token.' },
    })
  }
}

// Augment FastifyRequest type
declare module 'fastify' {
  interface FastifyRequest {
    user?: import('../lib/jwt.js').AccessTokenPayload
  }
}
