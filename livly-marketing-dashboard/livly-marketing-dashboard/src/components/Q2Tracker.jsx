import { useState } from 'react'
import { B } from '../brand.js'
import { ITEMS, ROCKS, SORDER, SCFG } from '../data/trackerItems.js'
import { useStore } from '../utils/useStore.js'

const ROCK_COLORS = { r1: B.amber, r2: B.coral, r3: B.green, r4: B.blue }

export default function Q2Tracker() {
  const [statuses, setStatuses] = useStore('livly-tracker-states', {})
  const [notes, setNotes] = useStore('livly-tracker-notes', {})
  const [activeRock, setActiveRock] = useState('r1')
  const [catFilter, setCatFilter] = useState('all')
  const [openNote, setOpenNote] = useState(null)
  const [noteInput, setNoteInput] = useState('')

  const cycle = id => setStatuses(p => {
    const cur = p[id] || 'todo'
    return { ...p, [id]: SORDER[(SORDER.indexOf(cur) + 1) % 4] }
  })

  const prog = rid => {
    const all = ITEMS.filter(i => i.rock === rid)
    const done = all.filter(i => (statuses[i.id] || 'todo') === 'done').length
    return { done, total: all.length, pct: Math.round(done / all.length * 100) }
  }

  const rock = ROCKS.find(r => r.id === activeRock)
  const rockItems = ITEMS.filter(i => i.rock === activeRock)
  const allCats = [...new Set(rockItems.map(i => i.cat))]
  const visible = catFilter === 'all' ? rockItems : rockItems.filter(i => i.cat === catFilter)
  const groups = catFilter === 'all' ? allCats : [catFilter]

  const totalDone = ITEMS.filter(i => (statuses[i.id] || 'todo') === 'done').length
  const totalDoing = ITEMS.filter(i => (statuses[i.id] || 'todo') === 'doing').length
  const totalBlocked = ITEMS.filter(i => (statuses[i.id] || 'todo') === 'blocked').length

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>Q2 2026</div>
        <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>Rock Tracker</h1>
        <div style={{ fontSize: 13, color: B.textSec }}>
          <span style={{ color: B.green }}>{totalDone}</span> done &nbsp;·&nbsp;
          <span style={{ color: B.amber }}>{totalDoing}</span> in progress &nbsp;·&nbsp;
          <span style={{ color: '#e05a4a' }}>{totalBlocked}</span> blocked &nbsp;·&nbsp;
          {Math.round(totalDone / ITEMS.length * 100)}% complete
        </div>
      </div>

      {/* Progress cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {ROCKS.map(r => {
          const p = prog(r.id)
          const active = r.id === activeRock
          return (
            <div key={r.id} onClick={() => { setActiveRock(r.id); setCatFilter('all'); setOpenNote(null) }}
              style={{ flex: 1, background: B.surface, border: `1px solid ${active ? ROCK_COLORS[r.id] + '50' : B.border}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'border-color 0.15s' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: active ? ROCK_COLORS[r.id] : B.textTert, marginBottom: 6 }}>{r.label}{r.bonus ? ' +' : ''}</div>
              <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden', marginBottom: 5 }}>
                <div style={{ height: '100%', width: `${p.pct}%`, background: ROCK_COLORS[r.id], borderRadius: 1, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 9, color: B.textTert }}>{p.done}/{p.total}</div>
            </div>
          )
        })}
      </div>

      {/* Rock tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${B.border}`, marginBottom: 14, overflowX: 'auto' }}>
        {ROCKS.map(r => (
          <button key={r.id} onClick={() => { setActiveRock(r.id); setCatFilter('all'); setOpenNote(null) }}
            style={{ background: 'none', border: 'none', borderBottom: `2px solid ${r.id === activeRock ? ROCK_COLORS[r.id] : 'transparent'}`, padding: '8px 16px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', color: r.id === activeRock ? ROCK_COLORS[r.id] : B.textSec, fontWeight: r.id === activeRock ? 500 : 400, fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {r.label}{r.bonus ? ' +' : ''}
          </button>
        ))}
      </div>

      {/* Rock heading */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: ROCK_COLORS[activeRock], marginBottom: 3 }}>
          Rock {rock.n}{rock.bonus ? ' — bonus' : ''}
        </div>
        <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 18, marginBottom: 10 }}>{rock.fullName}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', ...allCats].map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              style={{ background: catFilter === c ? ROCK_COLORS[activeRock] + '33' : 'rgba(255,255,255,0.07)', color: catFilter === c ? ROCK_COLORS[activeRock] : B.textSec, border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: catFilter === c ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      {groups.map(cat => {
        const groupItems = visible.filter(i => i.cat === cat)
        if (!groupItems.length) return null
        return (
          <div key={cat} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert, margin: '10px 0 5px 2px' }}>{cat}</div>
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {groupItems.map((item, idx) => {
                const st = statuses[item.id] || 'todo'
                const cfg = SCFG[st]
                const isDone = st === 'done'
                const hasNote = !!notes[item.id]
                const isOpen = openNote === item.id
                const isLast = idx === groupItems.length - 1
                return (
                  <div key={item.id} style={{ borderBottom: (!isLast || isOpen) ? `1px solid ${B.border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10 }}>
                      <button onClick={() => cycle(item.id)}
                        style={{ background: cfg.bg, color: cfg.color, border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 10, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 86, textAlign: 'center', fontFamily: 'inherit', flexShrink: 0 }}>
                        {cfg.label}
                      </button>
                      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.45, color: isDone ? B.textTert : 'rgba(255,255,255,0.88)', textDecoration: isDone ? 'line-through' : 'none' }}>
                        {item.text}
                      </div>
                      <button onClick={() => { setOpenNote(isOpen ? null : item.id); setNoteInput(notes[item.id] || '') }}
                        style={{ background: hasNote ? ROCK_COLORS[activeRock] + '22' : 'none', color: hasNote ? ROCK_COLORS[activeRock] : B.textTert, border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                        {hasNote ? '+ note' : '+'}
                      </button>
                    </div>
                    {hasNote && !isOpen && (
                      <div style={{ padding: '0 14px 8px', marginLeft: 110, fontSize: 11, color: B.textTert, fontStyle: 'italic', lineHeight: 1.4 }}>
                        {notes[item.id]}
                      </div>
                    )}
                    {isOpen && (
                      <div style={{ padding: '8px 14px 12px', borderTop: `1px solid ${B.border}` }}>
                        <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Add a note..."
                          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${B.border}`, borderRadius: 6, color: B.text, fontSize: 13, padding: '8px 10px', minHeight: 72, resize: 'none', outline: 'none', fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setOpenNote(null)}
                            style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6, color: B.textSec, fontSize: 12, padding: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancel
                          </button>
                          <button onClick={() => { if (noteInput.trim()) setNotes(p => ({ ...p, [item.id]: noteInput.trim() })); else { const n = { ...notes }; delete n[item.id]; setNotes(n) } setOpenNote(null) }}
                            style={{ flex: 2, background: ROCK_COLORS[activeRock], border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 500, padding: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Save note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
