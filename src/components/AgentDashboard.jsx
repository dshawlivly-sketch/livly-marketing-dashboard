import { useState, useRef, useEffect, useCallback } from 'react'
import { B } from '../brand.js'

// ── Agents ────────────────────────────────────────────────────────────────────

const AGENTS = [
  {
    id: 'brand-copy',
    name: 'Brand Copy',
    sub: 'Voice & Messaging',
    color: B.coral,
    icon: '✦',
    steps: ['Parse intent', 'Load brand rules', 'Draft copy', 'Voice check', 'Output ready'],
    system: `You are the Livly brand voice engine. Livly is a mid-market multifamily PropTech SaaS platform serving operators with 500–5,000 units, positioned as a portfolio intelligence layer (PMS-agnostic, hardware-agnostic).

Voice rules — enforce all of these strictly:
- Executive tone, no exclamation marks, no emojis
- Storytelling-forward, outcomes-first
- No unnecessary bolding, no staccato paragraphs
- Natural sentence cadence: longer for context, shorter for main ideas
- Minimize em dashes
- Operators are the hero — Livly makes them smarter
- Avoid "resident experience" framing; use "resident operations" or "portfolio intelligence"

Reference customers when helpful: CEDARst/Flats, SPM, Southern Land Company, Soave Enterprises, Jamestown, Toll Brothers Apartment Living.

Generate on-brand marketing copy in the requested format. Be specific, outcomes-first, and concise.`,
    prompts: [
      'Hero headline for the AI Concierge product page',
      '3-sentence value prop for a 2,000-unit operator',
      'Reframe "resident app" as "resident operations platform" in one paragraph',
    ],
  },
  {
    id: 'sales-enable',
    name: 'Sales Enablement',
    sub: 'Battle Cards & Objections',
    color: B.blue,
    icon: '◉',
    steps: ['Parse scenario', 'Load ICP context', 'Map objections', 'Build response', 'Output ready'],
    system: `You are Livly's sales enablement strategist.

Livly is a portfolio intelligence layer for mid-market multifamily operators (500–5,000 units). PMS-agnostic, hardware-agnostic.

Displacement motion:
- Point solutions (Elevated Living, Venn, Flamingo): fragmented, data-siloed — "point solution sprawl"
- Yardi/Entrata native tools: complement framing — "we make your PMS smarter, not replace it"
- 1Valet: Livly sits above as portfolio orchestration layer

ICP tiers:
- Primary: 1,500–5,000 units, 3+ properties, Yardi/Entrata, frustrated with point solution sprawl
- Secondary: 500–1,500 units, growth-stage, open to consolidation
- Tertiary: 5,000+ units, enterprise, custom pilot required

Voice: Executive tone, no exclamation marks, outcomes-first.`,
    prompts: [
      'Battle card: Livly vs Yardi Concierge IQ',
      'Objection: "We already have a resident app"',
      'Discovery questions for a 3,000-unit Yardi operator',
    ],
  },
  {
    id: 'comp-intel',
    name: 'Competitive Intel',
    sub: 'Displacement Analysis',
    color: B.green,
    icon: '◎',
    steps: ['Load competitor data', 'Map capabilities', 'Score gaps', 'Frame positioning', 'Output ready'],
    system: `You are Livly's competitive intelligence engine.

Competitors:
- Yardi Suite (Voyager, RentCafe, Concierge IQ, Home IQ, Maintenance IQ): PMS-native, data-siloed, weak cross-portfolio intelligence. Frame: "built to manage transactions, not generate intelligence."
- Elevated Living / Venn / Flamingo: Point solutions — high implementation overhead, fragmented.
- 1Valet: Hardware-adjacent; Livly is the portfolio orchestration layer above.
- ResMan, Entrata: PMS players; complement framing.

Livly advantages: PMS-agnostic, hardware-agnostic, qualitative context layer, portfolio-level AI insights.

Output executive-level competitive analysis. No exclamation marks. Frame Livly as the intelligent orchestration layer above fragmented point solutions.`,
    prompts: [
      'Displacement scorecard: Livly vs Elevated Living',
      'Why Livly complements rather than replaces Yardi',
      'Feature matrix: Livly vs RentCafe resident portal',
    ],
  },
  {
    id: 'apollo-drip',
    name: 'Apollo Drip',
    sub: 'Outreach Sequences',
    color: B.amber,
    icon: '◆',
    steps: ['Parse persona', 'Load sequence rules', 'Draft emails', 'CTA + subject check', 'Output ready'],
    system: `You are Livly's outreach sequence writer for Apollo.io campaigns.

Email rules — enforce strictly:
- No exclamation marks, executive tone throughout
- Subject lines under 50 characters: specific, not clever
- Opening line: contextual reference — not a generic opener
- Value prop in sentences 2–3, not sentence 1
- CTA: soft ask only — "worth a 20-minute call?" not "schedule a demo now"
- Max 150 words per email body
- 3–5 email sequence with 4–7 day gaps between touches
- Each email escalates slightly in directness but never becomes pushy

Livly positioning: Portfolio intelligence layer. Makes Yardi/Entrata smarter. Replaces scattered point solutions with one operator command center.

Format each sequence with: Email #, Subject Line, Body, Sending Day.`,
    prompts: [
      '5-email acquisition sequence for a 2,500-unit Yardi operator',
      '3-email expansion sequence: AI Concierge upsell to existing customer',
      'Evergreen re-engagement email for a 90-day dormant VP of Operations',
    ],
  },
  {
    id: 'partner',
    name: 'Partner Channel',
    sub: 'Hardware & Reseller',
    color: '#8b70d8',
    icon: '◇',
    steps: ['Load partner profile', 'Map hardware stack', 'Draft messaging', 'Channel tone check', 'Output ready'],
    system: `You are Livly's partner channel strategist.

Hardware partners: Comelit (primary smart access), Schlage (traditional lock), Assa Abloy (enterprise access), Dormakaba (growing co-sell), SALTO (hospitality-adjacent).

Resellers: Southbay (technology integrators), SKBM (smart building management), LaMarco (regional dealer networks).

Partner messaging: Livly adds recurring software revenue on top of hardware margin. PMS-agnostic positioning means broader addressable market. Livly is the software intelligence layer above hardware — not a hardware company, not a PMS.

Voice: Executive tone for partner executives. No exclamation marks. Outcomes-first (ARR, margin, deal size).`,
    prompts: [
      'Co-sell pitch email: Livly + Dormakaba for a 2,000-unit portfolio',
      'Partner executive intro deck outline for Comelit leadership',
      'Channel enablement one-pager brief for SKBM resellers',
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Content',
    sub: 'Thought Leadership',
    color: '#30a8a6',
    icon: '◐',
    steps: ['Parse topic', 'Load voice profile', 'Draft post', 'Hook + tone check', 'Output ready'],
    system: `You are Livly's LinkedIn content strategist writing in the voice of Dave Shaw, President & COO of Livly.

Voice profile: David Sedaris + Malcolm Gladwell + Ryan Reynolds. Professional with ~20% casual/conversational balance. Witty but never risqué. Confident and thought-provoking for an executive real estate and technology audience.

Hard rules — never break:
- No exclamation marks
- No emojis
- No unnecessary bolding
- No staccato one-sentence paragraphs
- No "I'm excited to announce" openers
- Hooks must earn attention without being clickbait
- Avoid generic takes; bring a specific, counterintuitive observation

Topics: PropTech and multifamily operations, AI in real estate (practical over hype), portfolio intelligence vs property-level thinking, the operator's view on resident operations, building a high-impact 15-person remote SaaS team, dual vendor/operator perspective.

Format: 150–400 words, paragraph-forward, written for LinkedIn native.`,
    prompts: [
      'Why "resident experience" is the wrong framing for operators',
      'What coaching 5th grade football taught me about building a SaaS team',
      'The problem with point solutions in multifamily tech stacks',
    ],
  },
]

// ── Inline text renderer ──────────────────────────────────────────────────────

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ fontWeight: 600, color: '#eee' }}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</em>
    return part
  })
}

