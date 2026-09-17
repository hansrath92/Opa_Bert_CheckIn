// Sofort aktiv werden statt auf den nächsten Seitenaufruf zu warten,
// damit Push-Benachrichtigungen nach einem Deployment ohne Verzögerung funktionieren.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Opa-Checkin";
  const body = data.body || "";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
