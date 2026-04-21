// Livly Marketing Dashboard — Service Worker
// Handles background push notifications

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Livly Dashboard'
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/favicon-180.png',
    badge: '/favicon-32.png',
    tag: data.tag || 'livly-notif',
    data: { url: data.url || '/' },
    requireInteraction: data.requireInteraction || false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})

// For in-app broadcast messages (when tab IS open)
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
