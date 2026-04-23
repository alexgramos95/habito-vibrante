/**
 * CORE FILE — DO NOT EDIT VIA LOVABLE.
 * Changes must be reviewed and tested locally.
 */
// becoMe Service Worker - push only, no frontend asset caching
const SERVICE_WORKER_VERSION = '2026-04-23-push-only-1';
const CACHE_NAME = `become-runtime-${SERVICE_WORKER_VERSION}`;

// Install event - activate immediately without pre-caching frontend files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(Promise.resolve());
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => clients.claim())
  );
});

// Fetch event - always use the network for the frontend so published updates appear immediately.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(fetch(event.request));
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event fired');
  
  event.waitUntil((async () => {
    try {
      let title = 'becoMe';
      let body = 'Time for your habit!';
      let icon = '/icons/icon-192.png';
      let badge = '/icons/icon-192.png';
      let tag = 'habit-reminder';
      let extraData = {};

      if (event.data) {
        try {
          const payload = event.data.json();
          console.log('[SW] Push payload:', JSON.stringify(payload));
          title = payload.title || title;
          body = payload.body || body;
          icon = payload.icon || icon;
          badge = payload.badge || badge;
          tag = payload.tag || tag;
          extraData = payload.data || extraData;
        } catch (e) {
          body = event.data.text() || body;
          console.log('[SW] Push payload as text:', body);
        }
      }

      await self.registration.showNotification(title, {
        body,
        icon,
        badge,
        tag,
        data: extraData,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'Open App' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
      console.log('[SW] showNotification called successfully');
    } catch (err) {
      console.error('[SW] Push handler error:', err);
      // Fallback: always show something
      await self.registration.showNotification('becoMe', {
        body: 'You have a notification',
        icon: '/icons/icon-192.png',
      });
    }
  })());
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Message event - handle skip waiting and other messages
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync (for future offline habit logging)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-habits') {
    event.waitUntil(
      // Future: sync offline habit completions
      Promise.resolve()
    );
  }
});
