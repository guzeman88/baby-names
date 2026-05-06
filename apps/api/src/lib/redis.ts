import Redis from 'ioredis'

let redis: Redis | null = null

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    })
    redis.on('error', (err) => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[Redis] Connection error:', err.message)
      }
    })
  }
  return redis
}

export async function closeRedis() {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
