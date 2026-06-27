import type { VercelRequest, VercelResponse } from '@vercel/node'

// ============================================================
// Debug endpoint — test KV connection and show env status
// ============================================================

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const info: Record<string, unknown> = {
    time: new Date().toISOString(),
    env: {},
    kv: { status: 'unknown', error: null as string | null },
  }

  // Check environment
  const kvVars = ['KV_URL', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'KV_REST_API_READ_ONLY_TOKEN']
  kvVars.forEach((v) => {
    info.env = { ...(info.env as Record<string, unknown>), [v]: process.env[v] ? 'SET ✅' : 'MISSING ❌' }
  })

  // Test KV connection
  try {
    const { kv } = await import('@vercel/kv')
    await kv.set('debug:test', { ts: Date.now(), msg: 'hello' })
    const val = await kv.get('debug:test')
    if (val) {
      info.kv = { status: 'working ✅', error: null, testValue: val }
    } else {
      info.kv = { status: 'write OK but read returned null ⚠️', error: null }
    }
    await kv.del('debug:test')
  } catch (err) {
    info.kv = {
      status: 'error ❌',
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    }
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json(info)
}
