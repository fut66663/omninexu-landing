import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

// ============================================================
// Shared Redis client — auto-configures from env vars
// ============================================================

const redis = Redis.fromEnv()

// ============================================================
// Static file contents — inlined for reliable serving
// ============================================================

const LLMS_TXT = `# OmniNexu — Agent Data Intelligence
# Visit logged for analytics (anonymous, see /api/stats)

> Machine-readable catalog. Agents: read this first.
> Humans: https://omninexu.com
> Full JSON catalog: https://omninexu.com/catalog.json

## Discovery Files

| File | Purpose |
|------|---------|
| \`/llms.txt\` | This file — AI agent quick reference |
| \`/catalog.json\` | Full structured data catalog (Schema.org Dataset) |
| \`/robots.txt\` | AI crawler allowlist (GPTBot, ClaudeBot, PerplexityBot...) |
| \`/sitemap.xml\` | Site structure for crawlers |

## What We Provide

Structured financial intelligence endpoints for AI agents.
US equities coverage (NYSE, NASDAQ, AMEX): 5,000+ tickers.

## Products

### Company Intelligence v1
- Endpoint: \`GET /intelligence/:ticker\`
- Protocol: x402 (HTTP + USDC payment)
- Pricing: To be announced

Response structure:
- \`scores\`: 8 aggregated dimensions (0–100)
  - sector_momentum, financial_quality, management_signal, institutional_signal
  - expansion_activity, policy_risk_exposure, event_activity, composite
- \`facts\`: 3 objective fact layers
  - insider_activity (SEC Form 4)
  - institutional_activity (SEC 13F)
  - financial_trends (SEC 10-K/Q)
- \`data_provenance\`: Source filing references (CIK, accession number, form type)
- \`disclaimer\`: Objective data aggregation. Not investment advice.

## Data Sources

1. SEC EDGAR (Primary): Form 4, 13F, 10-K/Q, 8-K. Parsed via edgartools.
   Coverage: 1994–present. Update: real-time + daily batch.
2. Exchange Feeds: NYSE/NASDAQ consolidated tape. Latency <300ms.
3. Alternative (Public): USPTO, FDA, SAM.gov, NOAA. Non-commercial.

## Verification

Every response includes \`data_provenance\` with exact SEC filing references.
Agents can independently fetch and cross-validate via sec.gov.
Example: CIK 0000320193, Filing 0000320193-26-000041, Form 4.

## Benchmarking

Same SEC source data as Bloomberg/Refinitiv/FactSet.
Field-level mapping available at https://omninexu.com/#benchmarking.

## Purchase Flow

1. Agent discovers this file at omninexu.com/llms.txt
2. Agent parses endpoint schema from JSON-LD on omninexu.com
3. Agent queries via x402: GET https://agentic.market/store/omninexu/intelligence/AAPL
4. Payment in USDC, auto-settled via x402 protocol

## Store

All purchases via agentic.market: https://agentic.market/store/omninexu

## Contact

Email: hello@omninexu.com
Domain: omninexu.com
`

