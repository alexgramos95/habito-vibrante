/**
 * CORE FILE — DO NOT EDIT VIA LOVABLE.
 * Changes must be reviewed and tested locally.
 */
// becoMe Service Worker - PWA Support with Push Notifications
const CACHE_NAME = 'become-v4';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
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
    }).then(() => {
      return clients.claim();
    })
  );
});

// Fetch event - network-first strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Network-first for navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update in background
        fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response);
            });
          }
        });
        return cachedResponse;
      }
      
      // Fetch and cache new requests
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
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