function renderText(text) {
  if (!text) return null
  return text.split(/\n\n+/).filter(Boolean).map((para, i) => {
    if (para.startsWith('### '))
      return <p key={i} style={{ fontSize: 13, fontWeight: 700, color: '#eee', margin: '12px 0 4px' }}>{renderInline(para.slice(4))}</p>
    if (para.startsWith('## ') || para.startsWith('# '))
      return <p key={i} style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '14px 0 5px' }}>{renderInline(para.replace(/^#+\s/, ''))}</p>
    const lines = para.split('\n')
    const allList = lines.every(l => l.match(/^[-*•]\s/) || !l.trim())
    if (allList && lines.some(l => l.match(/^[-*•]\s/))) {
      return (
        <ul key={i} style={{ margin: '6px 0 10px', paddingLeft: 16 }}>
          {lines.filter(l => l.match(/^[-*•]\s/)).map((l, j) => (
            <li key={j} style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>
              {renderInline(l.replace(/^[-*•]\s/, ''))}
            </li>
          ))}
        </ul>
      )
    }
    return <p key={i} style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>{renderInline(para)}</p>
  })
}

// ── Workflow step ─────────────────────────────────────────────────────────────

function WorkflowStep({ label, state, color }) {
  const isDone   = state === 'done'
  const isActive = state === 'active'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7,
      background: state !== 'idle' ? `${color}10` : 'transparent',
      border: `1px solid ${state !== 'idle' ? `${color}28` : B.border}`,
      marginBottom: 5, opacity: state === 'idle' ? 0.3 : 1,
      transition: 'all 0.35s ease',
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: (isDone || isActive) ? color : B.border,
        boxShadow: isActive ? `0 0 8px ${color}` : 'none',
        animation: isActive ? 'liAgentPulse 1.2s ease-in-out infinite' : 'none',
        transition: 'all 0.35s ease',
      }} />
      <span style={{ fontSize: 11, color: state !== 'idle' ? B.text : B.textTert, lineHeight: 1.3, flex: 1 }}>
        {isDone ? '✓ ' : ''}{label}
      </span>
    </div>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

