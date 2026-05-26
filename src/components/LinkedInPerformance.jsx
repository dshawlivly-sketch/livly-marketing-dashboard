import { useState, useRef } from 'react'
import { B } from '../brand.js'
import { useStore } from '../utils/useStore.js'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

// Sarah Bonder added to PAGES
const PAGES = ['Livly', 'David Shaw', 'Will Coffin', 'Sarah Bonder']
const PAGE_COLORS = {
  'Livly':        B.coral,
  'David Shaw':   B.blue,
  'Will Coffin':  B.amber,
  'Sarah Bonder': B.green,
}
const TARGETS = { impressions: 800, followersPerWeek: 17 }

// ── CSV Parsers ───────────────────────────────────────────────────────────────

function parsePlanableCSV(text) {
  const parseRow = line => {
    const result = []; let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
      else cur += ch
    }
    result.push(cur.trim())
    return result
  }

  const rawLines = text.split('\n').filter(l => l.trim())
  if (rawLines.length < 2) return null

  // Detect Planable metadata row (e.g. "CURRENT PERIOD (2026 May 19 - 2026 May 26)")
  const firstRow = parseRow(rawLines[0])
  const headerRowIdx = (firstRow.length === 1 || firstRow[0].toUpperCase().includes('CURRENT')) ? 1 : 0
  const headers = parseRow(rawLines[headerRowIdx]).map(h => h.replace(/"/g, '').trim())

  // ── CRITICAL FIX: only parse rows from the CURRENT PERIOD ──────────────────
  // Stop at the first "Total" row. The CSV may contain PREVIOUS PERIOD data
  // after it, which we must not include — otherwise impressions double-count.
  const dataRows = []
  for (const l of rawLines.slice(headerRowIdx + 1)) {
    const vals = parseRow(l).map(v => v.replace(/"/g, '').trim())
    const row  = Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))

    // Stop at the Total row — everything after is a different period
    if (row['Date'] === 'Total') break

    // Skip rows without valid Date, Page, or Audience
    if (!row['Date'] || !row['Audience'] || !row['Page'] || row['Page'] === 'Page') continue

    dataRows.push(row)
  }

  if (!dataRows.length) return null

  // Derive page list dynamically from the data (handles new pages automatically)
  const dynamicPages = [...new Set(dataRows.map(r => r['Page']).filter(Boolean))]

  // Build per-page aggregates
  const channels = {}
  for (const page of dynamicPages) {
    const rows = dataRows.filter(r => r['Page'] === page)
    if (!rows.length) continue
    const audiences = rows.map(r => parseInt(r['Audience']) || 0).filter(n => n > 0)
    const imps      = rows.map(r => parseFloat(r['Impressions']) || 0)
    const engs      = rows.map(r => parseFloat(r['Engagement']) || 0)
    const ers       = rows.map(r => parseFloat(r['Engagement Rate (%)']) || 0)
    channels[page] = {
      followers:     audiences[audiences.length - 1] || 0,
      followerDelta: audiences.length >= 2 ? audiences[audiences.length - 1] - audiences[0] : 0,
      impressions:   Math.round(imps.reduce((a, b) => a + b, 0)),
      engagements:   Math.round(engs.reduce((a, b) => a + b, 0)),
      er:            parseFloat((ers.reduce((a, b) => a + b, 0) / (ers.length || 1)).toFixed(1)),
    }
  }

  if (!Object.keys(channels).length) return null

  const totals = Object.values(channels).reduce((acc, c) => ({
    followers:     (acc.followers     || 0) + c.followers,
    followerDelta: (acc.followerDelta || 0) + c.followerDelta,
    impressions:   (acc.impressions   || 0) + c.impressions,
    engagements:   (acc.engagements   || 0) + c.engagements,
  }), {})
  totals.er = totals.impressions > 0
    ? parseFloat(((totals.engagements / totals.impressions) * 100).toFixed(1))
    : 0

  const dateRange = firstRow.length === 1
    ? firstRow[0].replace('CURRENT PERIOD ', '').replace(/[()]/g, '').trim()
    : `${dataRows[0]?.Date} - ${dataRows[dataRows.length - 1]?.Date}`

  return { channels, totals, dateRange, source: 'planable-csv' }
}

function parseLinkedInPostsCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return null

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const rows = lines.slice(1).map(l => {
    const vals = l.split(',').map(v => v.trim().replace(/"/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))
  }).filter(r => r['Impressions'] || r['Post content'])

  if (!rows.length) return null

  const posts = rows.map(r => ({
    page:        r['Author'] || r['Page'] || 'Unknown',
    topic:       (r['Post content'] || r['Title'] || '').substring(0, 80),
    impressions: parseInt(r['Impressions']) || 0,
    engagements: parseInt(r['Engagements'] || r['Reactions'] || 0)
      + parseInt(r['Comments'] || 0)
      + parseInt(r['Reposts'] || r['Shares'] || 0),
    publishDate: r['Published date'] || r['Date'] || '',
  })).sort((a, b) => b.impressions - a.impressions)

  const topByImpressions = posts[0] || null
  const topByEngagement  = [...posts].sort((a, b) => b.engagements - a.engagements)[0] || null

  return { posts, topByImpressions, topByEngagement, source: 'linkedin-posts-csv' }
}

// ── LinkedIn native XLS parser (daily aggregate page export) ──────────────────
// Parses the LinkedIn Analytics → Metrics export (XLS / XLSX binary).
// Uses SheetJS (xlsx) loaded on-demand so we don't bloat the main bundle.

async function loadXlsx() {
  if (window.__xlsxLoaded) return window.XLSX
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    s.onload = () => { window.__xlsxLoaded = true; resolve(window.XLSX) }
    s.onerror = reject
    document.head.appendChild(s)
  })
}

