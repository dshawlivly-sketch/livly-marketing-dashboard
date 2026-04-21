// /api/notion-conference.js
// Reads Conference Follow-Up table and pushes Contact Status changes back
// DB ID: 3386cc19402280a4972af3f7017d897a
// Only syncs the 7 agreed columns

const NOTION_VERSION = '2022-06-28'
const NOTION_API = 'https://api.notion.com/v1'
const DB_ID = '3386cc19402280a4972af3f7017d897a'

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

function pageToContact(page) {
  const p = page.properties
  const txt = k => p[k]?.title?.[0]?.plain_text || p[k]?.rich_text?.[0]?.plain_text || p[k]?.email || ''
  return {
    id: page.id,
    url: page.url,
    fullName:        txt('Full Name'),
    contactStatus:   p['Contact Status']?.select?.name || '',
    title:           txt('Title'),
    companyName:     txt('Company Name'),
    email:           txt('Email'),
    conferenceNotes: txt('Conference Notes'),
    personalNotes:   txt('Personal Notes'),
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

  // GET — fetch all contacts (only the 7 fields)
  if (req.method === 'GET') {
    const { archived } = req.query
    try {
      const results = []
      let cursor = undefined
      do {
        const body = {
          page_size: 100,
          sorts: [{ property: 'Full Name', direction: 'ascending' }],
        }
        // Filter by archived status if requested
        // "archived" in our context = Contact Status is "Demo Completed" or "Opportunity Created"
        // (Notion doesn't have a separate archive field, so we use status-based filtering)
        if (cursor) body.start_cursor = cursor
        const r = await fetch(`${NOTION_API}/databases/${DB_ID}/query`, {
          method: 'POST', headers: h, body: JSON.stringify(body),
        })
        const data = await r.json()
        if (!r.ok) return res.status(r.status).json(data)
        results.push(...(data.results || []).map(pageToContact))
        cursor = data.has_more ? data.next_cursor : undefined
      } while (cursor)

      // Filter archived vs active (archived = Demo Completed or Opportunity Created for now)
      const ARCHIVED_STATUSES = ['Demo Completed', 'Opportunity Created']
      const filtered = archived === 'true'
        ? results.filter(c => ARCHIVED_STATUSES.includes(c.contactStatus))
        : results.filter(c => !ARCHIVED_STATUSES.includes(c.contactStatus))

      return res.json({ contacts: filtered, total: filtered.length })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // POST — update a contact's Contact Status
  if (req.method === 'POST') {
    const { pageId, contactStatus } = req.body || {}
    if (!pageId || !contactStatus) return res.status(400).json({ error: 'pageId and contactStatus required' })

    try {
      const r = await fetch(`${NOTION_API}/pages/${pageId}`, {
        method: 'PATCH',
        headers: h,
        body: JSON.stringify({
          properties: { 'Contact Status': { select: { name: contactStatus } } }
        }),
      })
      const data = await r.json()
      if (!r.ok) return res.status(r.status).json(data)
      return res.json({ success: true, contact: pageToContact(data) })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'method not allowed' })
}
