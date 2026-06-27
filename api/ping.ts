import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

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
    const ua = req.headers['user-agent'] as string | undefined
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown'
    const src = (req.query.src as string) || 'home'
    const referer = (req.headers['referer'] as string) || ''
    const ts = Date.now()

    const agent = identifyAgent(ua)

    const visit = {
      agent,
      ip: ip.replace(/[0-9]+\.[0-9]+\.[0-9]+\.([0-9]+)$/, 'x.x.x.$1'),
      path: `/ (${src})`,
      referer: referer || undefined,
      ts,
      iso: new Date(ts).toISOString(),
    }

    console.log(`[ping] ${JSON.stringify(visit)}`)

    try {
      const today = visit.iso.slice(0, 10)
      await Promise.all([
        redis.set(`visit:home:${ts}`, visit, { ex: 2592000 }),
        redis.incr('count:total'),
        redis.incr(`count:today:${today}`),
        redis.incr(`count:agent:${agent}`),
        redis.incr('count:path:/ (homepage)'),
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
