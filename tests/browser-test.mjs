// Test 2: Testet die echte App in einem Browser (Chromium) mit kleinen Test-MP3s.
// Braucht: Node.js, Playwright (mit Chromium) und ffmpeg.
// Aufruf:  node tests/browser-test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const wurzel = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// ---- Test-Folgen erzeugen (Töne statt Sprache) ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bfp-test-'));
const ton = (name, sek, hz) => execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', `sine=frequency=${hz}:duration=${sek}`,
  '-ac', '1', '-ar', '44100', '-b:a', '128k', path.join(tmp, name)]);
ton('folge-01-a.mp3', 6, 440);
ton('folge-01-b.mp3', 4, 660);
ton('folge-02-a.mp3', 20, 550);
fs.writeFileSync(path.join(tmp, 'folgen.json'), JSON.stringify({ folgen: [
  { nummer: 1, titel: 'Testfolge Eins', bereich: 'Basis', teile: ['folge-01-a.mp3', 'folge-01-b.mp3'] },
  { nummer: 2, titel: 'Testfolge Zwei', bereich: 'See', teile: ['folge-02-a.mp3'] },
  { nummer: 3, titel: 'Testfolge Drei', bereich: 'Binnen', teile: ['folge-03-a.mp3'] }
] }));

// ---- Kleiner Webserver (mit Spul-Unterstützung) ----
const typen = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const datei = p.startsWith('/folgen/') ? path.join(tmp, p.slice(8)) : path.join(wurzel, p);
  if (!fs.existsSync(datei) || !fs.statSync(datei).isFile()) { res.writeHead(404); return res.end('fehlt'); }
  const daten = fs.readFileSync(datei);
  const typ = typen[path.extname(datei)] || 'application/octet-stream';
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
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
const adresse = `http://127.0.0.1:${server.address().port}/`;

let fehler = 0;
const pruefe = (bed, text) => { if (bed) console.log('  ✓ ' + text); else { fehler++; console.log('  ✗ FEHLER: ' + text); } };

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const kontext = await browser.newContext({ acceptDownloads: true, viewport: { width: 400, height: 860 } });
const seite = await kontext.newPage();
const jsFehler = [];
seite.on('pageerror', (e) => jsFehler.push(e.message));
const warte = (fn, arg, ms = 15000) => seite.waitForFunction(fn, arg, { timeout: ms });

