// FR-30: bildirime dokununca ana ekran (Sürü Sağlık Takvimi) açılır
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate('/#/');
          return c.focus();
        }
      }
      return self.clients.openWindow('/#/');
    }),
  );
});
