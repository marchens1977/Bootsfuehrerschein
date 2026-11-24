# CLAUDE.md – Projekt-Tagebuch „Bootsführerschein-Podcast“

## Grundregeln für die Zusammenarbeit (von Marc)
- Marc baut Apps als Hobby mit KI und hat nie programmiert. Alles auf **Deutsch, in einfachen Worten** erklären. Fachbegriffe vermeiden oder kurz erklären.
- Kleine, nummerierte Schritte mit **„Du machst:“** und **„Ich mache:“**.
- Marc hat nur ein Samsung-Handy und einen Raspberry Pi 400, **keinen PC**. Er arbeitet nur über GitHub (Konto marchens1977). Befehle für den Raspberry Pi immer komplett zum Kopieren angeben und erklären.
- Wenn etwas unklar ist: kurz nachfragen statt raten. Vor größeren Änderungen in 2–3 Sätzen sagen, was geplant ist.
- **Vor jeder Code-Änderung fragen:** direkt auf `main` speichern oder Branch + Pull Request (den Marc selbst merged)? Nach jeder Änderung sagen, ob Marc noch etwas tun muss (z. B. mergen), damit sie in der App ankommt.
- **Nichts löschen oder überschreiben, ohne vorher zu fragen.**
- Keine Schlüssel, Passwörter oder persönlichen Daten in Code oder Repository. Vorher Bescheid sagen, wenn etwas Geld kostet (API-Guthaben, Abos, Credits). Bei ElevenLabs immer nur **eine** Variante erzeugen.
- Nur „funktioniert“ melden, wenn es wirklich getestet wurde. Offen sagen, was ungetestet ist.
- Tests und Hilfsprogramme im Repository speichern, hier beschreiben und nach jeder Änderung laufen lassen.
- Am Ende jeder Aufgabe: kurz sagen, was geändert wurde, was Marc tun/testen soll und wo der Link zur App ist.

## Zweck der App
Marc lernt für den **Sportbootführerschein Binnen und See** (beide Prüfungen möglichst auf einmal) – und zwar nur per Audio: im Auto oder abends.
Die Lern-Podcasts erstellt Marc mit Claude im Chat (Texte nach den amtlichen Prüfungsfragen von ELWIS, vertont mit ElevenLabs).
**Diese App spielt die fertigen MP3s nur ab.** Sie erzeugt keine Sprache und braucht keinen ElevenLabs-Zugang.

Format jeder Folge: 5–10 Minuten, ein Thema. Kurz erklärt → Prüfungsfrage → Pause zum Mitdenken → Antwort → Merksatz. Am Ende die 3 wichtigsten Merksätze.
Reihenfolge: erst **Basis** (gilt für Binnen und See), dann **See**, dann **Binnen**.

- **App-Link:** https://marchens1977.github.io/Bootsfuehrerschein/
- **Repository:** https://github.com/marchens1977/Bootsfuehrerschein (öffentlich)

## Aktueller Stand (24.11.2026)
- App fertig gebaut: Liste, Filter, Player, Weiterhören, Fortschritt, Geschwindigkeit, automatisch weiter / wiederholen, Sperrbildschirm-Steuerung, Export/Import, Offline-Speicher, installierbar (PWA).
- `folgen/folgen.json` enthält Folge 1 „Lichter und Signale“ und Folge 2 „Ausweichen und Begegnen“ (beide Basis, je 2 Teile).
- MP3s von Folge 1 sind da: `folge-01-a.mp3` (4:04) + `folge-01-b.mp3` (2:17) = **6:21 Min.** Marc hatte sie versehentlich in den Hauptordner hochgeladen, Claude hat sie nach `folgen/` verschoben. Übergang A → B mit den echten Dateien im Test-Browser geprüft.
- GitHub Pages ist noch **nicht** eingeschaltet (kann Claude nicht selbst, Marc muss es in den Settings tun).
- **Folge 2** am 24.11.2026 komplett aus Google Drive geholt (MP3s + Manuskript): `folge-02-a.mp3` (3:31) + `folge-02-b.mp3` (3:06) = **6:38 Min.** In Drive hießen die MP3s `folge-2-a.mp3` / `folge-2-b.mp3` (ohne führende Null); Claude hat sie beim Kopieren richtig benannt. Teil a: 3.300 Zeichen, Teil b: 2.863 Zeichen. Quelle: ELWIS-Basisfragen 14, 15, 34, 36, 37, 61.
- Manuskript von Folge 1 liegt als `texte/folge-01.md` im Repository (aus Google Drive geholt). Teil a: 3.661 Zeichen, Teil b: 1.970 Zeichen. Quelle: ELWIS-Basisfragen 4, 5, 7, 10, 11, 12, 13, 16, 24, 72.
- Design auf Marcs Corporate Design umgestellt (Orange & Blau wie die New York Mets).
- Alle automatischen Tests laufen durch (siehe unten). Auf Marcs Handy ist noch nichts getestet.

