/* =========================================================================
   FlowArena — Profile Store (Modul 4: Community/Profile, Modul 5: Shop/
   Premium/Credits — Ball-Designs, Credits-Käufe, Tages-/Wochen-Belohnungen)
   -------------------------------------------------------------------------
   WICHTIG — Ehrlichkeit über die Grenzen dieses Prototyps:
   Es gibt kein Backend und keine echten Accounts. Dieses "Profil" lebt
   komplett in localStorage DIESES EINEN BROWSERS. Es gibt keine echte
   Anmeldung, keinen Server-Abgleich zwischen Geräten, und "Premium"/
   Credits-Käufe sind reine Demo-Schalter OHNE jede echte Zahlung (siehe
   unlockPremiumDemo() / purchaseCreditsDemo()) — es werden nirgends
   Zahlungsdaten abgefragt oder verarbeitet. Genauso wichtig: Premium/Credits
   kaufen NIE einen Gameplay-Vorteil — siehe docs/SHOP.md, Abschnitt
   "Niemals Pay-to-Win". Sobald ein echtes Backend existiert, wird dieser
   Store 1:1 durch API-Calls (/api/profile, /api/credits, /api/payments, …)
   ersetzt; die Aufrufer (profile.html, shop.html, challenge.js) ändern
   sich dabei nicht.
   ========================================================================= */

