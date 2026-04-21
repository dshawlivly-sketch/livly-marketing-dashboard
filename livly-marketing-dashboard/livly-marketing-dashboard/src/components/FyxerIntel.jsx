import { useState, useEffect, useCallback } from 'react'
import { B } from '../brand.js'
import { useStore } from '../utils/useStore.js'
import { notifyContract, notifyFyxerIngest } from '../utils/notifications.js'

// ── Shared helpers ────────────────────────────────────────────────────────────

const CONTACT_STATUS_OPTIONS = ['New','Outreach Sent','Responded','Engaged','Nurture','Demo Scheduled','Demo Completed','Opportunity Created','Unresponsive']
const CONTACT_STATUS_COLORS = {
  New: B.textSec, 'Outreach Sent': B.amber, Responded: B.blue, Engaged: B.green,
  Nurture: B.blue, 'Demo Scheduled': B.coral, 'Demo Completed': B.green,
  'Opportunity Created': B.green, Unresponsive: 'rgba(255,255,255,0.25)',
}
const ARCHIVED_STATUSES = ['Demo Completed', 'Opportunity Created']

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function SectionHeader({ title, count, color, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 3, height: 18, background: color, borderRadius: 2 }} />
      <span style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 17, color: B.text }}>{title}</span>
      {count > 0 && <span style={{ background: `${color}20`, color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>{count}</span>}
      {badge && <span style={{ fontSize: 10, color: B.textTert, fontStyle: 'italic' }}>{badge}</span>}
    </div>
  )
}

// ── Section 1: Contracts ─────────────────────────────────────────────────────

