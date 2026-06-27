// test-agent-id.js — local unit test for identifyAgent()
// Run: node test-agent-id.js

function identifyAgent(ua) {
  if (!ua || ua.trim() === '') return 'empty'

  // OpenAI family
  if (/GPTBot|ChatGPT|OAI-SearchBot/i.test(ua)) return 'openai'
  // Anthropic family
  if (/Claude|anthropic|claude-web/i.test(ua)) return 'anthropic'
  // Google family
  if (/Gemini|Googlebot|GoogleOther/i.test(ua)) return 'google'
  // Perplexity
  if (/Perplexity|PerplexityBot/i.test(ua)) return 'perplexity'
  // Agentic market / x402
  if (/x402|agentic|agentic-market/i.test(ua)) return 'agentic-market'
  // Meta / Llama
  if (/Meta|Llama|facebookexternalhit/i.test(ua)) return 'meta'
  // Other search crawlers
  if (/Bytespider|Baiduspider|YandexBot|DuckDuckBot|Slurp/i.test(ua)) return 'search-bot'

  return 'unknown'
}

const tests = [
  // === Real AI Agent User-Agents ===
  { ua: 'GPTBot/1.0 (+https://openai.com/gptbot)', expect: 'openai' },
  { ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/chatgpt-user', expect: 'openai' },
  { ua: 'OAI-SearchBot/1.0; +https://openai.com/oai-searchbot', expect: 'openai' },
  { ua: 'Claude-Web/1.0 (user-agent: claude@anthropic.com)', expect: 'anthropic' },
  { ua: 'Mozilla/5.0 (compatible; anthropic-ai/1.0; +https://anthropic.com)', expect: 'anthropic' },
  { ua: 'Googlebot/2.1 (+http://www.google.com/bot.html)', expect: 'google' },
  { ua: 'Gemini/1.0 (+https://developers.google.com)', expect: 'google' },
  { ua: 'GoogleOther', expect: 'google' },
  { ua: 'PerplexityBot/1.0 (+https://perplexity.ai)', expect: 'perplexity' },
  { ua: 'x402-agent/1.0 agentic-market', expect: 'agentic-market' },
  { ua: 'Meta-ExternalAgent/1.0 (+https://developers.facebook.com)', expect: 'meta' },
  { ua: 'Baiduspider/2.0', expect: 'search-bot' },
  { ua: 'YandexBot/3.0', expect: 'search-bot' },

  // === Edge cases ===
  { ua: '', expect: 'empty' },
  { ua: '   ', expect: 'empty' },  // spaces-only = empty
  { ua: null, expect: 'empty' },
  { ua: undefined, expect: 'empty' },
  { ua: 'curl/8.0', expect: 'unknown' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120', expect: 'unknown' }, // human browser
  { ua: 'A'.repeat(1000), expect: 'unknown' },                            // very long UA
  { ua: '🤖 GPTBot 中文测试', expect: 'openai' },                          // emoji in UA
  { ua: 'gptbot/2.0', expect: 'openai' },                                 // lowercase
  { ua: 'CLAUDE-WEB', expect: 'anthropic' },                              // uppercase
]

let pass = 0
let fail = 0

tests.forEach(({ ua, expect }, i) => {
  const result = identifyAgent(ua)
  if (result === expect) {
    pass++
  } else {
    const label = ua === null ? 'null' : ua === undefined ? 'undefined' : `"${String(ua).slice(0, 60)}"`
    console.log(`FAIL #${i}: ${label} → "${result}" (expected "${expect}")`)
    fail++
  }
})

console.log(`\n${pass}/${tests.length} passed, ${fail} failed`)
if (fail === 0) {
  console.log('ALL TESTS PASSED ✅')
} else {
  console.log('SOME TESTS FAILED ❌')
  process.exit(1)
}