async function parseLinkedInXLS(buffer, pageName = 'Livly') {
  const XLSX = await loadXlsx()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })

  // Row 0 is a description line; Row 1 is headers; Rows 2+ are data
  if (raw.length < 3) return null
  const headers = raw[1].map(h => String(h || '').trim())
  const dataRows = raw.slice(2).filter(r => r[0]) // skip empty rows

  const dateIdx   = headers.findIndex(h => h.toLowerCase() === 'date')
  const impIdx    = headers.findIndex(h => h.toLowerCase().includes('impressions (total)'))
  const engIdx    = headers.findIndex(h => h.toLowerCase().includes('engagement rate (total)'))
  const reactIdx  = headers.findIndex(h => h.toLowerCase().includes('reactions (total)'))
  const commIdx   = headers.findIndex(h => h.toLowerCase().includes('comments (total)'))
  const repostIdx = headers.findIndex(h => h.toLowerCase().includes('reposts (total)'))
  const clickIdx  = headers.findIndex(h => h.toLowerCase().includes('clicks (total)'))

  if (dateIdx < 0 || impIdx < 0) return null

  const dailyRows = dataRows.map(r => ({
    date:        String(r[dateIdx] || ''),
    impressions: parseFloat(r[impIdx])    || 0,
    engRate:     parseFloat(r[engIdx])    || 0,
    reactions:   parseFloat(r[reactIdx])  || 0,
    comments:    parseFloat(r[commIdx])   || 0,
    reposts:     parseFloat(r[repostIdx]) || 0,
    clicks:      parseFloat(r[clickIdx])  || 0,
  }))

  const totalImpressions = dailyRows.reduce((a, r) => a + r.impressions, 0)
  const totalEngagements = dailyRows.reduce((a, r) => a + r.reactions + r.comments + r.reposts, 0)
  const avgEngRate = totalImpressions > 0
    ? parseFloat(((totalEngagements / totalImpressions) * 100).toFixed(1))
    : 0

  const dateRange = dailyRows.length >= 2
    ? `${dailyRows[0].date} – ${dailyRows[dailyRows.length - 1].date}`
    : dailyRows[0]?.date || ''

  return {
    page: pageName,
    dailyRows,
    totals: {
      impressions:   Math.round(totalImpressions),
      engagements:   Math.round(totalEngagements),
      er:            avgEngRate,
      followerDelta: 0, // XLS doesn't include follower data
      followers:     0,
    },
    dateRange,
    source: 'linkedin-xls',
  }
}

