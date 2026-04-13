import { useState } from 'react'
import { B } from '../brand.js'
import { CONTENT_CALENDAR, SCORECARD } from '../data/contentCalendar.js'
import { ITEMS, ROCKS } from '../data/trackerItems.js'
import { useStore } from '../utils/useStore.js'

const ROCK_COLORS = { r1: B.amber, r2: B.coral, r3: B.green, r4: B.blue }

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
  const today = new Date()
  const q2Start = new Date('2026-04-01')
  return Math.max(1, Math.min(13, Math.floor((today - q2Start) / (7 * 24 * 60 * 60 * 1000)) + 1))
}

const CC = { David: B.coral, Adam: B.amber, Sarah: B.green, Will: B.blue }

export default function CommandCenter() {
  const [trackerStates] = useStore('livly-tracker-states', {})
  const [scorecardValues, setScorecardValues] = useStore('livly-scorecard-values', {})
  const [editingKPI, setEditingKPI] = useState(null)

  const hoursToMeeting = getHoursToMeeting()
  const showBanner = hoursToMeeting > 0 && hoursToMeeting <= 24
  const thisWeek = getCurrentWeek()
  const weekNum = getWeekNumber()

  const saveScorecardValue = (id, val) => {
    setScorecardValues(prev => ({ ...prev, [id]: parseFloat(val) || 0 }))
    setEditingKPI(null)
  }

  const totalDone    = ITEMS.filter(i => trackerStates[i.id] === 'done').length
  const totalDoing   = ITEMS.filter(i => trackerStates[i.id] === 'doing').length
  const totalBlocked = ITEMS.filter(i => trackerStates[i.id] === 'blocked').length
  const pct = Math.round(totalDone / ITEMS.length * 100)
  const inProgress = ITEMS.filter(i => trackerStates[i.id] === 'doing').slice(0, 5)
  const blocked    = ITEMS.filter(i => trackerStates[i.id] === 'blocked').slice(0, 3)
  const contributors = Object.entries(thisWeek?.posts || {}).filter(([, v]) => v)

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>Q2 2026 · Week {weekNum} of 13</div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>Command Center</h1>
          <div style={{ fontSize: 13, color: B.textSec }}>{totalDone} of {ITEMS.length} items done — {pct}% complete</div>
        </div>
        {showBanner && (
          <div style={{ background: 'rgba(240,123,107,0.12)', border: '1px solid rgba(240,123,107,0.25)', borderRadius: 8, padding: '10px 16px', textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: B.coral }}>Marketing L10 in {Math.round(hoursToMeeting)}h</div>
            <div style={{ fontSize: 11, color: B.textSec, marginTop: 2 }}>Monday 11:30 AM ET</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {ROCKS.map(rock => {
          const all = ITEMS.filter(i => i.rock === rock.id)
          const done = all.filter(i => trackerStates[i.id] === 'done').length
          const p = Math.round(done / all.length * 100)
          return (
            <div key={rock.id} style={{ flex: 1, background: B.surface, border: '1px solid ' + B.border, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: ROCK_COLORS[rock.id], marginBottom: 6 }}>Rock {rock.n}{rock.bonus ? ' +' : ''}</div>
              <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 13, color: B.text, marginBottom: 8, lineHeight: 1.3 }}>{rock.fullName}</div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
                <div style={{ height: '100%', width: p + '%', background: ROCK_COLORS[rock.id], borderRadius: 2, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 10, color: B.textTert }}>{done}/{all.length} · {p}%</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: B.surface, border: '1px solid ' + B.border, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + B.border, display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert }}>This week</div>
              <div style={{ fontSize: 10, color: B.textTert }}>{thisWeek?.week}</div>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 16, color: B.text, marginBottom: 14 }}>{thisWeek?.theme}</div>
              {contributors.map(([name, angle]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: CC[name] || B.textSec, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: CC[name] || B.textSec, width: 52, flexShrink: 0 }}>{name}</span>
                  <span style={{ fontSize: 12, color: B.textSec }}>{angle}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: B.surface, border: '1px solid ' + B.border, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + B.border }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert }}>In progress · {totalDoing}</span>
            </div>
            {inProgress.length === 0
              ? <div style={{ padding: '14px 16px', fontSize: 13, color: B.textTert }}>No items in progress</div>
              : inProgress.map(item => (
                <div key={item.id} style={{ padding: '10px 16px', borderBottom: '1px solid ' + B.border, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 32, background: ROCK_COLORS[item.rock], borderRadius: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, color: B.text, lineHeight: 1.35 }}>{item.text}</div>
                    <div style={{ fontSize: 10, color: B.textTert, marginTop: 2 }}>{ROCKS.find(r => r.id === item.rock)?.label}</div>
                  </div>
                </div>
              ))}
            {blocked.length > 0 && <>
              <div style={{ padding: '10px 16px', borderTop: '1px solid ' + B.border }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#e05a4a' }}>Blocked · {totalBlocked}</span>
              </div>
              {blocked.map(item => (
                <div key={item.id} style={{ padding: '10px 16px', borderBottom: '1px solid ' + B.border, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 32, background: '#e05a4a', borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: B.textSec, lineHeight: 1.35 }}>{item.text}</div>
                </div>
              ))}
            </>}
          </div>
        </div>

        <div style={{ background: B.surface, border: '1px solid ' + B.border, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + B.border, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: B.textTert }}>Weekly scorecard</span>
            <span style={{ fontSize: 10, color: B.textTert }}>Tap to update</span>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {SCORECARD.map(kpi => {
              const value = scorecardValues[kpi.id] ?? 0
              const onTrack = value >= kpi.target
              const isEditing = editingKPI === kpi.id
              return (
                <div key={kpi.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderRadius: 6, gap: 10, background: isEditing ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: onTrack ? B.green : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, color: B.textSec }}>{kpi.label}</div>
                  <div style={{ fontSize: 9, color: B.textTert, width: 60, textAlign: 'right' }}>{kpi.target} {kpi.unit}</div>
                  {isEditing
                    ? <input autoFocus type="number" defaultValue={value}
                        onBlur={e => saveScorecardValue(kpi.id, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveScorecardValue(kpi.id, e.target.value); if (e.key === 'Escape') setEditingKPI(null) }}
                        style={{ width: 52, background: B.surface2, border: '1px solid ' + ROCK_COLORS[kpi.rock], borderRadius: 4, color: B.text, fontSize: 13, fontWeight: 600, padding: '3px 6px', textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
                    : <button onClick={() => setEditingKPI(kpi.id)}
                        style={{ width: 52, background: 'rgba(255,255,255,0.05)', border: '1px solid ' + B.border, borderRadius: 4, color: onTrack ? B.green : B.text, fontSize: 13, fontWeight: 600, padding: '3px 6px', textAlign: 'center', cursor: 'pointer', fontFamily: 'inherit' }}>
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
