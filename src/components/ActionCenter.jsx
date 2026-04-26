import { useState, useEffect, useCallback } from 'react'
import { B } from '../brand.js'
import { useStore } from '../utils/useStore.js'
import { notifyNewTask } from '../utils/notifications.js'

const PRIORITY_ORDER  = { Critical: 0, 'High Priority': 1, Low: 2 }
const PRIORITY_CFG = {
  Critical:       { color: '#e05a4a', bg: 'rgba(224,90,74,0.14)',   label: 'Critical' },
  'High Priority':{ color: B.amber,  bg: 'rgba(176,120,48,0.14)',  label: 'High' },
  Low:            { color: B.blue,   bg: 'rgba(74,144,217,0.14)',  label: 'Low' },
}
const STATUS_CYCLE = ['Not started', 'In progress', 'Done', 'Blocked']
const STATUS_CFG = {
  'Not started': { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)', label: 'Not started' },
  'In progress': { color: B.amber,  bg: 'rgba(176,120,48,0.18)',  label: 'In progress' },
  'Done':        { color: B.green,  bg: 'rgba(90,191,130,0.18)',  label: 'Done' },
  'Blocked':     { color: '#e05a4a',bg: 'rgba(224,90,74,0.18)',   label: 'Blocked' },
}

function isThisWeek(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0)
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999)
  return d >= weekStart && d <= weekEnd
}

function isOverdue(task) {
  if (!task.dueDate || task.status === 'Done') return false
  return new Date(task.dueDate) < new Date()
}

