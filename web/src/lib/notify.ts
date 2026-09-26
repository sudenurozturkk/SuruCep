// FR-06: Tarayıcı bildirimi (sunucu gerektirmez). İzin yoksa uygulama içi bant yeterli.
export async function initNotifications() {
  try {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  } catch {
    /* desteklenmiyor */
  }
}

export async function notifyNow(title: string, body: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: '/icon.svg', tag: body });
    else new Notification(title, { body, icon: '/icon.svg' });
  } catch {
    /* bazı tarayıcılar sayfa içinden bildirime izin vermez */
  }
}
