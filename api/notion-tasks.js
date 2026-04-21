// /api/notion-tasks.js
// Reads and writes the David To-Dos Notion database
// DB ID: 3496cc194022802399cfc16b05564cf4

const NOTION_VERSION = '2022-06-28'
const NOTION_API = 'https://api.notion.com/v1'
const DB_ID = '3496cc194022802399cfc16b05564cf4'

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

function pageToTask(page) {
  const props = page.properties
  const getText = p => p?.title?.[0]?.plain_text || p?.rich_text?.[0]?.plain_text || ''
  const getSelect = p => p?.select?.name || p?.status?.name || ''
  const getDate = p => p?.date?.start || null

  return {
    id: page.id,
    url: page.url,
    task: getText(props.Task),
    status: getSelect(props.Status),
    priority: getSelect(props.Priority),
    dueDate: getDate(props['Due Date']),
    notes: props.Notes?.rich_text?.[0]?.plain_text || '',
    dateAdded: props['Date Added']?.created_time || page.created_time,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { NOTION_TOKEN } = process.env
  if (!NOTION_TOKEN) return res.status(503).json({ error: 'notion_not_configured' })

  const h = headers(NOTION_TOKEN)

  // GET /api/notion-tasks — fetch all tasks
  if (req.method === 'GET') {
    try {
      const results = []
      let cursor = undefined
      do {
        const body = { page_size: 100, sorts: [{ property: 'Due Date', direction: 'ascending' }] }
        if (cursor) body.start_cursor = cursor
        const r = await fetch(`${NOTION_API}/databases/${DB_ID}/query`, {
          method: 'POST', headers: h, body: JSON.stringify(body),
        })
        const data = await r.json()
        if (!r.ok) return res.status(r.status).json(data)
        results.push(...(data.results || []).map(pageToTask))
        cursor = data.has_more ? data.next_cursor : undefined
      } while (cursor)
      return res.json({ tasks: results, total: results.length })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // POST /api/notion-tasks — update a task's status (and optionally priority)
  if (req.method === 'POST') {
    const { pageId, status, priority } = req.body || {}
    if (!pageId) return res.status(400).json({ error: 'pageId required' })

    const properties = {}
    if (status) properties.Status = { status: { name: status } }
    if (priority) properties.Priority = { status: { name: priority } }

    try {
      const r = await fetch(`${NOTION_API}/pages/${pageId}`, {
        method: 'PATCH', headers: h, body: JSON.stringify({ properties }),
      })
      const data = await r.json()
      if (!r.ok) return res.status(r.status).json(data)
      return res.json({ success: true, task: pageToTask(data) })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'method not allowed' })
}
