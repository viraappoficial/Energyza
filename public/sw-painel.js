// Service worker do painel: recebe as notificações (Web Push) e abre a tela certa ao tocar.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "Energyza", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Energyza";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/painel/icon-192.png",
      badge: "/painel/icon-192.png",
      tag: data.tag || undefined,   // mesma conversa substitui a anterior em vez de empilhar
      renotify: !!data.tag,
      data: { url: data.url || "/admin" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes("/admin") && "focus" in c) {
          if ("navigate" in c) c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
