import { useState, useEffect, useCallback } from 'react'
import { B } from '../brand.js'
import { useStore } from '../utils/useStore.js'

// ── Shared ────────────────────────────────────────────────────────────────────

const CONTACT_STATUS_OPTIONS = ['New','Outreach Sent','Responded','Engaged','Nurture','Demo Scheduled','Demo Completed','Opportunity Created','Unresponsive']
const CONTACT_STATUS_COLORS = {
  New: B.textSec, 'Outreach Sent': B.amber, Responded: B.blue, Engaged: B.green,
  Nurture: B.blue, 'Demo Scheduled': B.coral, 'Demo Completed': B.green,
  'Opportunity Created': B.green, Unresponsive: 'rgba(255,255,255,0.25)',
}
const ARCHIVED_STATUSES = ['Demo Completed', 'Opportunity Created']
const ACTION_CYCLE = ['Open', 'In Progress', 'Done', 'Deferred']
const ACTION_CFG = {
  Open:         { color: B.textSec,   bg: 'rgba(255,255,255,0.07)' },
  'In Progress':{ color: B.amber,     bg: 'rgba(176,120,48,0.18)' },
  Done:         { color: B.green,     bg: 'rgba(90,191,130,0.18)' },
  Deferred:     { color: B.textTert,  bg: 'rgba(255,255,255,0.04)' },
}

function daysUntil(d) {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}

function SectionHead({ title, count, color, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 3, height: 18, background: color, borderRadius: 2 }} />
      <span style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 17, color: B.text }}>{title}</span>
      {count > 0 && <span style={{ background: `${color}20`, color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>{count}</span>}
      {extra}
    </div>
  )
}

// ── Connection status banner ──────────────────────────────────────────────────

function StatusBanner({ onTest }) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)

  const runTest = async () => {
    setTesting(true)
    setResult(null)
    try {
      const r = await fetch('/api/test-fyxer', { method: 'POST' })
      const data = await r.json()
      setResult(data)
    } catch (err) {
      setResult({ success: false, error: err.message })
    } finally {
      setTesting(false)
      if (onTest) onTest()
    }
  }

  return (
    <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Pipeline status</div>
      <div style={{ fontSize: 12, color: B.textTert, lineHeight: 1.6, marginBottom: 12 }}>
        Meetings, Action Items, and Contracts are populated by Zapier forwarding Fyxer emails to{' '}
        <code style={{ fontSize: 11, color: B.amber, background: 'rgba(176,120,48,0.12)', padding: '1px 5px', borderRadius: 3 }}>/api/ingest-fyxer</code>.
        If Zapier is not yet configured, use the test button to verify the Notion connection and inject sample data.
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={runTest} disabled={testing}
          style={{ background: testing ? 'rgba(255,255,255,0.05)' : 'rgba(176,120,48,0.14)', color: testing ? B.textTert : B.amber, border: `1px solid rgba(176,120,48,0.3)`, borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: testing ? 'default' : 'pointer', fontFamily: 'inherit' }}>
          {testing ? 'Testing…' : '🔬 Inject test data'}
        </button>
        {result && (
          <div style={{ fontSize: 11, color: result.success ? B.green : '#e05a4a', fontWeight: 500 }}>
            {result.success
              ? `✓ Connected — injected ${result.injected?.meetings} meeting, ${result.injected?.actions} actions, ${result.injected?.contracts} contract`
              : `✗ Failed: ${result.error}`}
          </div>
        )}
      </div>
      {result && !result.success && (
        <div style={{ marginTop: 10, fontSize: 11, color: B.textTert, lineHeight: 1.6 }}>
          {result.hint || 'Check Vercel → Settings → Environment Variables for NOTION_TOKEN and NOTION_DATABASE_ID. Then confirm the Livly Dashboard integration has access to your KV store database.'}
        </div>
      )}
    </div>
  )
}

// ── Contracts ─────────────────────────────────────────────────────────────────

