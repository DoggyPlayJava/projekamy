// Service Worker untuk Push Notification Sistem Pengairan Pintar (POLISAS)
self.addEventListener('push', function (event) {
  if (event.data) {
    let data = {};
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: event.data.text() };
    }

    const title = data.title || 'Sistem Pengairan Pintar';
    const options = {
      body: data.body || 'Amaran status kelembapan tanah atau aktiviti pam.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      data: data.url || '/',
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  if (event.notification.data) {
    event.waitUntil(clients.openWindow(event.notification.data));
  }
});
