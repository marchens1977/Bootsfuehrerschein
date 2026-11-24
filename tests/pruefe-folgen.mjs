// Test 1: Prüft folgen/folgen.json und die Zeit-Berechnung über mehrere Teile.
// Aufruf:  node tests/pruefe-folgen.mjs           (fehlende MP3s = nur Hinweis)
//          node tests/pruefe-folgen.mjs --streng  (fehlende MP3s = Fehler)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const wurzel = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const Z = require(path.join(wurzel, 'js/zeitleiste.js'));
const streng = process.argv.includes('--streng');

let fehler = 0;
let hinweise = 0;
const ok = (t) => console.log('  ✓ ' + t);
const falsch = (t) => { fehler++; console.log('  ✗ FEHLER: ' + t); };
const hinweis = (t) => { hinweise++; console.log('  ! Hinweis: ' + t); };
const gleich = (a, b, t) => (Math.abs(a - b) < 1e-9 ? ok(t) : falsch(`${t} (erwartet ${b}, bekommen ${a})`));

// ---- 1. folgen.json ----
console.log('\n1) folgen/folgen.json');
let daten;
try {
  daten = JSON.parse(fs.readFileSync(path.join(wurzel, 'folgen/folgen.json'), 'utf8'));
  ok('ist gültiges JSON');
} catch (e) {
  falsch('folgen.json ist kein gültiges JSON: ' + e.message);
  process.exit(1);
}
const folgen = daten.folgen;
if (!Array.isArray(folgen) || !folgen.length) falsch('"folgen" fehlt oder ist leer');
const nummern = new Set();
const alleTeile = new Set();
const BEREICHE = ['Basis', 'See', 'Binnen'];
(folgen || []).forEach((f, i) => {
  const wo = `Eintrag ${i + 1}`;
  if (!Number.isInteger(f.nummer) || f.nummer < 1) falsch(`${wo}: "nummer" muss eine ganze Zahl ab 1 sein`);
  else if (nummern.has(f.nummer)) falsch(`${wo}: Nummer ${f.nummer} kommt doppelt vor`);
  nummern.add(f.nummer);
  if (typeof f.titel !== 'string' || !f.titel.trim()) falsch(`${wo}: "titel" fehlt`);
  if (!BEREICHE.includes(f.bereich)) falsch(`${wo}: "bereich" muss Basis, See oder Binnen sein (ist "${f.bereich}")`);
  if (!Array.isArray(f.teile) || !f.teile.length) { falsch(`${wo}: "teile" muss eine Liste mit mind. 1 Datei sein`); return; }
  const nr2 = String(f.nummer).padStart(2, '0');
  f.teile.forEach((t, k) => {
    const erwartet = `folge-${nr2}-${String.fromCharCode(97 + k)}.mp3`;
    if (typeof t !== 'string' || !/^[a-z0-9-]+\.mp3$/.test(t)) falsch(`${wo}: Dateiname "${t}" ungültig (nur Kleinbuchstaben, Zahlen, Bindestrich, .mp3)`);
    else if (t !== erwartet) hinweis(`${wo}: "${t}" weicht vom Namensschema ab (erwartet "${erwartet}")`);
    if (alleTeile.has(t)) falsch(`${wo}: Datei "${t}" wird mehrfach benutzt`);
    alleTeile.add(t);
  });
  if (!fehler) ok(`Folge ${f.nummer} "${f.titel}" (${f.bereich}, ${f.teile.length} Teile) ist richtig eingetragen`);
});

// Reihenfolge: erst Basis, dann See, dann Binnen
const rang = (folgen || []).map((f) => BEREICHE.indexOf(f.bereich));
if (rang.some((r, i) => i > 0 && r < rang[i - 1])) hinweis('Reihenfolge ist nicht Basis → See → Binnen');
const sortiert = (folgen || []).every((f, i, a) => i === 0 || f.nummer > a[i - 1].nummer);
sortiert ? ok('Nummern sind aufsteigend sortiert') : hinweis('Nummern sind nicht aufsteigend sortiert');

