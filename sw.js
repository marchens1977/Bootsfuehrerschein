// Service Worker: macht die App offline-fähig.
// - App-Dateien: erst Internet versuchen (damit Updates ankommen), sonst gespeicherte Kopie.
// - MP3s: aus dem Offline-Speicher, wenn dort vorhanden (mit Unterstützung fürs Spulen).
var APP_CACHE = 'bfp-app-v1';
var AUDIO_CACHE = 'bfp-audio-v1';
var APP_DATEIEN = [
  './', 'index.html', 'css/style.css', 'js/zeitleiste.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'folgen/folgen.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(APP_CACHE).then(function (c) { return c.addAll(APP_DATEIEN); }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (namen) {
    return Promise.all(namen.filter(function (n) {
      return n.indexOf('bfp-') === 0 && n !== APP_CACHE && n !== AUDIO_CACHE;
    }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

function mitZeitlimit(promise, ms) {
  return new Promise(function (ok, fehler) {
    var t = setTimeout(function () { fehler(new Error('zeit')); }, ms);
    promise.then(function (r) { clearTimeout(t); ok(r); }, function (e) { clearTimeout(t); fehler(e); });
  });
}

// Antwort für "Range"-Anfragen (Spulen) aus einer gespeicherten Datei bauen
function teilAntwort(anfrage, antwort) {
  var range = anfrage.headers.get('range');
  if (!range) return antwort;
  return antwort.arrayBuffer().then(function (daten) {
    var m = /bytes=(\d*)-(\d*)/.exec(range);
    var groesse = daten.byteLength;
    var start = m && m[1] ? parseInt(m[1], 10) : 0;
    var ende = m && m[2] ? parseInt(m[2], 10) : groesse - 1;
    if (m && !m[1] && m[2]) { start = groesse - parseInt(m[2], 10); ende = groesse - 1; }
    if (start >= groesse) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + groesse } });
    ende = Math.min(ende, groesse - 1);
    return new Response(daten.slice(start, ende + 1), {
      status: 206,
      headers: {
        'Content-Type': antwort.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Range': 'bytes ' + start + '-' + ende + '/' + groesse,
        'Content-Length': String(ende - start + 1),
        'Accept-Ranges': 'bytes'
      }
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (/\.mp3$/i.test(url.pathname)) {
    e.respondWith(caches.open(AUDIO_CACHE).then(function (c) {
      return c.match(url.href).then(function (gespeichert) {
        if (gespeichert) return teilAntwort(req, gespeichert);
        return fetch(req);
      });
    }));
    return;
  }

  e.respondWith(
    mitZeitlimit(fetch(req), 5000).then(function (antwort) {
      if (antwort && antwort.ok) {
        var kopie = antwort.clone();
        caches.open(APP_CACHE).then(function (c) { c.put(req, kopie); });
      }
      return antwort;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) {
        return r || caches.match('index.html');
      });
    })
  );
});
