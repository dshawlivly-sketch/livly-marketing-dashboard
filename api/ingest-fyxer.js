// /api/ingest-fyxer.js
// Receives raw Fyxer emails forwarded via Zapier.
// Zapier sends only 3 fields — all parsing happens here server-side.
//
// Zapier webhook payload:
//   subject:  email subject line  (e.g. "Dom x Dave Sync")
//   body:     plain-text email body (full Fyxer email body)
//   from:     sender email address (optional, used for contracts)

const NOTION_VERSION = '2022-06-28'
const NOTION_API = 'https://api.notion.com/v1'
const MAX_CHUNK = 1990

function notionHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ── Notion KV helpers ─────────────────────────────────────────────────────────

async function readKV(key, token, dbId) {
  const r = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify({
      filter: { property: 'Key', title: { equals: key } },
      page_size: 1,
    }),
  })
  const data = await r.json()
  const page = data.results?.[0]
  if (!page) return []
  const blocks = page.properties?.Value?.rich_text || []
  const raw = blocks.map(b => b.text?.content || '').join('')
  try { return JSON.parse(raw) } catch { return [] }
}

async function writeKV(key, value, token, dbId) {
  const str = JSON.stringify(value)
  const chunks = []
  for (let i = 0; i < str.length; i += MAX_CHUNK) {
    chunks.push({ type: 'text', text: { content: str.slice(i, i + MAX_CHUNK) } })
  }
  const properties = {
    Key:   { title: [{ type: 'text', text: { content: key } }] },
    Value: { rich_text: chunks },
  }
  const checkRes = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify({ filter: { property: 'Key', title: { equals: key } }, page_size: 1 }),
  })
  const checkData = await checkRes.json()
  const existing = checkData.results?.[0]
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

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseMeetingDate(body) {
  const match = body.match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+([A-Z][a-z]+ \d{1,2},\s+\d{4})/i
  )
  if (match) {
    const d = new Date(match[1])
    if (!isNaN(d)) return d.toISOString().split('T')[0]
  }
  return new Date().toISOString().split('T')[0]
}

function parseAttendees(subject) {
  const cleaned = subject.replace(/\s+sync\s*$/i, '').trim()
  return cleaned.split(/\s+x\s+/i).map(n => n.trim()).filter(Boolean)
}

function parseSections(body) {
  const lines = body.split('\n').map(l => l.trimEnd())
  const sections = []
  let currentSection = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Skip Fyxer navigation links and footer lines
    if (/View\s+(recording|transcript|meeting|chat)/i.test(trimmed)) continue
    if (trimmed.endsWith('→')) continue
    if (/^https?:\/\//i.test(trimmed)) continue

    const isDateLine = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i.test(trimmed)

    // Detect bullet formats: *, •, -, and numbered lists (1. 2. 3.)
    const isBullet = /^[\*•\-]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)

    if (!isBullet && !isDateLine && trimmed.length > 0 && trimmed.length < 120) {
      // New section header
      currentSection = { header: trimmed, bullets: [] }
      sections.push(currentSection)
    } else if (isBullet && currentSection) {
      const indentMatch = line.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1].length : 0
      // Strip bullet marker: *, •, -, or N.
      const bulletText = trimmed.replace(/^[\*•\-]\s+/, '').replace(/^\d+\.\s+/, '').trim()
      if (bulletText) {
        currentSection.bullets.push({ text: bulletText, indent })
      }
    }
  }

  return sections
}

// Expanded: matches "Next Steps", "Action Items", "Tasks", "Follow-up",
// "Follow up", "To-do", "To do", "Takeaways", "Decisions"
const ACTION_SECTION_RE = /next\s+steps?|action\s+items?|tasks?|follow[\s-]up|to[\s-]do|takeaways?|decisions?/i

