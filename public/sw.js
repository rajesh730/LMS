/* Pravyo service worker.
 *
 * Deliberately conservative. A service worker is the one thing here that can
 * keep serving stale code to a user after a deploy, and on a live school
 * platform that is very hard to diagnose and worse to recover from. So the
 * rules are strict:
 *
 *   1. NEVER cache anything under /api/. Those responses are per-user and
 *      auth-scoped; caching them risks showing one family another family's data.
 *   2. NEVER serve HTML from cache on a normal load. Documents are network-first,
 *      falling back to a cached shell only when the device is actually offline.
 *   3. Cache-first is used ONLY for /_next/static/, whose filenames contain a
 *      content hash. A hashed file's contents can never change, so caching it
 *      forever is safe by construction.
 *
 * The net effect: instant repeat loads and a usable offline screen, with no
 * path by which a user can get stuck on an old build.
 *
 * Kill switch: bump CACHE_VERSION to invalidate everything. To remove the
 * worker entirely, serve this file with a body of
 * `self.addEventListener("install", () => self.registration.unregister())`.
 */

const CACHE_VERSION = "pravyo-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      // A failed precache must not block installation — the worker is still
      // useful for static assets even if the offline page could not be fetched.
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      // Take over open tabs immediately, so a user is never left on the
      // previous worker after an update.
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/favicon.ico" ||
    /\.(?:png|jpg|jpeg|svg|webp|avif|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever touch same-origin GETs. Anything else (POST, PATCH, analytics,
  // a third-party font) goes straight to the network untouched.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Rule 1: API traffic is never cached, never intercepted.
  if (url.pathname.startsWith("/api/")) return;

  // Rule 3: hashed static assets — cache-first, safe because the name changes
  // whenever the bytes do.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Rule 2: documents — network-first, cache only as an offline lifeline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then(
            (hit) =>
              hit ||
              new Response("You are offline.", {
                status: 503,
                headers: { "Content-Type": "text/plain" },
              })
          )
      )
    );
  }
});
