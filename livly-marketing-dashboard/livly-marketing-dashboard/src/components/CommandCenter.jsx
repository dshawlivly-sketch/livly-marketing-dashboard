import { useState, useEffect } from 'react'
import { B } from '../brand.js'
import { CONTENT_CALENDAR, SCORECARD } from '../data/contentCalendar.js'
import { ITEMS, ROCKS } from '../data/trackerItems.js'
import { useStore } from '../utils/useStore.js'

const ROCK_COLORS = { r1: B.amber, r2: B.coral, r3: B.green, r4: B.blue }
const PAGE_COLORS = { 'Livly': B.coral, 'David Shaw': B.blue, 'Will Coffin': B.amber }
const CC = { David: B.coral, Adam: B.amber, Sarah: B.green, Will: B.blue }

function getHoursToMeeting() {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date())
    const g = t => parseInt(parts.find(p => p.type === t)?.value || '0')
    const [y, mo, d, h, mi] = [g('year'), g('month') - 1, g('day'), g('hour'), g('minute')]
    const etNow = new Date(y, mo, d, h, mi)
    let dAdd = (1 - etNow.getDay() + 7) % 7
    if (dAdd === 0 && (h > 11 || (h === 11 && mi >= 30))) dAdd = 7
    return (new Date(y, mo, d + dAdd, 11, 30) - etNow) / 36e5
  } catch { return 999 }
}

function getCurrentWeek() {
  const today = new Date()
  return CONTENT_CALENDAR.find(w => {
    const start = new Date(w.start)
    const end = new Date(start); end.setDate(end.getDate() + 6)
    return today >= start && today <= end
  }) || CONTENT_CALENDAR.find(w => new Date(w.start) > today) || CONTENT_CALENDAR[0]
}

function getWeekNumber() {
  return Math.max(1, Math.min(13, Math.floor((new Date() - new Date('2026-04-01')) / (7*24*60*60*1000)) + 1))
}

function LinkedInWidget({ liData }) {
  const weeks = liData?.weeks || []
  const latest = weeks[weeks.length - 1]
  if (!latest?.totals) return (
    <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert, marginBottom: 6 }}>LinkedIn</div>
      <div style={{ fontSize: 12, color: B.textTert, fontStyle: 'italic' }}>No data — upload a Planable CSV in the LinkedIn tab</div>
    </div>
  )
  const t = latest.totals
  const top = latest.topByImpressions || latest.topByEngagement
  return (
    <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${B.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert }}>LinkedIn · {latest.weekLabel}</span>
        <span style={{ fontFamily: 'Georgia,serif', fontSize: 15, color: B.green }}>{t.followers?.toLocaleString()} <span style={{ fontSize: 10, color: t.followerDelta > 0 ? B.green : '#e05a4a' }}>+{t.followerDelta}</span></span>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          {['Livly', 'David Shaw', 'Will Coffin'].map(page => {
            const c = latest.channels?.[page]; if (!c) return null
            return (
              <div key={page} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: PAGE_COLORS[page] }} />
                <span style={{ fontSize: 10, color: B.textSec }}>{page.split(' ')[0]}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: B.text }}>{c.followers?.toLocaleString()}</span>
                {c.followerDelta !== 0 && <span style={{ fontSize: 9, color: c.followerDelta > 0 ? B.green : '#e05a4a' }}>{c.followerDelta > 0 ? '+' : ''}{c.followerDelta}</span>}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: top ? 10 : 0 }}>
          <div><div style={{ fontSize: 9, color: B.textTert }}>Impressions</div><div style={{ fontSize: 13, color: B.text }}>{t.impressions?.toLocaleString()}</div></div>
          <div><div style={{ fontSize: 9, color: B.textTert }}>Engagements</div><div style={{ fontSize: 13, color: B.text }}>{t.engagements?.toLocaleString()}</div></div>
          <div><div style={{ fontSize: 9, color: B.textTert }}>Avg ER</div><div style={{ fontSize: 13, color: B.text }}>{t.er}%</div></div>
        </div>
        {top && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 5, padding: '7px 10px' }}>
            <div style={{ fontSize: 9, color: B.textTert, marginBottom: 3 }}>Top post</div>
            <div style={{ fontSize: 11, color: B.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top.topic}</div>
            <div style={{ fontSize: 10, color: PAGE_COLORS[top.page] || B.textSec, marginTop: 1 }}>{top.page} · {top.impressions?.toLocaleString()} impressions</div>
          </div>
        )}
      </div>
    </div>
  )
}

