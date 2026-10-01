// Service Worker untuk Push Notification Stesen Amaran Cuaca IoT (POLISAS)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (event.data) {
    let data = {};
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: event.data.text() };
    }

    const title = data.title || 'Stesen Amaran Cuaca IoT';
    const options = {
      body: data.body || 'Amaran cuaca atau perubahan telemetri atmosfera dikesan.',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230ea5e9"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A7 7 0 0 1 5.07 11H5a1 1 0 0 1 0-2h.07A7 7 0 0 1 11 5.07V5a1 1 0 0 1 2 0v.07A7 7 0 0 1 18.93 11H19a1 1 0 0 1 0 2h-.07A7 7 0 0 1 13 16.93z"/></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230ea5e9"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/></svg>',
      vibrate: [200, 100, 200, 100, 200],
      tag: data.tag || 'weather-station-alert',
      renotify: true,
      data: data.url || '/',
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data || '/');
      }
    })
  );
});