function TaskCard({ task, completedAt, onStatusChange, compact = false }) {
  const statusCfg = STATUS_CFG[task.status] || STATUS_CFG['Not started']
  const priCfg    = PRIORITY_CFG[task.priority]
  const overdue   = isOverdue(task)

  const cycleStatus = () => {
    const idx  = STATUS_CYCLE.indexOf(task.status)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    onStatusChange(task.id, next, task.status)
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${overdue ? 'rgba(224,90,74,0.3)' : B.border}`, borderRadius: 7, padding: compact ? '8px 10px' : '10px 12px', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
        <button onClick={cycleStatus}
          style={{ background: statusCfg.bg, color: statusCfg.color, border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 10, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {statusCfg.label}
        </button>
        <span style={{ fontSize: compact ? 12 : 13, color: task.status === 'Done' ? B.textTert : 'rgba(255,255,255,0.88)', lineHeight: 1.4, textDecoration: task.status === 'Done' ? 'line-through' : 'none', flex: 1 }}>
          {task.task}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginLeft: 2 }}>
        {priCfg && (
          <span style={{ background: priCfg.bg, color: priCfg.color, fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3 }}>{priCfg.label}</span>
        )}
        {task.dueDate && (
          <span style={{ fontSize: 10, color: overdue ? '#e05a4a' : B.textTert }}>
            {overdue ? '⚠ ' : ''}{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.status === 'Done' && completedAt && (
          <span style={{ fontSize: 9, color: B.textTert }}>
            ✓ {new Date(completedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {task.notes && !compact && (
          <span style={{ fontSize: 10, color: B.textTert, fontStyle: 'italic' }}>{task.notes}</span>
        )}
      </div>
    </div>
  )
}

function BentoCell({ title, color, children, count, emptyMsg }) {
  return (
    <div style={{ background: B.surface, border: `1px solid ${color}30`, borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 260 }}>
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 3, height: 16, background: color, borderRadius: 2 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{title}</span>
        </div>
        {count > 0 && <span style={{ background: `${color}20`, color, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10 }}>{count}</span>}
      </div>
      <div style={{ flex: 1, padding: '10px 12px', overflowY: 'auto' }}>
        {children}
        {count === 0 && <div style={{ fontSize: 12, color: B.textTert, fontStyle: 'italic', paddingTop: 6 }}>{emptyMsg}</div>}
      </div>
    </div>
  )
}

export default function ActionCenter() {
  const [tasks, setTasks]                     = useState([])
  const [completions, setCompletions]         = useStore('livly-action-completions', {})
  const [loading, setLoading]                 = useState(false)
  const [lastPull, setLastPull]               = useState(null)

  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem('livly-notion-tasks')
      if (cached) setTasks(JSON.parse(cached))
    } catch {}
  }

  useEffect(() => {
    loadFromCache()
    const handler = e => { setTasks(e.detail); setLastPull(new Date()) }
    window.addEventListener('livly-tasks-updated', handler)
    return () => window.removeEventListener('livly-tasks-updated', handler)
  }, [])

  const pullTasks = async () => {
    setLoading(true)
    try {
      const r    = await fetch('/api/notion-tasks')
      const data = await r.json()
      if (data.tasks) {
        const prevCount = tasks.length
        setTasks(data.tasks)
        localStorage.setItem('livly-notion-tasks', JSON.stringify(data.tasks))
        setLastPull(new Date())
        if (data.tasks.length > prevCount) {
          data.tasks.slice(0, data.tasks.length - prevCount).forEach(t => notifyNewTask(t.task))
        }
      }
    } catch (err) { console.error('Task pull failed:', err) }
    finally { setLoading(false) }
  }

  const handleStatusChange = useCallback(async (taskId, newStatus, prevStatus) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))

    // Record / clear completion timestamp
    if (newStatus === 'Done') {
      setCompletions(p => ({ ...p, [taskId]: new Date().toISOString() }))
    } else if (prevStatus === 'Done') {
      setCompletions(p => { const n = { ...p }; delete n[taskId]; return n })
    }

    // Push to Notion
    try {
      await fetch('/api/notion-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: taskId, status: newStatus }),
      })
    } catch (err) { console.error('Status push failed:', err) }
  }, [setCompletions])

  // Categorize
  const highPriority = tasks
    .filter(t => (t.priority === 'Critical' || t.priority === 'High Priority') && t.status !== 'Done')
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))

  const thisWeek     = tasks.filter(t => isThisWeek(t.dueDate) && t.status !== 'Done')
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))

  const inProgress   = tasks.filter(t => t.status === 'In progress')
  const blocked      = tasks.filter(t => t.status === 'Blocked')
  const done         = tasks.filter(t => t.status === 'Done')

  // Expose for weekly recap
  useEffect(() => {
    localStorage.setItem('livly-recap-tasks', JSON.stringify(
      done.map(t => ({ ...t, completedAt: completions[t.id] || null }))
    ))
  }, [done, completions])

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.textTert, marginBottom: 4 }}>Notion Synced</div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', color: B.text, marginBottom: 2 }}>Action Center</h1>
          <div style={{ fontSize: 13, color: B.textSec }}>
            {tasks.length} tasks · <span style={{ color: B.green }}>{done.length}</span> done
            {blocked.length > 0 && <> · <span style={{ color: '#e05a4a' }}>{blocked.length} blocked</span></>}
            {' · '}{lastPull ? `Synced ${lastPull.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not yet synced'}
          </div>
        </div>
        <button onClick={pullTasks} disabled={loading}
          style={{ background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(90,191,130,0.12)', color: loading ? B.textTert : B.green, border: `1px solid ${loading ? B.border : 'rgba(90,191,130,0.3)'}`, borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'Syncing…' : '↓ Sync from Notion'}
        </button>
      </div>

      {tasks.length === 0 && !loading && (
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: 10, padding: 40, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 15, color: B.textTert, marginBottom: 8 }}>No tasks loaded yet</div>
          <div style={{ fontSize: 12, color: B.textTert }}>Press "Sync from Notion" or use the global Pull button in the sidebar.</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <BentoCell title="High Priority" color={B.coral} count={highPriority.length} emptyMsg="No critical or high-priority tasks">
          {highPriority.map(t => <TaskCard key={t.id} task={t} completedAt={completions[t.id]} onStatusChange={handleStatusChange} />)}
        </BentoCell>

        <BentoCell title="Due This Week" color={B.amber} count={thisWeek.length} emptyMsg="Nothing due this week">
          {thisWeek.map(t => <TaskCard key={t.id} task={t} completedAt={completions[t.id]} onStatusChange={handleStatusChange} />)}
        </BentoCell>

        <BentoCell title="In Progress" color={B.blue} count={inProgress.length + blocked.length} emptyMsg="Nothing in progress">
          {blocked.map(t => <TaskCard key={t.id} task={t} completedAt={completions[t.id]} onStatusChange={handleStatusChange} compact />)}
          {inProgress.map(t => <TaskCard key={t.id} task={t} completedAt={completions[t.id]} onStatusChange={handleStatusChange} compact />)}
        </BentoCell>

        <BentoCell title="Completed" color={B.green} count={done.length} emptyMsg="Nothing completed yet">
          {done.map(t => <TaskCard key={t.id} task={t} completedAt={completions[t.id]} onStatusChange={handleStatusChange} compact />)}
          {done.length > 0 && (
            <div style={{ fontSize: 10, color: B.textTert, marginTop: 8, fontStyle: 'italic' }}>✓ Mapped to weekly recap</div>
          )}
        </BentoCell>
      </div>
    </div>
  )
}
