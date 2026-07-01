// apps/web/public/firebase-messaging-sw.js
// Service Worker para receber notificações push FCM em background (Web)
// Versão: Sprint 16

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── Configuração Firebase (substitua com seus valores do projeto FCM) ─────────
// Os valores abaixo são lidos de um cache no install, ou hardcoded aqui.
// Em produção, injete via variáveis de ambiente no build (ex: next.config.js publicRuntimeConfig).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    const config = event.data.config;
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title, body, image } = payload.notification ?? {};
      const data = payload.data ?? {};

      self.registration.showNotification(title ?? 'IcodLife', {
        body:  body ?? '',
        icon:  '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        image,
        data,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'open', title: 'Abrir' },
          { action: 'dismiss', title: 'Dispensar' },
        ],
      });
    });
  }
});

// Clique na notificação: abre o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const data = event.notification.data ?? {};
  let url = '/';

  // Deep link por tipo
  if (data.type === 'telemedicine_admit') url = `/telemedicina/${data.roomToken}`;
  else if (data.type === 'appointment_created') url = '/consultas';
  else if (data.type === 'medication_reminder') url = '/medicamentos';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
