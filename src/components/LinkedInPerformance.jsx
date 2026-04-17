import { useState, useRef } from 'react'
import { B } from '../brand.js'
import { useStore } from '../utils/useStore.js'
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

const TARGETS = { impressions: 800, followersPerWeek: 17, engagementRate: 5 }
const LIVLY_BASELINE = { followers: 6218, date: '2026-04-01' }

const CUSTOM_TOOLTIP = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 500 }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{unit || ''}</div>
      ))}
    </div>
  )
}

export default function LinkedInPerformance() {
  const [snapshots, setSnapshots] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ weekLabel: '', avgImpressions: '', netFollowers: '', engagementRate: '', topPost: '', demos: '' })
  const fileRef = useRef()

  const saveSnapshots = next => setSnapshots(next)

  const parseCSV = (text) => {
    // Planable / LinkedIn exports have different structures.
    // Planable: row 0 = metadata ("CURRENT PERIOD..."), row 1 = headers, row 2+ = daily data
    // LinkedIn native: row 0 = headers, row 1+ = data
    // We detect which by checking if row 0 has real column names.

    const parseRow = (line) => {
      const result = []
      let cur = '', inQ = false
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ }
        else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
        else { cur += ch }
      }
      result.push(cur.trim())
      return result
    }

    const rawLines = text.split('\n').filter(l => l.trim())
    if (rawLines.length < 2) return null

    // Detect Planable format: first line contains no comma-separated column names
    const firstRow = parseRow(rawLines[0])
    const isPlanabler = firstRow.length === 1 || !firstRow.some(v =>
      ['date','impressions','engagement','audience','followers'].includes(v.toLowerCase())
    )
    const headerRowIdx = isPlanabler ? 1 : 0
    const headers = parseRow(rawLines[headerRowIdx]).map(h => h.replace(/"/g, '').trim())
    const dataRows = rawLines.slice(headerRowIdx + 1).map(l => {
      const vals = parseRow(l).map(v => v.replace(/"/g, '').trim())
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))
    }).filter(r => r['Date'] && r['Date'] !== 'Total' && r['Audience'] && r['Impressions'])

    if (dataRows.length === 0) return null

    // If multiple pages, prefer Livly page; fall back to all rows
    const livlyRows = dataRows.filter(r => r['Page'] && r['Page'].toLowerCase().includes('livly'))
    const rows = livlyRows.length > 0 ? livlyRows : dataRows

    // Follower delta: last audience value minus first
    const audiences = rows.map(r => parseInt(r['Audience']) || 0).filter(n => n > 0)
    const netFollowers = audiences.length >= 2 ? audiences[audiences.length - 1] - audiences[0] : 0

    // Average daily impressions and engagement rate
    const impressionVals = rows.map(r => parseFloat(r['Impressions']) || 0)
    const erVals = rows.map(r => parseFloat(r['Engagement Rate (%)']) || 0)
    const avgImp = impressionVals.length ? Math.round(impressionVals.reduce((a,b)=>a+b,0) / impressionVals.length) : 0
    const avgEr = erVals.length ? parseFloat((erVals.reduce((a,b)=>a+b,0) / erVals.length).toFixed(1)) : 0

    return {
      avgImpressions: avgImp,
      netFollowers,
      engagementRate: avgEr,
      dataType: 'daily-page', // flag so UI can label correctly
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result)
      if (parsed) setForm(f => ({ ...f, ...Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)])) }))
    }
    reader.readAsText(file)
  }

  const addSnapshot = () => {
    if (!form.weekLabel) return
    const snap = {
      week: form.weekLabel,
      avgImpressions: parseFloat(form.avgImpressions) || 0,
      netFollowers: parseFloat(form.netFollowers) || 0,
      engagementRate: parseFloat(form.engagementRate) || 0,
      topPost: form.topPost,
      demos: parseFloat(form.demos) || 0,
      date: new Date().toISOString(),
    }
    saveSnapshots([...snapshots, snap].sort((a, b) => a.week.localeCompare(b.week)))
    setForm({ weekLabel: '', avgImpressions: '', netFollowers: '', engagementRate: '', topPost: '', demos: '' })
    setAdding(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const deleteSnapshot = (idx) => saveSnapshots(snapshots.filter((_, i) => i !== idx))

  const latestFollowers = LIVLY_BASELINE.followers + snapshots.reduce((s, n) => s + n.netFollowers, 0)
  const totalContentDemos = snapshots.reduce((s, n) => s + n.demos, 0)
  const avgImpressions = snapshots.length ? Math.round(snapshots.reduce((s, n) => s + n.avgImpressions, 0) / snapshots.length) : 0

  const impressionData = snapshots.map(s => ({ week: s.week, impressions: s.avgImpressions, target: TARGETS.impressions }))
  const followerData = snapshots.map(s => ({ week: s.week, followers: s.netFollowers, target: TARGETS.followersPerWeek }))

  const statCard = (label, value, target, unit, color) => {
    const onTrack = value >= target
    return (
      <div style={{ flex: 1, background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '14px 16px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 8 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 28, color: onTrack ? B.green : B.text }}>{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}</span>
          <span style={{ fontSize: 12, color: B.textTert }}>{unit}</span>
        </div>
        <div style={{ fontSize: 11, color: onTrack ? B.green : B.textTert }}>Target: {target} {unit}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.green, marginBottom: 4 }}>Rock 3</div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>LinkedIn Performance</h1>
          <div style={{ fontSize: 13, color: B.textSec }}>{latestFollowers.toLocaleString()} total followers · {snapshots.length} weeks tracked</div>
        </div>
        <button onClick={() => setAdding(p => !p)}
          style={{ background: adding ? 'rgba(255,255,255,0.07)' : B.green, color: adding ? B.textSec : '#111', border: 'none', borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          {adding ? 'Cancel' : '+ Add week'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: B.textSec, marginBottom: 14 }}>
            Upload a Planable or LinkedIn CSV to auto-fill, or enter values manually.
          </div>
          <div style={{ marginBottom: 12 }}>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload}
              style={{ fontSize: 12, color: B.textSec, background: 'rgba(255,255,255,0.05)', border: `1px solid ${B.border}`, borderRadius: 6, padding: '7px 10px', width: '100%', cursor: 'pointer', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            {[
              { key: 'weekLabel', label: 'Week label (e.g. Apr 14–18)', type: 'text' },
              { key: 'avgImpressions', label: 'Avg post impressions', type: 'number' },
              { key: 'netFollowers', label: 'Net new followers', type: 'number' },
              { key: 'engagementRate', label: 'Avg engagement rate (%)', type: 'number' },
              { key: 'topPost', label: 'Top post topic (optional)', type: 'text' },
              { key: 'demos', label: 'Content-attributed demos', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 10, color: B.textTert, marginBottom: 4 }}>{f.label}</div>
                <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder="—"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${B.border}`, borderRadius: 6, color: B.text, fontSize: 13, padding: '7px 10px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <button onClick={addSnapshot}
            style={{ background: B.green, color: '#111', border: 'none', borderRadius: 7, padding: '9px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Save week
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {statCard('Avg daily impressions', avgImpressions, TARGETS.impressions, '/ day', B.green)}
        {statCard('Net new followers / wk', snapshots.length ? Math.round(snapshots.reduce((s, n) => s + n.netFollowers, 0) / snapshots.length) : 0, TARGETS.followersPerWeek, '/ week', B.green)}
        {statCard('Content demos (total)', totalContentDemos, 5, '/ 5 target', B.green)}
        {statCard('Livly page followers', latestFollowers, 0, 'total', B.green)}
      </div>

      {snapshots.length === 0 ? (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: B.textTert, marginBottom: 8 }}>No data yet</div>
          <div style={{ fontSize: 12, color: B.textTert }}>Upload a Planable or LinkedIn Analytics CSV to start tracking</div>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Impressions chart */}
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 14 }}>Avg daily impressions (Planable export is page-level, not per-post)</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={impressionData}>
                  <defs>
                    <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={B.green} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={B.green} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <ReferenceLine y={800} stroke={B.green} strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Area type="monotone" dataKey="impressions" name="Impressions" stroke={B.green} fill="url(#impGrad)" strokeWidth={2} dot={{ fill: B.green, r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Followers chart */}
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert, marginBottom: 14 }}>Net new followers vs 17/week target</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={followerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <ReferenceLine y={17} stroke={B.green} strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Bar dataKey="followers" name="New followers" fill={B.green} fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Snapshot table */}
          <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${B.border}` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert }}>Weekly snapshots</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#252527' }}>
                  {['Week', 'Avg impressions', 'New followers', 'Eng. rate', 'Demos', 'Top post', ''].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${B.border}` }}>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: B.text }}>{s.week}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: s.avgImpressions >= 800 ? B.green : B.textSec, fontWeight: s.avgImpressions >= 800 ? 500 : 400 }}>{s.avgImpressions}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: s.netFollowers >= 17 ? B.green : B.textSec, fontWeight: s.netFollowers >= 17 ? 500 : 400 }}>{s.netFollowers}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: B.textSec }}>{s.engagementRate}%</td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: s.demos > 0 ? B.green : B.textSec, fontWeight: s.demos > 0 ? 500 : 400 }}>{s.demos}</td>
                    <td style={{ padding: '9px 14px', fontSize: 11, color: B.textTert }}>{s.topPost || '—'}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <button onClick={() => deleteSnapshot(i)} style={{ background: 'none', border: 'none', color: B.textTert, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
