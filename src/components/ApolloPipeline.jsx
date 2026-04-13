import { useState, useRef } from 'react'
import { B } from '../brand.js'
import { useStore } from '../utils/useStore.js'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

// Exact column names from Apollo Sequence Engagement Report export
const COL_SENT     = '# Emails sent'
const COL_OPENED   = '# Emails opened'
const COL_CLICKED  = '# Emails clicked'
const COL_REPLIED  = '# Emails replied'
const COL_INTEREST = '# Emails interested'
const COL_SPAM     = '# Emails spam blocked'
const COL_CONTACTS = '# Contacts added to sequence'
const COL_ACCOUNTS = '# Accounts emailed'

const TARGETS = { sent: 100, replyRate: 5, openRate: 20 }

const PHASE_LABEL = {
  build:    { label: 'Build phase', color: B.amber, note: 'April — infrastructure only, no live sequences yet' },
  live:     { label: 'Live', color: B.green, note: 'May–June — 100 emails/week target active' },
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: B.textSec, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 500 }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{p.unit || ''}</div>
      ))}
    </div>
  )
}

function parseApolloCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return null
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(l => {
    const vals = l.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '0']))
  }).filter(r => r[COL_SENT] && parseInt(r[COL_SENT]) > 0)

  if (!rows.length) return null

  const totals = {
    sent:       rows.reduce((s, r) => s + (parseInt(r[COL_SENT]) || 0), 0),
    opened:     rows.reduce((s, r) => s + (parseInt(r[COL_OPENED]) || 0), 0),
    clicked:    rows.reduce((s, r) => s + (parseInt(r[COL_CLICKED]) || 0), 0),
    replied:    rows.reduce((s, r) => s + (parseInt(r[COL_REPLIED]) || 0), 0),
    interested: rows.reduce((s, r) => s + (parseInt(r[COL_INTEREST]) || 0), 0),
    spam:       rows.reduce((s, r) => s + (parseInt(r[COL_SPAM]) || 0), 0),
    contacts:   rows.reduce((s, r) => s + (parseInt(r[COL_CONTACTS]) || 0), 0),
    accounts:   rows.reduce((s, r) => s + (parseInt(r[COL_ACCOUNTS]) || 0), 0),
  }

  return {
    ...totals,
    openRate:   totals.sent > 0 ? parseFloat(((totals.opened / totals.sent) * 100).toFixed(1)) : 0,
    replyRate:  totals.sent > 0 ? parseFloat(((totals.replied / totals.sent) * 100).toFixed(1)) : 0,
    intRate:    totals.sent > 0 ? parseFloat(((totals.interested / totals.sent) * 100).toFixed(1)) : 0,
    spamRate:   totals.sent > 0 ? parseFloat(((totals.spam / totals.sent) * 100).toFixed(1)) : 0,
  }
}

