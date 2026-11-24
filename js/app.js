// Bootsführerschein-Podcast – Abspiel-App
// Reines JavaScript, keine Bibliotheken. Siehe CLAUDE.md für die Erklärung.
(function () {
  'use strict';

  var Z = window.Zeitleiste;
  var SPEICHER_KEY = 'bfp-daten-v1';
  var AUDIO_CACHE = 'bfp-audio-v1';
  var ORDNER = 'folgen/';

  // ---------- Gespeicherte Daten (Browser-Speicher) ----------
  function leererSpeicher() {
    return {
      fortschritt: {},          // { "1": { pos: Sekunden, durchlaeufe: Zahl, zuletzt: Datum } }
      letzte: null,             // Nummer der zuletzt gehörten Folge
      dauern: {},               // gemerkte Teil-Längen { "folge-01-a.mp3": 312.4 }
      einstellungen: { tempo: 1, autoWeiter: true, wiederholen: false }
    };
  }
  function ladeSpeicher() {
    try {
      var d = JSON.parse(localStorage.getItem(SPEICHER_KEY));
      if (!d || typeof d !== 'object') return leererSpeicher();
      var leer = leererSpeicher();
      d.fortschritt = d.fortschritt || {};
      d.dauern = d.dauern || {};
      d.einstellungen = Object.assign(leer.einstellungen, d.einstellungen || {});
      return d;
    } catch (e) { return leererSpeicher(); }
  }
  var speicher = ladeSpeicher();
  function sichern() {
    try { localStorage.setItem(SPEICHER_KEY, JSON.stringify(speicher)); } catch (e) { /* Speicher voll */ }
  }
  function fortschrittVon(nr) {
    return speicher.fortschritt[nr] || { pos: 0, durchlaeufe: 0 };
  }

  // ---------- Elemente ----------
  function $(id) { return document.getElementById(id); }
  var audio = $('audio');
  var el = {
    liste: $('liste'), listeMeldung: $('listeMeldung'),
    weiter: $('weiterhoeren'), whTitel: $('whTitel'), whZeit: $('whZeit'),
    player: $('player'), pBereich: $('pBereich'), pTitel: $('pTitel'), pMeldung: $('pMeldung'),
    balken: $('pBalken'), pZeit: $('pZeit'), pRest: $('pRest'),
    play: $('kPlay'), autoWeiter: $('kAutoWeiter'), wiederholen: $('kWiederholen'),
    menue: $('menue'), speicherInfo: $('speicherInfo')
  };

  // ---------- Folgen laden ----------
  var folgen = [];          // { nummer, titel, bereich, teile, dauern[], fehlt }
  var filter = 'Alle';
  var aktuell = -1;         // Index in "folgen"
  var aktTeil = 0;
  var zieheBalken = false;

  function teilUrl(name) { return ORDNER + name; }

  // Ergebnis: Länge in Sekunden, null = Datei fehlt wirklich, undefined = unklar (z. B. Netzproblem)
  function misstDauer(name, zweiterVersuch) {
    return misstDauerEinmal(name).then(function (d) {
      if (d !== null) return d;
      // Fehler beim Laden: nachfragen, ob die Datei wirklich fehlt (404)
      return fetch(teilUrl(name), { method: 'HEAD', cache: 'no-cache' }).then(function (r) {
        if (r.status === 404) return null;
        return zweiterVersuch ? undefined : misstDauer(name, true);
      }, function () { return navigator.onLine === false ? null : undefined; });
    });
  }

  function misstDauerEinmal(name) {
    return new Promise(function (fertig) {
      var a = new Audio();
      a.preload = 'metadata';
      var erledigt = false;
      function ende(wert) {
        if (erledigt) return;
        erledigt = true;
        a.removeAttribute('src');
        try { a.load(); } catch (e) { /* egal */ }
        fertig(wert);
      }
      a.addEventListener('loadedmetadata', function () {
        ende(isFinite(a.duration) && a.duration > 0 ? a.duration : null);
      });
      a.addEventListener('error', function () { ende(null); });
      setTimeout(function () { ende(undefined); }, 20000); // undefined = unbekannt (z. B. kein Netz)
      a.src = teilUrl(name);
    });
  }

  function pruefeFolge(f) {
    if (f._pruefung) return f._pruefung;
    f._pruefung = Promise.all(f.teile.map(function (name) {
      return misstDauer(name).then(function (d) {
        if (d) { speicher.dauern[name] = d; }
        return d;
      });
    })).then(function (werte) {
      var fehlend = [];
      var offline = navigator.onLine === false;
      werte.forEach(function (d, i) {
        if (d) f.dauern[i] = d;
        // null = Datei fehlt. Ohne Internet nicht als "fehlt" werten, wenn die Länge schon bekannt ist.
        else if (d === null && !(offline && speicher.dauern[f.teile[i]])) fehlend.push(f.teile[i]);
      });
      f.fehlt = fehlend.length > 0;
      f.fehlendeTeile = fehlend;
      f.geprueft = true;
      sichern();
      zeigeListe();
      zeigeWeiterhoeren();
      return f;
    });
    return f._pruefung;
  }

  function ladeFolgen() {
    return fetch(ORDNER + 'folgen.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (daten) {
        var liste = Array.isArray(daten) ? daten : (daten.folgen || []);
        folgen = liste
          .filter(function (f) { return f && Array.isArray(f.teile) && f.teile.length; })
          .map(function (f) {
            return {
              nummer: f.nummer, titel: f.titel || ('Folge ' + f.nummer), bereich: f.bereich || 'Basis',
              teile: f.teile.slice(),
              dauern: f.teile.map(function (n) { return speicher.dauern[n] || 0; }),
              fehlt: false, geprueft: false
            };
          });
        zeigeListe();
        zeigeWeiterhoeren();
        // Längen nacheinander ermitteln (schont das Netz)
        folgen.reduce(function (kette, f) {
          return kette.then(function () { return pruefeFolge(f); });
        }, Promise.resolve());
      })
      .catch(function () {
        el.listeMeldung.textContent = 'Die Folgenliste konnte nicht geladen werden. Bitte Internet prüfen und neu laden.';
      });
  }

  // ---------- Anzeige: Liste ----------
  function gesamtVon(f) { return Z.gesamtDauer(f.dauern); }
  function dauerBekannt(f) { return f.dauern.every(function (d) { return d > 0; }); }

  function statusText(f) {
    if (f.geprueft && f.fehlt) return { text: '🎧 Audio folgt bald', klasse: 'fehlt' };
    var p = fortschrittVon(f.nummer);
    var mal = p.durchlaeufe ? ' · ' + p.durchlaeufe + '× komplett gehört' : '';
    if (p.pos > 1) {
      var g = gesamtVon(f);
      return { text: '◐ Angefangen bei ' + Z.formatZeit(p.pos) + (g ? ' von ' + Z.formatZeit(g) : '') + mal, klasse: 'angefangen' };
    }
    if (p.durchlaeufe) return { text: '✓ Fertig' + mal, klasse: 'fertig' };
    return { text: '● Neu', klasse: 'neu' };
  }

  function zeigeListe() {
    el.liste.innerHTML = '';
    var sichtbar = folgen.filter(function (f) { return filter === 'Alle' || f.bereich === filter; });
    el.listeMeldung.textContent = folgen.length && !sichtbar.length ? 'In diesem Bereich gibt es noch keine Folgen.' : '';
    sichtbar.forEach(function (f) {
      var index = folgen.indexOf(f);
      var li = document.createElement('li');
      li.className = 'folge' + (index === aktuell ? ' laeuft' : '');
      li.dataset.nummer = f.nummer;

      var haupt = document.createElement('button');
      haupt.className = 'f-haupt';
      var st = statusText(f);
      var p = fortschrittVon(f.nummer);
      var g = gesamtVon(f);
      var anteil = g && p.pos ? Math.min(100, (p.pos / g) * 100) : 0;
      haupt.innerHTML =
        '<span class="f-nr"></span>' +
        '<span class="f-text">' +
          '<div class="f-titel"></div>' +
          '<div class="f-info"><span class="f-bereich"></span> · <span class="f-dauer"></span></div>' +
          '<div class="f-status"></div>' +
          (anteil ? '<div class="f-mini"><div style="width:' + anteil.toFixed(1) + '%"></div></div>' : '') +
        '</span>';
      haupt.querySelector('.f-nr').textContent = f.nummer;
      haupt.querySelector('.f-titel').textContent = f.titel;
      var b = haupt.querySelector('.f-bereich');
      b.textContent = f.bereich; b.classList.add(f.bereich);
      haupt.querySelector('.f-dauer').textContent =
        f.geprueft && f.fehlt ? '–' : (dauerBekannt(f) ? Z.formatZeit(g) + ' Min.' : 'Länge wird ermittelt …');
      var s = haupt.querySelector('.f-status');
      s.textContent = st.text; s.classList.add(st.klasse);
      haupt.addEventListener('click', function () { starteFolge(index, { abspielen: true }); });
      li.appendChild(haupt);

      var off = document.createElement('button');
      off.className = 'f-offline';
      off.textContent = '⬇ Offline speichern';
      off.setAttribute('aria-label', 'Folge ' + f.nummer + ' für offline speichern');
      off.addEventListener('click', function () { offlineKnopf(f, off); });
      li.appendChild(off);
      el.liste.appendChild(li);
      zeigeOfflineStatus(f, off);
    });
  }

  function zeigeWeiterhoeren() {
    var f = folgen.filter(function (x) { return x.nummer === speicher.letzte; })[0];
    if (!f || !el.player.hidden || (f.geprueft && f.fehlt)) { el.weiter.hidden = true; return; }
    var p = fortschrittVon(f.nummer);
    el.whTitel.textContent = 'Folge ' + f.nummer + ': ' + f.titel;
    var g = gesamtVon(f);
    el.whZeit.textContent = p.pos > 1
      ? 'bei ' + Z.formatZeit(p.pos) + (g ? ' von ' + Z.formatZeit(g) : '')
      : 'von vorne';
    el.weiter.hidden = false;
  }

  // ---------- Abspielen ----------
  function folge() { return folgen[aktuell]; }
  function globalePos() {
    var f = folge(); if (!f) return 0;
    return Z.folgenZeit(f.dauern, aktTeil, audio.currentTime || 0);
  }
  function meldung(text) {
    el.pMeldung.textContent = text || '';
    el.pMeldung.hidden = !text;
  }

  function spiele() {
    var p = audio.play();
    if (p && p.catch) p.catch(function () { zeigePlay(); });
  }

  var ladeNr = 0;      // zählt jedes Laden eines Teils (damit ein Teil-Ende nur einmal verbucht wird)
  var endeNr = -1;
  function ladeTeil(teil, zeit, abspielen, neuLaden) {
    var f = folge();
    aktTeil = teil;
    letzteZeit = zeit || 0;
    ladeNr++;
    return new Promise(function (fertig) {
      var url = teilUrl(f.teile[teil]);
      var erledigt = false;
      var weiter = function () {
        if (erledigt) return;
        erledigt = true;
        audio.removeEventListener('loadedmetadata', weiter);
        if (Math.abs((audio.currentTime || 0) - (zeit || 0)) > 0.3) {
          try { audio.currentTime = zeit; } catch (e) { /* egal */ }
        }
        audio.playbackRate = speicher.einstellungen.tempo;
        fertig();
      };
      audio.defaultPlaybackRate = speicher.einstellungen.tempo;
      if (!neuLaden && audio.getAttribute('src') === url && audio.readyState >= 1 && !audio.error) {
        weiter();
        if (abspielen) spiele();
        return;
      }
      audio.addEventListener('loadedmetadata', weiter);
      audio.src = url;
      audio.load();
      audio.playbackRate = speicher.einstellungen.tempo;
      if (zeit > 0) { try { audio.currentTime = zeit; } catch (e) { /* wird nach dem Laden gesetzt */ } }
      // Wichtig fürs Handy: play() SOFORT aufrufen, nicht erst nach dem Laden.
      // Android lädt bei gesperrtem Bildschirm / im Hintergrund oft erst, wenn play() kommt.
      // Würde die App aufs Laden warten, warten beide aufeinander und es geht nicht weiter.
      if (abspielen) spiele();
    });
  }

  // Ist der aktuelle Teil (fast) zu Ende?
  function teilAmEnde() {
    if (audio.ended) return true;
    var d = audio.duration;
    return isFinite(d) && d > 0 && audio.currentTime >= d - 0.5;
  }

  // Ein Teil ist zu Ende: nächster Teil oder Folge fertig. Wird nur einmal pro Teil ausgeführt.
  function teilZuEnde() {
    var f = folge(); if (!f) return;
    if (endeNr === ladeNr) return;
    endeNr = ladeNr;
    if (aktTeil < f.teile.length - 1) ladeTeil(aktTeil + 1, 0, true);   // nahtlos zum nächsten Teil
    else folgeFertig();
  }

  function starteFolge(index, opt) {
    opt = opt || {};
    if (index < 0 || index >= folgen.length) return Promise.resolve();
    var neu = index !== aktuell;
    if (aktuell >= 0 && neu) speicherePosition();
    aktuell = index;
    var f = folge();
    speicher.letzte = f.nummer;
    sichern();

    el.player.hidden = false;
    el.weiter.hidden = true;
    el.pBereich.textContent = 'Folge ' + f.nummer + ' · ' + f.bereich;
    el.pTitel.textContent = f.titel;
    meldung('');
    setzeMediaInfos(f);
    zeigeListe();
    if (opt.scrollen !== false) window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!neu && !audio.paused && opt.position === undefined) return Promise.resolve();
    if (!neu && opt.position === undefined && audio.getAttribute('src')) {
      var pr = audio.play(); if (pr && pr.catch) pr.catch(function () {});
      return Promise.resolve();
    }

    // Wichtig fürs Handy: play() muss direkt nach dem Antippen kommen.
    // Darum startet der erste Teil sofort, die Längen-Prüfung läuft nebenher.
    var start = opt.position !== undefined ? opt.position : fortschrittVon(f.nummer).pos || 0;
    var ziel = dauerBekannt(f) ? Z.findeTeil(f.dauern, start) : { teil: 0, zeit: start };
    if (f.geprueft && f.fehlt) {
      audio.pause(); audio.removeAttribute('src'); audio.load();
      meldung('🎧 Audio folgt bald – diese Folge ist noch nicht hochgeladen.');
      zeigeZeit();
      return Promise.resolve();
    }
    var laden = ladeTeil(ziel.teil, ziel.zeit, opt.abspielen);
    pruefeFolge(f).then(function () {
      if (folge() !== f) return;
      if (f.fehlt) {
        audio.pause();
        meldung('🎧 Audio folgt bald – diese Folge ist noch nicht vollständig hochgeladen.');
      }
      zeigeZeit();
    });
    return laden;
  }

  function springeZu(sekunden) {
    var f = folge(); if (!f) return;
    var ziel;
    var t = Math.max(0, sekunden);
    if (dauerBekannt(f)) {
      var g = gesamtVon(f);
      ziel = Z.findeTeil(f.dauern, Math.min(t, g - 0.25));
    } else {
      // Länge späterer Teile noch unbekannt (z. B. Messung auf dem Handy fehlgeschlagen):
      // trotzdem über das Ende des aktuellen Teils hinaus in den nächsten Teil springen.
      var start = Z.startZeiten(f.dauern)[aktTeil];
      var dauer = f.dauern[aktTeil] || (isFinite(audio.duration) ? audio.duration : 0);
      var letzter = aktTeil >= f.teile.length - 1;
      if (t < start) ziel = Z.findeTeil(f.dauern.slice(0, aktTeil), t);
      else if (dauer && t >= start + dauer && !letzter) ziel = { teil: aktTeil + 1, zeit: t - start - dauer };
      else ziel = { teil: aktTeil, zeit: dauer ? Math.min(t - start, dauer - 0.25) : t - start };
    }
    // Hängt die Wiedergabe am Ende eines Teils, gilt sie trotzdem als "läuft"
    var spielte = !audio.paused || (sollSpielen && teilAmEnde());
    if (ziel.teil === aktTeil) {
      try { audio.currentTime = ziel.zeit; } catch (e) { /* egal */ }
      zeigeZeit();
    } else {
      ladeTeil(ziel.teil, ziel.zeit, spielte).then(zeigeZeit);
    }
  }

  function playPause() {
    if (aktuell < 0) { if (folgen.length) starteFolge(0, { abspielen: true }); return; }
    var f = folge();
    if (f.geprueft && f.fehlt) return;
    if (audio.paused) {
      if (!audio.getAttribute('src')) { starteFolge(aktuell, { abspielen: true, position: fortschrittVon(f.nummer).pos || 0 }); return; }
      sollSpielen = true;
      // Nach einem Ladefehler: Teil an derselben Stelle neu laden
      if (audio.error) { versuche = []; meldung(''); ladeTeil(aktTeil, letzteZeit, true, true); return; }
      // Teil ist zu Ende, aber der nächste kam nicht: jetzt zum nächsten Teil
      if (teilAmEnde() && aktTeil < f.teile.length - 1) { endeNr = ladeNr; ladeTeil(aktTeil + 1, 0, true); return; }
      spiele();
    } else {
      sollSpielen = false;
      audio.pause();
    }
  }

  function naechsteFolge(abspielen) {
    if (aktuell + 1 < folgen.length) starteFolge(aktuell + 1, { abspielen: abspielen !== false, position: 0 });
  }
  function vorigeFolge() {
    if (aktuell > 0) starteFolge(aktuell - 1, { abspielen: true, position: 0 });
    else springeZu(0);
  }

  function folgeFertig() {
    var f = folge();
    var p = fortschrittVon(f.nummer);
    p.pos = 0;
    p.durchlaeufe = (p.durchlaeufe || 0) + 1;
    p.zuletzt = new Date().toISOString();
    speicher.fortschritt[f.nummer] = p;
    sichern();
    zeigeListe();
    autoOffline(f); // fertig gehörte Folgen landen automatisch im Offline-Speicher
    if (speicher.einstellungen.wiederholen) {
      starteFolge(aktuell, { abspielen: true, position: 0, scrollen: false });
    } else if (speicher.einstellungen.autoWeiter && aktuell + 1 < folgen.length) {
      starteFolge(aktuell + 1, { abspielen: true, position: 0, scrollen: false });
    } else {
      sollSpielen = false;
      ladeTeil(0, 0, false).then(zeigeZeit);
    }
  }

  var letztesSichern = 0;
  function speicherePosition() {
    var f = folge(); if (!f || !audio.getAttribute('src') || f.fehlt) return;
    if (audio.ended) return; // Ende wird in folgeFertig() verbucht (Position zurück auf 0)
    var p = fortschrittVon(f.nummer);
    p.pos = globalePos();
    p.zuletzt = new Date().toISOString();
    speicher.fortschritt[f.nummer] = p;
    sichern();
  }

  // ---------- Anzeige: Player ----------
  function zeigePlay() {
    el.play.textContent = audio.paused ? '▶' : '⏸';
    el.play.setAttribute('aria-label', audio.paused ? 'Abspielen' : 'Pause');
  }
  function zeigeZeit() {
    var f = folge(); if (!f) return;
    var g = gesamtVon(f);
    var pos = globalePos();
    if (!zieheBalken) el.balken.value = g ? Math.round((pos / g) * 1000) : 0;
    el.pZeit.textContent = Z.formatZeit(pos);
    el.pRest.textContent = '-' + Z.formatZeit(Math.max(0, g - pos));
    setzeMediaPosition(pos, g);
  }

  audio.addEventListener('timeupdate', function () {
    zeigeZeit();
    var jetzt = Date.now();
    if (jetzt - letztesSichern > 5000) { letztesSichern = jetzt; speicherePosition(); }
  });
  audio.addEventListener('durationchange', function () {
    var f = folge();
    if (f && isFinite(audio.duration) && audio.duration > 0) {
      f.dauern[aktTeil] = audio.duration;
      speicher.dauern[f.teile[aktTeil]] = audio.duration;
    }
  });
  audio.addEventListener('play', function () { zeigePlay(); meldung(''); setzeMediaStatus('playing'); });
  audio.addEventListener('pause', function () { zeigePlay(); speicherePosition(); zeigeListe(); setzeMediaStatus('paused'); });
  audio.addEventListener('ended', teilZuEnde);
  // Wächter: Manche Handys melden das Ende eines Teils nicht ("ended" fehlt) und bleiben
  // am Ende stehen. Steht die Wiedergabe 2 Sekunden lang am Ende, geht es von selbst weiter.
  var wache = { zeit: -1, mal: 0 };
  setInterval(function () {
    if (aktuell < 0 || !sollSpielen || !audio.getAttribute('src') || audio.error || !teilAmEnde()) { wache.mal = 0; return; }
    if (audio.paused || audio.currentTime === wache.zeit) wache.mal++;
    else wache.mal = 0;
    wache.zeit = audio.currentTime;
    if (wache.mal >= 2) { wache.mal = 0; teilZuEnde(); }
  }, 1000);
  // Abbruch (z. B. Funkloch): bis zu 3x automatisch an derselben Stelle weitermachen
  var sollSpielen = false, letzteZeit = 0, versuche = [];
  audio.addEventListener('playing', function () { sollSpielen = true; });
  audio.addEventListener('timeupdate', function () { if (audio.currentTime > 0) letzteZeit = audio.currentTime; });
  audio.addEventListener('error', function () {
    if (!audio.getAttribute('src')) return;
    var f = folge();
    var jetzt = Date.now();
    versuche = versuche.filter(function (t) { return jetzt - t < 30000; });
    if (f && !f.fehlt && versuche.length < 3) {
      versuche.push(jetzt);
      var spielen = sollSpielen;
      setTimeout(function () { ladeTeil(aktTeil, letzteZeit, spielen, true); }, 300 * versuche.length);
      return;
    }
    zeigePlay();
    meldung(navigator.onLine === false
      ? '📶 Kein Internet – diese Folge ist nicht offline gespeichert.'
      : '🎧 Audio folgt bald – dieser Teil ist noch nicht hochgeladen.');
  });

  // ---------- Sperrbildschirm & Lenkradtasten (Media Session) ----------
  var ms = 'mediaSession' in navigator ? navigator.mediaSession : null;
  function setzeMediaInfos(f) {
    if (!ms || !window.MediaMetadata) return;
    ms.metadata = new MediaMetadata({
      title: 'Folge ' + f.nummer + ': ' + f.titel,
      artist: 'Sportbootführerschein – ' + f.bereich,
      album: 'Bootsführerschein-Podcast',
      artwork: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    });
  }
  function setzeMediaStatus(s) { if (ms) { try { ms.playbackState = s; } catch (e) { /* egal */ } } }
  function setzeMediaPosition(pos, g) {
    if (!ms || !ms.setPositionState || !g) return;
    try { ms.setPositionState({ duration: g, position: Math.min(pos, g), playbackRate: audio.playbackRate || 1 }); } catch (e) { /* egal */ }
  }
  if (ms) {
    var aktion = function (name, fn) { try { ms.setActionHandler(name, fn); } catch (e) { /* nicht unterstützt */ } };
    aktion('play', function () { if (audio.paused) playPause(); });
    aktion('pause', function () { sollSpielen = false; if (!audio.paused) audio.pause(); });
    aktion('seekbackward', function () { springeZu(globalePos() - 15); });
    aktion('seekforward', function () { springeZu(globalePos() + 15); });
    aktion('previoustrack', vorigeFolge);
    aktion('nexttrack', function () { naechsteFolge(true); });
    aktion('seekto', function (d) { if (d && typeof d.seekTime === 'number') springeZu(d.seekTime); });
  }

  // ---------- Knöpfe ----------
  el.play.addEventListener('click', playPause);
  $('kZurueck').addEventListener('click', function () { springeZu(globalePos() - 15); });
  $('kVor').addEventListener('click', function () { springeZu(globalePos() + 15); });
  $('kVorige').addEventListener('click', vorigeFolge);
  $('kNaechste').addEventListener('click', function () { naechsteFolge(true); });
  el.weiter.addEventListener('click', function () {
    var i = folgen.map(function (f) { return f.nummer; }).indexOf(speicher.letzte);
    if (i >= 0) starteFolge(i, { abspielen: true });
  });

  el.balken.addEventListener('input', function () {
    zieheBalken = true;
    var g = gesamtVon(folge() || { dauern: [] });
    el.pZeit.textContent = Z.formatZeit((el.balken.value / 1000) * g);
  });
  el.balken.addEventListener('change', function () {
    zieheBalken = false;
    var g = gesamtVon(folge() || { dauern: [] });
    springeZu((el.balken.value / 1000) * g);
  });

  function zeigeTempo() {
    document.querySelectorAll('[data-tempo]').forEach(function (b) {
      b.classList.toggle('aktiv', parseFloat(b.dataset.tempo) === speicher.einstellungen.tempo);
    });
  }
  document.querySelectorAll('[data-tempo]').forEach(function (b) {
    b.addEventListener('click', function () {
      speicher.einstellungen.tempo = parseFloat(b.dataset.tempo);
      audio.defaultPlaybackRate = speicher.einstellungen.tempo;
      audio.playbackRate = speicher.einstellungen.tempo;
      sichern(); zeigeTempo();
    });
  });
  function zeigeSchalter() {
    el.autoWeiter.classList.toggle('an', !!speicher.einstellungen.autoWeiter);
    el.wiederholen.classList.toggle('an', !!speicher.einstellungen.wiederholen);
    el.autoWeiter.setAttribute('aria-pressed', !!speicher.einstellungen.autoWeiter);
    el.wiederholen.setAttribute('aria-pressed', !!speicher.einstellungen.wiederholen);
  }
  el.autoWeiter.addEventListener('click', function () {
    speicher.einstellungen.autoWeiter = !speicher.einstellungen.autoWeiter; sichern(); zeigeSchalter();
  });
  el.wiederholen.addEventListener('click', function () {
    speicher.einstellungen.wiederholen = !speicher.einstellungen.wiederholen; sichern(); zeigeSchalter();
  });

  document.querySelectorAll('[data-filter]').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(function (x) { x.classList.toggle('aktiv', x === b); });
      zeigeListe();
    });
  });

  $('menueKnopf').addEventListener('click', function () {
    el.menue.hidden = !el.menue.hidden;
    if (!el.menue.hidden) zeigeSpeicherInfo();
  });

  // ---------- Export / Import ----------
  $('exportKnopf').addEventListener('click', function () {
    speicherePosition();
    var daten = {
      app: 'bootsfuehrerschein-podcast', version: 1, exportiert: new Date().toISOString(),
      fortschritt: speicher.fortschritt, letzte: speicher.letzte, einstellungen: speicher.einstellungen
    };
    var blob = new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'podcast-fortschritt-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  });
  $('importDatei').addEventListener('change', function (ev) {
    var datei = ev.target.files && ev.target.files[0];
    if (!datei) return;
    datei.text().then(function (text) {
      var d = JSON.parse(text);
      if (!d || d.app !== 'bootsfuehrerschein-podcast' || typeof d.fortschritt !== 'object') throw new Error('falsch');
      if (!confirm('Dein aktueller Hörfortschritt wird durch die Sicherung ersetzt. Fortfahren?')) return;
      speicher.fortschritt = d.fortschritt || {};
      speicher.letzte = d.letzte || null;
      if (d.einstellungen) speicher.einstellungen = Object.assign(leererSpeicher().einstellungen, d.einstellungen);
      sichern();
      alert('Sicherung eingelesen ✓');
      location.reload();
    }).catch(function () {
      alert('Diese Datei ist keine gültige Sicherung der Podcast-App.');
    }).then(function () { ev.target.value = ''; });
  });

  // ---------- Offline speichern ----------
  var hatCache = 'caches' in window;
  function istOffline(f) {
    if (!hatCache) return Promise.resolve(false);
    return caches.open(AUDIO_CACHE).then(function (c) {
      return Promise.all(f.teile.map(function (n) { return c.match(new URL(teilUrl(n), location.href).href); }));
    }).then(function (treffer) { return treffer.every(Boolean); }).catch(function () { return false; });
  }
  function zeigeOfflineStatus(f, knopf) {
    if (!hatCache) { knopf.hidden = true; return; }
    if (f.geprueft && f.fehlt) { knopf.hidden = true; return; }
    istOffline(f).then(function (ok) {
      knopf.classList.toggle('gespeichert', ok);
      knopf.textContent = ok ? '✓ Offline' : '⬇ Offline speichern';
      f.offline = ok;
    });
  }
  function speichereOffline(f, knopf) {
    if (!hatCache) return Promise.resolve(false);
    if (knopf) knopf.textContent = 'Lädt …';
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    return caches.open(AUDIO_CACHE).then(function (c) {
      return Promise.all(f.teile.map(function (n) {
        var url = new URL(teilUrl(n), location.href).href;
        return fetch(url).then(function (r) {
          if (!r.ok || r.status !== 200) throw new Error('fehlt');
          return c.put(url, r);
        });
      }));
    }).then(function () { return true; }).catch(function () { return false; });
  }
  function offlineKnopf(f, knopf) {
    if (f.offline) {
      if (!confirm('Folge ' + f.nummer + ' vom Handy-Speicher entfernen? (Sie bleibt online hörbar.)')) return;
      caches.open(AUDIO_CACHE).then(function (c) {
        return Promise.all(f.teile.map(function (n) { return c.delete(new URL(teilUrl(n), location.href).href); }));
      }).then(function () { zeigeOfflineStatus(f, knopf); });
      return;
    }
    speichereOffline(f, knopf).then(function (ok) {
      if (!ok) alert('Speichern hat nicht geklappt. Ist die Folge schon hochgeladen und Internet da?');
      zeigeOfflineStatus(f, knopf);
    });
  }
  // Angehörte Folgen werden automatisch im Hintergrund offline gespeichert.
  function autoOffline(f) {
    istOffline(f).then(function (ok) {
      if (ok || navigator.onLine === false) return;
      pruefeFolge(f).then(function () {
        if (f.fehlt) return;
        speichereOffline(f).then(function () { zeigeListe(); });
      });
    });
  }
  function zeigeSpeicherInfo() {
    if (!navigator.storage || !navigator.storage.estimate) { el.speicherInfo.textContent = ''; return; }
    navigator.storage.estimate().then(function (s) {
      el.speicherInfo.textContent = 'Offline gespeichert: ca. ' + Math.round((s.usage || 0) / 1048576) + ' MB.';
    });
  }

  // ---------- Start ----------
  window.addEventListener('pagehide', speicherePosition);
  document.addEventListener('visibilitychange', function () { if (document.hidden) speicherePosition(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () { /* egal */ });
  }
  zeigeTempo();
  zeigeSchalter();
  zeigePlay();
  ladeFolgen();

  // Für Tests
  window.__podcast = { folgen: function () { return folgen; }, speicher: function () { return speicher; },
    aktTeil: function () { return aktTeil; }, globalePos: globalePos, springeZu: springeZu };
})();
