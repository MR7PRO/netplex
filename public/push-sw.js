/* NetPlex Web Push service worker.
 * Scope: /push-sw.js — only handles push events, does NOT cache the app shell.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "NetPlex", body: "لديك إشعار جديد", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {
    if (event.data) payload.body = event.data.text();
  }
  const options = {
    body: payload.body,
    icon: "/favicon.png",
    badge: "/favicon.png",
    dir: "rtl",
    lang: "ar",
    data: { url: payload.url || "/" },
    tag: payload.tag || undefined,
  };
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