export default function AgentDashboard() {
  const [activeId, setActiveId] = useState('brand-copy')
  const [convos, setConvos]     = useState({})
  const [input, setInput]       = useState('')
  const [thinking, setThinking] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
  const [tokens, setTokens]     = useState(null)
  const [latency, setLatency]   = useState(null)
  const [copied, setCopied]     = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const stepRef   = useRef(null)

  const agent    = AGENTS.find(a => a.id === activeId)
  const messages = convos[activeId] || []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = useCallback(async (text) => {
    if (!text?.trim() || thinking) return
    const userMsg = { role: 'user', content: text.trim() }
    const newMsgs = [...messages, userMsg]
    setConvos(prev => ({ ...prev, [activeId]: newMsgs }))
    setInput('')
    setThinking(true)
    setActiveStep(0)
    setTokens(null)
    setLatency(null)

    const t0  = Date.now()
    let step  = 0
    stepRef.current = setInterval(() => {
      step++
      if (step >= agent.steps.length - 1) { clearInterval(stepRef.current); return }
      setActiveStep(step)
    }, 550)

    try {
      // Uses the /api/chat serverless proxy — API key stays server-side
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system:     agent.system,
          messages:   newMsgs,
        }),
      })
      const data  = await res.json()
      const reply = data.content?.[0]?.text || data.error || 'No response received.'
      clearInterval(stepRef.current)
      setActiveStep(agent.steps.length - 1)
      setTokens(data.usage?.output_tokens ?? null)
      setLatency(((Date.now() - t0) / 1000).toFixed(1))
      setConvos(prev => ({
        ...prev,
        [activeId]: [...newMsgs, { role: 'assistant', content: reply }],
      }))
    } catch (e) {
      clearInterval(stepRef.current)
      setConvos(prev => ({
        ...prev,
        [activeId]: [...newMsgs, { role: 'assistant', content: `Error: ${e.message}` }],
      }))
    } finally {
      setThinking(false)
    }
  }, [activeId, agent, messages, thinking])

  const switchAgent = id => {
    if (thinking) return
    setActiveId(id)
    setActiveStep(-1)
    setTokens(null)
    setLatency(null)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const copyLast = () => {
    const last = [...messages].reverse().find(m => m.role === 'assistant')
    if (!last) return
    navigator.clipboard.writeText(last.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: B.dark }}>
      <style>{`
        @keyframes liAgentPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(0.8); }
        }
        @keyframes liAgentFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes liAgentBlink {
          0%, 100% { opacity: 1; } 50% { opacity: 0.2; }
        }
        .li-agent-row:hover { background: ${B.surface} !important; }
      `}</style>

      {/* ── Left: agent list ── */}
      <div style={{ width: 200, flexShrink: 0, borderRight: `1px solid ${B.border}`, display: 'flex', flexDirection: 'column', padding: '14px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert, padding: '0 8px 10px' }}>
          Agent Registry
        </div>

        {AGENTS.map(a => {
          const isActive  = a.id === activeId
          const hasConvo  = (convos[a.id] || []).length > 0
          return (
            <div
              key={a.id}
              className="li-agent-row"
              onClick={() => switchAgent(a.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px',
                borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: isActive ? `${a.color}14` : 'transparent',
                border: `1px solid ${isActive ? `${a.color}35` : 'transparent'}`,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 13, color: isActive ? a.color : B.textTert, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? B.text : B.textSec, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}
                </div>
                <div style={{ fontSize: 10, color: isActive ? a.color : B.textTert, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.sub}
                </div>
              </div>
              {hasConvo && (
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? a.color : B.textTert, flexShrink: 0 }} />
              )}
            </div>
          )
        })}

        {/* Color legend */}
        <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: `1px solid ${B.border}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 8 }}>
            Color Legend
          </div>
          {[
            [B.coral,  'Resident / Brand'],
            [B.blue,   'Connect / Access'],
            [B.green,  'AI / Intelligence'],
            [B.amber,  'Prospect / Leasing'],
          ].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: B.textTert }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Center: chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Agent header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderBottom: `1px solid ${B.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: 18, color: agent.color }}>{agent.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: B.text }}>{agent.name}</div>
            <div style={{ fontSize: 11, color: B.textSec }}>{agent.sub}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
            {messages.some(m => m.role === 'assistant') && (
              <button onClick={copyLast}
                style={{ padding: '4px 10px', borderRadius: 5, border: `1px solid ${B.border}`, background: 'transparent', color: copied ? B.green : B.textSec, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                {copied ? '✓ Copied' : 'Copy last'}
              </button>
            )}
            {messages.length > 0 && (
              <button onClick={() => { setConvos(p => ({ ...p, [activeId]: [] })); setActiveStep(-1); setTokens(null); setLatency(null) }}
                style={{ padding: '4px 10px', borderRadius: 5, border: `1px solid ${B.border}`, background: 'transparent', color: B.textSec, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 14px' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, color: `${agent.color}28`, marginBottom: 10 }}>{agent.icon}</div>
                <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 17, color: B.textSec, marginBottom: 5 }}>{agent.name}</div>
                <div style={{ fontSize: 12, color: B.textTert, maxWidth: 280, lineHeight: 1.6 }}>
                  {agent.sub} — ready to generate on-brand output
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%', maxWidth: 380 }}>
                {agent.prompts.map((p, i) => (
                  <button key={i} onClick={() => send(p)}
                    style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.border}`, background: B.surface, color: B.textSec, fontSize: 12, cursor: 'pointer', textAlign: 'left', lineHeight: 1.4, fontFamily: 'inherit', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = agent.color; e.currentTarget.style.color = B.text; e.currentTarget.style.background = `${agent.color}0a` }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = B.border; e.currentTarget.style.color = B.textSec; e.currentTarget.style.background = B.surface }}>
                    <span style={{ color: agent.color, marginRight: 7 }}>→</span>{p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 660, margin: '0 auto' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', animation: 'liAgentFadeUp 0.25s ease' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>
                    {m.role === 'user' ? 'You' : agent.name}
                  </div>
                  <div style={{ padding: '11px 14px', borderRadius: m.role === 'user' ? '10px 10px 3px 10px' : '3px 10px 10px 10px', background: m.role === 'user' ? `${agent.color}18` : B.surface, border: `1px solid ${m.role === 'user' ? `${agent.color}30` : B.border}`, maxWidth: '92%' }}>
                    {m.role === 'user'
                      ? <p style={{ fontSize: 13, lineHeight: 1.7, color: B.text, margin: 0 }}>{m.content}</p>
                      : <div>{renderText(m.content)}</div>
                    }
                  </div>
                </div>
              ))}

              {thinking && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', animation: 'liAgentFadeUp 0.2s ease' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>{agent.name}</div>
                  <div style={{ padding: '11px 16px', borderRadius: '3px 10px 10px 10px', background: B.surface, border: `1px solid ${B.border}` }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0, 1, 2].map(j => (
                        <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: agent.color, animation: `liAgentBlink 1.4s ease-in-out infinite ${j * 0.22}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${B.border}`, flexShrink: 0 }}>
          <div style={{ maxWidth: 660, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, borderRadius: 9, border: `1px solid ${B.border}`, background: B.surface, transition: 'border-color 0.15s' }}
              onFocusCapture={e => e.currentTarget.style.borderColor = agent.color}
              onBlurCapture={e => e.currentTarget.style.borderColor = B.border}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
                placeholder={`Ask ${agent.name}…`}
                rows={2}
                style={{ width: '100%', padding: '10px 12px', border: 'none', background: 'transparent', color: B.text, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || thinking}
              style={{ padding: '10px 16px', borderRadius: 9, border: 'none', background: input.trim() && !thinking ? agent.color : B.surface, color: input.trim() && !thinking ? '#111' : B.textTert, fontSize: 13, fontWeight: 600, cursor: input.trim() && !thinking ? 'pointer' : 'default', fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.15s' }}
            >
              {thinking ? '···' : 'Send'}
            </button>
          </div>
          <div style={{ maxWidth: 660, margin: '6px auto 0', fontSize: 10, color: B.textTert, paddingLeft: 2 }}>
            Enter to send · Shift+Enter for line break · All output follows Livly brand voice rules
          </div>
        </div>
      </div>

      {/* ── Right: workflow + metrics ── */}
      <div style={{ width: 205, flexShrink: 0, borderLeft: `1px solid ${B.border}`, display: 'flex', flexDirection: 'column', padding: '14px 11px', overflowY: 'auto' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 11 }}>
          Agent Workflow
        </div>

        {agent.steps.map((step, i) => {
          const state = activeStep === -1 ? 'idle' : i < activeStep ? 'done' : i === activeStep ? 'active' : 'idle'
          return <WorkflowStep key={`${activeId}-${i}`} label={step} state={state} color={agent.color} />
        })}

        {(tokens !== null || latency !== null) && (
          <div style={{ marginTop: 14, padding: '11px', borderRadius: 8, background: B.surface, border: `1px solid ${B.border}`, animation: 'liAgentFadeUp 0.25s ease' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 9 }}>
              Session Metrics
            </div>
            {latency && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: B.textSec }}>Latency</span>
                <span style={{ fontSize: 11, color: agent.color, fontFamily: 'monospace', fontWeight: 500 }}>{latency}s</span>
              </div>
            )}
            {tokens !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: B.textSec }}>Output tokens</span>
                <span style={{ fontSize: 11, color: agent.color, fontFamily: 'monospace', fontWeight: 500 }}>{tokens}</span>
              </div>
            )}
          </div>
        )}

        {/* Quick prompts */}
        <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: `1px solid ${B.border}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 7 }}>
            Quick Start
          </div>
          {agent.prompts.map((p, i) => (
            <div key={i} onClick={() => send(p)}
              style={{ padding: '7px 8px', borderRadius: 6, marginBottom: 5, background: B.surface, border: `1px solid ${B.border}`, fontSize: 10, color: B.textSec, cursor: 'pointer', lineHeight: 1.4, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = agent.color; e.currentTarget.style.color = B.text; e.currentTarget.style.background = `${agent.color}0a` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = B.border; e.currentTarget.style.color = B.textSec; e.currentTarget.style.background = B.surface }}>
              <span style={{ color: agent.color, marginRight: 5, fontSize: 9 }}>▸</span>{p}
            </div>
          ))}
        </div>

        {/* Active agent badge */}
        <div style={{ marginTop: 12, padding: '9px', borderRadius: 7, background: `${agent.color}10`, border: `1px solid ${agent.color}25` }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 5 }}>Active</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: agent.color }}>{agent.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: B.text }}>{agent.name}</span>
          </div>
          <div style={{ fontSize: 10, color: agent.color, marginTop: 2 }}>{agent.sub}</div>
        </div>
      </div>
    </div>
  )
}
