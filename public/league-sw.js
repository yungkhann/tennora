// Only immutable public shell assets are cacheable. Private pages/APIs and
// every score or session request always use the network.
const CACHE = "tennora-public-shell-v1";
const ASSETS = new Set([
  "/icon.svg",
  "/manifest.webmanifest",
  "/league-icon-192.png",
  "/league-icon-512.png",
]);
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([...ASSETS])),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("tennora-public-shell-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !ASSETS.has(url.pathname) ||
    url.search ||
    event.request.headers.has("authorization")
  )
    return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
