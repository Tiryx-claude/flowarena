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
    // boxesPerLine: JEDE Zeile hat genau so viele Kästchen — die ersten
    // (boxesPerLine - 1) sind IMMER leer und dienen nur als BPM-Taktanzeige,
    // nur das LETZTE Kästchen zeigt das Reimwort. Der Ball springt im
    // BPM-Takt durch alle Kästchen einer Zeile (1 Kästchen pro Beat), landet
    // exakt im letzten Kästchen auf dem Reimwort. Gilt identisch in JEDEM
    // Spielmodus (Solo, Turnier, Freundes-Duell — siehe docs/GAMEPLAY.md §3).
    boxesPerLine: 5,
    beatsPerLine: 5, // = boxesPerLine: 1 Beat pro Kästchen, siehe oben
    minStanzas: 1,
    maxStanzas: 10,
    freeMaxStanzas: 5, // Modul 4: ohne Premium bei 5 Strophen gedeckelt
    // Turnier-Runden (tournament-data.js/tournament.js): EINE Runde besteht
    // aus stanzasPerTournamentRound (3) Strophen hintereinander, beat-genau
    // OHNE Unterbrechung (eine einzige BeatClock/Aufnahme pro Runde). Nach
    // jeder abgeschlossenen Strophe werden automatisch 5 neue Reimwörter +
    // ein neues Reimschema generiert — exakt dieselbe Strophen-Logik wie in
    // der Solo-Challenge, nur pro Turnier-Runde statt pro ganzer Challenge.
    // Siehe docs/TOURNAMENTS.md.
    stanzasPerTournamentRound: 3,
  };

  // audioUrl: Pfad zur Beat-Audiodatei (z.B. "/beats/dark-trap.mp3").
  // Aktuell überall null — es liegen noch keine echten Audiodateien vor,
  // das Gameplay nutzt stattdessen einen synthetischen, BPM-exakten
  // Klick-Track (assets/js/beat-clock.js + sound.js). Sobald ein Beat
  // eine echte Datei bekommt, spielt genau diese ab — ohne Änderungen an
  // der Gameplay-Logik (siehe docs/AI_ARCHITECTURE.md / GAMEPLAY.md).
  // premiumOnly + unlockCost: Modul 4 (Credits/Premium). Ohne Premium-Status
  // ist ein premiumOnly-Beat gesperrt, bis er einmalig für `unlockCost`
  // Credits freigeschaltet wird (siehe assets/js/profile-data.js).
  const BEATS = [
    { id: "b1", name: "Dark Trap Wave", category: "Trap", bpm: 150, audioUrl: null, premiumOnly: true, unlockCost: 60 },
    { id: "b2", name: "Boom Bap Classic", category: "Boom Bap", bpm: 90, audioUrl: null },
    { id: "b3", name: "Cloud Drift", category: "Lo-Fi", bpm: 75, audioUrl: null },
    { id: "b4", name: "Neon Drive", category: "Synth", bpm: 120, audioUrl: null },
    { id: "b5", name: "Street Anthem", category: "Hip-Hop", bpm: 100, audioUrl: null },
    { id: "b6", name: "Midnight Cypher", category: "Boom Bap", bpm: 86, audioUrl: null, premiumOnly: true, unlockCost: 45 },
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

  // Sprachabhängig: TOPICS[].id ist eine stabile interne Kennung (nie
  // übersetzt, siehe docs/I18N.md), die ANZEIGE kommt aus dem aktiven
  // i18n-Wörterbuch (common.topics.*) statt aus dem statischen label-Feld
  // oben — dadurch wechselt jede Themen-Anzeige in der App automatisch mit
  // der Sprache, ohne dass jede Aufrufstelle das selbst wissen muss.
  function findTopicLabel(topicId) {
    if (window.FlowI18n) return window.FlowI18n.t(`common.topics.${topicId}`);
    return TOPICS.find((t) => t.id === topicId)?.label ?? topicId;
  }

  /* -------------------------------------------------------------------
     Modul 5 — Shop, Premium, Credits & Werbung
     -------------------------------------------------------------------
     Reiner Content/Katalog-Teil (Preise, Kataloge, Belohnungs-Tabellen).
     Die zugehörige STATE-Logik (Freischalten, Kauf, Streak-Tracking) lebt
     bewusst getrennt in assets/js/profile-data.js — hier stehen nur die
     Daten, die sich Katalog-Seite (shop.js) und Belohnungs-Logik teilen.
     Wichtig, siehe docs/SHOP.md: KEIN Pay-to-Win — Premium/Credits kaufen
     NIE einen Gameplay-Vorteil (keine leichteren Reimwörter, keine bessere
     Bewertung, kein Zeitvorteil). Nur Kosmetik (Ball-Designs), Komfort
     (mehr Strophen), Zugriff (Beats/Challenges) und Werbefreiheit.
     ------------------------------------------------------------------- */

  const PREMIUM = {
    priceLabel: "6,99 €",
    billingLabel: "pro Monat (Demo — keine echte Zahlung)",
  };

  const CREDIT_PACKAGES = [
    { id: "cp1", credits: 100, priceLabel: "0,99 €" },
    { id: "cp2", credits: 550, priceLabel: "4,49 €", bonusLabel: "+10% mehr Credits" },
    { id: "cp3", credits: 1200, priceLabel: "8,99 €", bonusLabel: "+20% mehr Credits" },
  ];

  // premiumOnly: nur mit Premium wählbar (nie per Credits kaufbar — echte
  // Premium-Exklusivität). price: Freischaltkosten in Credits für
  // Nicht-Premium-Designs (0 = von Anfang an frei, z.B. "classic").
  const BALL_DESIGNS = [
    { id: "classic", name: "Classic White", desc: "Der Standard-Ball.", price: 0, premiumOnly: false,
      gradient: "radial-gradient(circle at 35% 30%, #ffffff, #e4e6f5 55%, #b9bcd6 100%)",
      glow: "0 0 12px rgba(255,255,255,.9), 0 0 28px rgba(255,255,255,.5)" },
    { id: "neon-purple", name: "Neon Purple", desc: "Violettes Glühen im Takt der Marke.", price: 90, premiumOnly: false,
      gradient: "radial-gradient(circle at 35% 30%, #f3ddff, #b537f5 60%, #6b12a8 100%)",
      glow: "0 0 14px rgba(181,55,245,.95), 0 0 32px rgba(181,55,245,.55)" },
    { id: "ice-blue", name: "Ice Blue", desc: "Kühler Cyan-Trail hinter dem Ball her.", price: 90, premiumOnly: false,
      gradient: "radial-gradient(circle at 35% 30%, #e3faff, #29d3ff 60%, #0f7ea8 100%)",
      glow: "0 0 14px rgba(41,211,255,.95), 0 0 32px rgba(41,211,255,.55)" },
    { id: "inferno", name: "Inferno", desc: "Premium-exklusiv — brennt wie Magma.", price: 0, premiumOnly: true,
      gradient: "radial-gradient(circle at 35% 30%, #fff2d9, #ff8a3d 55%, #ff3d1f 100%)",
      glow: "0 0 16px rgba(255,106,0,.95), 0 0 34px rgba(255,45,0,.6)" },
    { id: "gold", name: "Gold Rush", desc: "Premium-exklusiv — pures Gold auf der Bühne.", price: 0, premiumOnly: true,
      gradient: "radial-gradient(circle at 35% 30%, #fff8e0, #ffd66b 55%, #b8860b 100%)",
      glow: "0 0 16px rgba(255,214,107,.95), 0 0 34px rgba(184,134,11,.55)" },
  ];

  // Kuratierte Preset-Challenges, nur mit Premium spielbar — reiner
  // INHALTS-Zugriff (Beat/Thema/Strophenzahl-Kombination), KEIN leichterer
  // Schwierigkeitsgrad und keine andere Bewertungslogik als jede normale
  // Challenge (siehe docs/SHOP.md, Abschnitt "Niemals Pay-to-Win").
  const PREMIUM_CHALLENGES = [
    { id: "pc1", name: "Neon Cypher", desc: "Battle-Vibes auf Dark Trap Wave — hart, schnell, kompromisslos.", difficulty: "schwer", beatId: "b1", topic: "battle", verses: 4 },
    { id: "pc2", name: "Midnight Grind", desc: "Money-Talk auf Midnight Cypher — spät, ruhig, treffsicher.", difficulty: "mittel", beatId: "b6", topic: "money", verses: 3 },
    { id: "pc3", name: "Aufstiegs-Story", desc: "Motivation in 5 Strophen — die volle Distanz.", difficulty: "leicht", beatId: "b1", topic: "motivation", verses: 5 },
  ];

  // Tages-Login-Belohnung, 7-Tage-Zyklus (danach beginnt er von vorn).
  // Tag 7 hat zusätzlich eine Chance auf ein zufälliges, noch nicht
  // freigeschaltetes Ball-Design (kosmetischer Bonus statt nur Credits).
  const DAILY_LOGIN_REWARDS = [
    { day: 1, credits: 5 },
    { day: 2, credits: 8 },
    { day: 3, credits: 10 },
    { day: 4, credits: 12 },
    { day: 5, credits: 15 },
    { day: 6, credits: 18 },
    { day: 7, credits: 30, ballDesignChance: true },
  ];

  // Eine rotierende, aber in diesem Prototyp bewusst statische
  // Wochen-Challenge (kein Backend, das echte Rotation bräuchte) —
  // "3 Challenges in dieser Woche abschließen".
  const WEEKLY_CHALLENGE = {
    id: "weekly_3_challenges",
    target: 3,
    label: "Schließe diese Woche 3 Challenges ab",
    creditsReward: 35,
  };

  const WEEKEND_BONUS_MULTIPLIER = 1.25;

  /** "Besonderes Event": Wochenend-Bonus auf verdiente Credits (Sa/So, nach
   * lokaler Client-Uhrzeit — deterministisch statt server-gepusht, siehe
   * docs/SHOP.md für die ehrlichen Grenzen dieser Simulation). */
  function isWeekendBonusActive() {
    const day = new Date().getDay(); // 0 = Sonntag, 6 = Samstag
    return day === 0 || day === 6;
  }

  function findBallDesign(id) {
    return BALL_DESIGNS.find((d) => d.id === id) || BALL_DESIGNS[0];
  }

  /* -------------------------------------------------------------------
     Modul 6 — Faires Monetarisierungssystem (Erweiterung von Modul 5)
     -------------------------------------------------------------------
     Neue kosmetische Kategorien (Ergebnis-Animationen, Profil-Designs),
     ein Free-Tages-Limit für Challenges (Premium = unbegrenzt — reine
     Komfort-/Zugriffs-Grenze, KEIN Bewertungs-/Zeit-/Reimwort-Vorteil),
     eine rein dekorative Zahlungsmethoden-Auswahl für die Kaufbestätigung
     (KEINE echten Zahlungsfelder, siehe docs/SHOP.md) und eine
     Early-Access-Vorschau. Siehe docs/SHOP.md Abschnitt "Niemals
     Pay-to-Win" — gilt hier genauso.
     ------------------------------------------------------------------- */

  // Free-Accounts dürfen FREE_DAILY_CHALLENGE_LIMIT Challenges pro Kalendertag
  // STARTEN (siehe profile-data.js: canStartChallenge()/recordChallengeStart()).
  // Bewusst großzügig bemessen — eine Zugriffs-/Komfortgrenze, kein
  // Wettbewerbsnachteil: wer eine Challenge spielt, wird exakt gleich bewertet
  // wie mit Premium. Premium = unbegrenzt (Infinity).
  const FREE_DAILY_CHALLENGE_LIMIT = 5;

  const RESULT_ANIMATIONS = [
    { id: "classic", name: "Classic Spark", desc: "Der Standard-Look beim Ergebnis.", price: 0, premiumOnly: false, color1: "#b537f5", color2: "#29d3ff" },
    { id: "inferno-burst", name: "Inferno Burst", desc: "Feurige Funken beim Ergebnis-Reveal.", price: 70, premiumOnly: false, color1: "#ff8a3d", color2: "#ff3d1f" },
    { id: "aurora", name: "Aurora Flow", desc: "Premium-exklusiv — sanftes Nordlicht-Schimmern.", price: 0, premiumOnly: true, color1: "#29d3ff", color2: "#4fffb0" },
    { id: "gold-shower", name: "Gold Shower", desc: "Premium-exklusiv — goldener Punktregen.", price: 0, premiumOnly: true, color1: "#ffd66b", color2: "#fff2c2" },
  ];

  const PROFILE_THEMES = [
    { id: "default", name: "Standard", desc: "Die gewohnten App-Farben.", price: 0, premiumOnly: false, gradient: null },
    { id: "sunset", name: "Sunset", desc: "Warmer Orange-Pink-Verlauf.", price: 60, premiumOnly: false, gradient: "linear-gradient(135deg, rgba(255,138,61,0.28) 0%, rgba(255,79,216,0.22) 100%)" },
    { id: "cyber", name: "Cyber", desc: "Premium-exklusiv — kühles Neon-Grid-Gefühl.", price: 0, premiumOnly: true, gradient: "linear-gradient(135deg, rgba(41,211,255,0.3) 0%, rgba(181,55,245,0.24) 100%)" },
    { id: "aurora-theme", name: "Aurora", desc: "Premium-exklusiv — sanftes Grün-Blau.", price: 0, premiumOnly: true, gradient: "linear-gradient(135deg, rgba(79,255,176,0.24) 0%, rgba(41,211,255,0.24) 100%)" },
  ];

  // Rein visuelle Auswahl für die Kaufbestätigung — es gibt KEINE echten
  // Zahlungsfelder/-formulare, keine echte Verarbeitung. Siehe docs/SHOP.md.
  const PAYMENT_METHODS = [
    { id: "apple_pay", label: "Apple Pay", icon: "🍎" },
    { id: "google_pay", label: "Google Pay", icon: "🇬" },
    { id: "credit_card", label: "Kreditkarte", icon: "💳" },
    { id: "debit_card", label: "Debitkarte", icon: "🏦" },
  ];

  // Simulierte Vorschau auf ein künftiges Feature — es gibt (noch) keine
  // echte Feature-Pipeline in diesem Prototyp; die Karte macht das im Text
  // selbst transparent, statt einen echten Rollout vorzutäuschen.
  const EARLY_ACCESS_PREVIEW = {
    icon: "🧪",
    name: "Voice-Filter (Vorschau)",
    desc: "Stimmveränderungen für deine Aufnahmen — als Erstes ausprobieren, sobald es echten Code dafür gibt. Reine Demo-Vorschau, noch kein echtes Feature.",
  };

  function findAnimation(id) {
    return RESULT_ANIMATIONS.find((a) => a.id === id) || RESULT_ANIMATIONS[0];
  }

  function findTheme(id) {
    return PROFILE_THEMES.find((t) => t.id === id) || PROFILE_THEMES[0];
  }

  window.FlowData = {
    STORAGE_KEY,
    GAMEPLAY_CONFIG,
    BEATS,
    TOPICS,
    DEFAULT_SETTINGS,
    PREMIUM,
    CREDIT_PACKAGES,
    BALL_DESIGNS,
    PREMIUM_CHALLENGES,
    DAILY_LOGIN_REWARDS,
    WEEKLY_CHALLENGE,
    WEEKEND_BONUS_MULTIPLIER,
    FREE_DAILY_CHALLENGE_LIMIT,
    RESULT_ANIMATIONS,
    PROFILE_THEMES,
    PAYMENT_METHODS,
    EARLY_ACCESS_PREVIEW,
    loadSettings,
    saveSettings,
    findBeat,
    findTopicLabel,
    findBallDesign,
    findAnimation,
    findTheme,
    isWeekendBonusActive,
  };
})(window);
