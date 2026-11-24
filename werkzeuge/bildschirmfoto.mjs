// Hilfsprogramm: macht ein Bildschirmfoto der App in Handy-Größe (wie Marcs Samsung, 360 Pixel breit).
// Benutzt die echten Folgen aus dem Ordner folgen/ und öffnet den Player (Folge 1).
// Aufruf:  node werkzeuge/bildschirmfoto.mjs [Ziel.png] [Breite] [--spielt]
//          --spielt: Foto während der Wiedergabe (bei Sekunde 150), sonst pausiert am Anfang
// Beispiel: node werkzeuge/bildschirmfoto.mjs /tmp/app.png 360
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const wurzel = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ziel = process.argv[2] || 'bildschirmfoto.png';
const breite = Number(process.argv[3] || 360);
const spielt = process.argv.includes('--spielt');

const typen = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const datei = path.join(wurzel, p);
  if (!datei.startsWith(wurzel) || !fs.existsSync(datei) || !fs.statSync(datei).isFile()) { res.writeHead(404); return res.end(); }
  const daten = fs.readFileSync(datei);
  const typ = typen[path.extname(datei)] || 'application/octet-stream';
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range); // nötig zum Spulen in MP3s
  if (range) {
    const start = range[1] ? +range[1] : 0;
    const ende = range[2] ? Math.min(+range[2], daten.length - 1) : daten.length - 1;
    res.writeHead(206, { 'Content-Type': typ, 'Accept-Ranges': 'bytes', 'Content-Length': ende - start + 1,
      'Content-Range': `bytes ${start}-${ende}/${daten.length}` });
    return res.end(daten.subarray(start, ende + 1));
  }
  res.writeHead(200, { 'Content-Type': typ, 'Accept-Ranges': 'bytes', 'Content-Length': daten.length });
  res.end(daten);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const kontext = await browser.newContext({ viewport: { width: breite, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const seite = await kontext.newPage();
await seite.goto(`http://127.0.0.1:${server.address().port}/`);
await seite.waitForSelector('.folge');
await seite.click('.folge .f-haupt');          // Folge 1 öffnen → Player erscheint
await seite.waitForTimeout(800);
if (spielt) {
  await seite.evaluate(() => window.__podcast.springeZu(150));
  await seite.waitForTimeout(1500);
} else {
  await seite.click('#kPlay').catch(() => {});   // wieder pausieren, damit das Bild ruhig ist
  await seite.waitForTimeout(300);
}
await seite.screenshot({ path: ziel, fullPage: true });
console.log('Bildschirmfoto gespeichert: ' + ziel);
await browser.close();
server.close();
