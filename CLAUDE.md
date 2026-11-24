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
- `folgen/folgen.json` enthält Folge 1 „Lichter und Signale“ (Basis, 2 Teile).
- MP3s von Folge 1 sind da: `folge-01-a.mp3` (4:04) + `folge-01-b.mp3` (2:17) = **6:21 Min.** Marc hatte sie versehentlich in den Hauptordner hochgeladen, Claude hat sie nach `folgen/` verschoben. Übergang A → B mit den echten Dateien im Test-Browser geprüft.
- GitHub Pages ist noch **nicht** eingeschaltet (kann Claude nicht selbst, Marc muss es in den Settings tun).
- Manuskript von Folge 1 liegt nur als Audio im Claude-Projekt vor → `texte/` enthält nur eine Erklärung.
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
5. Einfacher: Claude in einer Sitzung bitten „Trag Folge 2 ein“ – Claude prüft dann auch alles mit den Tests.
6. Das Manuskript als `texte/folge-NN.md` speichern.

## Tests
| Test | Was er prüft | Befehl |
|---|---|---|
| `tests/pruefe-folgen.mjs` | folgen.json gültig (Nummern, Titel, Bereich, Dateinamen), welche MP3s vorhanden sind (+ Länge, wenn ffprobe da ist), und ob die Teile richtig zusammengerechnet werden (`zeitleiste.js`) | `node tests/pruefe-folgen.mjs` (mit `--streng` zählen fehlende MP3s als Fehler) |
| `tests/browser-test.mjs` | Die echte App in Chromium mit Test-Tönen: Liste, Filter, Teil A → B nahtlos, Restzeit, automatisch weiter, Zählen, Spulen über Teilgrenzen, Geschwindigkeit, Weiterhören nach Neustart, „Audio folgt bald“, Export/Import, Offline-Speichern (auch während des Abspielens), Spielen und Spulen ohne Internet, Sperrbildschirm-Titel | `node tests/browser-test.mjs` (braucht Playwright + ffmpeg, läuft in Claude-Sitzungen) |

Auf GitHub läuft `pruefe-folgen.mjs` automatisch bei jeder Änderung (Reiter „Actions“). Ein rotes ✗ heißt: in folgen.json ist ein Fehler.

**Letzter Lauf (24.11.2026):** `pruefe-folgen.mjs` 0 Fehler (auch mit `--streng`: alle MP3s vorhanden), `browser-test.mjs` 0 Fehler.

## Hilfsprogramme
- `werkzeuge/mache-icons.py` – erzeugt die App-Symbole neu (`python3 werkzeuge/mache-icons.py`, braucht Pillow).

## Offene Punkte
- [x] MP3s von Folge 1 hochgeladen.
- [ ] Manuskript Folge 1 als `texte/folge-01.md` (liegt bisher nur als Audio vor; ggf. von Claude abtippen lassen).
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
- [ ] „Automatisch weiter“ an: nach dem Ende startet die nächste Folge (ab Folge 2 testbar)
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
