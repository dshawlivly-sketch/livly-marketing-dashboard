// /api/test-fyxer.js
// Injects sample Fyxer data to verify the full pipeline without needing Zapier.
// POST /api/test-fyxer — no body required.
// Returns what was stored so you can confirm each step works.
// Remove or disable this endpoint once Zapier is live.

const NOTION_VERSION = '2022-06-28'
const NOTION_API = 'https://api.notion.com/v1'
const MAX_CHUNK = 1990

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

async function readKV(key, token, dbId) {
  const r = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ filter: { property: 'Key', title: { equals: key } }, page_size: 1 }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(`Notion query failed: ${JSON.stringify(data)}`)
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
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ filter: { property: 'Key', title: { equals: key } }, page_size: 1 }),
  })
  const checkData = await checkRes.json()
  const existing = checkData.results?.[0]
  if (existing) {
    const r = await fetch(`${NOTION_API}/pages/${existing.id}`, {
      method: 'PATCH', headers: headers(token), body: JSON.stringify({ properties }),
    })
    if (!r.ok) { const d = await r.json(); throw new Error(`Notion PATCH failed: ${JSON.stringify(d)}`) }
  } else {
    const r = await fetch(`${NOTION_API}/pages`, {
      method: 'POST', headers: headers(token),
      body: JSON.stringify({ parent: { database_id: dbId }, properties }),
    })
    if (!r.ok) { const d = await r.json(); throw new Error(`Notion POST failed: ${JSON.stringify(d)}`) }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { NOTION_TOKEN, NOTION_DATABASE_ID } = process.env
  if (!NOTION_TOKEN)        return res.status(503).json({ error: 'NOTION_TOKEN not set in Vercel env vars' })
  if (!NOTION_DATABASE_ID) return res.status(503).json({ error: 'NOTION_DATABASE_ID not set in Vercel env vars' })

  const now = new Date().toISOString()
  const today = now.split('T')[0]
  const log = []

  try {
    // ── Test meeting summary ─────────────────────────────────────────────────
    const testMeeting = {
      id: `meeting-test-${Date.now()}`,
      type: 'meeting-summary',
      title: 'Dom x Dave Sync',
      date: today,
      attendees: ['Dom', 'Dave'],
      summary: `Livly Positioning & Messaging\n  • Avoid using "workflow" publicly — use "orchestration"\n  • Anchor positioning to operator experience\n  • Preferred metaphors: Conductor, Air traffic control, Backbone\n\nAI Differentiation & Product Capabilities\n  • Livly powers actions directly, not only prompts\n  • Centralized data plus context graph enables decision-based automation\n  • Zero Inbox surfaces and prioritizes urgent operational tasks\n\nMarket & Competitor Feedback\n  • Industry shows AI fatigue — prefer outcome descriptions over AI jargon\n  • Venn experienced a down round\n  • AppFolio frames AI as outcome-guiding "fly-by-wire"`,
      receivedAt: now,
    }
    const meetings = await readKV('livly-fyxer-meetings', NOTION_TOKEN, NOTION_DATABASE_ID)
    log.push({ step: 'read meetings', existing: meetings.length })
    meetings.unshift(testMeeting)
    await writeKV('livly-fyxer-meetings', meetings, NOTION_TOKEN, NOTION_DATABASE_ID)
    log.push({ step: 'wrote meetings', total: meetings.length })

    // ── Test action items ────────────────────────────────────────────────────
    const testActions = [
      { id: `action-test-1-${Date.now()}`, type: 'action-item', meetingTitle: 'Dom x Dave Sync', meetingDate: today, action: 'Revise Livly one-sentence positioning to emphasize operator mediation', owner: 'David', dueDate: '', status: 'Open', receivedAt: now },
      { id: `action-test-2-${Date.now()}`, type: 'action-item', meetingTitle: 'Dom x Dave Sync', meetingDate: today, action: 'Update AI one-pager and send iteration to Dom for feedback', owner: 'David', dueDate: '', status: 'Open', receivedAt: now },
      { id: `action-test-3-${Date.now()}`, type: 'action-item', meetingTitle: 'Dom x Dave Sync', meetingDate: today, action: 'Confirm Apartmentalize / New Orleans meetup and send calendar invite', owner: 'David', dueDate: '', status: 'Open', receivedAt: now },
    ]
    const actions = await readKV('livly-fyxer-actions', NOTION_TOKEN, NOTION_DATABASE_ID)
    log.push({ step: 'read actions', existing: actions.length })
    const updatedActions = [...testActions, ...actions]
    await writeKV('livly-fyxer-actions', updatedActions, NOTION_TOKEN, NOTION_DATABASE_ID)
    log.push({ step: 'wrote actions', total: updatedActions.length })

    // ── Test contract ────────────────────────────────────────────────────────
    const testContract = {
      id: `contract-test-${Date.now()}`,
      type: 'contract',
      documentName: 'TEST — Master Service Agreement',
      sender: 'test@example.com',
      executionLink: 'https://example.com/sign-here',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      receivedAt: now,
    }
    const contracts = await readKV('livly-fyxer-contracts', NOTION_TOKEN, NOTION_DATABASE_ID)
    log.push({ step: 'read contracts', existing: contracts.length })
    contracts.unshift(testContract)
    await writeKV('livly-fyxer-contracts', contracts, NOTION_TOKEN, NOTION_DATABASE_ID)
    log.push({ step: 'wrote contracts', total: contracts.length })

    return res.status(200).json({
      success: true,
      message: 'Test data injected. Reload the dashboard and check Fyxer Intel.',
      log,
      injected: {
        meetings: 1,
        actions: testActions.length,
        contracts: 1,
      },
    })

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      log,
      hint: 'Check that NOTION_TOKEN and NOTION_DATABASE_ID are set in Vercel and that the Livly Dashboard integration has access to the KV database.',
    })
  }
}
