/* =========================================================================
   FlowArena — Sound Engine
   Erzeugt kurze UI-Klicksounds per Web Audio API (keine externen Dateien
   nötig). AudioContext wird erst bei der ersten Nutzer-Interaktion erzeugt,
   wie es Browser-Autoplay-Richtlinien verlangen.
   ========================================================================= */

(function (window) {
  "use strict";

  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  /**
   * Spielt einen kurzen synthetischen Ton.
   * @param {Object} opts
   * @param {number} opts.freq - Startfrequenz in Hz
   * @param {number} opts.freqTo - Zielfrequenz in Hz (Pitch-Sweep)
   * @param {number} opts.duration - Dauer in Sekunden
   * @param {"sine"|"triangle"|"square"|"sawtooth"} opts.type - Wellenform
   * @param {number} opts.gain - Lautstärke (0..1)
   */
  function tone({ freq = 880, freqTo = null, duration = 0.08, type = "sine", gain = 0.06 }) {
    const audioCtx = getCtx();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (freqTo) {
      osc.frequency.exponentialRampToValueAtTime(freqTo, audioCtx.currentTime + duration);
    }

    // Kurze Attack/Release-Hüllkurve, damit nichts knackt
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration + 0.02);
  }

  const FlowSound = {
    /**
     * Gemeinsamer AudioContext für alles, was eine gemeinsame Zeitbasis
     * braucht (v.a. assets/js/beat-clock.js). Erzeugt/resumed ihn bei Bedarf.
     */
    getAudioContext() {
      return getCtx();
    },
    /** Dezenter Klick für Buttons/Links */
    playClick() {
      tone({ freq: 720, freqTo: 480, duration: 0.07, type: "sine", gain: 0.05 });
    },
    /** Sound für Toggle/Switch */
    playToggle(isOn) {
      tone({
        freq: isOn ? 520 : 380,
        freqTo: isOn ? 880 : 260,
        duration: 0.09,
        type: "triangle",
        gain: 0.055,
      });
    },
    /** Sound beim Auswählen einer Option (Beat, Thema, …) */
    playSelect() {
      tone({ freq: 640, freqTo: 900, duration: 0.06, type: "sine", gain: 0.045 });
    },
    /** Bestätigungs-/Erfolgs-Sound (z.B. Einstellungen gespeichert) */
    playConfirm() {
      tone({ freq: 500, freqTo: 760, duration: 0.12, type: "triangle", gain: 0.06 });
      setTimeout(() => tone({ freq: 760, freqTo: 1020, duration: 0.14, type: "triangle", gain: 0.05 }), 70);
    },
    /** Countdown-Beep (3, 2, 1) */
    playCountdown(isFinal) {
      tone({ freq: isFinal ? 660 : 420, freqTo: isFinal ? 900 : 420, duration: isFinal ? 0.16 : 0.09, type: "square", gain: 0.05 });
    },
    /**
     * Synthetischer Metronom-/Beat-Tick, ersetzt echte Beat-Audiodateien
     * (Platzhalter, siehe Beat.audioUrl in data.js). `when` ist eine
     * AudioContext-Zeit (audioCtx.currentTime-Basis) für sample-genaues
     * Vorausplanen — das ist der Kern der drift-freien Beat-Synchronisation
     * in assets/js/beat-clock.js. Ohne `when` spielt der Tick sofort.
     */
    playBeatTick(isAccent, when) {
      const audioCtx = getCtx();
      if (!audioCtx) return;
      const t0 = when != null ? when : audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = "sine";
      const freq = isAccent ? 130 : 90;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t0 + 0.09);
      gainNode.gain.setValueAtTime(0, t0);
      gainNode.gain.linearRampToValueAtTime(isAccent ? 0.16 : 0.11, t0 + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
      osc.connect(gainNode).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.15);
    },
    /** Ergebnis-Reveal — kurzes Arpeggio, Tonhöhe je nach Bewertungs-Bracket */
    playReveal(bracket) {
      const runs = {
        top: [660, 880, 1100],
        mid: [560, 700, 840],
        low: [420, 520, 460],
      }[bracket] || [560, 700, 840];
      runs.forEach((freq, i) => {
        setTimeout(() => tone({ freq, freqTo: freq * 1.15, duration: 0.16, type: "triangle", gain: 0.055 }), i * 110);
      });
    },
  };

  window.FlowSound = FlowSound;
})(window);
