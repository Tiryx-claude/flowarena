/* =========================================================================
   FlowArena — Shared Data
   Von index.html (Settings) UND challenge.html (Spielablauf) genutzt, damit
   beide Seiten garantiert dieselben Beats/Themen/Settings-Struktur kennen.
   Später ersetzt durch echte Daten aus der DB (Beat-Modell, /api/beats).
   ========================================================================= */

(function (window) {
  "use strict";

  const STORAGE_KEY = "flowarena.settings.v1";

  /* -------------------------------------------------------------------
     Gameplay-Konfiguration (Modul 2/3-Rewrite)
     -------------------------------------------------------------------
     Zentrale, im Code sichtbare Stellschrauben für die Kernmechanik —
     bewusst NICHT irgendwo tief vergraben, damit sie leicht anpassbar
     bleiben (siehe docs/GAMEPLAY.md).
     ------------------------------------------------------------------- */
  const GAMEPLAY_CONFIG = {
    linesPerStanza: 5, // jede Zeile bekommt genau EIN Endwort
    beatsPerLine: 4, // musikalisches Timing: 1 Takt (4 Beats) pro Zeile
    minStanzas: 1,
    maxStanzas: 10,
  };

  // audioUrl: Pfad zur Beat-Audiodatei (z.B. "/beats/dark-trap.mp3").
  // Aktuell überall null — es liegen noch keine echten Audiodateien vor,
  // das Gameplay nutzt stattdessen einen synthetischen, BPM-exakten
  // Klick-Track (assets/js/beat-clock.js + sound.js). Sobald ein Beat
  // eine echte Datei bekommt, spielt genau diese ab — ohne Änderungen an
  // der Gameplay-Logik (siehe docs/AI_ARCHITECTURE.md / GAMEPLAY.md).
  const BEATS = [
    { id: "b1", name: "Dark Trap Wave", category: "Trap", bpm: 150, audioUrl: null },
    { id: "b2", name: "Boom Bap Classic", category: "Boom Bap", bpm: 90, audioUrl: null },
    { id: "b3", name: "Cloud Drift", category: "Lo-Fi", bpm: 75, audioUrl: null },
    { id: "b4", name: "Neon Drive", category: "Synth", bpm: 120, audioUrl: null },
    { id: "b5", name: "Street Anthem", category: "Hip-Hop", bpm: 100, audioUrl: null },
    { id: "b6", name: "Midnight Cypher", category: "Boom Bap", bpm: 86, audioUrl: null },
  ];

  const TOPICS = [
    { id: "freestyle", label: "Freestyle (offen)" },
    { id: "love", label: "Liebe & Beziehungen" },
    { id: "money", label: "Money & Grind" },
    { id: "street", label: "Streetlife" },
    { id: "motivation", label: "Motivation & Aufstieg" },
    { id: "battle", label: "Battle / Diss" },
    { id: "random", label: "Zufällig" },
  ];

  const DEFAULT_SETTINGS = {
    difficulty: "mittel", // leicht | mittel | schwer
    beatId: "b2",
    verses: 2, // Strophenanzahl, GAMEPLAY_CONFIG.minStanzas..maxStanzas
    topic: "freestyle",
    streamerMode: false,
    soundEnabled: true,
    roastMode: false,
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      /* localStorage evtl. nicht verfügbar (privater Modus) — kein Problem */
    }
  }

  function findBeat(beatId) {
    return BEATS.find((b) => b.id === beatId) || BEATS[0];
  }

  function findTopicLabel(topicId) {
    return TOPICS.find((t) => t.id === topicId)?.label ?? topicId;
  }

  window.FlowData = {
    STORAGE_KEY,
    GAMEPLAY_CONFIG,
    BEATS,
    TOPICS,
    DEFAULT_SETTINGS,
    loadSettings,
    saveSettings,
    findBeat,
    findTopicLabel,
  };
})(window);