## Wichtige Entscheidungen
1. **Eine Folge = mehrere MP3-Teile.** ElevenLabs vertont höchstens 5.000 Zeichen auf einmal. Darum besteht eine Folge oft aus 2 oder mehr Dateien. Die App zeigt trotzdem nur *eine* Folge: Teile laufen automatisch nacheinander, Balken, Restzeit, Weiterhören und ±15 s gelten für die ganze Folge. Die Umrechnung steckt in `js/zeitleiste.js`.
2. **Reines HTML, CSS, JavaScript** – keine Bibliotheken, kein Build-Schritt. GitHub Pages zeigt die Dateien direkt an.
3. **Ein einziges Audio-Element**, das beim Teilwechsel die nächste Datei lädt. Grund: so bleiben Sperrbildschirm und Lenkradtasten stabil. Nachteil: zwischen zwei Teilen kann eine winzige Lücke entstehen (im Test: 6 ms, auf dem Handy evtl. etwas mehr).
4. **Länge wird aus den MP3s gemessen** (nicht in folgen.json eingetragen) und im Browser gemerkt.
5. **„Fehlt“ gilt nur bei echter 404-Meldung** des Servers. Bei Netzproblemen wird die Folge nicht fälschlich als „folgt bald“ markiert.
6. **Offline:** Ein Service Worker (`sw.js`) speichert die App selbst. MP3s werden gespeichert, wenn man „⬇ Offline speichern“ antippt **oder automatisch, sobald eine Folge fertig gehört ist**. (Automatisch *während* des Abspielens speichern hat im Test die Wiedergabe gestört – darum erst am Ende.)
7. **Automatische Wiederaufnahme:** Bricht die Wiedergabe ab (z. B. Funkloch), lädt die App den Teil bis zu 3-mal neu und macht an derselben Stelle weiter.
8. **Lenkradtasten:** „Weiter/Zurück“ = nächste/vorige Folge; „Spulen“ = ±15 s.
9. **Corporate Design: Orange & Blau wie die New York Mets.** Hintergrund dunkles Mets-Blau `#001a42`, Flächen Mets-Blau `#002d72`, große Knöpfe Mets-Orange `#ff5910` mit dunkelblauer Schrift, dazu Weiß. Farben stehen oben in `css/style.css` (`:root`), App-Symbol in `werkzeuge/mache-icons.py`. Dunkel bleibt es wegen der Nutzung im Auto.
10. **Gespeicherte Daten** liegen im Browser-Speicher (`localStorage`, Schlüssel `bfp-daten-v1`). Export/Import als JSON-Datei. Import fragt vorher, weil er den aktuellen Stand ersetzt.

## Google Drive (Austausch zwischen Claude-Chat und Claude Code)
Neue Folgen (MP3s + Manuskript) kommen zuerst in Marcs Google Drive, Claude Code holt sie von dort ins Repository.
| Ordner | Link |
|---|---|
| Bootsführerschein (Hauptordner) | https://drive.google.com/drive/folders/1OTZ_CjS2TqEH-52egq04CnHjRDk3vslF |
| folgen (MP3s) | https://drive.google.com/drive/folders/1qfg5up9OnT-VhzsQE2uDcUuE24N2zkG8 |
| texte (Manuskripte) | https://drive.google.com/drive/folders/1H75fH5yBp8U2K08bUR6kKn3xQDYiZKZ3 |

So holt Claude Code eine Datei: Google-Drive-Verbindung → im Ordner suchen (`parentId = '<Ordner-ID>'`) → `download_file_content`. Die Datei landet als Datei in der Sitzung und wird dann ins Repository kopiert. Direkter Download über drive.google.com ist in der Sitzung gesperrt, ist aber auch nicht nötig.
- Getestet am 24.11.2026 mit `folge-01.md` (Text) und mit Folge 2 (2 MP3s + Text): **klappt auch mit MP3s**, die Dateien kamen unverändert an (Größe und Länge geprüft).
- MP3s von Folge 1 liegen schon im Repository und sollen nicht angefasst werden.

