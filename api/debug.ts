import type { VercelRequest, VercelResponse } from '@vercel/node'

// ============================================================
// Debug endpoint — test Redis connection and show env status
// ============================================================

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const info: Record<string, unknown> = {
    version: '2.0-upstash',
    time: new Date().toISOString(),
    env: {},
    redis: { status: 'unknown', error: null as string | null },
  }

  // Check all possible env vars
  const allVars = [
    'KV_URL', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'KV_REST_API_READ_ONLY_TOKEN',
    'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
    'REDIS_URL', 'REDIS_TOKEN',
  ]
  allVars.forEach((v) => {
    const val = process.env[v]
    if (val) {
      info.env = { ...(info.env as Record<string, unknown>), [v]: `SET ✅ (${val.slice(0, 30)}...)` }
    }
  })

  // Test Redis connection via @upstash/redis
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = Redis.fromEnv()
    await redis.set('debug:test', JSON.stringify({ ts: Date.now(), msg: 'hello' }))
    const val = await redis.get('debug:test')
    if (val) {
      info.redis = { status: 'working ✅', error: null, testValue: val }
    } else {
      info.redis = { status: 'write OK but read returned null ⚠️', error: null }
    }
    await redis.del('debug:test')
  } catch (err) {
    info.redis = {
      status: 'error ❌',
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    }
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json(info)
}
