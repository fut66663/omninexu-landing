import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { createHash } from 'crypto'

let _redis: Redis | null = null
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv()
  return _redis
}

function sessionFingerprint(ip: string, ua: string): string {
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 8)
}

function identifyAgent(ua: string | undefined): string {
  if (!ua || ua.trim() === '') return 'empty'
  if (/GPTBot|ChatGPT|OAI-SearchBot/i.test(ua)) return 'openai'
  if (/Claude|anthropic|claude-web/i.test(ua)) return 'anthropic'
  if (/Gemini|Googlebot|GoogleOther/i.test(ua)) return 'google'
  if (/Perplexity|PerplexityBot/i.test(ua)) return 'perplexity'
  if (/x402|agentic|agentic-market/i.test(ua)) return 'agentic-market'
  if (/Meta|Llama|facebookexternalhit/i.test(ua)) return 'meta'
  if (/Bytespider|Baiduspider|YandexBot|DuckDuckBot|Slurp/i.test(ua)) return 'search-bot'
  return 'unknown'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const ua = req.headers['user-agent'] as string || ''
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown'
    const src = (req.query.src as string) || 'home'
    const referer = (req.headers['referer'] as string) || ''
    const country = (req.headers['x-vercel-ip-country'] as string) || (req.headers['cf-ipcountry'] as string) || 'XX'
    const ts = Date.now()

    const agent = identifyAgent(ua)
    const maskedIp = ip.replace(/[0-9]+\.[0-9]+\.[0-9]+\.([0-9]+)$/, 'x.x.x.$1')

    const visit = {
      agent,
      ip: maskedIp,
      path: `/ (${src})`,
      referer: referer || undefined,
      ts,
      iso: new Date(ts).toISOString(),
      country,
      session: sessionFingerprint(maskedIp, ua.slice(0, 200)),
      rawUa: ua.slice(0, 500),
    }

    console.log(`[ping] ${JSON.stringify(visit)}`)

    try {
      const today = visit.iso.slice(0, 10)
      await Promise.all([
        getRedis().set(`visit:home:${ts}`, visit, { ex: 2592000 }),
        getRedis().incr('count:total'),
        getRedis().incr(`count:today:${today}`),
        getRedis().incr(`count:agent:${agent}`),
        getRedis().incr('count:path:/ (homepage)'),
        getRedis().incr(`count:country:${country}`),
        getRedis().sadd(`sessions:${today}`, visit.session),
      ])
    } catch (_err) {
      // Redis not available
    }

    return res.status(204).send('')
  } catch (err) {
    console.error('[ping] error:', err)
    return res.status(204).send('')
  }
}