## Vertonungs-Einstellungen (damit alle Folgen gleich klingen)
| Einstellung | Wert |
|---|---|
| Dienst | ElevenLabs |
| Stimme | „Marco – Warm & Friendly Narrator“ |
| voice_id | `xpx2H2DghGxsTBJ1pQO1` |
| Modell | `eleven_v4` |
| Länge pro Teil | höchstens 5.000 Zeichen |
| Varianten | immer nur **eine** (kostet sonst doppelt Guthaben) |

## Aufbau der Dateien
```
index.html            Die App-Seite
css/style.css         Aussehen (dunkel, große Knöpfe)
js/zeitleiste.js      Rechnet Zeiten über mehrere Teile (auch von den Tests benutzt)
js/app.js             Die eigentliche App
sw.js                 Service Worker (offline)
manifest.webmanifest  Damit man die App auf den Startbildschirm legen kann
icons/                App-Symbole (erzeugt mit werkzeuge/mache-icons.py)
folgen/folgen.json    Liste aller Folgen
folgen/*.mp3          Die Audio-Teile
texte/                Manuskripte als Markdown (folge-01.md …)
tests/                Automatische Tests
werkzeuge/            Hilfsprogramme
.github/workflows/    Prüft folgen.json automatisch bei jeder Änderung auf GitHub
```

## So kommt eine neue Folge in die App
1. MP3-Teile richtig benennen: `folge-NN-a.mp3`, `folge-NN-b.mp3`, … (NN = Folgennummer zweistellig, z. B. `folge-02-a.mp3`). Nur Kleinbuchstaben, keine Leerzeichen.
2. Auf github.com im Handy-Browser: Repository öffnen → **erst in den Ordner `folgen` tippen** (sonst landen die Dateien im Hauptordner) → **„Add file“ → „Upload files“** → MP3s auswählen → unten **„Commit changes“**.
3. In `folgen/folgen.json` einen Eintrag ergänzen (Stift-Symbol zum Bearbeiten). Beispiel – Komma zwischen den Einträgen nicht vergessen:
   ```json
   {
     "nummer": 2,
     "titel": "Ausweichregeln",
     "bereich": "Basis",
     "teile": ["folge-02-a.mp3", "folge-02-b.mp3"]
   }
   ```
   `bereich` ist genau eins von: `Basis`, `See`, `Binnen`. Die Länge muss man **nicht** eintragen.
4. Nach 1–2 Minuten ist die Folge in der App (evtl. App einmal neu laden).
5. Einfacher: MP3s und Manuskript in den Google-Drive-Ordner „Bootsführerschein“ legen (MP3s nach `folgen`, Manuskript nach `texte`) und Claude Code bitten: „Hol Folge 2 aus meinem Google-Drive-Ordner Bootsführerschein und trag sie in die App ein.“ Claude prüft dann alles mit den Tests.
6. Das Manuskript als `texte/folge-NN.md` speichern.

## Tests
| Test | Was er prüft | Befehl |
|---|---|---|
| `tests/pruefe-folgen.mjs` | folgen.json gültig (Nummern, Titel, Bereich, Dateinamen), welche MP3s vorhanden sind (+ Länge, wenn ffprobe da ist), ob es zu jeder Folge ein Manuskript `texte/folge-NN.md` gibt, ob die Anzahl „## Teil …“-Abschnitte zu den MP3s passt und ob jeder Teil höchstens 5.000 Zeichen hat, und ob die Teile richtig zusammengerechnet werden (`zeitleiste.js`) | `node tests/pruefe-folgen.mjs` (mit `--streng` zählen fehlende MP3s als Fehler) |
| `tests/browser-test.mjs` | Die echte App in Chromium mit Test-Tönen: Liste, Filter, Teil A → B nahtlos, Restzeit, automatisch weiter, Zählen, Spulen über Teilgrenzen, Geschwindigkeit, Weiterhören nach Neustart, „Audio folgt bald“, Export/Import, Offline-Speichern (auch während des Abspielens), Spielen und Spulen ohne Internet, Sperrbildschirm-Titel | `node tests/browser-test.mjs` (braucht Playwright + ffmpeg, läuft in Claude-Sitzungen) |