function extractActionItems(sections, meetingTitle, meetingDate) {
  // Find ALL sections that look like they contain action items
  const actionSections = sections.filter(s => ACTION_SECTION_RE.test(s.header))

  // Fallback: if no dedicated action section found, scan all sections for
  // bullets containing owner: action patterns
  const targetSections = actionSections.length > 0 ? actionSections : sections

  const items = []
  for (const section of targetSections) {
    for (const b of section.bullets) {
      if (b.indent > 6) continue // skip deep sub-bullets

      // Format: "David: Action text" or "Dom: Action text"
      const ownerMatch = b.text.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*:\s*(.+)/)

      // Only include unowned bullets if this is a dedicated action section
      if (!ownerMatch && actionSections.length === 0) continue

      items.push({
        id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'action-item',
        meetingTitle,
        meetingDate,
        action:  ownerMatch ? ownerMatch[2].trim() : b.text,
        owner:   ownerMatch ? ownerMatch[1].trim() : 'Dave Shaw',
        dueDate: '',
        status:  'Open',
        receivedAt: new Date().toISOString(),
      })
    }
  }

  return items.filter(a => a.action.length > 3) // filter noise
}

function buildSummary(sections) {
  return sections
    .filter(s => !ACTION_SECTION_RE.test(s.header))
    .map(s => {
      const bullets = s.bullets.map(b => {
        const prefix = b.indent > 3 ? '    • ' : '  • '
        return `${prefix}${b.text}`
      }).join('\n')
      return bullets ? `${s.header}\n${bullets}` : s.header
    })
    .join('\n\n')
}

function detectContract(subject, body) {
  return /please\s+sign|signature\s+request|awaiting\s+(your\s+)?signature|docusign|hellosign|adobe\s+sign/i
    .test(subject + ' ' + body.slice(0, 500))
}

function extractExecutionLink(body) {
  const lines = body.split('\n')
  for (const line of lines) {
    if (/sign|review|execute/i.test(line)) {
      const m = line.match(/https?:\/\/[^\s<>"]+/)
      if (m) return m[0]
    }
  }
  const m = body.match(/https?:\/\/[^\s<>"]{20,}/)
  return m ? m[0] : ''
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Zapier-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { NOTION_TOKEN, NOTION_DATABASE_ID, ZAPIER_SECRET } = process.env

  if (ZAPIER_SECRET && req.headers['x-zapier-secret'] !== ZAPIER_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    return res.status(503).json({ error: 'notion_not_configured' })
  }

  const { subject = '', body = '', from = '' } = req.body || {}
  if (!body) return res.status(400).json({ error: 'body is required' })

  const results = { stored: [] }

  try {
    // ── Contract (takes priority) ─────────────────────────────────────────
    if (detectContract(subject, body)) {
      const contract = {
        id: `contract-${Date.now()}`,
        type: 'contract',
        documentName: subject,
        sender: from,
        executionLink: extractExecutionLink(body),
        deadline: '',
        status: 'pending',
        receivedAt: new Date().toISOString(),
      }
      const existing = await readKV('livly-fyxer-contracts', NOTION_TOKEN, NOTION_DATABASE_ID)
      existing.unshift(contract)
      await writeKV('livly-fyxer-contracts', existing, NOTION_TOKEN, NOTION_DATABASE_ID)
      results.stored.push({ type: 'contract', id: contract.id })
      return res.json({ success: true, results })
    }

    // ── Meeting summary + action items ────────────────────────────────────
    const meetingDate = parseMeetingDate(body)
    const attendees   = parseAttendees(subject)
    const sections    = parseSections(body)
    const summaryText = buildSummary(sections)
    const actionItems = extractActionItems(sections, subject, meetingDate)

    // Save meeting summary
    const meeting = {
      id: `meeting-${Date.now()}`,
      type: 'meeting-summary',
      title: subject,
      date: meetingDate,
      attendees,
      summary: summaryText,
      receivedAt: new Date().toISOString(),
    }
    const meetings = await readKV('livly-fyxer-meetings', NOTION_TOKEN, NOTION_DATABASE_ID)
    meetings.unshift(meeting)
    await writeKV('livly-fyxer-meetings', meetings, NOTION_TOKEN, NOTION_DATABASE_ID)
    results.stored.push({ type: 'meeting-summary', id: meeting.id })

    // Save extracted action items
    if (actionItems.length > 0) {
      const existingActions = await readKV('livly-fyxer-actions', NOTION_TOKEN, NOTION_DATABASE_ID)
      await writeKV('livly-fyxer-actions', [...actionItems, ...existingActions], NOTION_TOKEN, NOTION_DATABASE_ID)
      results.stored.push({ type: 'action-items', count: actionItems.length, items: actionItems.map(a => a.action) })
    }

    return res.json({ success: true, results })

  } catch (err) {
    console.error('ingest-fyxer error:', err)
    return res.status(500).json({ error: err.message })
  }
}