function ContractsSection({ contracts, onUpdate }) {
  const active = contracts.filter(c => c.status !== 'signed')
  const signed = contracts.filter(c => c.status === 'signed')

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeader title="Contracts Awaiting Signature" count={active.length} color={B.coral} badge={signed.length > 0 ? `${signed.length} signed` : ''} />
      {active.length === 0 && (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '20px 16px', color: B.textTert, fontSize: 13, fontStyle: 'italic' }}>
          No contracts pending. New contracts will appear here when forwarded via Zapier.
        </div>
      )}
      {active.map(c => {
        const days = daysUntil(c.deadline)
        const urgent = days !== null && days <= 3
        return (
          <div key={c.id} style={{ background: B.surface, border: `1px solid ${urgent ? 'rgba(224,90,74,0.4)' : B.border}`, borderRadius: 8, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: B.text, marginBottom: 4 }}>{c.documentName || 'Untitled contract'}</div>
              <div style={{ fontSize: 11, color: B.textSec }}>{c.sender}</div>
              {days !== null && (
                <div style={{ fontSize: 11, color: urgent ? '#e05a4a' : B.textTert, marginTop: 3 }}>
                  {days < 0 ? `⚠ Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}` : days === 0 ? '⚠ Due today' : `Due in ${days} day${days !== 1 ? 's' : ''}`}
                </div>
              )}
            </div>
            {c.executionLink && (
              <a href={c.executionLink} target="_blank" rel="noopener noreferrer"
                style={{ background: B.coral, color: '#111', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                ✍ Sign
              </a>
            )}
            <button onClick={() => onUpdate(c.id, { status: 'signed' })}
              style={{ background: 'rgba(90,191,130,0.12)', color: B.green, border: `1px solid rgba(90,191,130,0.25)`, borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Mark signed
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Section 2: Meeting Action Items ─────────────────────────────────────────

const ACTION_STATUS_CYCLE = ['Open', 'In Progress', 'Done', 'Deferred']
const ACTION_STATUS_CFG = {
  Open:       { color: B.textSec,   bg: 'rgba(255,255,255,0.07)' },
  'In Progress':{ color: B.amber,   bg: 'rgba(176,120,48,0.18)' },
  Done:       { color: B.green,    bg: 'rgba(90,191,130,0.18)' },
  Deferred:   { color: B.textTert, bg: 'rgba(255,255,255,0.04)' },
}

function ActionItemsSection({ actions, meetings, onUpdate }) {
  const [expandedMeetings, setExpandedMeetings] = useState({})
  const byMeeting = {}
  actions.forEach(a => {
    const key = a.meetingTitle || 'General'
    if (!byMeeting[key]) byMeeting[key] = []
    byMeeting[key].push(a)
  })
  const active = actions.filter(a => a.status !== 'Done' && a.status !== 'Deferred').length

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeader title="Meeting Action Items" count={active} color={B.amber} />
      {actions.length === 0 && (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '20px 16px', color: B.textTert, fontSize: 13, fontStyle: 'italic' }}>
          No action items yet. Items from Fyxer meeting summaries will appear here.
        </div>
      )}
      {Object.entries(byMeeting).map(([meetingTitle, items]) => {
        const expanded = expandedMeetings[meetingTitle]
        const parentMeeting = meetings.find(m => m.title === meetingTitle)
        return (
          <div key={meetingTitle} style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: expanded ? `1px solid ${B.border}` : 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setExpandedMeetings(p => ({ ...p, [meetingTitle]: !p[meetingTitle] }))}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: B.textTert, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                <path d="M9 18l6-6-6-6" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 500, color: B.text }}>{meetingTitle}</span>
              <span style={{ fontSize: 10, color: B.textTert, marginLeft: 'auto' }}>{items.length} items</span>
            </div>
            {expanded && (
              <div>
                {parentMeeting && (
                  <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${B.border}` }}>
                    <div style={{ fontSize: 10, color: B.textTert, marginBottom: 3 }}>{parentMeeting.date} · {parentMeeting.attendees?.length} attendees</div>
                    <div style={{ fontSize: 11, color: B.textSec, lineHeight: 1.5 }}>{parentMeeting.summary}</div>
                  </div>
                )}
                {items.map(item => {
                  const cfg = ACTION_STATUS_CFG[item.status || 'Open']
                  const cycle = () => {
                    const idx = ACTION_STATUS_CYCLE.indexOf(item.status || 'Open')
                    onUpdate(item.id, { status: ACTION_STATUS_CYCLE[(idx + 1) % ACTION_STATUS_CYCLE.length] })
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
                          <div style={{ fontSize: 10, color: B.textTert, marginTop: 3 }}>
                            {item.owner && <span>{item.owner}</span>}
                            {item.owner && item.dueDate && <span> · </span>}
                            {item.dueDate && <span>Due {new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
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

// ── Section 3: Meeting Summaries ─────────────────────────────────────────────

function extractCompanies(attendees = []) {
  const domains = new Set()
  attendees.forEach(a => {
    const match = a.match(/<(.+)>/) || a.match(/[\w.+-]+@([\w.]+)/)
    const email = match ? (match[1] || match[0]) : a
    const domain = email.split('@')[1]?.toLowerCase()
    if (domain && !domain.includes('livly') && !domain.includes('gmail') && !domain.includes('yahoo') && !domain.includes('hotmail')) {
      domains.add(domain)
    }
  })
  return [...domains]
}

function MeetingSummariesSection({ meetings }) {
  const [expanded, setExpanded] = useState({})
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeader title="Meeting Summaries" count={meetings.length} color={B.blue} />
      {meetings.length === 0 && (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '20px 16px', color: B.textTert, fontSize: 13, fontStyle: 'italic' }}>
          No meeting summaries yet. Forward Fyxer emails via Zapier to populate this section.
        </div>
      )}
      {[...meetings].reverse().map(m => {
        const companies = extractCompanies(m.attendees)
        const isExpanded = expanded[m.id]
        return (
          <div key={m.id} style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }} onClick={() => setExpanded(p => ({ ...p, [m.id]: !p[m.id] }))}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: B.text }}>{m.title || 'Meeting summary'}</span>
                  <span style={{ fontSize: 10, color: B.textTert }}>{m.date}</span>
                </div>
                {companies.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {companies.map(d => (
                      <span key={d} style={{ background: B.blueLight || 'rgba(74,144,217,0.14)', color: B.blue, fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 500 }}>{d}</span>
                    ))}
                  </div>
                )}
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: B.textTert, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0, marginTop: 2 }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            {isExpanded && (
              <div style={{ borderTop: `1px solid ${B.border}`, padding: '12px 14px' }}>
                {m.attendees?.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 5 }}>Attendees</div>
                    {m.attendees.map((a, i) => <div key={i} style={{ fontSize: 11, color: B.textSec, marginBottom: 2 }}>{a}</div>)}
                  </div>
                )}
                {m.summary && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 5 }}>Summary</div>
                    <div style={{ fontSize: 12, color: B.textSec, lineHeight: 1.65 }}>{m.summary}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Section 4: Conference Follow-Ups ─────────────────────────────────────────

function ConferenceDrawer({ contact, onClose, onStatusChange }) {
  const [newStatus, setNewStatus] = useState(contact.contactStatus)
  const save = () => { onStatusChange(contact.id, newStatus); onClose() }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }} onClick={onClose}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ width: 400, background: '#141416', borderLeft: `1px solid ${B.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Drawer header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, color: B.text }}>{contact.fullName}</div>
            <div style={{ fontSize: 11, color: B.textSec, marginTop: 2 }}>{contact.title} · {contact.companyName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: B.textTert, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Status selector */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 8 }}>Contact status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CONTACT_STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => setNewStatus(s)}
                  style={{ background: newStatus === s ? `${CONTACT_STATUS_COLORS[s] || B.textSec}22` : 'rgba(255,255,255,0.05)', color: newStatus === s ? (CONTACT_STATUS_COLORS[s] || B.textSec) : B.textTert, border: `1px solid ${newStatus === s ? (CONTACT_STATUS_COLORS[s] || B.textSec) + '50' : B.border}`, borderRadius: 5, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: newStatus === s ? 500 : 400 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Contact details */}
          {[['Email', contact.email], ['Title', contact.title], ['Company', contact.companyName]].map(([label, value]) => value ? (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: B.text, userSelect: 'all', cursor: 'text' }}>{value}</div>
            </div>
          ) : null)}

          {/* Conference notes */}
          {contact.conferenceNotes && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>Conference notes</div>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${B.border}`, borderRadius: 6, padding: '10px 12px', fontSize: 12, color: B.textSec, lineHeight: 1.6, userSelect: 'all', cursor: 'text', whiteSpace: 'pre-wrap' }}>
                {contact.conferenceNotes}
              </div>
            </div>
          )}

          {/* Personal notes */}
          {contact.personalNotes && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>Personal notes</div>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${B.border}`, borderRadius: 6, padding: '10px 12px', fontSize: 12, color: B.textSec, lineHeight: 1.6, userSelect: 'all', cursor: 'text', whiteSpace: 'pre-wrap' }}>
                {contact.personalNotes}
              </div>
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${B.border}`, display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid ${B.border}`, borderRadius: 6, color: B.textSec, fontSize: 13, padding: '9px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={save} style={{ flex: 2, background: B.green, border: 'none', borderRadius: 6, color: '#111', fontSize: 13, fontWeight: 500, padding: '9px', cursor: 'pointer', fontFamily: 'inherit' }}>Save status</button>
        </div>
      </div>
    </div>
  )
}

function ConferenceSection({ contacts, archivedContacts, onStatusChange, onPull, loading }) {
  const [showArchived, setShowArchived] = useState(false)
  const [drawerContact, setDrawerContact] = useState(null)
  const displayContacts = showArchived ? archivedContacts : contacts

  const statusBadge = (status) => {
    const color = CONTACT_STATUS_COLORS[status] || B.textSec
    return (
      <span style={{ background: `${color}20`, color, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 10 }}>{status}</span>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <SectionHeader title="Conference Follow-Ups" count={contacts.length} color={B.green} badge={archivedContacts.length > 0 ? `${archivedContacts.length} archived` : ''} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowArchived(p => !p)}
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${B.border}`, borderRadius: 5, color: B.textSec, fontSize: 11, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {showArchived ? 'Active' : 'Archived'}
          </button>
          <button onClick={onPull} disabled={loading}
            style={{ background: 'rgba(90,191,130,0.1)', color: loading ? B.textTert : B.green, border: `1px solid rgba(90,191,130,0.25)`, borderRadius: 5, fontSize: 11, padding: '5px 12px', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? '···' : '↓ Sync'}
          </button>
        </div>
      </div>

      {displayContacts.length === 0 && (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '20px 16px', color: B.textTert, fontSize: 13, fontStyle: 'italic' }}>
          {showArchived ? 'No archived contacts yet.' : 'No active conference contacts. Use the Sync button or the global Pull to load from Notion.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {displayContacts.map(c => (
          <div key={c.id} style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setDrawerContact(c)}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: B.text }}>{c.fullName}</span>
                {statusBadge(c.contactStatus)}
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
        ))}
      </div>

      {drawerContact && (
        <ConferenceDrawer contact={drawerContact} onClose={() => setDrawerContact(null)} onStatusChange={onStatusChange} />
      )}
    </div>
  )
}

// ── Main FyxerIntel ───────────────────────────────────────────────────────────

export default function FyxerIntel() {
  const [meetings,  setMeetings]  = useStore('livly-fyxer-meetings',  [])
  const [actions,   setActions]   = useStore('livly-fyxer-actions',   [])
  const [contracts, setContracts] = useStore('livly-fyxer-contracts', [])
  const [confActive,   setConfActive]   = useState([])
  const [confArchived, setConfArchived] = useState([])
  const [confLoading, setConfLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('all')

  const loadConference = useCallback(async () => {
    setConfLoading(true)
    try {
      const [active, archived] = await Promise.all([
        fetch('/api/notion-conference?archived=false').then(r => r.json()),
        fetch('/api/notion-conference?archived=true').then(r => r.json()),
      ])
      if (active.contacts) { setConfActive(active.contacts); localStorage.setItem('livly-notion-conference', JSON.stringify(active.contacts)) }
      if (archived.contacts) setConfArchived(archived.contacts)
    } catch (err) { console.error('Conference load failed:', err) }
    finally { setConfLoading(false) }
  }, [])

  useEffect(() => {
    // Load from cache first
    try {
      const cached = localStorage.getItem('livly-notion-conference')
      if (cached) setConfActive(JSON.parse(cached))
    } catch {}
    // Listen for global pull
    const handler = e => setConfActive(e.detail)
    window.addEventListener('livly-conference-updated', handler)
    return () => window.removeEventListener('livly-conference-updated', handler)
  }, [])

  const handleContractUpdate = (id, updates) => {
    setContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const handleActionUpdate = (id, updates) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  const handleConferenceStatusChange = async (pageId, newStatus) => {
    setConfActive(prev => prev.map(c => c.id === pageId ? { ...c, contactStatus: newStatus } : c))
    try {
      await fetch('/api/notion-conference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, contactStatus: newStatus }),
      })
      // Move to archived if status is archive-worthy
      if (ARCHIVED_STATUSES.includes(newStatus)) {
        const contact = confActive.find(c => c.id === pageId)
        if (contact) {
          setConfActive(prev => prev.filter(c => c.id !== pageId))
          setConfArchived(prev => [...prev, { ...contact, contactStatus: newStatus }])
        }
      }
    } catch (err) { console.error('Status push failed:', err) }
  }

  const SECTIONS = ['all', 'contracts', 'actions', 'meetings', 'conference']
  const total = contracts.filter(c => c.status !== 'signed').length + actions.filter(a => a.status !== 'Done' && a.status !== 'Deferred').length + confActive.length

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.amber, marginBottom: 4 }}>Zapier · Notion · Outlook</div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>Fyxer Intel</h1>
          <div style={{ fontSize: 13, color: B.textSec }}>{total} active items across 4 sources</div>
        </div>
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 7, padding: '10px 14px' }}>
          <div style={{ fontSize: 9, color: B.textTert, marginBottom: 4 }}>Zapier webhook endpoint</div>
          <code style={{ fontSize: 11, color: B.amber }}>POST /api/ingest-fyxer</code>
          <div style={{ fontSize: 9, color: B.textTert, marginTop: 3 }}>Add header: X-Zapier-Secret (optional)</div>
        </div>
      </div>

      {/* Section filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            style={{ background: activeSection === s ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)', color: activeSection === s ? B.text : B.textSec, border: 'none', borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: activeSection === s ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
            {s === 'all' ? 'All sections' : s}
          </button>
        ))}
      </div>

      {(activeSection === 'all' || activeSection === 'contracts') && (
        <ContractsSection contracts={contracts} onUpdate={handleContractUpdate} />
      )}
      {(activeSection === 'all' || activeSection === 'actions') && (
        <ActionItemsSection actions={actions} meetings={meetings} onUpdate={handleActionUpdate} />
      )}
      {(activeSection === 'all' || activeSection === 'meetings') && (
        <MeetingSummariesSection meetings={meetings} />
      )}
      {(activeSection === 'all' || activeSection === 'conference') && (
        <ConferenceSection contacts={confActive} archivedContacts={confArchived} onStatusChange={handleConferenceStatusChange} onPull={loadConference} loading={confLoading} />
      )}
    </div>
  )
}