function ContractsSection({ contracts, onUpdate }) {
  const active = contracts.filter(c => c.status !== 'signed')
  const signed = contracts.filter(c => c.status === 'signed')
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHead title="Contracts Awaiting Signature" count={active.length} color={B.coral}
        extra={signed.length > 0 && <span style={{ fontSize: 10, color: B.textTert }}>· {signed.length} signed</span>} />
      {active.length === 0 && (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px', color: B.textTert, fontSize: 13, fontStyle: 'italic' }}>
          No pending contracts. Contracts appear here when Zapier forwards a signature-request email via /api/ingest-fyxer, or when you press "Inject test data" above.
        </div>
      )}
      {active.map(c => {
        const days = daysUntil(c.deadline)
        const urgent = days !== null && days <= 3
        return (
          <div key={c.id} style={{ background: B.surface, border: `1px solid ${urgent ? 'rgba(224,90,74,0.4)' : B.border}`, borderRadius: 8, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: B.text, marginBottom: 3 }}>{c.documentName}</div>
              {c.sender && <div style={{ fontSize: 11, color: B.textSec }}>{c.sender}</div>}
              {days !== null && (
                <div style={{ fontSize: 11, color: urgent ? '#e05a4a' : B.textTert, marginTop: 3 }}>
                  {days < 0 ? `⚠ Overdue ${Math.abs(days)}d` : days === 0 ? '⚠ Due today' : `Due in ${days}d`}
                </div>
              )}
            </div>
            {c.executionLink && c.executionLink !== 'https://example.com/sign-here' && (
              <a href={c.executionLink} target="_blank" rel="noopener noreferrer"
                style={{ background: B.coral, color: '#111', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>
                ✍ Sign
              </a>
            )}
            <button onClick={() => onUpdate(c.id, { status: 'signed' })}
              style={{ background: 'rgba(90,191,130,0.12)', color: B.green, border: `1px solid rgba(90,191,130,0.25)`, borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Mark signed
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Action Items ──────────────────────────────────────────────────────────────

function ActionItemsSection({ actions, meetings, onUpdate }) {
  const [expanded, setExpanded] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newAction, setNewAction] = useState({ action: '', owner: 'David', meetingTitle: '', dueDate: '' })

  const byMeeting = {}
  actions.forEach(a => {
    const key = a.meetingTitle || 'General'
    if (!byMeeting[key]) byMeeting[key] = []
    byMeeting[key].push(a)
  })
  const active = actions.filter(a => a.status !== 'Done' && a.status !== 'Deferred').length

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <SectionHead title="Meeting Action Items" count={active} color={B.amber} />
        <button onClick={() => setShowAdd(p => !p)}
          style={{ background: 'rgba(176,120,48,0.12)', color: B.amber, border: `1px solid rgba(176,120,48,0.25)`, borderRadius: 5, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add manually
        </button>
      </div>

      {showAdd && (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {[['action', 'Action *', 'text'], ['owner', 'Owner', 'text'], ['meetingTitle', 'Meeting title', 'text'], ['dueDate', 'Due date', 'date']].map(([k, label, type]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: B.textTert, marginBottom: 3 }}>{label}</div>
                <input type={type} value={newAction[k]} onChange={e => setNewAction(p => ({ ...p, [k]: e.target.value }))} placeholder={label}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${B.border}`, borderRadius: 5, color: B.text, fontSize: 12, padding: '6px 8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <button onClick={() => {
            if (!newAction.action.trim()) return
            onUpdate('__add__', { ...newAction, id: `action-manual-${Date.now()}`, status: 'Open', receivedAt: new Date().toISOString() })
            setNewAction({ action: '', owner: 'David', meetingTitle: '', dueDate: '' })
            setShowAdd(false)
          }}
            style={{ background: B.amber, color: '#111', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Add action item
          </button>
        </div>
      )}

      {actions.length === 0 && (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px', color: B.textTert, fontSize: 13, fontStyle: 'italic' }}>
          No action items yet. They appear here when Zapier forwards a Fyxer meeting email. Use "Add manually" or "Inject test data" above to test.
        </div>
      )}

      {Object.entries(byMeeting).map(([title, items]) => {
        const isExpanded = expanded[title] !== false // default open
        const parent = meetings.find(m => m.title === title)
        return (
          <div key={title} style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: isExpanded ? `1px solid ${B.border}` : 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              onClick={() => setExpanded(p => ({ ...p, [title]: !isExpanded }))}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: B.textTert, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                <path d="M9 18l6-6-6-6" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 500, color: B.text, flex: 1 }}>{title}</span>
              <span style={{ fontSize: 10, color: B.textTert }}>{items.length} items</span>
            </div>
            {isExpanded && (
              <div>
                {parent?.summary && (
                  <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${B.border}` }}>
                    <div style={{ fontSize: 10, color: B.textTert, marginBottom: 3 }}>{parent.date} · {parent.attendees?.join(', ')}</div>
                    <div style={{ fontSize: 11, color: B.textSec, lineHeight: 1.5 }}>{parent.summary.split('\n').slice(0, 3).join(' ')}</div>
                  </div>
                )}
                {items.map(item => {
                  const cfg = ACTION_CFG[item.status || 'Open']
                  const cycle = () => {
                    const idx = ACTION_CYCLE.indexOf(item.status || 'Open')
                    onUpdate(item.id, { ...item, status: ACTION_CYCLE[(idx + 1) % ACTION_CYCLE.length] })
                  }
                  return (
                    <div key={item.id} style={{ padding: '10px 14px', borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <button onClick={cycle}
                        style={{ background: cfg.bg, color: cfg.color, border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 10, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {item.status || 'Open'}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: item.status === 'Done' ? B.textTert : B.text, textDecoration: item.status === 'Done' ? 'line-through' : 'none', lineHeight: 1.4 }}>{item.action}</div>
                        {(item.owner || item.dueDate) && (
                          <div style={{ fontSize: 10, color: B.textTert, marginTop: 2 }}>
                            {item.owner && <span>{item.owner}</span>}
                            {item.owner && item.dueDate && <span> · </span>}
                            {item.dueDate && <span>{new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Meeting Summaries ─────────────────────────────────────────────────────────

function extractCompanies(attendees = []) {
  const domains = new Set()
  attendees.forEach(a => {
    const m = a.match(/<(.+)>/) || a.match(/[\w.+-]+@([\w.]+)/)
    const email = m ? (m[1] || m[0]) : a
    const domain = email.split('@')[1]?.toLowerCase()
    if (domain && !['livly.io', 'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].some(x => domain.includes(x))) {
      domains.add(domain)
    }
  })
  return [...domains]
}

function MeetingSummariesSection({ meetings }) {
  const [expanded, setExpanded] = useState({})
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHead title="Meeting Summaries" count={meetings.length} color={B.blue} />
      {meetings.length === 0 && (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px', color: B.textTert, fontSize: 13, fontStyle: 'italic' }}>
          No meeting summaries yet. Use "Inject test data" above to verify the pipeline, or configure Zapier to forward Fyxer emails to /api/ingest-fyxer.
        </div>
      )}
      {[...meetings].map(m => {
        const companies = extractCompanies(m.attendees || [])
        const isExpanded = expanded[m.id]
        return (
          <div key={m.id} style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
              onClick={() => setExpanded(p => ({ ...p, [m.id]: !p[m.id] }))}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: B.text }}>{m.title}</span>
                  <span style={{ fontSize: 10, color: B.textTert }}>{m.date}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(m.attendees || []).map((a, i) => (
                    <span key={i} style={{ fontSize: 10, color: B.textSec }}>{a}{i < (m.attendees.length - 1) ? ' ·' : ''}</span>
                  ))}
                  {companies.map(d => (
                    <span key={d} style={{ background: 'rgba(74,144,217,0.14)', color: B.blue, fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 500 }}>{d}</span>
                  ))}
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: B.textTert, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0, marginTop: 3 }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            {isExpanded && m.summary && (
              <div style={{ borderTop: `1px solid ${B.border}`, padding: '12px 14px' }}>
                <pre style={{ fontSize: 12, color: B.textSec, lineHeight: 1.65, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{m.summary}</pre>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Conference Follow-Ups ─────────────────────────────────────────────────────

function ConferenceDrawer({ contact, onClose, onStatusChange }) {
  const [status, setStatus] = useState(contact.contactStatus)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }} onClick={onClose}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ width: 420, background: '#141416', borderLeft: `1px solid ${B.border}`, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, color: B.text }}>{contact.fullName}</div>
            <div style={{ fontSize: 11, color: B.textSec, marginTop: 2 }}>{contact.title}{contact.companyName ? ` · ${contact.companyName}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: B.textTert, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 8 }}>Contact status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {CONTACT_STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  style={{ background: status === s ? `${CONTACT_STATUS_COLORS[s] || B.textSec}22` : 'rgba(255,255,255,0.05)', color: status === s ? (CONTACT_STATUS_COLORS[s] || B.textSec) : B.textTert, border: `1px solid ${status === s ? (CONTACT_STATUS_COLORS[s] || B.textSec) + '50' : B.border}`, borderRadius: 5, padding: '4px 9px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: status === s ? 500 : 400 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          {[['Email', contact.email], ['Title', contact.title], ['Company', contact.companyName]].map(([label, val]) => val ? (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: B.text, userSelect: 'all' }}>{val}</div>
            </div>
          ) : null)}
          {contact.conferenceNotes && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>Conference notes</div>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${B.border}`, borderRadius: 6, padding: '10px 12px', fontSize: 12, color: B.textSec, lineHeight: 1.6, userSelect: 'all', whiteSpace: 'pre-wrap' }}>{contact.conferenceNotes}</div>
            </div>
          )}
          {contact.personalNotes && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>Personal notes</div>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${B.border}`, borderRadius: 6, padding: '10px 12px', fontSize: 12, color: B.textSec, lineHeight: 1.6, userSelect: 'all', whiteSpace: 'pre-wrap' }}>{contact.personalNotes}</div>
            </div>
          )}
        </div>
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${B.border}`, display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid ${B.border}`, borderRadius: 6, color: B.textSec, fontSize: 13, padding: '9px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={() => { onStatusChange(contact.id, status); onClose() }}
            style={{ flex: 2, background: B.green, border: 'none', borderRadius: 6, color: '#111', fontSize: 13, fontWeight: 500, padding: '9px', cursor: 'pointer', fontFamily: 'inherit' }}>Save status</button>
        </div>
      </div>
    </div>
  )
}

function ConferenceSection({ contacts, archived, onStatusChange, onSync, loading, error }) {
  const [showArchived, setShowArchived] = useState(false)
  const [drawer, setDrawer] = useState(null)
  const display = showArchived ? archived : contacts

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <SectionHead title="Conference Follow-Ups" count={contacts.length} color={B.green}
          extra={archived.length > 0 && <span style={{ fontSize: 10, color: B.textTert }}>· {archived.length} archived</span>} />
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <button onClick={() => setShowArchived(p => !p)}
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${B.border}`, borderRadius: 5, color: B.textSec, fontSize: 11, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {showArchived ? '← Active' : 'Archived →'}
          </button>
          <button onClick={onSync} disabled={loading}
            style={{ background: 'rgba(90,191,130,0.1)', color: loading ? B.textTert : B.green, border: `1px solid rgba(90,191,130,0.25)`, borderRadius: 5, fontSize: 11, padding: '5px 12px', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? '···' : '↓ Sync'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(224,90,74,0.1)', border: '1px solid rgba(224,90,74,0.3)', borderRadius: 7, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#e05a4a' }}>
          Sync error: {error}. Check that the Livly Dashboard Notion integration has access to the Conference Follow-Up database.
        </div>
      )}

      {display.length === 0 && (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px', color: B.textTert, fontSize: 13, fontStyle: 'italic' }}>
          {showArchived
            ? 'No archived contacts yet.'
            : 'No conference contacts. Press ↓ Sync or use the global Pull button in the sidebar.'}
        </div>
      )}

      {display.map(c => {
        const color = CONTACT_STATUS_COLORS[c.contactStatus] || B.textSec
        return (
          <div key={c.id} style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '11px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => setDrawer(c)}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: B.text }}>{c.fullName}</span>
                <span style={{ background: `${color}20`, color, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 10 }}>{c.contactStatus}</span>
              </div>
              <div style={{ fontSize: 11, color: B.textSec }}>{c.title}{c.companyName ? ` · ${c.companyName}` : ''}</div>
              {c.conferenceNotes && (
                <div style={{ fontSize: 11, color: B.textTert, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>{c.conferenceNotes}</div>
              )}
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: B.textTert, flexShrink: 0 }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        )
      })}

      {drawer && (
        <ConferenceDrawer contact={drawer} onClose={() => setDrawer(null)}
          onStatusChange={(id, status) => {
            onStatusChange(id, status)
            setDrawer(null)
          }} />
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FyxerIntel() {
  const [meetings,  setMeetings]  = useStore('livly-fyxer-meetings',  [])
  const [actions,   setActionsRaw] = useStore('livly-fyxer-actions',  [])
  const [contracts, setContracts] = useStore('livly-fyxer-contracts', [])
  const [confActive,   setConfActive]   = useState([])
  const [confArchived, setConfArchived] = useState([])
  const [confLoading, setConfLoading]   = useState(false)
  const [confError, setConfError]       = useState(null)
  const [section, setSection]           = useState('all')

  // Ensure arrays even if Notion returns null/undefined
  const safeActions   = Array.isArray(actions)   ? actions   : []
  const safeMeetings  = Array.isArray(meetings)  ? meetings  : []
  const safeContracts = Array.isArray(contracts) ? contracts : []

  const setActions = useCallback((updater) => {
    setActionsRaw(typeof updater === 'function' ? updater(safeActions) : updater)
  }, [safeActions, setActionsRaw])

  const syncConference = useCallback(async () => {
    setConfLoading(true)
    setConfError(null)
    try {
      const [ar, aa] = await Promise.all([
        fetch('/api/notion-conference?archived=false').then(r => r.json()),
        fetch('/api/notion-conference?archived=true').then(r => r.json()),
      ])
      if (ar.error) throw new Error(ar.error)
      if (ar.contacts) { setConfActive(ar.contacts); localStorage.setItem('livly-notion-conference', JSON.stringify(ar.contacts)) }
      if (aa.contacts) setConfArchived(aa.contacts)
    } catch (err) {
      setConfError(err.message)
    } finally {
      setConfLoading(false)
    }
  }, [])

  useEffect(() => {
    // Hydrate conference from cache
    try {
      const c = localStorage.getItem('livly-notion-conference')
      if (c) setConfActive(JSON.parse(c))
    } catch {}
    // Listen for global pull
    const handler = e => setConfActive(e.detail)
    window.addEventListener('livly-conference-updated', handler)
    return () => window.removeEventListener('livly-conference-updated', handler)
  }, [])

  const handleContractUpdate = (id, updates) =>
    setContracts(prev => (Array.isArray(prev) ? prev : []).map(c => c.id === id ? { ...c, ...updates } : c))

  const handleActionUpdate = (id, updates) => {
    if (id === '__add__') {
      setActions(prev => [updates, ...(Array.isArray(prev) ? prev : [])])
    } else {
      setActions(prev => (Array.isArray(prev) ? prev : []).map(a => a.id === id ? { ...a, ...updates } : a))
    }
  }

  const handleConfStatusChange = async (pageId, newStatus) => {
    setConfActive(prev => prev.map(c => c.id === pageId ? { ...c, contactStatus: newStatus } : c))
    if (ARCHIVED_STATUSES.includes(newStatus)) {
      const contact = confActive.find(c => c.id === pageId)
      if (contact) {
        setConfActive(prev => prev.filter(c => c.id !== pageId))
        setConfArchived(prev => [...prev, { ...contact, contactStatus: newStatus }])
      }
    }
    try {
      await fetch('/api/notion-conference', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, contactStatus: newStatus }),
      })
    } catch {}
  }

  const handleTestComplete = useCallback(() => {
    // After test data injection, re-read from Notion KV via useStore
    // useStore will re-hydrate on next mount — trigger by clearing localStorage keys
    localStorage.removeItem('livly-fyxer-meetings')
    localStorage.removeItem('livly-fyxer-actions')
    localStorage.removeItem('livly-fyxer-contracts')
    window.location.reload()
  }, [])

  const total = safeContracts.filter(c => c.status !== 'signed').length
    + safeActions.filter(a => a.status !== 'Done' && a.status !== 'Deferred').length
    + confActive.length

  const SECTIONS = ['all', 'contracts', 'actions', 'meetings', 'conference']

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.amber, marginBottom: 4 }}>Zapier · Notion · Outlook</div>
        <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>Fyxer Intel</h1>
        <div style={{ fontSize: 13, color: B.textSec }}>{total} active items</div>
      </div>

      <StatusBanner onTest={handleTestComplete} />

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button key={s} onClick={() => setSection(s)}
            style={{ background: section === s ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)', color: section === s ? B.text : B.textSec, border: 'none', borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: section === s ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
            {s === 'all' ? 'All sections' : s}
          </button>
        ))}
      </div>

      {(section === 'all' || section === 'contracts') && (
        <ContractsSection contracts={safeContracts} onUpdate={handleContractUpdate} />
      )}
      {(section === 'all' || section === 'actions') && (
        <ActionItemsSection actions={safeActions} meetings={safeMeetings} onUpdate={handleActionUpdate} />
      )}
      {(section === 'all' || section === 'meetings') && (
        <MeetingSummariesSection meetings={safeMeetings} />
      )}
      {(section === 'all' || section === 'conference') && (
        <ConferenceSection contacts={confActive} archived={confArchived} onStatusChange={handleConfStatusChange} onSync={syncConference} loading={confLoading} error={confError} />
      )}
    </div>
  )
}
