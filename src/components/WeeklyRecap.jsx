import { useState, useEffect, useRef } from 'react'
import { B } from '../brand.js'
import { ITEMS, ROCKS } from '../data/trackerItems.js'
import { CONTENT_CALENDAR } from '../data/contentCalendar.js'

// ── Week utilities ────────────────────────────────────────────────────────────

function getWeekBounds(offsetWeeks = -1) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sun
  const thisMon = new Date(now)
  thisMon.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  thisMon.setHours(0, 0, 0, 0)

  const targetMon = new Date(thisMon)
  targetMon.setDate(thisMon.getDate() + offsetWeeks * 7)
  const targetSun = new Date(targetMon)
  targetSun.setDate(targetMon.getDate() + 6)
  targetSun.setHours(23, 59, 59, 999)

  return { start: targetMon, end: targetSun }
}

function formatWeekLabel(bounds) {
  const fmt = (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return `${fmt(bounds.start)} – ${fmt(bounds.end)}, ${bounds.end.getFullYear()}`
}

function inWindow(isoString, bounds) {
  if (!isoString) return false
  const d = new Date(isoString)
  return d >= bounds.start && d <= bounds.end
}

// ── Data collectors ───────────────────────────────────────────────────────────

function collectTrackerDone(bounds) {
  try {
    const statuses    = JSON.parse(localStorage.getItem('livly-tracker-states') || '{}')
    const completions = JSON.parse(localStorage.getItem('livly-tracker-completions') || '{}')
    return ITEMS.filter(item => {
      const st = statuses[item.id]
      const ts = completions[item.id]
      return st === 'done' && inWindow(ts, bounds)
    }).map(item => {
      const rock = ROCKS.find(r => r.id === item.rock)
      return { id: item.id, text: item.text, rock: rock?.fullName || item.rock, completedAt: completions[item.id] }
    })
  } catch { return [] }
}

function collectActionDone(bounds) {
  try {
    const tasks       = JSON.parse(localStorage.getItem('livly-notion-tasks') || '[]')
    const completions = JSON.parse(localStorage.getItem('livly-action-completions') || '{}')
    return tasks.filter(t => t.status === 'Done' && inWindow(completions[t.id], bounds))
      .map(t => ({ id: t.id, text: t.task, priority: t.priority, completedAt: completions[t.id] }))
  } catch { return [] }
}

function collectMeetingActionsDone(bounds) {
  try {
    const actions     = JSON.parse(localStorage.getItem('livly-fyxer-actions') || '[]')
    const completions = JSON.parse(localStorage.getItem('livly-fyxer-action-completions') || '{}')
    return actions.filter(a => a.status === 'Done' && inWindow(completions[a.id], bounds))
      .map(a => ({ id: a.id, text: a.action, meeting: a.meetingTitle, owner: a.owner, completedAt: completions[a.id] }))
  } catch { return [] }
}

function collectConferenceArchived(bounds) {
  try {
    // Conference archived = contacts moved to archived statuses
    // We store them in Notion so we read from the cached active list
    // Any contact with status Demo Completed or Opportunity Created is counted
    const conf = JSON.parse(localStorage.getItem('livly-notion-conference') || '[]')
    return conf.filter(c => ['Demo Completed', 'Opportunity Created'].includes(c.contactStatus))
      .map(c => ({ id: c.id, name: c.fullName, company: c.companyName, status: c.contactStatus }))
  } catch { return [] }
}

function collectPublishedPosts(bounds) {
  try {
    const statuses = JSON.parse(localStorage.getItem('livly-post-statuses') || '{}')
    const published = []
    CONTENT_CALENDAR.forEach((week, weekIdx) => {
      const weekStart = new Date(week.start)
      const weekEnd   = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
      // Check if this calendar week overlaps our recap window
      if (weekEnd < bounds.start || weekStart > bounds.end) return
      Object.entries(week.posts).forEach(([contributor, angle]) => {
        if (!angle) return
        const key = `${weekIdx}-${contributor}`
        if (statuses[key] === 'published') {
          published.push({ contributor, angle, theme: week.theme, week: week.week })
        }
      })
    })
    return published
  } catch { return [] }
}

function collectLinkedIn() {
  try {
    const data  = JSON.parse(localStorage.getItem('livly-li-data') || '{"weeks":[]}')
    const weeks = data.weeks || []
    if (!weeks.length) return null
    const latest = weeks[weeks.length - 1]
    return {
      weekLabel:        latest.weekLabel,
      totalFollowers:   latest.totals?.followers,
      followerDelta:    latest.totals?.followerDelta,
      impressions:      latest.totals?.impressions,
      engagements:      latest.totals?.engagements,
      er:               latest.totals?.er,
      topByImpressions: latest.topByImpressions,
      topByEngagement:  latest.topByEngagement,
    }
  } catch { return null }
}

function collectApollo() {
  try {
    const weeks = JSON.parse(localStorage.getItem('livly-apollo-weeks') || '[]')
    if (!weeks.length) return null
    const latest = weeks[weeks.length - 1]
    return { weekLabel: latest.week, sent: latest.sent, replyRate: latest.replyRate, demos: latest.demos, phase: latest.phase }
  } catch { return null }
}

function collectMeetings(bounds) {
  try {
    const meetings = JSON.parse(localStorage.getItem('livly-fyxer-meetings') || '[]')
    return meetings.filter(m => inWindow(m.receivedAt || m.date, bounds))
      .map(m => ({ title: m.title, date: m.date, attendees: m.attendees, summary: m.summary }))
  } catch { return [] }
}

function collectUpcoming() {
  try {
    // Action Center tasks due next week
    const tasks = JSON.parse(localStorage.getItem('livly-notion-tasks') || '[]')
    const nextBounds = getWeekBounds(0) // current week = next 7 days from today
    const dueSoon = tasks
      .filter(t => t.status !== 'Done' && t.dueDate && inWindow(t.dueDate, nextBounds))
      .map(t => ({ text: t.task, dueDate: t.dueDate, type: 'action' }))

    // In-progress tracker items
    const statuses = JSON.parse(localStorage.getItem('livly-tracker-states') || '{}')
    const inProgress = ITEMS
      .filter(i => statuses[i.id] === 'doing')
      .slice(0, Math.max(0, 5 - dueSoon.length))
      .map(i => ({ text: i.text, type: 'tracker', rock: ROCKS.find(r => r.id === i.rock)?.label }))

    return [...dueSoon, ...inProgress].slice(0, 5)
  } catch { return [] }
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(data) {
  const { bounds, trackerDone, actionDone, meetingActionsDone, conference,
          posts, linkedin, apollo, meetings, upcoming } = data

  const totalDone = trackerDone.length + actionDone.length + meetingActionsDone.length

  const liTargets = { impressions: 5600, followerDelta: 17 }
  const liFlags = linkedin ? [
    linkedin.impressions < liTargets.impressions ? `impressions (${linkedin.impressions?.toLocaleString()}) below weekly target of ${liTargets.impressions.toLocaleString()}` : null,
    linkedin.followerDelta < liTargets.followerDelta ? `follower growth (${linkedin.followerDelta}) below 17/week target` : null,
  ].filter(Boolean) : []

  const payload = {
    weekOf:         formatWeekLabel(bounds),
    totalCompleted: totalDone,
    trackerItems:   trackerDone.map(t => ({ task: t.text, rock: t.rock })),
    actionItems:    actionDone.map(t => ({ task: t.text, priority: t.priority })),
    meetingActions: meetingActionsDone.map(a => ({ action: a.text, owner: a.owner, meeting: a.meeting })),
    conferenceConverted: conference.map(c => ({ name: c.name, company: c.company, status: c.status })),
    publishedPosts: posts.map(p => ({ contributor: p.contributor, theme: p.theme, angle: p.angle })),
    meetings:       meetings.map(m => ({ title: m.title, date: m.date, summary: m.summary?.substring(0, 300) })),
    linkedIn:       linkedin ? {
      weekLabel:      linkedin.weekLabel,
      followers:      linkedin.totalFollowers,
      newFollowers:   linkedin.followerDelta,
      impressions:    linkedin.impressions,
      engagements:    linkedin.engagements,
      engagementRate: linkedin.er,
      topPost:        linkedin.topByImpressions ? { topic: linkedin.topByImpressions.topic, impressions: linkedin.topByImpressions.impressions, page: linkedin.topByImpressions.page } : null,
      performanceFlags: liFlags,
    } : null,
    apollo: apollo?.phase === 'live' ? { sent: apollo.sent, replyRate: apollo.replyRate, demos: apollo.demos } : null,
    upcomingNextWeek: upcoming.map(u => ({ task: u.text, type: u.type, dueDate: u.dueDate, rock: u.rock })),
  }

  return `You are writing a weekly executive summary for Dave Shaw, President & COO at Livly, addressed to the CEO. 

Livly is a mid-market multifamily PropTech SaaS company. Dave is responsible for marketing, GTM, and sales operations. This is an internal update — confident, outcome-focused, no corporate fluff, no exclamation marks.

Format the output exactly as follows:

WEEK OF [week label]

STATS
  Tasks completed      [total across all sources] ([breakdown by source if informative])
  Meetings held        [count]
  Content published    [count] post[s]
  LinkedIn reach       [impressions] impressions · [new followers] new followers
  Top post             "[topic]" — [page] — [impressions] impressions
  Demos booked         [count]

---

[Four paragraphs — no headers, no bullet lists within paragraphs:]

Paragraph 1: What got done this week. Synthesize the tasks into meaningful themes — do not list every item. Group by rock or type where it makes sense. Be specific and outcome-oriented.

Paragraph 2: GTM and content performance. Cover LinkedIn stats, top post, content published, and meetings held. If any metric is below target, flag it honestly and directly inline — do not soften or omit.

Paragraph 3: Pipeline and outreach. Cover conference contacts converted, Apollo demos booked if applicable. If nothing notable, say so briefly and move on.

Paragraph 4: Coming next week. Based on the upcoming items, write a forward-looking paragraph about where focus will be. Be specific about priorities.

---

Performance targets for smart context:
- LinkedIn impressions: 5,600/week total across pages (800/post × ~7 posts)
- Follower delta: 17/week
- Demos booked: 1 every 2 weeks

Write at the level of an executive memo. Confident voice. Four paragraphs max after the stats block. No more than 350 words total for the narrative.

Here is the data for this week:

${JSON.stringify(payload, null, 2)}`
}

// ── Copy helpers ──────────────────────────────────────────────────────────────

function toPlainText(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1')
}

function toMarkdown(text) {
  // Already in prose — just wrap stats block in code-ish format
  return text
}

// ── Archive entry ─────────────────────────────────────────────────────────────

function ArchiveRow({ entry, onExpand, expanded }) {
  return (
    <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 7, marginBottom: 6, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={onExpand}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: B.text }}>{entry.weekLabel}</div>
          <div style={{ fontSize: 11, color: B.textSec, marginTop: 2 }}>
            {entry.totalDone} tasks completed · {entry.posts} posts · {entry.demos ?? 0} demos
            {entry.oneLiner && <span style={{ color: B.textTert }}> · {entry.oneLiner}</span>}
          </div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ color: B.textTert, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {expanded && (
        <div style={{ borderTop: `1px solid ${B.border}`, padding: '12px 14px' }}>
          <pre style={{ fontFamily: 'inherit', fontSize: 12, color: B.textSec, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{entry.fullText}</pre>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const WEEK_OPTIONS = [
  { label: 'Last week',           offset: -1 },
  { label: 'Two weeks ago',       offset: -2 },
  { label: 'Three weeks ago',     offset: -3 },
  { label: 'This week (so far)',  offset: 0  },
]

export default function WeeklyRecap() {
  const [weekOffset, setWeekOffset]  = useState(-1)
  const [generating, setGenerating]  = useState(false)
  const [recap, setRecap]            = useState(null)
  const [error, setError]            = useState(null)
  const [copied, setCopied]          = useState(null)
  const [activeView, setActiveView]  = useState('recap') // recap | archive
  const [archive, setArchive]        = useState([])
  const [expandedArchive, setExpandedArchive] = useState(null)
  const recapRef = useRef()

  // Load archive from session storage
  useEffect(() => {
    try {
      const a = sessionStorage.getItem('livly-recap-archive')
      if (a) setArchive(JSON.parse(a))
    } catch {}
  }, [])

  const bounds = getWeekBounds(weekOffset)
  const weekLabel = formatWeekLabel(bounds)

  const generate = async () => {
    setGenerating(true)
    setError(null)
    setRecap(null)

    const trackerDone       = collectTrackerDone(bounds)
    const actionDone        = collectActionDone(bounds)
    const meetingActionsDone= collectMeetingActionsDone(bounds)
    const conference        = collectConferenceArchived(bounds)
    const posts             = collectPublishedPosts(bounds)
    const linkedin          = collectLinkedIn()
    const apollo            = collectApollo()
    const meetings          = collectMeetings(bounds)
    const upcoming          = collectUpcoming()

    const prompt = buildPrompt({
      bounds, trackerDone, actionDone, meetingActionsDone,
      conference, posts, linkedin, apollo, meetings, upcoming,
    })

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error.message)
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      if (!text) throw new Error('No content returned')

      const result = {
        weekLabel,
        text,
        totalDone: trackerDone.length + actionDone.length + meetingActionsDone.length,
        posts:     posts.length,
        demos:     apollo?.demos ?? 0,
        oneLiner:  linkedin ? `${linkedin.impressions?.toLocaleString()} impressions` : null,
        fullText:  text,
        generatedAt: new Date().toISOString(),
      }

      setRecap(result)

      // Save to session archive
      const newArchive = [result, ...archive].slice(0, 20)
      setArchive(newArchive)
      sessionStorage.setItem('livly-recap-archive', JSON.stringify(newArchive))

    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const copy = (mode) => {
    if (!recap) return
    const text = mode === 'plain' ? toPlainText(recap.text) : toMarkdown(recap.text)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(mode)
      setTimeout(() => setCopied(null), 2500)
    })
  }

  return (
    <div style={{ padding: 24, maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>Executive Reporting</div>
        <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>Weekly Recap</h1>
        <div style={{ fontSize: 13, color: B.textSec }}>Compiled from Q2 Tracker, Action Center, Fyxer Intel, LinkedIn, and Content Calendar</div>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${B.border}`, marginBottom: 24 }}>
        {[['recap', 'Generate'], ['archive', `Archive (${archive.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveView(id)}
            style={{ background: 'none', border: 'none', borderBottom: `2px solid ${activeView === id ? B.green : 'transparent'}`, padding: '8px 18px', fontSize: 13, cursor: 'pointer', color: activeView === id ? B.green : B.textSec, fontWeight: activeView === id ? 500 : 400, fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── GENERATE VIEW ── */}
      {activeView === 'recap' && (
        <div>
          {/* Controls row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, color: B.textTert, marginBottom: 4 }}>Week</div>
              <select value={weekOffset}
                onChange={e => { setWeekOffset(Number(e.target.value)); setRecap(null); setError(null) }}
                style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 6, color: B.text, fontSize: 13, padding: '8px 12px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                {WEEK_OPTIONS.map(o => (
                  <option key={o.offset} value={o.offset}>{o.label} — {formatWeekLabel(getWeekBounds(o.offset))}</option>
                ))}
              </select>
            </div>
            <button onClick={generate} disabled={generating}
              style={{ background: generating ? 'rgba(255,255,255,0.05)' : B.green, color: generating ? B.textTert : '#111', border: 'none', borderRadius: 7, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: generating ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 18, transition: 'all 0.15s' }}>
              {generating ? 'Generating…' : '✦ Generate recap'}
            </button>
            {recap && (
              <div style={{ display: 'flex', gap: 7, marginTop: 18 }}>
                <button onClick={() => copy('plain')}
                  style={{ background: copied === 'plain' ? 'rgba(90,191,130,0.18)' : 'rgba(255,255,255,0.07)', color: copied === 'plain' ? B.green : B.textSec, border: `1px solid ${B.border}`, borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied === 'plain' ? '✓ Copied' : '⎘ Copy for email'}
                </button>
                <button onClick={() => copy('markdown')}
                  style={{ background: copied === 'markdown' ? 'rgba(90,191,130,0.18)' : 'rgba(255,255,255,0.07)', color: copied === 'markdown' ? B.green : B.textSec, border: `1px solid ${B.border}`, borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied === 'markdown' ? '✓ Copied' : '⎘ Copy as Markdown'}
                </button>
              </div>
            )}
          </div>

          {/* Data preview — what will be included */}
          {!recap && !generating && !error && (
            <DataPreview bounds={bounds} weekLabel={weekLabel} />
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(224,90,74,0.1)', border: '1px solid rgba(224,90,74,0.3)', borderRadius: 8, padding: '14px 16px', color: '#e05a4a', fontSize: 13 }}>
              Generation failed: {error}
            </div>
          )}

          {/* Generating spinner */}
          {generating && (
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: 48, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 15, color: B.textSec, marginBottom: 8 }}>Compiling {weekLabel}…</div>
              <div style={{ fontSize: 12, color: B.textTert }}>Collecting data from all dashboard sources and generating executive summary</div>
            </div>
          )}

          {/* Output */}
          {recap && !generating && (
            <div ref={recapRef} style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${B.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert }}>
                  {recap.weekLabel}
                </span>
                <span style={{ fontSize: 10, color: B.textTert }}>
                  Generated {new Date(recap.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ padding: '20px 22px' }}>
                <pre style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.88)', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {recap.text}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ARCHIVE VIEW ── */}
      {activeView === 'archive' && (
        <div>
          <div style={{ fontSize: 12, color: B.textTert, marginBottom: 16, fontStyle: 'italic' }}>
            Recaps saved this session only — cleared on page refresh. {archive.length === 0 && 'Generate a recap to start the archive.'}
          </div>
          {archive.map((entry, i) => (
            <ArchiveRow key={i} entry={entry} expanded={expandedArchive === i}
              onExpand={() => setExpandedArchive(expandedArchive === i ? null : i)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Data preview card ─────────────────────────────────────────────────────────

function DataPreview({ bounds, weekLabel }) {
  const trackerDone        = collectTrackerDone(bounds)
  const actionDone         = collectActionDone(bounds)
  const meetingActionsDone = collectMeetingActionsDone(bounds)
  const conference         = collectConferenceArchived(bounds)
  const posts              = collectPublishedPosts(bounds)
  const linkedin           = collectLinkedIn()
  const apollo             = collectApollo()
  const meetings           = collectMeetings(bounds)
  const upcoming           = collectUpcoming()

  const total = trackerDone.length + actionDone.length + meetingActionsDone.length

  const rows = [
    ['Q2 Tracker items done',    trackerDone.length,        trackerDone.length === 0],
    ['Action Center tasks done', actionDone.length,         false],
    ['Meeting action items done',meetingActionsDone.length, false],
    ['Conference contacts converted', conference.length,    false],
    ['Posts published',          posts.length,              posts.length === 0],
    ['Meetings this week',       meetings.length,           false],
    ['LinkedIn data',            linkedin ? `${linkedin.totalFollowers?.toLocaleString()} followers · ${linkedin.impressions?.toLocaleString()} impressions` : 'No data uploaded', !linkedin],
    ['Apollo',                   apollo ? `${apollo.sent} sent · ${apollo.replyRate}% reply · ${apollo.demos} demos` : 'No data', !apollo],
    ['Upcoming items (next week)', upcoming.length,         false],
  ]

  return (
    <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${B.border}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B.textTert }}>
          Data available for {weekLabel}
        </div>
        <div style={{ fontSize: 12, color: B.textSec, marginTop: 4 }}>
          {total} completed tasks found with timestamps in this window
          {total === 0 && <span style={{ color: B.amber }}> — tasks must be marked Done after this update is deployed to appear in recaps</span>}
        </div>
      </div>
      <div style={{ padding: '4px 0' }}>
        {rows.map(([label, value, warn]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 16px', borderBottom: `1px solid ${B.border}` }}>
            <span style={{ fontSize: 12, color: B.textSec }}>{label}</span>
            <span style={{ fontSize: 12, color: warn ? B.amber : B.green, fontWeight: 500 }}>
              {typeof value === 'number' ? (value === 0 ? '—' : value) : value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
