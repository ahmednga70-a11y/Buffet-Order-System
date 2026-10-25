self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch {}
  event.waitUntil(self.registration.showNotification(payload.title || "بوفيه الشركة", {
    body: payload.body || "راجع الطلبات الجديدة",
    tag: payload.tag || "buffet-orders",
    data: { url: payload.url === "/my-orders" ? "/my-orders" : "/" },
    requireInteraction: true,
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url === "/my-orders" ? "/my-orders" : "/";
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(url);
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
