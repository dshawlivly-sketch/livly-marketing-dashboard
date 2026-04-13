import { useState } from 'react'
import { B } from '../brand.js'
import { CONTENT_CALENDAR } from '../data/contentCalendar.js'
import { useStore } from '../utils/useStore.js'

const CONTRIBUTORS = ['David', 'Adam', 'Sarah', 'Will']
const CONTRIBUTOR_COLORS = { David: B.coral, Adam: B.amber, Sarah: B.green, Will: B.blue }
const POST_STATUSES = ['unassigned', 'draft', 'scheduled', 'published']
const STATUS_CFG = {
  unassigned: { label: 'Not assigned', bg: 'rgba(255,255,255,0.06)', color: B.textTert },
  draft:      { label: 'Draft',        bg: 'rgba(176,120,48,0.18)',  color: B.amber },
  scheduled:  { label: 'Scheduled',    bg: 'rgba(74,144,217,0.18)',  color: B.blue },
  published:  { label: 'Published',    bg: 'rgba(90,191,130,0.18)',  color: B.green },
}

function getCurrentWeekIndex() {
  const today = new Date()
  const idx = CONTENT_CALENDAR.findIndex(w => {
    const start = new Date(w.start)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return today >= start && today <= end
  })
  return idx >= 0 ? idx : 0
}

export default function ContentCalendar() {
  const [postStatuses, setPostStatuses] = useStore('livly-post-statuses', {})
  const [postNotes, setPostNotes] = useStore('livly-post-notes', {})
  const [editingNote, setEditingNote] = useState(null)
  const [noteInput, setNoteInput] = useState('')
  const [filter, setFilter] = useState('all')
  const currentWeekIdx = getCurrentWeekIndex()

  const saveStatus = (weekIdx, contributor, status) => {
    const key = `${weekIdx}-${contributor}`
    setPostStatuses(prev => ({ ...prev, [key]: status }))
  }

  const cycleStatus = (weekIdx, contributor) => {
    const key = `${weekIdx}-${contributor}`
    const cur = postStatuses[key] || 'unassigned'
    const next = POST_STATUSES[(POST_STATUSES.indexOf(cur) + 1) % POST_STATUSES.length]
    saveStatus(weekIdx, contributor, next)
  }

  const saveNote = (weekIdx, contributor) => {
    const key = `${weekIdx}-${contributor}`
    if (noteInput.trim()) {
      setPostNotes(prev => ({ ...prev, [key]: noteInput.trim() }))
    } else {
      setPostNotes(prev => { const n = { ...prev }; delete n[key]; return n })
    }
    setEditingNote(null)
  }

  const publishedCount = Object.values(postStatuses).filter(s => s === 'published').length
  const scheduledCount = Object.values(postStatuses).filter(s => s === 'scheduled').length
  const draftCount = Object.values(postStatuses).filter(s => s === 'draft').length

  const filteredCalendar = filter === 'all' ? CONTENT_CALENDAR :
    CONTENT_CALENDAR.filter(w => CONTRIBUTORS.some(c => {
      const key = `${CONTENT_CALENDAR.indexOf(w)}-${c}`
      return (postStatuses[key] || 'unassigned') === filter
    }))

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>Q2 2026 · 12 Weeks</div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>Content Calendar</h1>
          <div style={{ fontSize: 13, color: B.textSec }}>
            <span style={{ color: B.green }}>{publishedCount}</span> published &nbsp;·&nbsp;
            <span style={{ color: B.blue }}>{scheduledCount}</span> scheduled &nbsp;·&nbsp;
            <span style={{ color: B.amber }}>{draftCount}</span> drafts
          </div>
        </div>
        {/* Filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', ...POST_STATUSES].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ background: filter === f ? (f === 'all' ? 'rgba(255,255,255,0.15)' : STATUS_CFG[f]?.bg || 'rgba(255,255,255,0.15)') : 'rgba(255,255,255,0.07)', color: filter === f ? (f === 'all' ? B.text : STATUS_CFG[f]?.color || B.text) : B.textSec, border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: filter === f ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
              {f === 'all' ? 'All weeks' : STATUS_CFG[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Contributor legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {CONTRIBUTORS.map(c => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: CONTRIBUTOR_COLORS[c] }} />
            <span style={{ fontSize: 12, color: B.textSec }}>{c}</span>
          </div>
        ))}
      </div>

      {/* Calendar weeks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredCalendar.map((week, weekIdx) => {
          const realIdx = CONTENT_CALENDAR.indexOf(week)
          const isCurrent = realIdx === currentWeekIdx
          const isPast = realIdx < currentWeekIdx
          return (
            <div key={weekIdx} style={{ background: B.surface, border: `1px solid ${isCurrent ? B.coral + '40' : B.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {/* Week header */}
              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isCurrent ? 'rgba(240,123,107,0.06)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isCurrent && <div style={{ width: 6, height: 6, borderRadius: '50%', background: B.coral }} />}
                  <span style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 14, color: isPast ? B.textSec : B.text }}>{week.theme}</span>
                  {isCurrent && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.coral, background: 'rgba(240,123,107,0.12)', padding: '2px 6px', borderRadius: 3 }}>This week</span>}
                </div>
                <span style={{ fontSize: 10, color: B.textTert }}>{week.week}</span>
              </div>

              {/* Contributor posts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {CONTRIBUTORS.map((contributor, ci) => {
                  const angle = week.posts[contributor]
                  const key = `${realIdx}-${contributor}`
                  const status = postStatuses[key] || (angle ? 'draft' : 'unassigned')
                  const cfg = STATUS_CFG[status]
                  const note = postNotes[key]
                  const isEditingThis = editingNote === key

                  return (
                    <div key={contributor} style={{ padding: '10px 14px', borderRight: ci < 3 ? `1px solid ${B.border}` : 'none', borderTop: 'none', opacity: isPast && status !== 'published' ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: CONTRIBUTOR_COLORS[contributor], flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 500, color: CONTRIBUTOR_COLORS[contributor] }}>{contributor}</span>
                      </div>

                      {angle ? (
                        <>
                          <div style={{ fontSize: 12, color: B.textSec, lineHeight: 1.4, marginBottom: 8 }}>{angle}</div>
                          <button onClick={() => cycleStatus(realIdx, contributor)}
                            style={{ background: cfg.bg, color: cfg.color, border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 10, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: note ? 4 : 0 }}>
                            {cfg.label}
                          </button>
                          {note && !isEditingThis && (
                            <div style={{ fontSize: 10, color: B.textTert, fontStyle: 'italic', marginTop: 4, lineHeight: 1.3 }}>{note}</div>
                          )}
                          {isEditingThis ? (
                            <div style={{ marginTop: 6 }}>
                              <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Note..."
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${B.border}`, borderRadius: 4, color: B.text, fontSize: 11, padding: '5px 7px', minHeight: 52, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 5 }} />
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button onClick={() => setEditingNote(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 4, color: B.textSec, fontSize: 10, padding: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                                <button onClick={() => saveNote(realIdx, contributor)} style={{ flex: 1, background: CONTRIBUTOR_COLORS[contributor], border: 'none', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 500, padding: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingNote(key); setNoteInput(note || '') }}
                              style={{ background: 'none', border: 'none', color: B.textTert, fontSize: 10, cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit', display: 'block', marginTop: 4 }}>
                              {note ? 'edit note' : '+ note'}
                            </button>
                          )}
                        </>
                      ) : (
                        <div style={{ fontSize: 11, color: B.textTert, fontStyle: 'italic' }}>No post this week</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
