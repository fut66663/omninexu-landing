import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '@vercel/kv'

// ============================================================
// Stats dashboard — HTML page showing visit metrics
// ============================================================

const AGENT_LABELS: Record<string, string> = {
  openai: 'OpenAI (GPTBot/ChatGPT)',
  anthropic: 'Anthropic (Claude)',
  google: 'Google (Gemini/Bard)',
  perplexity: 'Perplexity',
  'agentic-market': 'Agentic.market (x402)',
  meta: 'Meta (Llama)',
  'search-bot': 'Search Crawlers',
  unknown: 'Unknown',
  empty: '(No User-Agent)',
}

const COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#3b82f6', '#6b7280', '#94a3b8']

function bar(percent: number): string {
  const w = Math.round(percent * 2) // 0-100 → 0-200 chars
  return '█'.repeat(Math.min(w, 30))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // --- Gather metrics from KV ---
    const today = new Date().toISOString().slice(0, 10)

    let total = 0
    let todayCount = 0
    const agentCounts: Record<string, number> = {}
    const pathCounts: Record<string, number> = {}
    let recentVisits: Array<Record<string, unknown>> = []

    try {
      const keys = [
        'count:total',
        `count:today:${today}`,
        ...Object.keys(AGENT_LABELS).map((a) => `count:agent:${a}`),
        'count:path:/llms.txt',
        'count:path:/catalog.json',
      ]

      const vals = await Promise.all(keys.map((k) => kv.get<number>(k)))
      total = vals[0] || 0
      todayCount = vals[1] || 0

      Object.keys(AGENT_LABELS).forEach((a, i) => {
        agentCounts[a] = vals[2 + i] || 0
      })

      pathCounts['/llms.txt'] = vals[2 + Object.keys(AGENT_LABELS).length] || 0
      pathCounts['/catalog.json'] = vals[2 + Object.keys(AGENT_LABELS).length + 1] || 0

      // Fetch recent visits
      const visitKeys = await kv.keys('visit:*')
      if (visitKeys.length > 0) {
        const sorted = visitKeys.sort().reverse().slice(0, 20)
        const rows = await Promise.all(sorted.map((k) => kv.get<Record<string, unknown>>(k)))
        recentVisits = rows.filter(Boolean) as Array<Record<string, unknown>>
      }
    } catch (_err) {
      // KV not available — show zeroed dashboard
    }

    // --- Build agent distribution rows ---
    const agentRows = Object.entries(AGENT_LABELS)
      .map(([key, label], i) => {
        const count = agentCounts[key] || 0
        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
        return { key, label, count, pct: parseFloat(pct), color: COLORS[i] }
      })
      .filter((r) => r.count > 0) // only show agents that have visited
      .sort((a, b) => b.count - a.count)

    if (agentRows.length === 0) {
      // Show all rows with zeros on empty dashboard
      Object.entries(AGENT_LABELS).forEach(([key, label], i) => {
        agentRows.push({ key, label, count: 0, pct: 0, color: COLORS[i] })
      })
    }

    const llmsCount = pathCounts['/llms.txt'] || 0
    const catalogCount = pathCounts['/catalog.json'] || 0
    const pathTotal = llmsCount + catalogCount || 1

    // --- Render HTML ---
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>AI Agent Visit Stats — OmniNexu</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: #0f172a; color: #e2e8f0; padding: 24px;
    max-width: 720px; margin: 0 auto;
  }
  h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
  .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  .kpis { display: flex; gap: 12px; margin-bottom: 28px; }
  .kpi {
    flex: 1; background: #1e293b; border-radius: 10px;
    padding: 16px; text-align: center;
  }
  .kpi .num { font-size: 32px; font-weight: 700; color: #38bdf8; }
  .kpi .lbl { font-size: 12px; color: #64748b; margin-top: 4px; }
  h2 { font-size: 15px; font-weight: 600; margin: 24px 0 12px; color: #94a3b8; }
  .row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #1e293b; }
  .row .name { flex: 0 0 180px; font-size: 13px; }
  .row .bar-wrap { flex: 1; height: 20px; background: #1e293b; border-radius: 4px; overflow: hidden; }
  .row .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .row .num { flex: 0 0 50px; text-align: right; font-size: 13px; font-weight: 600; }
  .row .pct { flex: 0 0 48px; text-align: right; font-size: 12px; color: #64748b; }
  .recent { font-size: 12px; }
  .recent .r-row { display: flex; gap: 12px; padding: 5px 0; border-bottom: 1px solid #1e293b; font-family: monospace; }
  .recent .r-time { flex: 0 0 130px; color: #64748b; }
  .recent .r-agent { flex: 0 0 100px; }
  .recent .r-path { flex: 0 0 90px; color: #38bdf8; }
  .recent .r-ip { color: #64748b; }
  .tag { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 11px; }
  .empty { text-align: center; padding: 40px; color: #64748b; }
  .kv-warn { background: #422006; color: #fbbf24; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; }
  .refresh { color: #38bdf8; font-size: 12px; text-decoration: none; float: right; margin-top: -20px; }
</style>
</head>
<body>
<h1>🤖 AI Agent 访问统计</h1>
<p class="sub">omninexu.com — 自动记录 AI 代理对 llms.txt / catalog.json 的访问</p>
${total === 0 && recentVisits.length === 0 ? '<div class="kv-warn">📡 KV 存储未配置或无数据。Vercel 仪表盘 → Storage → KV → 创建 <code>omninexu-visits</code> 关联此项目。</div>' : ''}

<div class="kpis">
  <div class="kpi"><div class="num">${total.toLocaleString()}</div><div class="lbl">总访问量</div></div>
  <div class="kpi"><div class="num">${todayCount.toLocaleString()}</div><div class="lbl">今日</div></div>
  <div class="kpi"><div class="num">${Object.values(agentCounts).filter(Boolean).length}</div><div class="lbl">Agent 类型</div></div>
</div>

<h2>Agent 分布 <a class="refresh" href="?refresh=${Date.now()}">刷新</a></h2>
${agentRows.map(r => `
<div class="row">
  <span class="name">${r.label}</span>
  <span class="bar-wrap"><span class="bar-fill" style="width:${Math.max(r.pct, 2)}%;background:${r.color}"></span></span>
  <span class="num">${r.count}</span>
  <span class="pct">${r.pct}%</span>
</div>`).join('')}

<h2>路径分布</h2>
<div class="row">
  <span class="name">/llms.txt</span>
  <span class="bar-wrap"><span class="bar-fill" style="width:${Math.max((llmsCount / pathTotal) * 100, 2)}%;background:#38bdf8"></span></span>
  <span class="num">${llmsCount}</span>
  <span class="pct">${pathTotal > 0 ? ((llmsCount / pathTotal) * 100).toFixed(1) : '0.0'}%</span>
</div>
<div class="row">
  <span class="name">/catalog.json</span>
  <span class="bar-wrap"><span class="bar-fill" style="width:${Math.max((catalogCount / pathTotal) * 100, 2)}%;background:#8b5cf6"></span></span>
  <span class="num">${catalogCount}</span>
  <span class="pct">${pathTotal > 0 ? ((catalogCount / pathTotal) * 100).toFixed(1) : '0.0'}%</span>
</div>

<h2>最近访问</h2>
<div class="recent">
${recentVisits.length === 0
    ? '<div class="empty">暂无访问记录。部署后 AI 代理访问 /llms.txt 或 /catalog.json 时会出现在这里。</div>'
    : recentVisits.map((v) => `
<div class="r-row">
  <span class="r-time">${(v.iso as string)?.replace('T', ' ').slice(0, 19) || ''}</span>
  <span class="r-agent"><span class="tag" style="background:${COLORS[Object.keys(AGENT_LABELS).indexOf(v.agent as string)] || '#64748b'}22;color:${COLORS[Object.keys(AGENT_LABELS).indexOf(v.agent as string)] || '#64748b'}">${v.agent}</span></span>
  <span class="r-path">${v.path}</span>
  <span class="r-ip">${v.ip}</span>
</div>`).join('')}
</div>

<script>
  // Auto-refresh every 60s
  setTimeout(() => location.reload(), 60000)
</script>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(html)
  } catch (err) {
    console.error('[stats] error:', err)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.status(500).send('Stats temporarily unavailable')
  }
}