// ── Small components ──────────────────────────────────────────────────────────

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: B.textSec, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  )
}

function Delta({ val, unit = '' }) {
  if (!val && val !== 0) return null
  const up = val > 0
  return <span style={{ fontSize: 11, color: up ? B.green : '#e05a4a', marginLeft: 5 }}>{up ? '↑' : '↓'}{Math.abs(val)}{unit}</span>
}

function StatCard({ label, value, delta, unit, color, target }) {
  const onTrack = target !== undefined && value >= target
  return (
    <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '14px 16px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{ fontFamily: 'Georgia,serif', fontSize: 26, color: target !== undefined ? (onTrack ? B.green : B.text) : (color || B.text) }}>
          {typeof value === 'number' ? value.toLocaleString() : value ?? '—'}
        </span>
        {unit && <span style={{ fontSize: 12, color: B.textTert, marginLeft: 2 }}>{unit}</span>}
        {delta !== undefined && delta !== null && <Delta val={delta} />}
      </div>
      {target !== undefined && (
        <div style={{ marginTop: 6 }}>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1 }}>
            <div style={{ height: '100%', width: `${Math.min(100, value / target * 100)}%`, background: onTrack ? B.green : color || B.coral, borderRadius: 1, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 9, color: B.textTert, marginTop: 3 }}>Target: {target.toLocaleString()}</div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

const EMPTY_DATA = { weeks: [] }

export default function LinkedInPerformance() {
  const [liData, setLiData] = useStore('livly-li-data', EMPTY_DATA)
  const [activeTab, setActiveTab] = useState('overview')
  const [addMode, setAddMode] = useState('planable')
  const [form, setForm] = useState({ weekLabel: '', dateRange: '' })
  const [manualChannels, setManualChannels] = useState({
    'Livly':         { followers: '', followerDelta: '', impressions: '', engagements: '', er: '' },
    'David Shaw':    { followers: '', followerDelta: '', impressions: '', engagements: '', er: '' },
    'Will Coffin':   { followers: '', followerDelta: '', impressions: '', engagements: '', er: '' },
    'Sarah Bonder':  { followers: '', followerDelta: '', impressions: '', engagements: '', er: '' },
  })
  const [parseError, setParseError] = useState('')
  const [parsedChannel, setParsedChannel] = useState(null)
  const [parsedPosts, setParsedPosts] = useState(null)
  const [parsedXls, setParsedXls] = useState(null)
  const [xlsLoading, setXlsLoading] = useState(false)
  const planableRef = useRef()
  const postsRef    = useRef()
  const xlsRef      = useRef()

  const weeks  = liData?.weeks || []
  const latest = weeks[weeks.length - 1]

  const handlePlanableUpload = e => {
    const file = e.target.files[0]; if (!file) return
    setParseError('')
    const reader = new FileReader()
    reader.onload = ev => {
      const result = parsePlanableCSV(ev.target.result)
      if (!result) {
        setParseError('Could not parse Planable CSV. Verify it is the Cross-Channel Performance export.')
        return
      }
      setParsedChannel(result)
      if (!form.weekLabel && result.dateRange) setForm(f => ({ ...f, weekLabel: result.dateRange, dateRange: result.dateRange }))
    }
    reader.readAsText(file)
  }

  const handlePostsUpload = e => {
    const file = e.target.files[0]; if (!file) return
    setParseError('')
    const reader = new FileReader()
    reader.onload = ev => {
      const result = parseLinkedInPostsCSV(ev.target.result)
      if (!result) {
        setParseError('Could not parse LinkedIn Posts CSV. Use Analytics → Content → Export.')
        return
      }
      setParsedPosts(result)
    }
    reader.readAsText(file)
  }

  const handleXlsUpload = async e => {
    const file = e.target.files[0]; if (!file) return
    setParseError('')
    setXlsLoading(true)
    try {
      const buf = await file.arrayBuffer()
      const result = await parseLinkedInXLS(buf, 'Livly')
      if (!result) {
        setParseError('Could not parse LinkedIn XLS. Use Analytics → Metrics → Export.')
        return
      }
      setParsedXls(result)
      if (!form.weekLabel && result.dateRange) setForm(f => ({ ...f, weekLabel: result.dateRange, dateRange: result.dateRange }))
    } catch (err) {
      setParseError(`XLS parse error: ${err.message}`)
    } finally {
      setXlsLoading(false)
    }
  }

  const saveWeek = () => {
    if (!form.weekLabel) return

    const existingIdx = weeks.findIndex(w => w.weekLabel === form.weekLabel)
    const weekEntry = existingIdx >= 0 ? { ...weeks[existingIdx] } : {
      id: `week-${Date.now()}`,
      weekLabel: form.weekLabel,
      dateRange: form.dateRange || form.weekLabel,
      channels: {},
      totals: {},
      posts: [],
      topByImpressions: null,
      topByEngagement:  null,
      xlsDaily: null,
    }

    if (addMode === 'planable' && parsedChannel) {
      weekEntry.channels  = parsedChannel.channels
      weekEntry.totals    = parsedChannel.totals
      weekEntry.dateRange = parsedChannel.dateRange || form.weekLabel
    } else if (addMode === 'posts' && parsedPosts) {
      weekEntry.posts            = parsedPosts.posts
      weekEntry.topByImpressions = parsedPosts.topByImpressions
      weekEntry.topByEngagement  = parsedPosts.topByEngagement
    } else if (addMode === 'xls' && parsedXls) {
      // XLS provides per-page totals; merge into channels for the Livly page
      weekEntry.xlsDaily  = parsedXls.dailyRows
      weekEntry.dateRange = parsedXls.dateRange || form.weekLabel
      // Merge Livly-page numbers from XLS into channels
      weekEntry.channels = {
        ...weekEntry.channels,
        [parsedXls.page]: {
          ...(weekEntry.channels?.[parsedXls.page] || {}),
          impressions: parsedXls.totals.impressions,
          engagements: parsedXls.totals.engagements,
          er:          parsedXls.totals.er,
        },
      }
      // Recompute totals
      const allC = Object.values(weekEntry.channels)
      weekEntry.totals = {
        followers:     allC.reduce((a, c) => a + (c.followers     || 0), 0),
        followerDelta: allC.reduce((a, c) => a + (c.followerDelta || 0), 0),
        impressions:   allC.reduce((a, c) => a + (c.impressions   || 0), 0),
        engagements:   allC.reduce((a, c) => a + (c.engagements   || 0), 0),
      }
      weekEntry.totals.er = weekEntry.totals.impressions > 0
        ? parseFloat(((weekEntry.totals.engagements / weekEntry.totals.impressions) * 100).toFixed(1))
        : 0
    } else if (addMode === 'manual') {
      const channels = {}
      let totals = { followers: 0, followerDelta: 0, impressions: 0, engagements: 0, er: 0 }
      PAGES.forEach(page => {
        const mc = manualChannels[page]
        const c = {
          followers:     parseInt(mc.followers)     || 0,
          followerDelta: parseInt(mc.followerDelta) || 0,
          impressions:   parseInt(mc.impressions)   || 0,
          engagements:   parseInt(mc.engagements)   || 0,
          er:            parseFloat(mc.er)          || 0,
        }
        channels[page] = c
        totals.followers     += c.followers
        totals.followerDelta += c.followerDelta
        totals.impressions   += c.impressions
        totals.engagements   += c.engagements
      })
      totals.er = totals.impressions > 0
        ? parseFloat(((totals.engagements / totals.impressions) * 100).toFixed(1))
        : 0
      weekEntry.channels = channels
      weekEntry.totals   = totals
    }

    const newWeeks = existingIdx >= 0
      ? weeks.map((w, i) => i === existingIdx ? weekEntry : w)
      : [...weeks, weekEntry].sort((a, b) => a.weekLabel.localeCompare(b.weekLabel))

    setLiData({ weeks: newWeeks })

    // Reset form
    setForm({ weekLabel: '', dateRange: '' })
    setParsedChannel(null); setParsedPosts(null); setParsedXls(null); setParseError('')
    if (planableRef.current) planableRef.current.value = ''
    if (postsRef.current)    postsRef.current.value    = ''
    if (xlsRef.current)      xlsRef.current.value      = ''
  }

  const deleteWeek = id => setLiData({ weeks: weeks.filter(w => w.id !== id) })

  // Chart data
  const followerChartData = weeks.map(w => {
    const row = { week: w.weekLabel }
    PAGES.forEach(p => { row[p] = w.channels?.[p]?.followers || 0 })
    return row
  })

  const impressionChartData = weeks.map(w => ({
    week:        w.weekLabel,
    impressions: w.totals?.impressions || 0,
  }))

  const followerDeltaData = weeks.map(w => ({
    week:   w.weekLabel,
    delta:  w.totals?.followerDelta || 0,
  }))

  // XLS daily chart for latest week
  const xlsDailyData = latest?.xlsDaily?.map(r => ({
    date:        r.date,
    impressions: r.impressions,
  })) || []

  const allPosts = weeks
    .flatMap(w => (w.posts || []).map(p => ({ ...p, week: w.weekLabel })))
    .sort((a, b) => b.impressions - a.impressions)

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'posts',    label: `Posts${allPosts.length ? ` (${allPosts.length})` : ''}` },
    { id: 'metrics',  label: 'Post Metrics' },
    { id: 'upload',   label: 'Upload / Add' },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.green, marginBottom: 4 }}>
            Rock 3 · {PAGES.length} channels
          </div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>
            LinkedIn Performance
          </h1>
          <div style={{ fontSize: 13, color: B.textSec }}>
            {weeks.length} weeks tracked
            {latest?.totals?.followers > 0 && (
              <> · <span style={{ color: B.text }}>{latest.totals.followers.toLocaleString()}</span> total followers</>
            )}
          </div>
        </div>
        <button
          onClick={() => setActiveTab('upload')}
          style={{ background: activeTab === 'upload' ? 'rgba(255,255,255,0.07)' : B.green, color: activeTab === 'upload' ? B.textSec : '#111', border: 'none', borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          + Add week
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${B.border}`, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t.id ? B.green : 'transparent'}`, padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: activeTab === t.id ? B.green : B.textSec, fontWeight: activeTab === t.id ? 500 : 400, fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div>
          {latest?.totals ? (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <StatCard label="Total followers"     value={latest.totals.followers}     delta={latest.totals.followerDelta} color={B.green} />
              <StatCard label="Weekly impressions"  value={latest.totals.impressions}   color={B.green} target={5600} />
              <StatCard label="Engagements"         value={latest.totals.engagements}   color={B.green} />
              <StatCard label="Avg engagement rate" value={latest.totals.er}            unit="%" color={B.green} />
            </div>
          ) : (
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: 32, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: B.textTert }}>Upload a Planable CSV or LinkedIn XLS to see channel metrics</div>
            </div>
          )}

          {/* Per-page breakdown */}
          {latest?.channels && Object.keys(latest.channels).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
              {Object.entries(latest.channels).map(([page, c]) => {
                const color = PAGE_COLORS[page] || B.textSec
                return (
                  <div key={page} style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color }}>{page}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        ['Followers',   c.followers?.toLocaleString(),  c.followerDelta],
                        ['Impressions', c.impressions?.toLocaleString(), null],
                        ['Engagements', c.engagements?.toLocaleString(), null],
                        ['Eng. rate',   `${c.er}%`,                    null],
                      ].map(([label, val, delta]) => (
                        <div key={label}>
                          <div style={{ fontSize: 9, color: B.textTert, marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: B.text }}>
                            {val}
                            {delta !== null && delta !== undefined && <Delta val={delta} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* XLS Daily impressions chart */}
          {xlsDailyData.length > 1 && (
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 14 }}>
                Livly page — daily impressions ({latest.dateRange})
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={xlsDailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CT />} />
                  <Area type="monotone" dataKey="impressions" name="Impressions" stroke={B.coral} fill={`${B.coral}18`} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trend charts */}
          {weeks.length >= 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 14 }}>
                  Weekly impressions
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={impressionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CT />} />
                    <ReferenceLine y={5600} stroke={B.green} strokeDasharray="4 4" strokeOpacity={0.5} />
                    <Bar dataKey="impressions" name="Impressions" fill={B.coral} fillOpacity={0.8} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 14 }}>
                  Weekly follower delta vs 17/wk target
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={followerDeltaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CT />} />
                    <ReferenceLine y={17} stroke={B.green} strokeDasharray="4 4" strokeOpacity={0.6} />
                    <Bar dataKey="delta" name="New followers" fill={B.green} fillOpacity={0.8} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── POSTS TAB ── */}
      {activeTab === 'posts' && (
        <div>
          {allPosts.length === 0 ? (
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: B.textTert, marginBottom: 8 }}>No post data yet</div>
              <div style={{ fontSize: 12, color: B.textTert }}>
                Upload a LinkedIn Posts CSV via the Upload tab (Analytics → Content → Export).
              </div>
            </div>
          ) : (
            <>
              {latest?.topByImpressions && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert, marginBottom: 10 }}>
                    Top post — latest week
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[['Most viewed', latest.topByImpressions, 'impressions'], ['Most engaging', latest.topByEngagement, 'engagements']].map(([label, post, metric]) => post ? (
                      <div key={label} style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '14px 16px' }}>
                        <div style={{ fontSize: 9, color: B.textTert, marginBottom: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: PAGE_COLORS[post.page] || B.textSec }} />
                          <span style={{ fontSize: 10, color: PAGE_COLORS[post.page] || B.textSec }}>{post.page}</span>
                        </div>
                        <div style={{ fontSize: 13, color: B.text, lineHeight: 1.4, marginBottom: 8 }}>{post.topic}</div>
                        <div style={{ fontFamily: 'Georgia,serif', fontSize: 22, color: B.green }}>{post[metric]?.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: B.textTert }}>{metric}</div>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${B.border}` }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert }}>
                    Post history — {allPosts.length} posts
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1a1a1c' }}>
                      {['Page', 'Topic', 'Impressions', 'Engagements', 'Week'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allPosts.map((p, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${B.border}` }}>
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: PAGE_COLORS[p.page] || B.textSec, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: PAGE_COLORS[p.page] || B.textSec }}>{p.page}</span>
                          </div>
                        </td>
                        <td style={{ padding: '9px 14px', fontSize: 12, color: B.text, maxWidth: 280 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.topic}</div>
                        </td>
                        <td style={{ padding: '9px 14px', fontSize: 12, color: B.text, fontWeight: 500 }}>{p.impressions?.toLocaleString()}</td>
                        <td style={{ padding: '9px 14px', fontSize: 12, color: B.text }}>{p.engagements?.toLocaleString()}</td>
                        <td style={{ padding: '9px 14px', fontSize: 11, color: B.textTert, whiteSpace: 'nowrap' }}>{p.week}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── POST METRICS TAB ── */}
      {activeTab === 'metrics' && (
        <div>
          <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>About this tab</div>
            <div style={{ fontSize: 12, color: B.textTert, lineHeight: 1.6 }}>
              Post Metrics visualizes per-post engagement from the LinkedIn Posts CSV export.
              Navigate to <strong style={{ color: B.textSec }}>LinkedIn → Analytics → Content → Export</strong> to get this file.
              The XLS export (Analytics → Metrics) provides page-level daily aggregate data and feeds the Overview tab.
            </div>
          </div>

          {allPosts.length === 0 ? (
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: B.textTert }}>Upload a Posts CSV to see per-post metrics</div>
            </div>
          ) : (
            <div>
              {/* Impressions bar chart — top 10 posts */}
              <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.textTert, marginBottom: 14 }}>
                  Top 10 posts by impressions
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={allPosts.slice(0, 10).map(p => ({ topic: p.topic.slice(0, 28) + (p.topic.length > 28 ? '…' : ''), impressions: p.impressions, page: p.page }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="topic" type="category" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9 }} axisLine={false} tickLine={false} width={200} />
                    <Tooltip content={<CT />} />
                    <Bar dataKey="impressions" name="Impressions" fill={B.coral} fillOpacity={0.85} radius={[0,3,3,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Per-page post count */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 12 }}>
                {PAGES.map(page => {
                  const pagePosts = allPosts.filter(p => p.page === page)
                  if (!pagePosts.length) return null
                  const avgImp = Math.round(pagePosts.reduce((a, p) => a + p.impressions, 0) / pagePosts.length)
                  const color = PAGE_COLORS[page] || B.textSec
                  return (
                    <div key={page} style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color }}>{page}</span>
                      </div>
                      <div style={{ fontSize: 22, fontFamily: 'Georgia,serif', color: B.text, marginBottom: 2 }}>{pagePosts.length}</div>
                      <div style={{ fontSize: 10, color: B.textTert, marginBottom: 8 }}>posts tracked</div>
                      <div style={{ fontSize: 11, color: B.textSec }}>Avg {avgImp.toLocaleString()} impressions</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── UPLOAD TAB ── */}
      {activeTab === 'upload' && (
        <div style={{ maxWidth: 720 }}>
          {/* Mode selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              ['planable', 'Planable CSV',          'Cross-channel aggregates (all pages)'],
              ['xls',      'LinkedIn Analytics XLS', 'Daily page metrics from LinkedIn native export'],
              ['posts',    'LinkedIn Posts CSV',      'Per-post impressions & engagements'],
              ['manual',   'Manual entry',            'Type values directly'],
            ].map(([id, label, desc]) => (
              <button key={id} onClick={() => setAddMode(id)}
                style={{ flex: '1 1 160px', background: addMode === id ? 'rgba(90,191,130,0.14)' : B.surface, border: `1px solid ${addMode === id ? B.green : B.border}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: addMode === id ? B.green : B.text, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 10, color: B.textTert }}>{desc}</div>
              </button>
            ))}
          </div>

          <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: B.textTert, marginBottom: 4 }}>Week label *</div>
              <input
                type="text" value={form.weekLabel}
                onChange={e => setForm(f => ({ ...f, weekLabel: e.target.value }))}
                placeholder="e.g. May 19–25, 2026"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${B.border}`, borderRadius: 6, color: B.text, fontSize: 13, padding: '7px 10px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            {addMode === 'planable' && (
              <div>
                <div style={{ fontSize: 10, color: B.textTert, marginBottom: 4 }}>
                  Planable → Analytics → Cross-Channel Performance → Export CSV
                </div>
                <input
                  ref={planableRef} type="file" accept=".csv"
                  onChange={handlePlanableUpload}
                  style={{ fontSize: 12, color: B.textSec, background: 'rgba(255,255,255,0.04)', border: `1px solid ${B.border}`, borderRadius: 6, padding: '7px 10px', width: '100%', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                {parsedChannel && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(90,191,130,0.08)', border: `1px solid rgba(90,191,130,0.2)`, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: B.green, fontWeight: 500, marginBottom: 6 }}>
                      ✓ Parsed CURRENT PERIOD — {Object.keys(parsedChannel.channels).join(', ')}
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {Object.entries(parsedChannel.channels).map(([page, c]) => (
                        <div key={page} style={{ fontSize: 10, color: B.textSec }}>
                          <div style={{ color: PAGE_COLORS[page] || B.textSec, fontWeight: 500, marginBottom: 2 }}>{page}</div>
                          <div>{c.followers?.toLocaleString()} followers (+{c.followerDelta})</div>
                          <div>{c.impressions?.toLocaleString()} impressions</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {addMode === 'xls' && (
              <div>
                <div style={{ fontSize: 10, color: B.textTert, marginBottom: 4 }}>
                  LinkedIn → Analytics → Metrics → Export (.xls) — one file per page
                </div>
                <input
                  ref={xlsRef} type="file" accept=".xls,.xlsx"
                  onChange={handleXlsUpload}
                  style={{ fontSize: 12, color: B.textSec, background: 'rgba(255,255,255,0.04)', border: `1px solid ${B.border}`, borderRadius: 6, padding: '7px 10px', width: '100%', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                {xlsLoading && <div style={{ fontSize: 11, color: B.amber, marginTop: 8 }}>Loading XLS library…</div>}
                {parsedXls && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(90,191,130,0.08)', border: `1px solid rgba(90,191,130,0.2)`, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: B.green, fontWeight: 500, marginBottom: 4 }}>
                      ✓ {parsedXls.page} — {parsedXls.dateRange}
                    </div>
                    <div style={{ fontSize: 10, color: B.textSec }}>
                      {parsedXls.totals.impressions.toLocaleString()} impressions · {parsedXls.totals.engagements.toLocaleString()} engagements · {parsedXls.totals.er}% ER
                    </div>
                  </div>
                )}
              </div>
            )}

            {addMode === 'posts' && (
              <div>
                <div style={{ fontSize: 10, color: B.textTert, marginBottom: 4 }}>
                  LinkedIn → Analytics → Content → Export CSV (per-post data)
                </div>
                <input
                  ref={postsRef} type="file" accept=".csv"
                  onChange={handlePostsUpload}
                  style={{ fontSize: 12, color: B.textSec, background: 'rgba(255,255,255,0.04)', border: `1px solid ${B.border}`, borderRadius: 6, padding: '7px 10px', width: '100%', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                {parsedPosts && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(90,191,130,0.08)', border: `1px solid rgba(90,191,130,0.2)`, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: B.green, fontWeight: 500 }}>✓ {parsedPosts.posts.length} posts parsed</div>
                    {parsedPosts.topByImpressions && (
                      <div style={{ fontSize: 10, color: B.textSec, marginTop: 4 }}>
                        Top: "{parsedPosts.topByImpressions.topic}" — {parsedPosts.topByImpressions.impressions.toLocaleString()} impressions
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {addMode === 'manual' && (
              <div>
                <div style={{ fontSize: 10, color: B.textTert, marginBottom: 10 }}>Enter metrics per page</div>
                {PAGES.map(page => (
                  <div key={page} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: PAGE_COLORS[page] || B.textSec, marginBottom: 6 }}>{page}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                      {[['followers', 'Followers'], ['followerDelta', '+/- Delta'], ['impressions', 'Impressions'], ['engagements', 'Engagements'], ['er', 'ER %']].map(([key, label]) => (
                        <div key={key}>
                          <div style={{ fontSize: 9, color: B.textTert, marginBottom: 3 }}>{label}</div>
                          <input
                            type="number"
                            value={manualChannels[page]?.[key] || ''}
                            onChange={e => setManualChannels(prev => ({ ...prev, [page]: { ...prev[page], [key]: e.target.value } }))}
                            placeholder="0"
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${B.border}`, borderRadius: 5, color: B.text, fontSize: 12, padding: '5px 8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {parseError && (
              <div style={{ fontSize: 11, color: '#e05a4a', marginTop: 8 }}>{parseError}</div>
            )}

            <button
              onClick={saveWeek}
              style={{ marginTop: 16, background: B.green, color: '#111', border: 'none', borderRadius: 7, padding: '9px 24px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Save week
            </button>
          </div>

          {/* Week history */}
          {weeks.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert, marginBottom: 10 }}>
                Saved weeks ({weeks.length})
              </div>
              {[...weeks].reverse().map(w => (
                <div key={w.id} style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 7, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, color: B.text }}>{w.weekLabel}</div>
                    <div style={{ fontSize: 10, color: B.textTert }}>
                      {w.totals?.impressions > 0 ? `${w.totals.impressions.toLocaleString()} impressions` : 'Channel data'}
                      {w.posts?.length > 0 ? ` · ${w.posts.length} posts` : ''}
                      {w.xlsDaily?.length > 0 ? ' · daily data' : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteWeek(w.id)}
                    style={{ background: 'none', border: 'none', color: B.textTert, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
