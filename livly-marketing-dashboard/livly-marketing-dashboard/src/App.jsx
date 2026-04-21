import { useState, useEffect, useCallback } from 'react'
import { B } from './brand.js'
import { initNotifications, requestPermission, onToast } from './utils/notifications.js'
import CommandCenter from './components/CommandCenter.jsx'
import Q2Tracker from './components/Q2Tracker.jsx'
import ContentCalendar from './components/ContentCalendar.jsx'
import LinkedInPerformance from './components/LinkedInPerformance.jsx'
import ApolloPipeline from './components/ApolloPipeline.jsx'
import PromptLibrary from './components/PromptLibrary.jsx'
import AssetLibrary from './components/AssetLibrary.jsx'
import ActionCenter from './components/ActionCenter.jsx'
import FyxerIntel from './components/FyxerIntel.jsx'

const NAV = [
  { id: 'command',  label: 'Command Center',  path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'action',   label: 'Action Center',   path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', accent: B.coral },
  { id: 'fyxer',   label: 'Fyxer Intel',     path: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', accent: B.amber },
  { id: 'tracker', label: 'Q2 Tracker',      path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'calendar',label: 'Content Calendar',path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'linkedin',label: 'LinkedIn',         path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', accent: B.green },
  { id: 'apollo',  label: 'Apollo Pipeline',  path: 'M13 10V3L4 14h7v7l9-11h-7z', accent: B.amber },
  { id: 'prompts', label: 'Prompt Library',   path: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { id: 'assets',  label: 'Asset Library',    path: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
]

const COMPONENTS = {
  command: CommandCenter, action: ActionCenter, fyxer: FyxerIntel,
  tracker: Q2Tracker, calendar: ContentCalendar, linkedin: LinkedInPerformance,
  apollo: ApolloPipeline, prompts: PromptLibrary, assets: AssetLibrary,
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: '#1c1c1e', border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon || '🔔'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{t.title}</div>
            {t.body && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{t.body}</div>}
          </div>
          <button onClick={() => onDismiss(t.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [active, setActive] = useState('command')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [toasts, setToasts] = useState([])
  const [syncing, setSyncing] = useState({ pull: false, push: false })
  const [lastSync, setLastSync] = useState(null)
  const [notifPermission, setNotifPermission] = useState('default')

  const ActiveComponent = COMPONENTS[active]

  const addToast = useCallback((t) => {
    const toast = { ...t, id: Date.now() + Math.random() }
    setToasts(prev => [toast, ...prev].slice(0, 5))
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== toast.id)), 5000)
  }, [])

  useEffect(() => {
    initNotifications()
    setNotifPermission(window.Notification?.permission || 'unsupported')
    const unsub = onToast(n => addToast(n))
    const handler = e => addToast(e.detail)
    window.addEventListener('livly-toast', handler)
    return () => { unsub(); window.removeEventListener('livly-toast', handler) }
  }, [addToast])

  const dismissToast = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const handlePull = async () => {
    setSyncing(s => ({ ...s, pull: true }))
    try {
      const [tasks, conf] = await Promise.all([
        fetch('/api/notion-tasks').then(r => r.json()).catch(() => null),
        fetch('/api/notion-conference').then(r => r.json()).catch(() => null),
      ])
      if (tasks?.tasks) {
        localStorage.setItem('livly-notion-tasks', JSON.stringify(tasks.tasks))
        window.dispatchEvent(new CustomEvent('livly-tasks-updated', { detail: tasks.tasks }))
      }
      if (conf?.contacts) {
        localStorage.setItem('livly-notion-conference', JSON.stringify(conf.contacts))
        window.dispatchEvent(new CustomEvent('livly-conference-updated', { detail: conf.contacts }))
      }
      const count = (tasks?.total || 0) + (conf?.total || 0)
      setLastSync(new Date())
      addToast({ title: 'Pull complete', body: `${count} records synced from Notion`, icon: '↓' })
    } catch { addToast({ title: 'Pull failed', body: 'Check Notion connection', icon: '⚠️' }) }
    finally { setSyncing(s => ({ ...s, pull: false })) }
  }

  const handlePush = async () => {
    setSyncing(s => ({ ...s, push: true }))
    try {
      const trackerStates = JSON.parse(localStorage.getItem('livly-tracker-states') || '{}')
      const scorecardValues = JSON.parse(localStorage.getItem('livly-scorecard-values') || '{}')
      await Promise.all([
        fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'livly-tracker-states', value: JSON.stringify(trackerStates) }) }),
        fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'livly-scorecard-values', value: JSON.stringify(scorecardValues) }) }),
      ])
      setLastSync(new Date())
      addToast({ title: 'Push complete', body: 'Dashboard state synced to Notion', icon: '↑' })
    } catch { addToast({ title: 'Push failed', body: 'Check Notion connection', icon: '⚠️' }) }
    finally { setSyncing(s => ({ ...s, push: false })) }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: B.dark, color: B.text, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", overflow: 'hidden' }}>
      <style>{`
        button:focus-visible { outline: 2px solid ${B.coral}40; outline-offset: 2px; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 220 : 56, flexShrink: 0, background: '#0c0c0e', borderRight: `1px solid ${B.border}`, display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease', overflow: 'hidden' }}>

        {/* Logo */}
        <div style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: `1px solid ${B.border}`, gap: 9, flexShrink: 0 }}>
          <img src="/livly-logo.png" alt="Livly" style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 6, objectFit: 'cover' }} />
          {sidebarOpen && (
            <div>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 13, fontWeight: 600, color: B.text, letterSpacing: '0.01em', lineHeight: 1.1 }}>Livly</div>
              <div style={{ fontFamily: "'Libre Franklin', 'Helvetica Neue', sans-serif", fontSize: 9.5, fontWeight: 500, color: B.coral, letterSpacing: '0.09em', textTransform: 'uppercase', marginTop: 1 }}>Marketing</div>
            </div>
          )}
        </div>

        {/* Sync buttons */}
        {sidebarOpen && (
          <div style={{ padding: '8px 10px 6px', borderBottom: `1px solid ${B.border}`, display: 'flex', gap: 5 }}>
            <button onClick={handlePull} disabled={syncing.pull}
              style={{ flex: 1, background: 'rgba(90,191,130,0.1)', color: syncing.pull ? B.textTert : B.green, border: `1px solid rgba(90,191,130,0.25)`, borderRadius: 5, padding: '5px 0', fontSize: 11, fontWeight: 500, cursor: syncing.pull ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {syncing.pull ? '···' : '↓ Pull'}
            </button>
            <button onClick={handlePush} disabled={syncing.push}
              style={{ flex: 1, background: 'rgba(240,123,107,0.1)', color: syncing.push ? B.textTert : B.coral, border: `1px solid rgba(240,123,107,0.25)`, borderRadius: 5, padding: '5px 0', fontSize: 11, fontWeight: 500, cursor: syncing.push ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {syncing.push ? '···' : '↑ Push'}
            </button>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 7px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map(item => {
            const isActive = active === item.id
            const color = item.accent || B.textSec
            return (
              <button key={item.id} onClick={() => setActive(item.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: sidebarOpen ? '7px 9px' : '7px 0', justifyContent: sidebarOpen ? 'flex-start' : 'center', background: isActive ? `${color}18` : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', marginBottom: 1, color: isActive ? color : 'rgba(255,255,255,0.45)', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d={item.path} />
                </svg>
                {sidebarOpen && <span style={{ fontSize: 12, fontWeight: isActive ? 500 : 400, whiteSpace: 'nowrap' }}>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Bottom controls */}
        <div style={{ padding: '7px', borderTop: `1px solid ${B.border}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {sidebarOpen && lastSync && (
            <div style={{ fontSize: 9, color: B.textTert, textAlign: 'center', padding: '1px 0' }}>
              Synced {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {sidebarOpen && notifPermission === 'default' && (
            <button onClick={async () => setNotifPermission(await requestPermission())}
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${B.border}`, borderRadius: 5, color: B.textTert, fontSize: 10, padding: '5px', cursor: 'pointer', fontFamily: 'inherit' }}>
              🔔 Enable notifications
            </button>
          )}
          <button onClick={() => setSidebarOpen(p => !p)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: 7, padding: '6px 7px', background: 'none', border: 'none', cursor: 'pointer', color: B.textTert, fontFamily: 'inherit', borderRadius: 5, width: '100%' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={sidebarOpen ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'} />
            </svg>
            {sidebarOpen && <span style={{ fontSize: 11 }}>Collapse</span>}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', background: B.dark }}>
        <ActiveComponent />
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
