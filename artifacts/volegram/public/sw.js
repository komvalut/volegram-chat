const CACHE_NAME = "vbc-v3";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon.svg",
];

// Install — cache app shell (skip failed fetches gracefully)
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) =>
      Promise.allSettled(SHELL.map((url) =>
        fetch(url).then((res) => { if (res.ok) c.put(url, res); }).catch(() => {})
      ))
    )
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

// Fetch — network first for HTML, cache first for assets
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET, cross-origin, API calls, WebSocket
  if (
    e.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/uploads/")
  ) return;

  // Assets (JS/CSS/fonts/images) — cache first
  if (url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|ico|webp)$/)) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached)
      )
    );
    return;
  }

  // HTML — network first, fallback to cached index.html (SPA)
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match("/index.html"))
  );
});

// Push notifications
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? "VBC ⚡", {
      body:    data.body ?? "Nova poruka",
      icon:    "/icons/icon.svg",
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