function ContractsWidget() {
  const [contracts] = useStore('livly-fyxer-contracts', [])
  const pending = contracts.filter(c => c.status !== 'signed')
  if (!pending.length) return null
  return (
    <div style={{ background: B.surface, border: `1px solid rgba(240,123,107,0.3)`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${B.border}`, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.coral }}>✍ Awaiting signature</span>
        <span style={{ background: 'rgba(240,123,107,0.2)', color: B.coral, fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 10 }}>{pending.length}</span>
      </div>
      {pending.slice(0, 3).map(c => {
        const days = c.deadline ? Math.ceil((new Date(c.deadline) - new Date()) / 86400000) : null
        return (
          <div key={c.id} style={{ padding: '9px 14px', borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: B.text }}>{c.documentName}</div>
              {days !== null && <div style={{ fontSize: 10, color: days <= 0 ? '#e05a4a' : B.textTert }}>{days <= 0 ? `Overdue ${Math.abs(days)}d` : `Due in ${days}d`}</div>}
            </div>
            {c.executionLink && (
              <a href={c.executionLink} target="_blank" rel="noopener noreferrer"
                style={{ background: B.coral, color: '#111', fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 5, textDecoration: 'none' }}>Sign</a>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CommandCenter() {
  const [trackerStates] = useStore('livly-tracker-states', {})
  const [scorecardValues, setScorecardValues] = useStore('livly-scorecard-values', {})
  const [liData] = useStore('livly-li-data', { weeks: [] })
  const [editingKPI, setEditingKPI] = useState(null)

  const hoursToMeeting = getHoursToMeeting()
  const showBanner = hoursToMeeting > 0 && hoursToMeeting <= 24
  const thisWeek = getCurrentWeek()
  const weekNum = getWeekNumber()

  const save = (id, val) => { setScorecardValues(prev => ({ ...prev, [id]: parseFloat(val) || 0 })); setEditingKPI(null) }

  const totalDone    = ITEMS.filter(i => trackerStates[i.id] === 'done').length
  const totalDoing   = ITEMS.filter(i => trackerStates[i.id] === 'doing').length
  const totalBlocked = ITEMS.filter(i => trackerStates[i.id] === 'blocked').length
  const pct = Math.round(totalDone / ITEMS.length * 100)
  const inProgress   = ITEMS.filter(i => trackerStates[i.id] === 'doing').slice(0, 5)
  const blocked      = ITEMS.filter(i => trackerStates[i.id] === 'blocked').slice(0, 2)
  const contributors = Object.entries(thisWeek?.posts || {}).filter(([, v]) => v)

  return (
    <div style={{ padding: 24, maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>Q2 2026 · Week {weekNum} of 13</div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>Command Center</h1>
          <div style={{ fontSize: 13, color: B.textSec }}>{totalDone} of {ITEMS.length} items done — {pct}%</div>
        </div>
        {showBanner && (
          <div style={{ background: 'rgba(240,123,107,0.1)', border: '1px solid rgba(240,123,107,0.25)', borderRadius: 8, padding: '10px 16px', textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: B.coral }}>Marketing L10 in {Math.round(hoursToMeeting)}h</div>
            <div style={{ fontSize: 11, color: B.textSec }}>Monday 11:30 AM ET</div>
          </div>
        )}
      </div>

      {/* Rock progress bars */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {ROCKS.map(rock => {
          const all = ITEMS.filter(i => i.rock === rock.id)
          const done = all.filter(i => trackerStates[i.id] === 'done').length
          const p = Math.round(done / all.length * 100)
          return (
            <div key={rock.id} style={{ flex: 1, background: B.surface, border: '1px solid ' + B.border, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: ROCK_COLORS[rock.id], marginBottom: 5 }}>R{rock.n}{rock.bonus?' +':''}</div>
              <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 12, color: B.text, marginBottom: 7, lineHeight: 1.3, height: 30, overflow: 'hidden' }}>{rock.fullName}</div>
              <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: p + '%', background: ROCK_COLORS[rock.id], borderRadius: 1, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 9, color: B.textTert }}>{done}/{all.length} · {p}%</div>
            </div>
          )
        })}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: 16 }}>

        {/* Left: content theme + active work */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: B.surface, border: '1px solid ' + B.border, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + B.border, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert }}>This week</span>
              <span style={{ fontSize: 10, color: B.textTert }}>{thisWeek?.week}</span>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 15, color: B.text, marginBottom: 12 }}>{thisWeek?.theme}</div>
              {contributors.map(([name, angle]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: CC[name] || B.textSec, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: CC[name] || B.textSec, width: 50, flexShrink: 0 }}>{name}</span>
                  <span style={{ fontSize: 11, color: B.textSec }}>{angle}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: B.surface, border: '1px solid ' + B.border, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + B.border }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert }}>In progress · {totalDoing}</span>
            </div>
            {inProgress.length === 0
              ? <div style={{ padding: '14px', fontSize: 12, color: B.textTert }}>Nothing in progress</div>
              : inProgress.map(item => (
                <div key={item.id} style={{ padding: '9px 14px', borderBottom: '1px solid ' + B.border, display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 3, height: 28, background: ROCK_COLORS[item.rock], borderRadius: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, color: B.text, lineHeight: 1.35 }}>{item.text}</div>
                    <div style={{ fontSize: 9, color: B.textTert, marginTop: 1 }}>{ROCKS.find(r => r.id === item.rock)?.label}</div>
                  </div>
                </div>
              ))}
            {blocked.length > 0 && <>
              <div style={{ padding: '8px 14px', borderTop: '1px solid ' + B.border }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#e05a4a' }}>Blocked · {totalBlocked}</span>
              </div>
              {blocked.map(item => (
                <div key={item.id} style={{ padding: '9px 14px', borderBottom: '1px solid ' + B.border, display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 3, height: 28, background: '#e05a4a', borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: B.textSec, lineHeight: 1.35 }}>{item.text}</div>
                </div>
              ))}
            </>}
          </div>
        </div>

        {/* Center: LinkedIn widget + contracts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <LinkedInWidget liData={liData} />
          <ContractsWidget />
        </div>

        {/* Right: Scorecard */}
        <div style={{ background: B.surface, border: '1px solid ' + B.border, borderRadius: 8, overflow: 'hidden', alignSelf: 'start' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + B.border, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert }}>Scorecard</span>
            <span style={{ fontSize: 9, color: B.textTert }}>tap to edit</span>
          </div>
          <div style={{ padding: '8px 10px' }}>
            {SCORECARD.map(kpi => {
              const value = scorecardValues[kpi.id] ?? 0
              const onTrack = value >= kpi.target
              const isEdit = editingKPI === kpi.id
              return (
                <div key={kpi.id} style={{ display: 'flex', alignItems: 'center', padding: '7px 8px', borderRadius: 5, gap: 8, background: isEdit ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: onTrack ? B.green : 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 11, color: B.textSec }}>{kpi.label}</div>
                  <div style={{ fontSize: 9, color: B.textTert, width: 50, textAlign: 'right' }}>{kpi.target} {kpi.unit}</div>
                  {isEdit
                    ? <input autoFocus type="number" defaultValue={value}
                        onBlur={e => save(kpi.id, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') save(kpi.id, e.target.value); if (e.key === 'Escape') setEditingKPI(null) }}
                        style={{ width: 44, background: B.surface2, border: `1px solid ${ROCK_COLORS[kpi.rock]}`, borderRadius: 4, color: B.text, fontSize: 12, fontWeight: 600, padding: '2px 5px', textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
                    : <button onClick={() => setEditingKPI(kpi.id)}
                        style={{ width: 44, background: 'rgba(255,255,255,0.05)', border: '1px solid ' + B.border, borderRadius: 4, color: onTrack ? B.green : B.text, fontSize: 12, fontWeight: 600, padding: '2px 5px', textAlign: 'center', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {value}
                      </button>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
