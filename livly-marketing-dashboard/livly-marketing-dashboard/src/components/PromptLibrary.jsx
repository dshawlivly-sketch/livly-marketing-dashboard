import { useState } from 'react'
import { B } from '../brand.js'
import { PROMPTS } from '../data/prompts.js'

const ROCK_CFG = {
  r1: { label: 'Apollo Outbound', color: B.amber },
  r2: { label: 'Sales Assets',    color: B.coral },
  r3: { label: 'GTM Reach',       color: B.green },
  r4: { label: 'Website',         color: B.blue  },
}

export default function PromptLibrary() {
  const [search, setSearch] = useState('')
  const [rockFilter, setRockFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [copied, setCopied] = useState(null)

  const copy = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const filtered = PROMPTS.filter(p => {
    const matchRock = rockFilter === 'all' || p.rock === rockFilter
    const q = search.toLowerCase()
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.item.toLowerCase().includes(q) || p.prompt.toLowerCase().includes(q)
    return matchRock && matchSearch
  })

  const groups = rockFilter === 'all'
    ? ['r1', 'r2', 'r3', 'r4']
    : [rockFilter]

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>Q2 2026 · All rocks</div>
        <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>Prompt Library</h1>
        <div style={{ fontSize: 13, color: B.textSec }}>{PROMPTS.length} prompts — one for every Q2 action item. Copy and paste directly into Claude.</div>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: B.textTert, pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input type="text" placeholder="Search prompts..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: B.surface, border: `1px solid ${B.border}`, borderRadius: 7, color: B.text, fontSize: 13, padding: '9px 12px 9px 32px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['all', 'All rocks', B.textSec], ...Object.entries(ROCK_CFG).map(([k, v]) => [k, v.label, v.color])].map(([id, label, color]) => (
            <button key={id} onClick={() => setRockFilter(id)}
              style={{ background: rockFilter === id ? (id === 'all' ? 'rgba(255,255,255,0.14)' : `${color}28`) : 'rgba(255,255,255,0.07)', color: rockFilter === id ? (id === 'all' ? B.text : color) : B.textSec, border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: rockFilter === id ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: B.textTert }}>No prompts match your search</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.map(rock => {
            const rockPrompts = filtered.filter(p => p.rock === rock)
            if (!rockPrompts.length) return null
            const cfg = ROCK_CFG[rock]
            return (
              <div key={rock}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 3, height: 20, background: cfg.color, borderRadius: 2 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: B.textTert }}>{rockPrompts.length} prompts</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rockPrompts.map(p => {
                    const isExpanded = expanded === p.id
                    const isCopied = copied === p.id
                    return (
                      <div key={p.id} style={{ background: B.surface, border: `1px solid ${isExpanded ? cfg.color + '40' : B.border}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : p.id)}>
                          <div style={{ width: 28, height: 28, background: `${cfg.color}18`, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'Georgia,serif', fontSize: 10, fontWeight: 'bold', color: cfg.color }}>{p.id.toUpperCase()}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: B.text }}>{p.title}</div>
                            <div style={{ fontSize: 11, color: B.textTert, marginTop: 1 }}>{p.item}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button onClick={e => { e.stopPropagation(); copy(p.id, p.prompt) }}
                              style={{ background: isCopied ? `${B.green}28` : 'rgba(255,255,255,0.08)', color: isCopied ? B.green : B.textSec, border: 'none', borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                              {isCopied ? '✓ Copied' : 'Copy'}
                            </button>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: B.textTert, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </div>
                        </div>

                        {/* Expanded prompt */}
                        {isExpanded && (
                          <div style={{ borderTop: `1px solid ${B.border}`, padding: 16 }}>
                            <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${B.border}`, borderRadius: 6, padding: '14px 16px', fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                              {p.prompt}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                              <button onClick={() => copy(p.id, p.prompt)}
                                style={{ background: isCopied ? `${B.green}28` : cfg.color, color: isCopied ? B.green : '#111', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                                {isCopied ? '✓ Copied to clipboard' : 'Copy prompt'}
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
      )}
    </div>
  )
}
