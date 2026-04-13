import { useState } from 'react'
import { B } from '../brand.js'
import { useStore } from '../utils/useStore.js'
import { ITEMS, SCFG } from '../data/trackerItems.js'

const PRIORITY_GROUPS = [
  {
    id: 'p1',
    label: 'Priority 1',
    sub: 'Q2 commit — must be done by June 30',
    cat: 'P1 — Q2 commit',
    color: B.coral,
    target: 15,
  },
  {
    id: 'p2',
    label: 'Priority 2',
    sub: 'Head start — build if P1 is ahead of schedule',
    cat: 'P2 — head start',
    color: B.amber,
    target: 12,
  },
  {
    id: 'p3',
    label: 'Priority 3',
    sub: 'Future — beyond Q2',
    cat: 'P3 — future',
    color: B.blue,
    target: 7,
  },
]

const ASSET_LINKS = {
  b01: null, b02: null, b03: null, b04: null, b05: null,
  b06: null, b07: null, b08: null, b09: null, b10: null,
  b11: null, b12: null, b13: null, b14: null, b15: null,
}

const STATUS_ICON = {
  todo:    { icon: '○', color: B.textTert },
  doing:   { icon: '◑', color: B.amber },
  done:    { icon: '●', color: B.green },
  blocked: { icon: '✕', color: '#e05a4a' },
}

export default function AssetLibrary() {
  const [statuses] = useStore('livly-tracker-states', {})
  const [assetLinks, setAssetLinks] = useStore('livly-asset-links', ASSET_LINKS)
  const [editingLink, setEditingLink] = useState(null)
  const [linkInput, setLinkInput] = useState('')
  const [filter, setFilter] = useState('all')

  const saveLink = (id) => {
    setAssetLinks(prev => ({ ...prev, [id]: linkInput.trim() || null }))
    setEditingLink(null)
    setLinkInput('')
  }

  const r2Items = ITEMS.filter(i => i.rock === 'r2')
  const p1Done = r2Items.filter(i => i.cat === 'P1 — Q2 commit' && statuses[i.id] === 'done').length
  const p1Total = r2Items.filter(i => i.cat === 'P1 — Q2 commit').length

  const filteredStatuses = filter === 'all' ? null : filter

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.coral, marginBottom: 4 }}>Rock 2</div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>Asset Library</h1>
          <div style={{ fontSize: 13, color: B.textSec }}>
            {p1Done} of {p1Total} P1 assets complete · Status synced from Q2 Tracker
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['all', 'All'], ['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done'], ['blocked', 'Blocked']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              style={{ background: filter === id ? (id === 'all' ? 'rgba(255,255,255,0.14)' : SCFG[id]?.bg || 'rgba(255,255,255,0.14)') : 'rgba(255,255,255,0.07)', color: filter === id ? (id === 'all' ? B.text : SCFG[id]?.color || B.text) : B.textSec, border: 'none', borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: filter === id ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '14px 18px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: B.textSec }}>P1 progress — Rock 2 target: 15 assets by June 30</span>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 15, color: B.coral }}>{p1Done}/{p1Total}</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.round(p1Done / p1Total * 100)}%`, background: B.coral, borderRadius: 2, transition: 'width 0.4s' }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: B.textTert }}>At 2 assets/week for 13 weeks = 26 possible — P1 completion is well within reach</div>
      </div>

      {/* Asset groups */}
      {PRIORITY_GROUPS.map(group => {
        const groupItems = r2Items.filter(i => i.cat === group.cat)
        const filteredItems = filteredStatuses ? groupItems.filter(i => (statuses[i.id] || 'todo') === filteredStatuses) : groupItems
        if (filteredItems.length === 0) return null
        const done = groupItems.filter(i => (statuses[i.id] || 'todo') === 'done').length

        return (
          <div key={group.id} style={{ marginBottom: 24 }}>
            {/* Group header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 3, height: 22, background: group.color, borderRadius: 2 }} />
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: group.color }}>{group.label}</span>
                <span style={{ fontSize: 11, color: B.textTert, marginLeft: 10 }}>{done}/{groupItems.length} done</span>
              </div>
              <span style={{ fontSize: 11, color: B.textTert, fontStyle: 'italic' }}>{group.sub}</span>
            </div>

            {/* Asset grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {filteredItems.map(item => {
                const st = statuses[item.id] || 'todo'
                const cfg = SCFG[st]
                const stIcon = STATUS_ICON[st]
                const link = assetLinks[item.id]
                const isEditingThis = editingLink === item.id
                const isDone = st === 'done'

                return (
                  <div key={item.id} style={{ background: B.surface, border: `1px solid ${isDone ? group.color + '40' : B.border}`, borderRadius: 8, padding: '14px 16px', transition: 'border-color 0.2s' }}>
                    {/* Status + ID row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, color: stIcon.color }}>{stIcon.icon}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: group.color }}>{item.id.toUpperCase()}</span>
                      </div>
                      <span style={{ background: cfg.bg, color: cfg.color, fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 3 }}>{cfg.label}</span>
                    </div>

                    {/* Asset name */}
                    <div style={{ fontSize: 13, lineHeight: 1.4, color: isDone ? B.textSec : B.text, textDecoration: isDone ? 'line-through' : 'none', marginBottom: 10 }}>
                      {item.text}
                    </div>

                    {/* Link / file */}
                    {isEditingThis ? (
                      <div>
                        <input type="url" value={linkInput} onChange={e => setLinkInput(e.target.value)} placeholder="Paste Google Drive, SharePoint, or PDF URL..."
                          onKeyDown={e => { if (e.key === 'Enter') saveLink(item.id); if (e.key === 'Escape') setEditingLink(null) }}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${group.color}60`, borderRadius: 5, color: B.text, fontSize: 12, padding: '6px 8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 6 }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setEditingLink(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 4, color: B.textSec, fontSize: 11, padding: '5px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                          <button onClick={() => saveLink(item.id)} style={{ flex: 2, background: group.color, border: 'none', borderRadius: 4, color: '#111', fontSize: 11, fontWeight: 500, padding: '5px', cursor: 'pointer', fontFamily: 'inherit' }}>Save link</button>
                        </div>
                      </div>
                    ) : link ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <a href={link} target="_blank" rel="noopener noreferrer"
                          style={{ flex: 1, background: `${group.color}18`, color: group.color, border: `1px solid ${group.color}30`, borderRadius: 5, padding: '5px 10px', fontSize: 11, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                          </svg>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Open asset</span>
                        </a>
                        <button onClick={() => { setEditingLink(item.id); setLinkInput(link) }}
                          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 5, color: B.textTert, fontSize: 11, padding: '5px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingLink(item.id); setLinkInput('') }}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px dashed ${B.border}`, borderRadius: 5, color: B.textTert, fontSize: 11, padding: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        + Add file link
                      </button>
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