const CATALOG_JSON = `{
  "@context": "https://schema.org",
  "@type": "DataCatalog",
  "name": "OmniNexu Agent Data Intelligence",
  "description": "Structured financial intelligence endpoints for AI agents. SEC-verified, cross-auditable, benchmarked against Bloomberg, Refinitiv, FactSet.",
  "url": "https://omninexu.com",
  "provider": {
    "@type": "Organization",
    "name": "OmniNexu",
    "url": "https://omninexu.com",
    "email": "hello@omninexu.com"
  },
  "keywords": [
    "AI agent data",
    "financial intelligence API",
    "SEC EDGAR structured data",
    "company intelligence endpoint",
    "x402 data provider",
    "machine-readable financial data",
    "US equities data API",
    "agentic market data store",
    "institutional financial data",
    "AI agent financial data",
    "Form 4 insider trading data",
    "13F institutional holdings data",
    "10-K 10-Q financial trends",
    "alternative data for AI",
    "hedge fund data API",
    "quantitative finance data"
  ],
  "dataset": [
    {
      "@type": "Dataset",
      "identifier": "company-intelligence-v1",
      "name": "Company Intelligence v1",
      "description": "Per-ticker 11-dimension intelligence endpoint. 8 composite scores + 3 objective fact layers sourced from SEC filings.",
      "url": "https://agentic.market/store/omninexu",
      "endpoint": "GET /intelligence/:ticker",
      "protocol": "x402",
      "coverage": {
        "exchanges": ["NYSE", "NASDAQ", "AMEX"],
        "tickers": "5,000+",
        "period": "1994–present"
      },
      "dimensions": {
        "scores": [
          { "key": "sector_momentum", "description": "SIC-weighted peer comparison scoring", "range": "0–100" },
          { "key": "financial_quality", "description": "Multi-period trend scoring from 10-K/Q filings", "range": "0–100" },
          { "key": "management_signal", "description": "Form 4 insider transaction cluster detection", "range": "0–100" },
          { "key": "institutional_signal", "description": "13F QoQ net flow analysis", "range": "0–100" },
          { "key": "expansion_activity", "description": "M&A, new markets, hiring signals", "range": "0–100" },
          { "key": "policy_risk_exposure", "description": "Regulatory and geopolitical risk assessment", "range": "0–100" },
          { "key": "event_activity", "description": "Earnings, FDA, litigation event signals", "range": "0–100" },
          { "key": "composite", "description": "Weighted aggregation of all dimensions", "range": "0–100" }
        ],
        "facts": [
          { "key": "insider_activity", "description": "SEC Form 4 transactions: discretionary vs planned, cluster detection", "source": "sec.gov/edgar" },
          { "key": "institutional_activity", "description": "SEC 13F filings: top additions/reductions, net flow direction", "source": "sec.gov/edgar" },
          { "key": "financial_trends", "description": "Multi-quarter revenue, earnings, margin trends", "source": "sec.gov/edgar" }
        ]
      },
      "provenance": {
        "source": "SEC EDGAR (primary), exchange feeds, public alternative data",
        "verification": "Every response includes data_provenance block with exact CIK, accession number, form type",
        "cross_validation": "Agents can independently fetch source filings from sec.gov"
      },
      "benchmarking": {
        "bloomberg": "INSR, HDS, FA — same SEC source data",
        "refinitiv": "Insider Filings, Institutional Holdings, Fundamentals",
        "factset": "Insider Transactions, Ownership 2.0, Fundamentals"
      },
      "pricing": {
        "status": "to_be_announced",
        "currency": "USDC",
        "purchase_url": "https://agentic.market/store/omninexu"
      },
      "disclaimer": "OmniNexu provides objective data aggregation based on publicly available SEC filings. Scores are statistical outputs — not investment advice, recommendations, or predictions."
    }
  ]
}
`

// ============================================================
// Agent identification — pure function, zero dependencies
// ============================================================

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

// ============================================================
// Path detection — which file is being requested
// ============================================================

function detectPath(req: VercelRequest): string {
  const originalUrl = (req.headers['x-original-url'] as string) || req.url || '/'
  if (originalUrl.includes('catalog.json')) return '/catalog.json'
  if (originalUrl.includes('llms.txt')) return '/llms.txt'
  return originalUrl
}

// ============================================================
// Logging — Upstash Redis with console fallback
// ============================================================

interface VisitLog {
  agent: string
  ip: string
  path: string
  referer?: string
  ts: number
  iso: string
}

async function logVisit(v: VisitLog): Promise<void> {
  console.log(`[track] ${JSON.stringify(v)}`)

  try {
    const today = v.iso.slice(0, 10)
    const visitKey = `visit:${v.path.replace(/\//g, '')}:${v.ts}`

    await Promise.all([
      redis.set(visitKey, v, { ex: 2592000 }),
      redis.incr('count:total'),
      redis.incr(`count:today:${today}`),
      redis.incr(`count:agent:${v.agent}`),
      redis.incr(`count:path:${v.path}`),
    ])
  } catch (err) {
    console.warn('[track] Redis write skipped (may not be configured yet)')
  }
}

// ============================================================
// Vercel Function handler
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const ua = req.headers['user-agent'] as string | undefined
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown'
    const path = detectPath(req)
    const referer = (req.headers['referer'] as string) || ''
    const ts = Date.now()

    const agent = identifyAgent(ua)

    await logVisit({
      agent,
      ip: ip.replace(/[0-9]+\.[0-9]+\.[0-9]+\.([0-9]+)$/, 'x.x.x.$1'),
      path,
      referer: referer || undefined,
      ts,
      iso: new Date(ts).toISOString(),
    })

    if (path === '/catalog.json') {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      return res.status(200).send(CATALOG_JSON)
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.status(200).send(LLMS_TXT)
  } catch (err) {
    console.error('[track] error:', err)
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    return res.status(200).send(LLMS_TXT)
  }
}
