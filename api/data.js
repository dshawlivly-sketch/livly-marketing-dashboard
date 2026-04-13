// /api/data.js
// Vercel serverless function that proxies read/write to a Notion database.
// Notion's API blocks direct browser requests (CORS), so this acts as the bridge.
//
// Required env vars (set in Vercel → Settings → Environment Variables):
//   NOTION_TOKEN        — your Notion integration secret
//   NOTION_DATABASE_ID  — the 32-char ID from your database URL

const NOTION_VERSION = '2022-06-28'
const NOTION_API = 'https://api.notion.com/v1'
const MAX_CHUNK = 1990 // Notion rich_text limit per block is 2000 chars

function notionHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// Notion rich_text is limited to 2000 chars per block.
// Split large JSON strings into multiple blocks and rejoin on read.
function toRichTextBlocks(str) {
  const chunks = []
  for (let i = 0; i < str.length; i += MAX_CHUNK) {
    chunks.push({ type: 'text', text: { content: str.slice(i, i + MAX_CHUNK) } })
  }
  return chunks
}

function fromRichTextBlocks(blocks = []) {
  return blocks.map(b => b.text?.content || '').join('')
}

async function findPage(dbId, key, headers) {
  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filter: { property: 'Key', title: { equals: key } },
      page_size: 1,
    }),
  })
  const data = await res.json()
  return data.results?.[0] || null
}

export default async function handler(req, res) {
  // CORS — allow requests from the same Vercel deployment
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const { NOTION_TOKEN, NOTION_DATABASE_ID } = process.env

  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    // Notion not configured — return a clean "not available" so the client
    // gracefully falls back to localStorage without logging errors.
    return res.status(503).json({ error: 'notion_not_configured' })
  }

  const headers = notionHeaders(NOTION_TOKEN)

  // ── GET /api/data?key=<key> ─────────────────────────────────────────
  if (req.method === 'GET') {
    const { key } = req.query
    if (!key) return res.status(400).json({ error: 'key required' })

    try {
      const page = await findPage(NOTION_DATABASE_ID, key, headers)
      if (!page) return res.json({ value: null })

      const blocks = page.properties?.Value?.rich_text || []
      const value = fromRichTextBlocks(blocks)
      return res.json({ value: value || null })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // ── POST /api/data { key, value } ───────────────────────────────────
  if (req.method === 'POST') {
    const { key, value } = req.body || {}
    if (!key || value === undefined) return res.status(400).json({ error: 'key and value required' })

    const properties = {
      Key:   { title: [{ type: 'text', text: { content: key } }] },
      Value: { rich_text: toRichTextBlocks(value) },
    }

    try {
      const existing = await findPage(NOTION_DATABASE_ID, key, headers)

      if (existing) {
        await fetch(`${NOTION_API}/pages/${existing.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ properties }),
        })
      } else {
        await fetch(`${NOTION_API}/pages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ parent: { database_id: NOTION_DATABASE_ID }, properties }),
        })
      }

      return res.json({ success: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'method not allowed' })
}