// ---- 2. Dateien vorhanden? ----
console.log('\n2) MP3-Dateien im Ordner folgen/');
let ffprobe = true;
try { execFileSync('ffprobe', ['-version'], { stdio: 'ignore' }); } catch { ffprobe = false; }
(folgen || []).forEach((f) => {
  const dauern = [];
  (f.teile || []).forEach((t) => {
    const datei = path.join(wurzel, 'folgen', t);
    if (!fs.existsSync(datei)) {
      (streng ? falsch : hinweis)(`${t} fehlt noch (App zeigt "Audio folgt bald")`);
      return;
    }
    const groesse = fs.statSync(datei).size;
    if (groesse < 1000) falsch(`${t} ist verdächtig klein (${groesse} Bytes)`);
    if (ffprobe) {
      try {
        const d = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', datei]).toString());
        dauern.push(d);
        ok(`${t} vorhanden (${Z.formatZeit(d)} Min., ${(groesse / 1048576).toFixed(1)} MB)`);
      } catch { falsch(`${t} ist keine lesbare Audiodatei`); }
    } else ok(`${t} vorhanden`);
  });
  if (dauern.length === f.teile.length && dauern.length) {
    ok(`Folge ${f.nummer} gesamt: ${Z.formatZeit(Z.gesamtDauer(dauern))} Min.`);
  }
});

// ---- 3. Zeit-Berechnung über mehrere Teile ----
console.log('\n3) Teile werden richtig zusammengerechnet');
const d = [300, 200.5, 100];
gleich(Z.gesamtDauer(d), 600.5, 'Gesamtlänge = Summe aller Teile');
gleich(Z.startZeiten(d)[2], 500.5, 'Teil C beginnt nach A + B');
let r = Z.findeTeil(d, 0); gleich(r.teil, 0, 'Sekunde 0 → Teil A');
r = Z.findeTeil(d, 299.9); gleich(r.teil, 0, 'kurz vor Ende von A → noch Teil A');
r = Z.findeTeil(d, 300); gleich(r.teil, 1, 'genau Ende A → Anfang Teil B'); gleich(r.zeit, 0, '… bei 0 Sekunden in B');
r = Z.findeTeil(d, 310); gleich(r.teil, 1, '310 s → Teil B'); gleich(r.zeit, 10, '… 10 s in Teil B');
r = Z.findeTeil(d, 550); gleich(r.teil, 2, '550 s → Teil C'); gleich(r.zeit, 49.5, '… 49,5 s in Teil C');
r = Z.findeTeil(d, 9999); gleich(r.teil, 2, 'über das Ende hinaus → letzter Teil'); gleich(r.zeit, 100, '… am Ende');
r = Z.findeTeil(d, -20); gleich(r.teil, 0, 'negative Zeit → Anfang'); gleich(r.zeit, 0, '… bei 0');
gleich(Z.folgenZeit(d, 1, 10), 310, 'Teil B + 10 s = 310 s in der Folge');
// Spulen über Teilgrenze: 10 s vor Ende A, +15 s → 5 s in B
r = Z.findeTeil(d, Z.folgenZeit(d, 0, 290) + 15); gleich(r.teil, 1, '+15 s über die Grenze A→B'); gleich(r.zeit, 5, '… landet 5 s in Teil B');
r = Z.findeTeil(d, Z.folgenZeit(d, 1, 5) - 15); gleich(r.teil, 0, '-15 s zurück über Grenze B→A'); gleich(r.zeit, 290, '… landet bei 290 s in A');
gleich(Z.findeTeil([], 5).teil, 0, 'leere Liste stürzt nicht ab');
const fmt = [[0, '0:00'], [59, '0:59'], [61, '1:01'], [754, '12:34'], [3725, '1:02:05'], [NaN, '0:00']];
fmt.forEach(([s, t]) => (Z.formatZeit(s) === t ? ok(`formatZeit(${s}) = ${t}`) : falsch(`formatZeit(${s}) = ${Z.formatZeit(s)}, erwartet ${t}`)));

console.log(`\nErgebnis: ${fehler} Fehler, ${hinweise} Hinweise`);
process.exit(fehler ? 1 : 0);
