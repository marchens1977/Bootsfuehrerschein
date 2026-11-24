// Zeitleiste: rechnet zwischen "Zeit in der ganzen Folge" und
// "Teil + Zeit im Teil" um. Wird von der App UND von den Tests benutzt.
// Eine Folge besteht aus mehreren MP3-Teilen (ElevenLabs-Grenze 5.000 Zeichen).
(function (global) {
  'use strict';

  // dauern: Liste der Teil-Längen in Sekunden, z. B. [312.5, 201.2]
  function gesamtDauer(dauern) {
    return dauern.reduce(function (summe, d) { return summe + (d > 0 ? d : 0); }, 0);
  }

  // Startzeit jedes Teils innerhalb der Folge
  function startZeiten(dauern) {
    var starts = [];
    var summe = 0;
    for (var i = 0; i < dauern.length; i++) {
      starts.push(summe);
      summe += dauern[i] > 0 ? dauern[i] : 0;
    }
    return starts;
  }

  // Folgen-Zeit -> { teil, zeit }
  function findeTeil(dauern, folgenZeit) {
    if (!dauern.length) return { teil: 0, zeit: 0 };
    var gesamt = gesamtDauer(dauern);
    var t = Math.max(0, Math.min(folgenZeit, gesamt));
    var summe = 0;
    for (var i = 0; i < dauern.length; i++) {
      var d = dauern[i] > 0 ? dauern[i] : 0;
      // Genau am Ende eines Teils -> Anfang des nächsten Teils
      if (t < summe + d || i === dauern.length - 1) {
        return { teil: i, zeit: Math.min(t - summe, d) };
      }
      summe += d;
    }
    return { teil: dauern.length - 1, zeit: dauern[dauern.length - 1] };
  }

  // Teil + Zeit im Teil -> Folgen-Zeit
  function folgenZeit(dauern, teil, zeitImTeil) {
    return startZeiten(dauern)[teil] + (zeitImTeil || 0);
  }

  // 754 -> "12:34", 3725 -> "1:02:05"
  function formatZeit(sekunden) {
    if (!isFinite(sekunden) || sekunden < 0) sekunden = 0;
    var s = Math.floor(sekunden);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var r = s % 60;
    var zwei = function (n) { return (n < 10 ? '0' : '') + n; };
    return h > 0 ? h + ':' + zwei(m) + ':' + zwei(r) : m + ':' + zwei(r);
  }

  var api = {
    gesamtDauer: gesamtDauer,
    startZeiten: startZeiten,
    findeTeil: findeTeil,
    folgenZeit: folgenZeit,
    formatZeit: formatZeit
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Zeitleiste = api;
})(this);
