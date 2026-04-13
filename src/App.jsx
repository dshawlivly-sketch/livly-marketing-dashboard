import { useState } from 'react'
import { B } from './brand.js'
import CommandCenter from './components/CommandCenter.jsx'
import Q2Tracker from './components/Q2Tracker.jsx'
import ContentCalendar from './components/ContentCalendar.jsx'
import LinkedInPerformance from './components/LinkedInPerformance.jsx'
import ApolloPipeline from './components/ApolloPipeline.jsx'
import PromptLibrary from './components/PromptLibrary.jsx'
import AssetLibrary from './components/AssetLibrary.jsx'

const NAV = [
  { id: 'command',  label: 'Command Center', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'tracker',  label: 'Q2 Tracker',     icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'calendar', label: 'Content Calendar',icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'linkedin', label: 'LinkedIn',        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'apollo',   label: 'Apollo Pipeline', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'prompts',  label: 'Prompt Library',  icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { id: 'assets',   label: 'Asset Library',   icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
]

const COMPONENTS = {
  command:  CommandCenter,
  tracker:  Q2Tracker,
  calendar: ContentCalendar,
  linkedin: LinkedInPerformance,
  apollo:   ApolloPipeline,
  prompts:  PromptLibrary,
  assets:   AssetLibrary,
}

export default function App() {
  const [active, setActive] = useState('command')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const ActiveComponent = COMPONENTS[active]

  return (
    <div style={{ display: 'flex', height: '100vh', background: B.dark, color: B.text, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 220 : 60, flexShrink: 0, background: B.dark, borderRight: `1px solid ${B.border}`, display: 'flex', flexDirection: 'column', transition: 'width 0.2s', overflow: 'hidden' }}>

        {/* Logo */}
        <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: `1px solid ${B.border}`, gap: 10, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, background: B.coral, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 11, fontWeight: 'bold', color: '#fff', letterSpacing: '0.05em' }}>L</span>
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, letterSpacing: '0.28em', color: B.text }}>LIVLY</div>
              <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 10, color: B.coral, marginTop: -1 }}>Marketing</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 8px', overflow: 'hidden' }}>
          {NAV.map(item => {
            const isActive = active === item.id
            return (
              <button key={item.id} onClick={() => setActive(item.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: sidebarOpen ? '9px 10px' : '9px 0', justifyContent: sidebarOpen ? 'flex-start' : 'center', background: isActive ? 'rgba(240,123,107,0.12)' : 'none', border: 'none', borderRadius: 7, cursor: 'pointer', marginBottom: 2, color: isActive ? B.coral : B.textSec, transition: 'all 0.15s', fontFamily: 'inherit' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d={item.icon} />
                </svg>
                {sidebarOpen && <span style={{ fontSize: 13, fontWeight: isActive ? 500 : 400, whiteSpace: 'nowrap' }}>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <div style={{ padding: '12px 8px', borderTop: `1px solid ${B.border}`, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(p => !p)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: 10, padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: B.textTert, fontFamily: 'inherit', borderRadius: 7 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d={sidebarOpen ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'} />
            </svg>
            {sidebarOpen && <span style={{ fontSize: 12 }}>Collapse</span>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', background: B.dark }}>
        <ActiveComponent />
      </div>
    </div>
  )
}
