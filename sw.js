// sw.js — Κύριο Service Worker του PWA (cache / offline / installability).
// Ξεχωριστό από το firebase-messaging-sw.js, που κάνει ΜΟΝΟ background push.

const CACHE_VERSION = 'ibeescale-v1';
const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// ── install: αποθήκευση του "κελύφους" της εφαρμογής ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── activate: καθάρισμα παλιών caches από προηγούμενες εκδόσεις ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── fetch: caching ΜΟΝΟ για στατικά αρχεία του ίδιου domain (app shell).
// Οτιδήποτε άλλο (Apps Script API, ThingSpeak, Firebase, gstatic κ.λπ.)
// πάει κατευθείαν στο δίκτυο, χωρίς παρέμβαση — γιατί είναι δυναμικά δεδομένα
// που ΔΕΝ πρέπει ποτέ να σερβίρονται από cache. ──
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Μόνο GET requests μπαίνουν στη λογική caching.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cross-origin requests (Google Apps Script, ThingSpeak, Firebase, CDNs) -> δίκτυο, χωρίς cache.
  if (url.origin !== self.location.origin) return;

  // Πλοήγηση (άνοιγμα της ίδιας της σελίδας): network-first, με fallback στο cache όταν είμαστε offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          return resp;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Στατικά αρχεία ίδιου origin (css/js/εικόνες μέσα στο ίδιο repo): cache-first, με fallback στο δίκτυο.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
        return resp;
      });
    })
  );
});
