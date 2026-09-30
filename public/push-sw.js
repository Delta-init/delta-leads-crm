// Delta — Push Notification Service Worker

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push event ────────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Delta", body: event.data.text() };
  }

  const title = payload.title ?? "Delta";
  // Lead assignments stay on screen until tapped and re-alert (default
  // system sound) even when an older one with the same tag is still showing.
  const isLead = payload.data?.type === "lead_assigned";
  const options = {
    body:    payload.body  ?? "",
    icon:    "/icons/icon-192.png",
    badge:   "/icons/icon-192.png",
    tag:     payload.tag   ?? "crm-notification",
    data:    { url: payload.url ?? "/", ...(payload.data ?? {}) },
    vibrate: isLead ? [300, 120, 300, 120, 300] : [200, 100, 200],
    requireInteraction: isLead,
    renotify: isLead,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/";
  const origin = self.location.origin;
  const fullUrl = url.startsWith("http") ? url : origin + url;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(origin) && "focus" in client) {
            client.postMessage({ type: "NAVIGATE", url });
            return client.focus();
          }
        }
        return self.clients.openWindow(fullUrl);
      })
  );
});