export default function ApolloPipeline() {
  const [weeks, setWeeks] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ weekLabel: '', sent: '', openRate: '', replyRate: '', interested: '', spam: '', spamRate: '', contacts: '', demos: '', phase: 'build' })
  const [parseError, setParseError] = useState('')
  const fileRef = useRef()

  const saveWeeks = next => setWeeks(next)

  const handleFile = e => {
    const file = e.target.files[0]
    if (!file) return
    setParseError('')
    const reader = new FileReader()
    reader.onload = ev => {
      const parsed = parseApolloCSV(ev.target.result)
      if (!parsed) {
        setParseError('Could not parse CSV. Check that it is an Apollo Sequence Engagement Report export.')
        return
      }
      setForm(f => ({
        ...f,
        sent:      String(parsed.sent),
        openRate:  String(parsed.openRate),
        replyRate: String(parsed.replyRate),
        interested: String(parsed.interested),
        spam:      String(parsed.spam),
        spamRate:  String(parsed.spamRate),
        contacts:  String(parsed.contacts),
      }))
    }
    reader.readAsText(file)
  }

  const addWeek = () => {
    if (!form.weekLabel) return
    const entry = {
      week:       form.weekLabel,
      sent:       parseFloat(form.sent) || 0,
      openRate:   parseFloat(form.openRate) || 0,
      replyRate:  parseFloat(form.replyRate) || 0,
      interested: parseFloat(form.interested) || 0,
      spamRate:   parseFloat(form.spamRate) || 0,
      contacts:   parseFloat(form.contacts) || 0,
      demos:      parseFloat(form.demos) || 0,
      phase:      form.phase,
    }
    saveWeeks([...weeks, entry].sort((a, b) => a.week.localeCompare(b.week)))
    setForm({ weekLabel: '', sent: '', openRate: '', replyRate: '', interested: '', spam: '', spamRate: '', contacts: '', demos: '', phase: 'build' })
    setAdding(false)
    setParseError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const deleteWeek = idx => saveWeeks(weeks.filter((_, i) => i !== idx))

  const liveWeeks = weeks.filter(w => w.phase === 'live')
  const totalDemos = weeks.reduce((s, w) => s + w.demos, 0)
  const avgSent = liveWeeks.length ? Math.round(liveWeeks.reduce((s, w) => s + w.sent, 0) / liveWeeks.length) : 0
  const avgReply = liveWeeks.length ? parseFloat((liveWeeks.reduce((s, w) => s + w.replyRate, 0) / liveWeeks.length).toFixed(1)) : 0

  const sentData = weeks.map(w => ({ week: w.week, sent: w.sent, target: 100 }))
  const replyData = liveWeeks.map(w => ({ week: w.week, replyRate: w.replyRate, target: 5 }))

  const statCard = (label, value, target, unit, note) => {
    const onTrack = target > 0 ? value >= target : false
    return (
      <div style={{ flex: 1, background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '14px 16px', minWidth: 140 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 8 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 28, color: target > 0 ? (onTrack ? B.green : B.text) : B.text }}>{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}</span>
          <span style={{ fontSize: 12, color: B.textTert }}>{unit}</span>
        </div>
        {target > 0 && <div style={{ fontSize: 11, color: onTrack ? B.green : B.textTert }}>Target: {target} {unit}</div>}
        {note && <div style={{ fontSize: 10, color: B.textTert, marginTop: 3, fontStyle: 'italic' }}>{note}</div>}
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.amber, marginBottom: 4 }}>Rock 1</div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>Apollo Pipeline</h1>
          <div style={{ fontSize: 13, color: B.textSec }}>Upload your weekly Apollo Sequence Engagement CSV to track performance</div>
        </div>
        <button onClick={() => setAdding(p => !p)}
          style={{ background: adding ? 'rgba(255,255,255,0.07)' : B.amber, color: adding ? B.textSec : '#111', border: 'none', borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          {adding ? 'Cancel' : '+ Add week'}
        </button>
      </div>

      {/* Phase indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(PHASE_LABEL).map(([key, cfg]) => (
          <div key={key} style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}40`, borderRadius: 6, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
            <span style={{ fontSize: 11, color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
            <span style={{ fontSize: 10, color: B.textTert }}>{cfg.note}</span>
          </div>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: B.textSec, marginBottom: 10 }}>
            Upload your Apollo <strong style={{ color: B.text }}>Sequence Engagement Report</strong> CSV to auto-fill metrics.
          </div>
          <div style={{ marginBottom: 12 }}>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile}
              style={{ fontSize: 12, color: B.textSec, background: 'rgba(255,255,255,0.05)', border: `1px solid ${B.border}`, borderRadius: 6, padding: '7px 10px', width: '100%', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            {parseError && <div style={{ fontSize: 11, color: '#e05a4a', marginTop: 6 }}>{parseError}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
            {[
              { key: 'weekLabel',   label: 'Week (e.g. May 5–9)',           type: 'text'   },
              { key: 'phase',       label: 'Phase',                          type: 'select', opts: [['build','April — build'], ['live','May–June — live']] },
              { key: 'sent',        label: 'Emails sent',                    type: 'number' },
              { key: 'openRate',    label: 'Open rate (%)',                  type: 'number' },
              { key: 'replyRate',   label: 'Reply rate (%)',                 type: 'number' },
              { key: 'interested',  label: 'Interested replies',             type: 'number' },
              { key: 'spamRate',    label: 'Spam rate (%)',                  type: 'number' },
              { key: 'contacts',    label: 'Contacts added',                 type: 'number' },
              { key: 'demos',       label: 'Demos booked (manual)',          type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 10, color: B.textTert, marginBottom: 4 }}>{f.label}</div>
                {f.type === 'select' ? (
                  <select value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', background: '#252527', border: `1px solid ${B.border}`, borderRadius: 6, color: B.text, fontSize: 13, padding: '7px 10px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                    {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder="—"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${B.border}`, borderRadius: 6, color: B.text, fontSize: 13, padding: '7px 10px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: B.textTert, marginBottom: 10, fontStyle: 'italic' }}>
            Demos booked is not in the Apollo export — enter manually after checking Salesforce.
          </div>
          <button onClick={addWeek}
            style={{ background: B.amber, color: '#111', border: 'none', borderRadius: 7, padding: '9px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Save week
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {statCard('Emails sent (avg/wk, live)', avgSent, 100, '/wk', liveWeeks.length === 0 ? 'Starts May' : null)}
        {statCard('Reply rate (avg, live)', avgReply, 5, '%', liveWeeks.length === 0 ? 'Starts May' : null)}
        {statCard('Demos booked (total)', totalDemos, 0, 'demos', 'Manual entry')}
        {statCard('Weeks tracked', weeks.length, 0, 'weeks', null)}
      </div>

      {weeks.length === 0 ? (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: 48, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 15, color: B.textTert, marginBottom: 8 }}>No data yet</div>
          <div style={{ fontSize: 12, color: B.textTert }}>
            Export your Apollo Sequence Engagement Report weekly and upload above.<br />
            Demos booked can be entered manually each week.
          </div>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 14 }}>Emails sent vs 100/week target</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={100} stroke={B.amber} strokeDasharray="4 4" strokeOpacity={0.6} />
                  <Bar dataKey="sent" name="Emails sent" fill={B.amber} fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {liveWeeks.length > 0 ? (
              <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 14 }}>Reply rate vs 5% target (live weeks)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={replyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={5} stroke={B.green} strokeDasharray="4 4" strokeOpacity={0.6} />
                    <Line type="monotone" dataKey="replyRate" name="Reply rate" stroke={B.amber} strokeWidth={2} dot={{ fill: B.amber, r: 4 }} unit="%" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: B.textTert, marginBottom: 6 }}>Reply rate chart</div>
                  <div style={{ fontSize: 11, color: B.textTert, fontStyle: 'italic' }}>Activates when live-phase weeks are logged (May)</div>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${B.border}` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert }}>Weekly log</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#252527' }}>
                    {['Week', 'Phase', 'Sent', 'Open rate', 'Reply rate', 'Interested', 'Spam rate', 'Demos', ''].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${B.border}` }}>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: B.text, whiteSpace: 'nowrap' }}>{w.week}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 500, color: w.phase === 'live' ? B.green : B.amber, background: w.phase === 'live' ? `${B.green}20` : `${B.amber}20`, padding: '2px 7px', borderRadius: 3 }}>
                          {PHASE_LABEL[w.phase].label}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: w.sent >= 100 ? B.green : B.textSec, fontWeight: w.sent >= 100 ? 500 : 400 }}>{w.sent}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: B.textSec }}>{w.openRate}%</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: w.replyRate >= 5 ? B.green : B.textSec, fontWeight: w.replyRate >= 5 ? 500 : 400 }}>{w.replyRate}%</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: B.textSec }}>{w.interested}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: w.spamRate > 0.1 ? '#e05a4a' : B.textSec }}>{w.spamRate}%</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: w.demos > 0 ? B.green : B.textTert, fontWeight: w.demos > 0 ? 500 : 400 }}>{w.demos}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <button onClick={() => deleteWeek(i)} style={{ background: 'none', border: 'none', color: B.textTert, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
