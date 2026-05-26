import { useState, useEffect, useCallback, useRef } from 'react'

const API = '/api/data'

// ─── Timestamp helpers ────────────────────────────────────────────────────────
// We store a companion key `${key}:ts` in localStorage with a unix ms timestamp
// of the last LOCAL write. On Notion hydration, we only overwrite localStorage
// if Notion data is NEWER than our last local write. This prevents the race
// condition where a quick page reload fetches stale Notion data before the
// async write has committed, reverting locally-set values.

function getLocalTs(key) {
  return parseInt(localStorage.getItem(`${key}:ts`) || '0', 10)
}

function setLocalTs(key) {
  localStorage.setItem(`${key}:ts`, Date.now().toString())
}

// Reads from localStorage immediately (zero latency),
// then fetches from Notion on mount ONLY if Notion data is newer,
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

  // On mount: pull latest from Notion and hydrate only if newer
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
            // Notion payload may be a wrapped { value, ts } object (new format)
            // or a raw value (legacy). Handle both.
            let notionData, notionTs
            try {
              const wrapper = JSON.parse(data.value)
              if (wrapper && typeof wrapper === 'object' && '_ts' in wrapper) {
                notionData = wrapper._v
                notionTs   = wrapper._ts
              } else {
                notionData = wrapper
                notionTs   = 0
              }
            } catch {
              notionData = data.value
              notionTs   = 0
            }

            const localTs = getLocalTs(key)

            // Only update if Notion is strictly newer than our last local write.
            // If localTs === 0 (never written locally), always accept Notion.
            if (notionTs > localTs || localTs === 0) {
              setValue(notionData)
              localStorage.setItem(key, JSON.stringify(notionData))
              localStorage.setItem(`${key}:ts`, notionTs.toString())
            }
          } catch {
            // malformed JSON — ignore, keep localStorage value
          }
        }
      })
      .catch(() => {
        // Notion unavailable — stay on localStorage silently
      })
      .finally(() => setSyncing(false))
  }, [key])

  // Write to localStorage immediately + async sync to Notion (wrapped with ts)
  const set = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const ts   = Date.now()

      // localStorage write is synchronous — instant
      try {
        localStorage.setItem(key, JSON.stringify(next))
        setLocalTs(key)  // record when we last wrote locally
      } catch {}

      // Notion sync — wrapped with timestamp so hydration can compare
      const wrapper = { _v: next, _ts: ts }
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: JSON.stringify(wrapper) }),
      }).catch(() => {})

      return next
    })
  }, [key])

  return [value, set, syncing]
}