Auf GitHub läuft `pruefe-folgen.mjs` automatisch bei jeder Änderung (Reiter „Actions“). Ein rotes ✗ heißt: in folgen.json ist ein Fehler.

**Letzter Lauf (24.11.2026, nach Folge 2):** `pruefe-folgen.mjs --streng` 0 Fehler (alle 4 MP3s vorhanden, Manuskripte Folge 1 und 2 geprüft), `browser-test.mjs` 0 Fehler. Zusätzlich die App mit den echten Dateien geöffnet: Folge 2 erscheint mit 6:38 Min.

## Hilfsprogramme
- `werkzeuge/mache-icons.py` – erzeugt die App-Symbole neu (`python3 werkzeuge/mache-icons.py`, braucht Pillow).

## Offene Punkte
- [x] MP3s von Folge 1 hochgeladen.
- [x] Manuskript Folge 1 als `texte/folge-01.md`.
- [x] Ersten MP3-Transport Drive → Repository mit Folge 2 testen.
- [x] Folge 2 „Ausweichen und Begegnen“ eingebunden.
- [ ] GitHub Pages einschalten (siehe README).
- [ ] Alles auf dem Handy und im Auto testen (Liste unten).
- [ ] Ideen für später: Schlaf-Timer, Lesezeichen/Kapitel, „nur ungehörte Folgen“.

## Test-Liste für Marc (am Handy abhaken)
**Grundlagen**
- [ ] App-Link öffnet sich im Handy-Browser (Chrome oder Samsung Internet)
- [ ] Folge 1 zeigt Titel, „Basis“ und die Gesamtlänge (beide Teile zusammen)
- [ ] Filter „Basis / See / Binnen / Alle“ funktionieren
- [ ] Antippen der Folge startet die Wiedergabe

**Mehrere Teile**
- [ ] Teil A geht ohne spürbare Pause in Teil B über
- [ ] Der Balken läuft über die ganze Folge (nicht nur über einen Teil)
- [ ] Restzeit stimmt für die ganze Folge
- [ ] 15 s vor/zurück klappt auch genau an der Grenze zwischen Teil A und B

**Weiterhören und Fortschritt**
- [ ] Mitten in der Folge pausieren, App schließen, wieder öffnen → großer Knopf „Weiterhören“ startet an der richtigen Stelle
- [ ] Status zeigt „Neu“ → „Angefangen“ → „Fertig · 1× komplett gehört“
- [ ] Nach zweimal komplett Hören steht „2×“ da
- [ ] Geschwindigkeit 0,8x / 1x / 1,25x / 1,5x hörbar und bleibt nach Neustart erhalten
- [ ] „Automatisch weiter“ an: nach dem Ende von Folge 1 startet Folge 2
- [ ] Folge 2 zeigt „Ausweichen und Begegnen“, „Basis“ und 6:38 Min., Teil A → B läuft durch
- [ ] „Folge wiederholen“ an: Folge startet nach dem Ende von vorn

**Sperrbildschirm und Auto**
- [ ] Sperrbildschirm zeigt den Titel der Folge
- [ ] Abspielen/Pause über den Sperrbildschirm klappt
- [ ] Wiedergabe läuft bei gesperrtem Bildschirm weiter – auch über den Wechsel Teil A → B
- [ ] Im Auto (Bluetooth): Titel wird im Display angezeigt
- [ ] Lenkradtasten: Pause/Play klappt
- [ ] Lenkradtasten: Weiter/Zurück springt zur nächsten/vorigen Folge

**Installieren und offline**
- [ ] Browser-Menü → „Zum Startbildschirm hinzufügen“ / „App installieren“ klappt, Symbol erscheint
- [ ] „⬇ Offline speichern“ bei Folge 1 → Knopf zeigt „✓ Offline“
- [ ] Flugmodus an → App öffnen → Folge 1 spielt und lässt sich spulen
- [ ] Fertig gehörte Folge zeigt danach automatisch „✓ Offline“

**Design**
- [ ] Farben Orange/Blau gefallen und sind im Auto gut lesbar (auch bei Sonne)
- [ ] Neues App-Symbol (orange Kopfhörer auf Blau) erscheint auf dem Startbildschirm (ggf. App einmal entfernen und neu hinzufügen)

**Sichern**
- [ ] Menü ☰ → „Fortschritt sichern“ lädt eine Datei herunter
- [ ] Menü ☰ → „Fortschritt einlesen“ mit dieser Datei stellt den Stand wieder her
