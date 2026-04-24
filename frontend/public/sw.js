const CACHE_NAME = "vbc-v1";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install — cache app shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(SHELL))
  );
  self.skipWaiting();
});

// Activate — remove old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET, WebSocket, and API calls
  if (
    e.request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/uploads/") ||
    url.protocol === "ws:" ||
    url.protocol === "wss:"
  ) return;

  // Assets (JS/CSS/fonts) — cache first
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|ico)$/)
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // HTML pages — network first, fallback to index.html (SPA)
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match("/index.html")
    )
  );
});

// Push notifications (Lightning payment received)
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? "VBC ⚡", {
      body:    data.body ?? "Nova poruka",
      icon:    "/icons/icon-192.png",
      badge:   "/icons/icon-72.png",
      vibrate: [100, 50, 100],
      data:    { url: data.url ?? "/" },
      actions: [
        { action: "open",    title: "Otvori chat" },
        { action: "dismiss", title: "Zatvori"     },
      ],
    })
  );
});

// Notification click
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "dismiss") return;
  e.waitUntil(
    clients.matchAll({ type: "window" }).then((wins) => {
      const win = wins.find((w) => w.focused);
      if (win) return win.focus();
      return clients.openWindow(e.notification.data?.url ?? "/");
    })
  );
});
