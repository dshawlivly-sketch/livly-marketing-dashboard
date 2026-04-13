import { useState, useEffect, useCallback, useRef } from 'react'

const API = '/api/data'

// Reads from localStorage immediately (zero latency),
// then fetches from Notion on mount to hydrate with cross-device data,
// and writes through to both on every update.
export function useStore(key, defaultValue = null) {
  const [value, setValue] = useState(() => {
    try {
      const s = localStorage.getItem(key)
      return s !== null ? JSON.parse(s) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const [syncing, setSyncing] = useState(false)
  const syncedRef = useRef(false)

  // On mount: pull latest from Notion and hydrate localStorage
  useEffect(() => {
    if (syncedRef.current) return
    syncedRef.current = true

    setSyncing(true)
    fetch(`${API}?key=${encodeURIComponent(key)}`)
      .then(r => {
        if (!r.ok) return null
        return r.json()
      })
      .then(data => {
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value)
            setValue(parsed)
            localStorage.setItem(key, JSON.stringify(parsed))
          } catch {
            // malformed JSON in Notion — ignore, keep localStorage value
          }
        }
      })
      .catch(() => {
        // Notion unavailable or not configured — stay on localStorage silently
      })
      .finally(() => setSyncing(false))
  }, [key])

  // Write to localStorage immediately + async sync to Notion
  const set = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      // localStorage write is synchronous — instant
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {}

      // Notion sync is fire-and-forget — never blocks the UI
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: JSON.stringify(next) }),
      }).catch(() => {})

      return next
    })
  }, [key])

  return [value, set, syncing]
}
