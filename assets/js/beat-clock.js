/* =========================================================================
   FlowArena — BeatClock
   -------------------------------------------------------------------------
   Zentrale, drift-freie Zeitbasis für Beat-Ticks, Ball-/Männchen-Animation
   UND Zeilenwechsel — alle drei lesen exakt dieselbe Uhr (AudioContext-
   Zeit), nie separate setInterval/CSS-Timer. Das ist der Kern der
   BPM-Synchronisation (siehe docs/GAMEPLAY.md, Abschnitt "Timing").

   Warum AudioContext-Zeit statt Date.now()/performance.now()?
   AudioContext.currentTime ist die Uhr, nach der der Web-Audio-Scheduler
   selbst Töne abspielt — wenn Animation und Zeilenwechsel dieselbe Uhr
   lesen, können sie per Definition nicht vom Ton wegdriften.

   Scheduling-Pattern ("look-ahead scheduler", nach Chris Wilsons "A Tale of
   Two Clocks"): ein günstiger setTimeout-Tick (alle 25ms) schaut ein kurzes
   Stück (lookaheadSec) in die Zukunft und plant fällige Beat-Sounds SAMPLE-
   GENAU über osc.start(audioTime) ein — der setTimeout-Tick selbst muss
   dafür nicht präzise sein, nur "oft genug" laufen.

   Kein-Drift-Garantie: beatTime()/lineTime() berechnen JEDEN Zeitpunkt
   direkt aus (startTime + n * Intervall) — also immer aus EINEM festen
   Ursprung, nie durch wiederholtes Aufaddieren kleiner Intervalle. Dadurch
   kann sich über viele Zeilen/Strophen hinweg kein Fehler aufsummieren.
   ========================================================================= */

(function (window) {
  "use strict";

  class BeatClock {
    /**
     * @param {Object} opts
     * @param {number} opts.bpm - Beats pro Minute des aktuellen Beats
     * @param {number} opts.beatsPerLine - Takt-Konfiguration (GAMEPLAY_CONFIG.beatsPerLine)
     * @param {AudioContext} opts.audioCtx - gemeinsamer Context (FlowSound.getAudioContext())
     */
    constructor({ bpm, beatsPerLine, audioCtx }) {
      this.bpm = bpm;
      this.secPerBeat = 60 / bpm;
      this.beatsPerLine = beatsPerLine;
      this.ctx = audioCtx;

      this.startTime = 0; // audioCtx-Zeit von "Beat 0"
      this.running = false;
      this.nextBeatIndex = 0;
      this.lookaheadSec = 0.12;
      this.schedulerIntervalMs = 25;
      this._timer = null;

      /** Callback (beatIndex, audioTime) => void — wird VORAB pro Beat aufgerufen, zum präzisen Einplanen von Sounds. */
      this.onBeat = null;
    }

    /** Startet die Uhr. leadInSec ist ein winziger Puffer, damit der erste Beat sicher noch geplant werden kann. */
    start(leadInSec = 0.08) {
      this.startTime = this.ctx.currentTime + leadInSec;
      this.nextBeatIndex = 0;
      this.running = true;
      this._tick();
    }

    stop() {
      this.running = false;
      if (this._timer) clearTimeout(this._timer);
      this._timer = null;
    }

    _tick() {
      if (!this.running) return;
      while (this.beatTime(this.nextBeatIndex) < this.ctx.currentTime + this.lookaheadSec) {
        if (this.onBeat) this.onBeat(this.nextBeatIndex, this.beatTime(this.nextBeatIndex));
        this.nextBeatIndex++;
      }
      this._timer = setTimeout(() => this._tick(), this.schedulerIntervalMs);
    }

    /** Absolute audioCtx-Zeit von Beat Nr. `beatIndex` (0-basiert). */
    beatTime(beatIndex) {
      return this.startTime + beatIndex * this.secPerBeat;
    }

    /** Absolute audioCtx-Zeit, zu der Zeile `lineGlobalIndex` (0-basiert, über die GANZE Challenge gezählt) beginnt. */
    lineTime(lineGlobalIndex) {
      return this.startTime + lineGlobalIndex * this.beatsPerLine * this.secPerBeat;
    }

    /** Aktuelle Zeit auf derselben Uhr wie beatTime()/lineTime(). */
    now() {
      return this.ctx.currentTime;
    }

    /**
     * Kontinuierliche Beat-Phase (Fließkommazahl) seit Start — z.B. 2.4 =
     * wir sind 40% durch Beat 2. Wird JEDEN Frame frisch aus der Audio-Uhr
     * berechnet (nie aufaddiert) → kann nicht driften. Basis für die
     * Ball-/Männchen-Animation.
     */
    currentBeatPhase() {
      if (!this.running) return 0;
      return Math.max(0, (this.ctx.currentTime - this.startTime) / this.secPerBeat);
    }
  }

  window.FlowBeatClock = BeatClock;
})(window);
