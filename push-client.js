// Called by the "เปิดการแจ้งเตือน" button on the IT dashboard.
// Requests permission, registers the service worker, subscribes to push,
// and saves the subscription on the server.

async function enableNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบ Web Push\n(บน iPhone ต้องเพิ่มหน้านี้ไปที่โฮมสกรีนก่อนถึงจะใช้ได้)');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('คุณยังไม่ได้อนุญาตการแจ้งเตือน');
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const { publicKey } = await fetch('/api/push/vapid-public-key').then((r) => r.json());

    if (!publicKey) {
      alert('เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า VAPID key — แจ้งแอดมินให้ตั้งค่าก่อน');
      return;
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    alert('เปิดการแจ้งเตือนสำเร็จแล้ว 🎉');
  } catch (err) {
    console.error(err);
    alert('เปิดการแจ้งเตือนไม่สำเร็จ: ' + err.message);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