try {
  console.log('\n1) Liste');
  await seite.goto(adresse);
  await warte(() => document.querySelectorAll('.folge').length === 3);
  pruefe(true, '3 Folgen werden angezeigt');
  await warte(() => document.querySelector('[data-nummer="1"] .f-dauer').textContent.includes('0:10'));
  pruefe(true, 'Folge 1 zeigt Gesamtlänge 0:10 (6 s Teil A + 4 s Teil B)');
  await warte(() => document.querySelector('[data-nummer="3"] .f-status').textContent.includes('Audio folgt bald'));
  pruefe(true, 'Folge 3 ohne MP3 zeigt "Audio folgt bald"');
  pruefe(await seite.textContent('[data-nummer="1"] .f-status') === '● Neu', 'Folge 1 hat Status "Neu"');
  await seite.click('[data-filter="See"]');
  pruefe((await seite.$$('.folge')).length === 1 && (await seite.textContent('.f-titel')) === 'Testfolge Zwei', 'Filter "See" zeigt nur Folge 2');
  await seite.click('[data-filter="Alle"]');

  console.log('\n2) Abspielen über zwei Teile');
  await seite.evaluate(() => {
    window.__log = [];
    const a = document.getElementById('audio');
    ['ended', 'playing'].forEach((ev) => a.addEventListener(ev, () => window.__log.push([ev, performance.now(), a.src])));
  });
  await seite.click('[data-nummer="1"] .f-haupt');
  await warte(() => !document.getElementById('audio').paused);
  pruefe(true, 'Antippen startet Folge 1');
  pruefe(await seite.isVisible('#player'), 'Player ist sichtbar');
  const titel = await seite.evaluate(() => navigator.mediaSession && navigator.mediaSession.metadata && navigator.mediaSession.metadata.title);
  pruefe(titel === 'Folge 1: Testfolge Eins', 'Sperrbildschirm-Titel gesetzt: ' + titel);
  await warte(() => window.__podcast.aktTeil() === 1 && window.__podcast.globalePos() > 6.2, null, 20000);
  pruefe(true, 'Nach Teil A spielt automatisch Teil B, Zeit läuft weiter (über 6 s)');
  const luecke = await seite.evaluate(() => {
    const e = window.__log.find((x) => x[0] === 'ended');
    const p = window.__log.find((x) => x[0] === 'playing' && x[1] > e[1]);
    return p[1] - e[1];
  });
  pruefe(luecke < 400, `Übergang A→B dauert ${Math.round(luecke)} ms (Ziel: unter 0,4 s)`);
  const rest = await seite.textContent('#pRest');
  pruefe(/^-0:0[0-4]$/.test(rest), 'Restzeit gilt für die ganze Folge: ' + rest);

  console.log('\n3) Automatisch weiter + Zählen');
  await warte(() => document.getElementById('pTitel').textContent === 'Testfolge Zwei', null, 20000);
  pruefe(true, 'Nach Ende von Folge 1 startet Folge 2 automatisch');
  const st1 = await seite.textContent('[data-nummer="1"] .f-status');
  pruefe(st1.includes('Fertig') && st1.includes('1× komplett'), 'Folge 1: ' + st1);

  console.log('\n4) Spulen über die Teilgrenze');
  await seite.click('[data-nummer="1"] .f-haupt');
  await warte(() => document.getElementById('pTitel').textContent === 'Testfolge Eins');
  await seite.click('#kPlay'); // Pause
  await seite.evaluate(() => window.__podcast.springeZu(5));
  await seite.click('#kVor'); // +15 s -> ans Ende (0:10 begrenzt)
  await seite.waitForTimeout(300);
  pruefe(await seite.evaluate(() => window.__podcast.aktTeil()) === 1, '+15 s springt von Teil A nach Teil B');
  await seite.evaluate(() => window.__podcast.springeZu(7.5));
  await seite.waitForTimeout(300);
  await seite.click('#kZurueck');
  await seite.waitForTimeout(300);
  const pos0 = await seite.evaluate(() => [window.__podcast.aktTeil(), window.__podcast.globalePos()]);
  pruefe(pos0[0] === 0 && pos0[1] < 0.5, '-15 s springt von Teil B zurück an den Anfang von Teil A');
  await seite.evaluate(() => window.__podcast.springeZu(7.5));
  await seite.waitForTimeout(400);
  const pos = await seite.evaluate(() => [window.__podcast.aktTeil(), window.__podcast.globalePos()]);
  pruefe(pos[0] === 1 && Math.abs(pos[1] - 7.5) < 0.3, `Springen zu 7,5 s landet in Teil B (${pos[1].toFixed(2)} s)`);
  await seite.click('[data-tempo="1.5"]');
  pruefe(await seite.evaluate(() => document.getElementById('audio').playbackRate) === 1.5, 'Geschwindigkeit 1,5x wird gesetzt');

  console.log('\n5) Weiterhören nach Neustart');
  await seite.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await seite.reload();
  await warte(() => !document.getElementById('weiterhoeren').hidden);
  const wh = await seite.textContent('#weiterhoeren');
  pruefe(wh.includes('Testfolge Eins') && wh.includes('0:07'), 'Weiterhören-Knopf zeigt Folge 1 bei 0:07');
  await seite.click('#weiterhoeren');
  await warte(() => !document.getElementById('audio').paused);
  const pos2 = await seite.evaluate(() => [window.__podcast.aktTeil(), window.__podcast.globalePos()]);
  pruefe(pos2[0] === 1 && pos2[1] >= 7.3, `Weiterhören startet in Teil B bei ${pos2[1].toFixed(1)} s`);
  pruefe(await seite.evaluate(() => document.getElementById('audio').playbackRate) === 1.5, 'Geschwindigkeit bleibt nach Neustart erhalten');
  await seite.click('#kPlay');

  console.log('\n6) Fehlende Folge');
  await seite.click('[data-nummer="3"] .f-haupt');
  await warte(() => !document.getElementById('pMeldung').hidden);
  pruefe((await seite.textContent('#pMeldung')).includes('Audio folgt bald'), 'Player zeigt "Audio folgt bald" statt abzustürzen');
  await seite.click('#kPlay');
  pruefe(await seite.evaluate(() => document.getElementById('audio').paused), 'Play-Knopf bei fehlender Folge macht nichts kaputt');

  console.log('\n7) Export und Import');
  await seite.click('#menueKnopf');
  const [download] = await Promise.all([seite.waitForEvent('download'), seite.click('#exportKnopf')]);
  const exportDatei = path.join(tmp, 'export.json');
  await download.saveAs(exportDatei);
  const exp = JSON.parse(fs.readFileSync(exportDatei, 'utf8'));
  pruefe(exp.app === 'bootsfuehrerschein-podcast' && exp.fortschritt['1'].durchlaeufe === 1, 'Export enthält Fortschritt (Folge 1: 1× gehört)');
  await seite.evaluate(() => localStorage.clear());
  seite.on('dialog', (d) => d.accept()); // "ersetzen?" und "eingelesen" bestätigen
  await Promise.all([seite.waitForEvent('load'), seite.setInputFiles('#importDatei', exportDatei)]);
  await warte(() => document.querySelector('[data-nummer="1"] .f-status') && document.querySelector('[data-nummer="1"] .f-status').textContent.includes('1×'));
  pruefe(true, 'Import stellt den Fortschritt wieder her');

  console.log('\n8) Offline');
  await seite.evaluate(() => navigator.serviceWorker.ready);
  await seite.reload(); // jetzt steuert der Service Worker die Seite
  await warte(() => navigator.serviceWorker.controller !== null);
  await warte(() => document.querySelector('[data-nummer="1"] .f-offline').textContent.includes('✓ Offline'), null, 20000);
  pruefe(true, 'Angehörte Folge 1 wurde automatisch offline gespeichert');
  // Folge 2 abspielen und WÄHREND des Abspielens offline speichern
  await seite.click('[data-nummer="2"] .f-haupt');
  await warte(() => document.getElementById('pTitel').textContent === 'Testfolge Zwei' && window.__podcast.globalePos() > 0.5);
  await seite.click('[data-nummer="2"] .f-offline');
  await warte(() => document.querySelector('[data-nummer="2"] .f-offline').textContent.includes('✓ Offline'));
  pruefe(true, 'Knopf "Offline speichern" speichert Folge 2 (während sie läuft)');
  await seite.evaluate(() => window.__podcast.springeZu(14));
  await warte(() => window.__podcast.globalePos() > 15.5 && !document.getElementById('audio').paused, null, 15000);
  pruefe(true, 'Folge 2 spielt nach dem Speichern + Spulen weiter (automatische Wiederaufnahme)');
  await seite.click('#kPlay');
  await kontext.setOffline(true);
  await seite.reload();
  await warte(() => document.querySelectorAll('.folge').length === 3);
  pruefe(true, 'App öffnet sich ohne Internet');
  await seite.click('[data-nummer="1"] .f-haupt');
  await seite.evaluate(() => window.__podcast.springeZu(0));
  await seite.click('#kPlay').catch(() => {});
  await warte(() => window.__podcast.globalePos() > 1 || window.__podcast.aktTeil() === 1, null, 15000);
  pruefe(true, 'Folge 1 spielt ohne Internet');
  await seite.evaluate(() => window.__podcast.springeZu(8));
  await seite.waitForTimeout(500);
  pruefe(await seite.evaluate(() => window.__podcast.aktTeil()) === 1, 'Spulen ohne Internet klappt (Teil B)');
  await kontext.setOffline(false);

  pruefe(jsFehler.length === 0, 'Keine JavaScript-Fehler' + (jsFehler.length ? ': ' + jsFehler.join(' | ') : ''));
} catch (e) {
  fehler++;
  console.log('  ✗ FEHLER (Abbruch): ' + e.message.split('\n')[0]);
  await seite.screenshot({ path: path.join(tmp, 'fehler.png') }).catch(() => {});
  console.log('    Bildschirmfoto: ' + path.join(tmp, 'fehler.png'));
} finally {
  await browser.close();
  server.close();
}
console.log(`\nErgebnis: ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
