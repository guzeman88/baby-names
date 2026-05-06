import { FastifyError, FastifyRequest, FastifyReply } from 'fastify'

export function errorHandler(
  error: FastifyError,
  _req: FastifyRequest,
  reply: FastifyReply
) {
  const statusCode = error.statusCode ?? 500
  if (statusCode >= 500) {
    console.error('[Server Error]', error)
  }
  return reply.status(statusCode).send({
    error: {
      code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message: statusCode >= 500 ? 'Internal server error.' : error.message,
    },
  })
}
