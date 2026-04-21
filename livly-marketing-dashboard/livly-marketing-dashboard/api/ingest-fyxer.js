// /api/ingest-fyxer.js
// Receives pre-parsed payloads from Zapier and stores them in the dashboard's Notion KV store
// Configure Zapier to POST to: https://your-app.vercel.app/api/ingest-fyxer
//
// Payload schemas (configure Zapier to match exactly):
//
// Meeting Summary:
// { type: "meeting-summary", date: "YYYY-MM-DD", title: "string",
//   attendees: ["Name <email@domain.com>"], summary: "string" }
//
// Action Item:
// { type: "action-item", meetingTitle: "string", meetingDate: "YYYY-MM-DD",
//   action: "string", owner: "string", dueDate: "YYYY-MM-DD" }
//
// Contract:
// { type: "contract", documentName: "string", sender: "string",
//   executionLink: "https://...", deadline: "YYYY-MM-DD" }

const NOTION_VERSION = '2022-06-28'
const NOTION_API = 'https://api.notion.com/v1'

function notionHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

async function readKV(key, token, dbId) {
  const r = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify({ filter: { property: 'Key', title: { equals: key } }, page_size: 1 }),
  })
  const data = await r.json()
  const page = data.results?.[0]
  if (!page) return null
  const blocks = page.properties?.Value?.rich_text || []
  const raw = blocks.map(b => b.text?.content || '').join('')
  try { return JSON.parse(raw) } catch { return null }
}

async function writeKV(key, value, token, dbId) {
  const str = JSON.stringify(value)
  const MAX = 1990
  const chunks = []
  for (let i = 0; i < str.length; i += MAX) {
    chunks.push({ type: 'text', text: { content: str.slice(i, i + MAX) } })
  }
  const properties = {
    Key: { title: [{ type: 'text', text: { content: key } }] },
    Value: { rich_text: chunks },
  }

  // Check if page exists
  const r = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify({ filter: { property: 'Key', title: { equals: key } }, page_size: 1 }),
  })
  const data = await r.json()
  const existing = data.results?.[0]

  if (existing) {
    await fetch(`${NOTION_API}/pages/${existing.id}`, {
      method: 'PATCH', headers: notionHeaders(token), body: JSON.stringify({ properties }),
    })
  } else {
    await fetch(`${NOTION_API}/pages`, {
      method: 'POST', headers: notionHeaders(token),
      body: JSON.stringify({ parent: { database_id: dbId }, properties }),
    })
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Zapier-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { NOTION_TOKEN, NOTION_DATABASE_ID, ZAPIER_SECRET } = process.env

  // Optional: validate Zapier secret header to prevent unauthorized posts
  if (ZAPIER_SECRET && req.headers['x-zapier-secret'] !== ZAPIER_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    return res.status(503).json({ error: 'notion_not_configured' })
  }

  const payload = req.body
  if (!payload?.type) return res.status(400).json({ error: 'type required' })

  const itemBase = {
    id: `${payload.type}-${Date.now()}`,
    receivedAt: new Date().toISOString(),
    status: 'new',
    ...payload,
  }

  try {
    const KEY_MAP = {
      'meeting-summary': 'livly-fyxer-meetings',
      'action-item':     'livly-fyxer-actions',
      'contract':        'livly-fyxer-contracts',
    }

    const key = KEY_MAP[payload.type]
    if (!key) return res.status(400).json({ error: `Unknown type: ${payload.type}` })

    // Read existing array, append, write back
    const existing = (await readKV(key, NOTION_TOKEN, NOTION_DATABASE_ID)) || []
    existing.unshift(itemBase) // newest first
    await writeKV(key, existing, NOTION_TOKEN, NOTION_DATABASE_ID)

    return res.json({ success: true, type: payload.type, id: itemBase.id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
