/* =========================================================================
   FlowArena — Echte Beat-Audiodateien, synchron zur BeatClock
   -------------------------------------------------------------------------
   Spielt Beat.audioUrl (siehe assets/js/data.js) als geloopte, sample-genau
   getimte Audiospur ab — auf DERSELBEN AudioContext-Uhr wie BeatClock
   (assets/js/beat-clock.js), damit Ball/Taktanzeige/Zeilenwechsel und der
   tatsächliche Song niemals auseinanderdriften (kein zweiter Timer, keine
   <audio>-Elemente mit eigenem Playback-Takt). Für Beats OHNE audioUrl
   bleibt der bisherige synthetische Klick-Track (sound.js: playBeatTick)
   unverändert die Zeitreferenz — beide Wege laufen über exakt dieselbe
   BeatClock, das Gameplay selbst unterscheidet nicht zwischen echtem Song
   und Platzhalter-Klick (siehe docs/GAMEPLAY.md).

   Bewusst EIN gemeinsames Modul statt Duplikat in challenge.js/tournament.js
   (beide brauchen identisches Verhalten: laden, cachen, loop-starten,
   stoppen).
   ========================================================================= */

(function (window) {
  "use strict";

  // AudioBuffer-Cache pro URL — ein Beat wird höchstens einmal pro
  // Seitenaufruf dekodiert, auch wenn mehrere Strophen/Runden ihn erneut
  // abspielen (z.B. Solo-Challenge-Retry, Turnier-Runde 2).
  const bufferCache = new Map(); // url -> Promise<AudioBuffer>

  function loadBuffer(url, audioCtx) {
    if (!bufferCache.has(url)) {
      const promise = fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`Beat-Audio HTTP ${res.status}: ${url}`);
          return res.arrayBuffer();
        })
        .then((arrayBuffer) => audioCtx.decodeAudioData(arrayBuffer))
        .catch((err) => {
          // Defensive Degradierung: schlägt das Laden fehl (z.B. Datei
          // fehlt), fällt der Aufrufer automatisch auf den synthetischen
          // Klick-Track zurück (siehe playLoop() Rückgabewert) statt die
          // Challenge abzubrechen.
          console.warn("[FlowBeatAudio] Konnte Beat-Audio nicht laden:", url, err);
          bufferCache.delete(url);
          return null;
        });
      bufferCache.set(url, promise);
    }
    return bufferCache.get(url);
  }

  /**
   * Lädt die Audiodatei eines Beats schon mal vor (fire-and-forget), damit
   * sie beim tatsächlichen Start (nach dem Countdown) bereits im Cache
   * liegt und ohne hörbare Verzögerung loslegen kann.
   */
  function preload(beat, audioCtx) {
    if (!beat?.audioUrl || !audioCtx) return;
    loadBuffer(beat.audioUrl, audioCtx);
  }

  /**
   * Startet die echte Beat-Audiodatei geloopt, exakt zeitgleich mit
   * `clock.startTime` (also mit Beat 0 der BeatClock — MUSS nach
   * clock.start() aufgerufen werden, da startTime erst dort gesetzt wird).
   * @returns {Promise<AudioBufferSourceNode|null>} null = kein audioUrl
   *   oder Laden fehlgeschlagen -> Aufrufer soll auf den synthetischen
   *   Klick-Track zurückfallen.
   */
  async function playLoop(beat, clock, audioCtx) {
    if (!beat?.audioUrl || !audioCtx || !clock) return null;
    const buffer = await loadBuffer(beat.audioUrl, audioCtx);
    if (!buffer) return null;
    // Clock kann während des Ladens gestoppt worden sein (z.B. Nutzer
    // bricht die Challenge sofort wieder ab) — dann nicht mehr starten.
    if (!clock.running) return null;

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = buffer.duration;
    // Eigener Gain-Node statt direkt an destination — Lautstärke des
    // Beats bewusst etwas unter den UI-Sounds, damit Ansagen/Punchline-
    // Badges etc. nicht zugedeckt werden. Der Beat selbst ist Gameplay-
    // Audio (kein optionaler UI-Sound, siehe sound.js) und läuft deshalb
    // unabhängig vom "Klick-Sounds"-Setting immer hörbar.
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.85;
    source.connect(gainNode).connect(audioCtx.destination);
    source.start(clock.startTime);
    return source;
  }

  /** Stoppt eine per playLoop() gestartete Quelle (no-op bei null/bereits gestoppt). */
  function stop(source) {
    if (!source) return;
    try {
      source.stop();
    } catch (e) {
      /* schon gestoppt/nie gestartet — ignorieren */
    }
    try {
      source.disconnect();
    } catch (e) {
      /* ignorieren */
    }
  }

  window.FlowBeatAudio = { preload, playLoop, stop };
})(window);
