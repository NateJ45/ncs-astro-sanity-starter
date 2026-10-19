// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The Studio app's service worker (PORTS.md card 125), scope /studio/
// =============================================================================
// Registered by the boot page (src/pages/studio/index.astro) and by nothing
// else, so it only ever sees requests made by the Studio. It does two jobs:
//
//   1. A QUICKER START. The Studio's code files (/_astro/*, named by their
//      content, so a file never changes under the same name) and the icons are
//      kept after the first visit and served from here, even when the phone has
//      dropped them from its ordinary cache.
//   2. A FRIENDLY OFFLINE PAGE. Opening the app with no connection shows
//      /studio/offline/ ("You're offline") instead of the phone's error.
//
// WHAT IT NEVER STORES (the reason this file is short):
//   - anything from another address: every Sanity API call, the realtime
//     channel, images on cdn.sanity.io and the Studio's own fonts. Sanity's
//     answers depend on who is signed in, and a stale one could show an old
//     draft as if it were current.
//   - anything with an Authorization header, anything that is not a GET, and
//     /api/** and /preview/** on the site itself (logins, Studio routes, drafts).
//   - the boot page itself is fetched fresh every time (network first): a copy
//     from last week could point at code files the next deploy removed. The
//     one copy it falls back to offline is /studio/offline/.
//
// cacheRule() below is the whole policy; src/lib/studio-app.test.ts runs this
// file in a sandbox and checks it. Bump VERSION to throw every kept file away.
// =============================================================================

var VERSION = 'v1';
var PREFIX = 'ncs-studio-';
var SHELL_CACHE = PREFIX + 'shell-' + VERSION;
var ASSET_CACHE = PREFIX + 'assets-' + VERSION;
var OFFLINE_URL = '/studio/offline/';
var MAX_ASSETS = 120;

// Kept at install, so the offline page works on the very next visit.
var PRECACHE = [OFFLINE_URL, '/favicon.svg', '/icon-192.png'];

/**
 * What to do with one request: 'shell' (the boot page: network first, offline
 * page if that fails), 'asset' (a code file named by its content: kept, served
 * from the cache first), 'static' (an icon or the manifest: served from the
 * cache, refreshed in the background) or 'none' (leave it to the browser).
 */
function cacheRule(url, method, hasAuth, ownOrigin) {
  var u;
  try {
    u = new URL(url);
  } catch (_e) {
    return 'none';
  }
  if (method !== 'GET' || hasAuth) return 'none';
  if (u.origin !== ownOrigin) return 'none';
  var p = u.pathname;
  if (p.indexOf('/api/') === 0 || p.indexOf('/preview') === 0) return 'none';
  if (p === '/studio' || p === '/studio/' || p === '/studio/index.html') return 'shell';
  if (p === OFFLINE_URL) return 'static';
  if (p.indexOf('/_astro/') === 0) return 'asset';
  if (
    p === '/favicon.svg' ||
    p === '/favicon.ico' ||
    p === '/apple-touch-icon.png' ||
    /^\/icon-[\w-]+\.png$/.test(p) ||
    p === '/studio/manifest.webmanifest'
  ) {
    return 'static';
  }
  return 'none';
}

/** Keep the code-file cache from growing for ever: oldest out first. */
function trim(cache) {
  return cache.keys().then(function (keys) {
    var extra = keys.length - MAX_ASSETS;
    var drops = [];
    for (var i = 0; i < extra; i++) drops.push(cache.delete(keys[i]));
    return Promise.all(drops);
  });
}

function keep(cacheName, request, response) {
  // Only whole, same-origin, successful answers. A partial (206) or an error
  // page must never become the copy served later.
  if (!response || response.status !== 200 || response.type !== 'basic') return;
  var copy = response.clone();
  caches.open(cacheName).then(function (cache) {
    cache.put(request, copy).then(function () {
      if (cacheName === ASSET_CACHE) trim(cache);
    });
  });
}

function offlinePage() {
  return caches.match(OFFLINE_URL).then(function (hit) {
    return (
      hit ||
      new Response(
        "<!doctype html><meta name=viewport content='width=device-width'><title>You're offline</title><p style='font:1rem system-ui;padding:24px'>You're offline. Your changes are saved when you're back online.</p>",
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    );
  });
}

// Only when running as a real service worker (the unit test loads this file
// in a sandbox with no `caches`, to read cacheRule alone).
if (typeof self !== 'undefined' && typeof caches !== 'undefined') {
  self.addEventListener('install', function (event) {
    event.waitUntil(
      caches
        .open(SHELL_CACHE)
        .then(function (cache) {
          return cache.addAll(PRECACHE);
        })
        .then(function () {
          return self.skipWaiting();
        }),
    );
  });

  self.addEventListener('activate', function (event) {
    event.waitUntil(
      caches
        .keys()
        .then(function (names) {
          return Promise.all(
            names
              .filter(function (n) {
                return n.indexOf(PREFIX) === 0 && n !== SHELL_CACHE && n !== ASSET_CACHE;
              })
              .map(function (n) {
                return caches.delete(n);
              }),
          );
        })
        .then(function () {
          return self.clients.claim();
        }),
    );
  });

  self.addEventListener('fetch', function (event) {
    var req = event.request;
    if (req.headers.has('range')) return;
    var rule = cacheRule(req.url, req.method, req.headers.has('authorization'), self.location.origin);
    if (rule === 'none') return;

    if (rule === 'shell') {
      event.respondWith(
        fetch(req).catch(function () {
          return offlinePage();
        }),
      );
      return;
    }

    if (rule === 'asset') {
      event.respondWith(
        caches.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            keep(ASSET_CACHE, req, res);
            return res;
          });
        }),
      );
      return;
    }

    // 'static': the kept copy straight away, a fresh one fetched behind it.
    event.respondWith(
      caches.match(req).then(function (hit) {
        var fresh = fetch(req)
          .then(function (res) {
            keep(SHELL_CACHE, req, res);
            return res;
          })
          .catch(function () {
            return hit || Response.error();
          });
        return hit || fresh;
      }),
    );
  });
}