(function (window) {
  "use strict";

  const STORAGE_KEY = "flowarena.profile.v1";
  const AVATAR_OPTIONS = ["🎤", "🔥", "🎧", "🐉", "👑", "🚀", "🎯", "⚡", "🦊", "🌙"];

  const BADGES = [
    { id: "first_flow", name: "Erster Flow", icon: "🎤", desc: "Deine erste Challenge abgeschlossen." },
    { id: "marathon", name: "Marathoner", icon: "🏃", desc: "Eine Challenge mit 5+ Strophen durchgezogen." },
    { id: "veteran", name: "Vielspieler", icon: "🔥", desc: "5 Challenges abgeschlossen." },
    { id: "century", name: "Century", icon: "💯", desc: "Eine Challenge mit 85+ Gesamtpunkten beendet." },
    { id: "wordsmith", name: "Wortakrobat", icon: "✍️", desc: "85+ Punkte bei Kreativität erreicht." },
    { id: "on_point", name: "Wort-Perfektionist", icon: "🎯", desc: "90+ Punkte bei Endwort-Nutzung erreicht." },
    { id: "roast_survivor", name: "Roast-Survivor", icon: "😅", desc: "Eine Challenge im Roast-Modus überlebt." },
    { id: "explorer", name: "Entdecker", icon: "🧭", desc: "4 verschiedene Themenfelder ausprobiert." },
    { id: "tournament_champion", name: "Turniersieger", icon: "🏆", desc: "Ein Turnier gewonnen." },
  ];

  function defaultProfile() {
    return {
      displayName: "Anonymer MC",
      avatar: AVATAR_OPTIONS[0],
      credits: 40, // kleines Startguthaben, damit man direkt etwas ausprobieren kann
      premium: false,
      unlockedBeatIds: [],
      earnedBadgeIds: [],
      privacy: {
        showOnLeaderboard: true, // steuert, ob "Du" in Rangliste/Mini-Rangliste auftauchst
        showActivityToFriends: true, // symbolisch (kein Backend) — vorbereitet für später
      },
      stats: {
        challengesCompleted: 0,
        totalScore: 0,
        bestScore: 0,
        bestKreativitaet: 0,
        bestEndwortNutzung: 0,
        maxStanzasInOneRun: 0,
        roastCompleted: false,
        topicsUsed: [],
        tournamentsPlayed: 0,
        tournamentsWon: 0,
      },
      rewardedTournamentCodes: [], // verhindert Doppel-Vergabe von Credits/Badges bei einem Reload auf dem Finale-Screen
      // ---- Modul 5: Shop, Premium, Credits & Werbung ----
      activeBallDesignId: "classic",
      unlockedBallDesignIds: ["classic"],
      login: { streak: 0, lastLoginDate: null }, // lastLoginDate: "YYYY-MM-DD" (lokale Client-Zeit)
      weeklyChallenge: { weekKey: null, progress: 0, completed: false },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProfile();
      const parsed = JSON.parse(raw);
      // Merge gegen defaultProfile(), damit neu hinzugekommene Felder bei
      // älteren gespeicherten Profilen nicht fehlen.
      const base = defaultProfile();
      return {
        ...base,
        ...parsed,
        stats: { ...base.stats, ...(parsed.stats || {}) },
        privacy: { ...base.privacy, ...(parsed.privacy || {}) },
        login: { ...base.login, ...(parsed.login || {}) },
        weeklyChallenge: { ...base.weeklyChallenge, ...(parsed.weeklyChallenge || {}) },
      };
    } catch (e) {
      return defaultProfile();
    }
  }

  function save(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      /* localStorage evtl. nicht verfügbar — kein Problem, Profil lebt nur für die Session */
    }
  }

  function addCredits(profile, amount) {
    profile.credits += amount;
    save(profile);
    return profile;
  }

  /** @returns {boolean} true wenn genug Credits vorhanden waren und abgezogen wurden */
  function spendCredits(profile, amount) {
    if (profile.credits < amount) return false;
    profile.credits -= amount;
    save(profile);
    return true;
  }

  /** Demo-Upgrade — KEINE echte Zahlung, siehe Datei-Kopfkommentar. */
  function unlockPremiumDemo(profile) {
    profile.premium = true;
    save(profile);
    return profile;
  }

  function isBeatUnlocked(profile, beat) {
    if (!beat.premiumOnly) return true;
    if (profile.premium) return true;
    return profile.unlockedBeatIds.includes(beat.id);
  }

  /** @returns {boolean} true wenn erfolgreich freigeschaltet */
  function unlockBeat(profile, beat) {
    if (isBeatUnlocked(profile, beat)) return true;
    if (!spendCredits(profile, beat.unlockCost || 0)) return false;
    profile.unlockedBeatIds.push(beat.id);
    save(profile);
    return true;
  }

  /* -----------------------------------------------------------------
     Modul 5 — Ball-Designs (kosmetisch, siehe docs/SHOP.md)
     ----------------------------------------------------------------- */
  function isBallDesignUnlocked(profile, design) {
    if (!design.premiumOnly && design.price === 0) return true;
    if (design.premiumOnly) return profile.premium === true;
    return profile.unlockedBallDesignIds.includes(design.id);
  }

  /** @returns {boolean} true wenn erfolgreich freigeschaltet (oder schon frei) */
  function unlockBallDesign(profile, design) {
    if (isBallDesignUnlocked(profile, design)) return true;
    if (design.premiumOnly) return false; // premiumOnly ist NIE per Credits kaufbar — echte Exklusivität
    if (!spendCredits(profile, design.price || 0)) return false;
    profile.unlockedBallDesignIds.push(design.id);
    save(profile);
    return true;
  }

  /** @returns {boolean} true wenn erfolgreich ausgewählt (setzt voraus: schon freigeschaltet) */
  function setActiveBallDesign(profile, design) {
    if (!isBallDesignUnlocked(profile, design)) return false;
    profile.activeBallDesignId = design.id;
    save(profile);
    return true;
  }

  /* -----------------------------------------------------------------
     Modul 5 — Credits-Kauf (Demo, KEINE echte Zahlung — siehe Kopfkommentar)
     ----------------------------------------------------------------- */
  function purchaseCreditsDemo(profile, pkg) {
    addCredits(profile, pkg.credits);
    return profile;
  }

  /* -----------------------------------------------------------------
     Modul 5 — Tages-Login-Belohnung
     ----------------------------------------------------------------- */
  function todayKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function isConsecutiveDay(prevKey, curKey) {
    if (!prevKey) return false;
    const prev = new Date(prevKey + "T00:00:00");
    const cur = new Date(curKey + "T00:00:00");
    const diffDays = Math.round((cur - prev) / 86400000);
    return diffDays === 1;
  }

  /**
   * Einmal pro Kalendertag aufrufen (idempotent — sicher von jeder Seite
   * aus aufrufbar, siehe assets/js/daily-rewards.js). Serie bricht ab,
   * sobald ein Kalendertag komplett ausgelassen wird.
   * @returns {{ rewarded: boolean, day?: number, streak?: number, creditsEarned?: number, unlockedBallDesign?: Object|null }}
   */
  function recordDailyLogin(profile) {
    const today = todayKey();
    if (profile.login.lastLoginDate === today) return { rewarded: false };

    const streak = isConsecutiveDay(profile.login.lastLoginDate, today) ? profile.login.streak + 1 : 1;
    profile.login = { streak, lastLoginDate: today };

    const rewards = window.FlowData.DAILY_LOGIN_REWARDS;
    const cycleIndex = (streak - 1) % rewards.length;
    const reward = rewards[cycleIndex];

    let unlockedBallDesign = null;
    if (reward.ballDesignChance) {
      const locked = window.FlowData.BALL_DESIGNS.filter((d) => !d.premiumOnly && !isBallDesignUnlocked(profile, d));
      if (locked.length > 0) {
        const pick = locked[Math.floor(Math.random() * locked.length)];
        profile.unlockedBallDesignIds.push(pick.id);
        unlockedBallDesign = pick;
      }
    }

    addCredits(profile, reward.credits);
    save(profile);
    return { rewarded: true, day: cycleIndex + 1, streak, creditsEarned: reward.credits, unlockedBallDesign };
  }

  /* -----------------------------------------------------------------
     Modul 5 — Wöchentliche Challenge & Wochenend-Bonus
     ----------------------------------------------------------------- */
  function isoWeekKey(d = new Date()) {
    // ISO-8601-Wochennummer, lokale Client-Zeit (kein Server, kein Zeitzonen-Abgleich).
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }

  /**
   * Nach jeder abgeschlossenen Challenge aufrufen — zählt auf die aktuelle
   * Wochen-Challenge ein (setzt sich automatisch zurück, sobald eine neue
   * ISO-Woche beginnt). Vergibt die Belohnung genau EINMAL pro Woche.
   * @returns {{ completed: boolean, label?: string, creditsReward?: number }}
   */
  function bumpWeeklyChallenge(profile) {
    const wk = isoWeekKey();
    if (profile.weeklyChallenge.weekKey !== wk) {
      profile.weeklyChallenge = { weekKey: wk, progress: 0, completed: false };
    }
    if (profile.weeklyChallenge.completed) return { completed: false };

    profile.weeklyChallenge.progress += 1;
    const def = window.FlowData.WEEKLY_CHALLENGE;
    if (profile.weeklyChallenge.progress >= def.target) {
      profile.weeklyChallenge.completed = true;
      addCredits(profile, def.creditsReward);
      save(profile);
      return { completed: true, label: def.label, creditsReward: def.creditsReward };
    }
    save(profile);
    return { completed: false };
  }

  /** Rundet Credits-Beträge NACH Anwendung des Wochenend-Bonus (falls aktiv). */
  function applyWeekendBonus(amount) {
    if (!window.FlowData.isWeekendBonusActive()) return { amount, applied: false };
    return { amount: Math.round(amount * window.FlowData.WEEKEND_BONUS_MULTIPLIER), applied: true };
  }

  /** Kleiner kosmetischer Bonus bei einem Turniersieg: Chance auf ein
   * zufälliges, noch nicht freigeschaltetes Ball-Design statt nur Credits —
   * fällt zurück auf null, wenn schon alles freigeschaltet ist. */
  function maybeAwardCosmetic(profile, chance = 0.3) {
    if (Math.random() > chance) return null;
    const locked = window.FlowData.BALL_DESIGNS.filter((d) => !d.premiumOnly && !isBallDesignUnlocked(profile, d));
    if (locked.length === 0) return null;
    const pick = locked[Math.floor(Math.random() * locked.length)];
    profile.unlockedBallDesignIds.push(pick.id);
    save(profile);
    return pick;
  }

  function checkBadgeConditions(profile) {
    const s = profile.stats;
    const checks = {
      first_flow: s.challengesCompleted >= 1,
      marathon: s.maxStanzasInOneRun >= 5,
      veteran: s.challengesCompleted >= 5,
      century: s.bestScore >= 85,
      wordsmith: s.bestKreativitaet >= 85,
      on_point: s.bestEndwortNutzung >= 90,
      roast_survivor: s.roastCompleted === true,
      explorer: (s.topicsUsed || []).length >= 4,
      tournament_champion: (s.tournamentsWon || 0) >= 1,
    };
    const newly = [];
    BADGES.forEach((b) => {
      if (checks[b.id] && !profile.earnedBadgeIds.includes(b.id)) {
        profile.earnedBadgeIds.push(b.id);
        newly.push(b);
      }
    });
    return newly;
  }

  /**
   * Nach einer abgeschlossenen Challenge aufrufen. Aktualisiert Stats,
   * vergibt Credits (inkl. Wochenend-Bonus, siehe docs/SHOP.md), prüft neue
   * Abzeichen und zählt auf die Wochen-Challenge ein.
   * @returns {{ creditsEarned: number, newBadges: Array, weekendBonusApplied: boolean, weeklyChallenge: {completed: boolean, label?: string, creditsReward?: number} }}
   */
  function recordChallengeResult(profile, { overall, scores, stanzaCount, roastMode, topic }) {
    const s = profile.stats;
    s.challengesCompleted += 1;
    s.totalScore += overall;
    s.bestScore = Math.max(s.bestScore, overall);
    s.bestKreativitaet = Math.max(s.bestKreativitaet, scores.kreativitaet || 0);
    s.bestEndwortNutzung = Math.max(s.bestEndwortNutzung, scores.endwortNutzung || 0);
    s.maxStanzasInOneRun = Math.max(s.maxStanzasInOneRun, stanzaCount);
    if (roastMode) s.roastCompleted = true;
    if (topic && !s.topicsUsed.includes(topic)) s.topicsUsed.push(topic);

    const base = 10 + Math.round(overall / 10);
    const { amount: creditsEarned, applied: weekendBonusApplied } = applyWeekendBonus(base);
    addCredits(profile, creditsEarned);

    const weeklyChallenge = bumpWeeklyChallenge(profile);
    const newBadges = checkBadgeConditions(profile);
    save(profile);
    return { creditsEarned, newBadges, weekendBonusApplied, weeklyChallenge };
  }

  /**
   * Nach Abschluss eines Turniers aufrufen (jede:r Teilnehmer:in, nicht nur
   * der/die Sieger:in). Vergibt Teilnahme-Credits, bei Sieg zusätzlichen
   * Bonus + das "Turniersieger"-Abzeichen. Läuft für denselben `code` nur
   * EINMAL durch (schützt gegen Doppel-Vergabe, falls der Finale-Screen neu
   * geladen wird).
   * @returns {{ creditsEarned: number, newBadges: Array, weekendBonusApplied: boolean, cosmeticReward: Object|null }}
   */
  function recordTournamentResult(profile, { code, won }) {
    if (code && profile.rewardedTournamentCodes.includes(code)) {
      return { creditsEarned: 0, newBadges: [], weekendBonusApplied: false, cosmeticReward: null };
    }
    if (code) profile.rewardedTournamentCodes.push(code);

    profile.stats.tournamentsPlayed += 1;
    if (won) profile.stats.tournamentsWon += 1;

    const base = won ? 40 : 15;
    const { amount: creditsEarned, applied: weekendBonusApplied } = applyWeekendBonus(base);
    addCredits(profile, creditsEarned);

    // Kosmetischer Bonus nur bei einem Sieg — kein Credits-Ersatz, oben drauf.
    const cosmeticReward = won ? maybeAwardCosmetic(profile) : null;

    const newBadges = checkBadgeConditions(profile);
    save(profile);
    return { creditsEarned, newBadges, weekendBonusApplied, cosmeticReward };
  }

  function setPrivacy(profile, key, value) {
    profile.privacy[key] = value;
    save(profile);
    return profile;
  }

  /**
   * Löscht ALLE FlowArena-Daten aus localStorage (Profil, Community-Posts,
   * Turniere, Freunde, Benachrichtigungen, Einstellungen) — ein echter,
   * sofort wirksamer "Alles zurücksetzen"-Schalter, da es sonst keine
   * Backend-Löschung gibt. Absichtlich nicht automatisch aufgerufen — nur
   * über einen expliziten, bestätigten Klick in profile.html.
   */
  function resetAllLocalData() {
    const prefixes = ["flowarena."];
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && prefixes.some((p) => key.startsWith(p))) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }

  window.FlowProfile = {
    STORAGE_KEY,
    AVATAR_OPTIONS,
    BADGES,
    load,
    save,
    addCredits,
    spendCredits,
    unlockPremiumDemo,
    isBeatUnlocked,
    unlockBeat,
    isBallDesignUnlocked,
    unlockBallDesign,
    setActiveBallDesign,
    purchaseCreditsDemo,
    recordDailyLogin,
    bumpWeeklyChallenge,
    recordChallengeResult,
    recordTournamentResult,
    setPrivacy,
    resetAllLocalData,
  };
})(window);
