// Service worker: receives push events from the server and shows a
// system notification, even if the IT dashboard tab isn't open.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'IT Helpdesk', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'IT Helpdesk';
  const options = {
    body: data.body || '',
    data: { url: data.url || '/it-helpdesk.html' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/it-helpdesk.html';
  event.waitUntil(clients.openWindow(url));
});
