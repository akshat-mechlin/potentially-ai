const CACHE_NAME = "potentially-v4";
const PRECACHE = ["/icon.svg", "/icon-maskable.svg"];
const NEVER_CACHE_PREFIXES = ["/api/", "/login", "/signup", "/dashboard", "/forgot-password", "/reset-password"];

function shouldNeverCache(pathname) {
  return NEVER_CACHE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldNeverCache(url.pathname)) return;

  // Never cache Next.js build assets; stale chunks cause hydration failures after deploys.
  if (url.pathname.startsWith("/_next/")) return;

  // Never cache HTML navigations — always fetch fresh from the network.
  if (request.mode === "navigate") return;

  if (url.pathname.endsWith(".svg") || url.pathname.endsWith(".png") || url.pathname.endsWith(".woff2")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
