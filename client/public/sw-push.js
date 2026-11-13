self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() ?? '' }; }
  const title = payload.title || 'A gentle reminder';
  const options = { body: payload.body || 'A little nudge for your day.', icon: '/pwa.svg', badge: '/pwa.svg', tag: payload.id || 'namma-dina', data: { url: '/' } };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    return existing ? existing.focus() : self.clients.openWindow(target);
  }));
});
