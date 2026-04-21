// Notification system: browser push (when tab closed) + in-app toasts (when tab open)

let swRegistration = null
const toastListeners = new Set()

export async function initNotifications() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return false
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js')
    return true
  } catch { return false }
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

export function getPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

// Subscribe a function to receive in-app toast events
export function onToast(fn) {
  toastListeners.add(fn)
  return () => toastListeners.delete(fn)
}

function broadcastToast(notification) {
  toastListeners.forEach(fn => fn(notification))
}

// Show a notification — browser push if tab is hidden/closed, toast if visible
export function notify({ title, body, tag, icon = '🔔', type = 'info' }) {
  const notification = { id: Date.now(), title, body, tag, icon, type, ts: new Date() }

  // Always broadcast toast (in-app listeners decide if visible)
  broadcastToast(notification)

  // Also fire browser notification if permission granted
  if (Notification.permission === 'granted') {
    if (document.visibilityState === 'hidden' && swRegistration) {
      swRegistration.showNotification(title, {
        body,
        icon: '/favicon-180.png',
        badge: '/favicon-32.png',
        tag: tag || 'livly',
      })
    } else if (document.visibilityState === 'hidden') {
      new Notification(title, { body, icon: '/favicon-180.png', tag })
    }
  }
}

// Prebuilt notification templates
export const notifyNewTask = (taskName) =>
  notify({ title: 'New task added', body: taskName, icon: '✅', type: 'task', tag: 'new-task' })

export const notifyFyxerIngest = (type, summary) =>
  notify({ title: `Fyxer: ${type}`, body: summary, icon: '📨', type: 'fyxer', tag: 'fyxer-ingest' })

export const notifyContract = (docName) =>
  notify({ title: 'Contract awaiting signature', body: docName, icon: '✍️', type: 'contract', tag: 'contract' })

export const notifySyncDone = (direction, count) =>
  notify({ title: `Notion ${direction} complete`, body: `${count} records synced`, icon: '🔄', type: 'sync', tag: 'sync' })
