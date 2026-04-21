/**
 * CORE FILE — DO NOT EDIT VIA LOVABLE.
 * Changes must be reviewed and tested locally.
 */
// becoMe Service Worker - PWA Support with Push Notifications
const CACHE_NAME = 'become-v5';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
];

const NETWORK_FIRST_DESTINATIONS = new Set(['document', 'script', 'style', 'font', 'image']);

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

// Fetch event - prefer the network for app shell/assets to avoid stale UI after updates.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const requestUrl = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  const isAssetRequest = NETWORK_FIRST_DESTINATIONS.has(event.request.destination) || requestUrl.pathname.startsWith('/assets/');

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (isNavigation || isAssetRequest) {
      try {
        const freshResponse = await fetch(event.request);
        if (freshResponse.ok) {
          cache.put(event.request, freshResponse.clone());
        }
        return freshResponse;
      } catch (error) {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;
        if (isNavigation) {
          return (await caches.match('/')) || Response.error();
        }
        throw error;
      }
    }

    const cachedResponse = await cache.match(event.request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetch(event.request);
    if (response.ok) {
      cache.put(event.request, response.clone());
    }
    return response;
  })());
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
