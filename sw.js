// Photossential offline support.
//
// This is the one piece that can't live inside index.html itself (a
// service worker has to be a real file fetched from the same origin).
// Everyone visiting the tool downloads this automatically once it's
// hosted alongside index.html -- no action needed on their end.
//
// Bump CACHE_NAME (v1 -> v2) if you ever want to force everyone's cached
// copy to be thrown out and rebuilt from scratch. You normally don't need
// to: the fetch handler below already refreshes the cache every time
// someone opens the tool with a signal.
const CACHE_NAME = "photossential-v1";
const PRECACHE_URLS = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

// Network-first: always try to fetch the latest version when there's a
// signal, updating the cache with whatever comes back, and only fall
// back to the cached copy when the network request fails outright
// (offline, airplane mode, no signal). This means someone who's online
// always sees your latest changes -- they're never stuck looking at a
// stale cached version -- while someone with zero signal still gets a
// working copy of the last version that loaded successfully.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});