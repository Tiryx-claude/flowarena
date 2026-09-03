/* =========================================================================
   FlowArena — Profile Store (Modul 4: Community, Profile, Premium & Credits)
   -------------------------------------------------------------------------
   WICHTIG — Ehrlichkeit über die Grenzen dieses Prototyps:
   Es gibt kein Backend und keine echten Accounts. Dieses "Profil" lebt
   komplett in localStorage DIESES EINEN BROWSERS. Es gibt keine echte
   Anmeldung, keinen Server-Abgleich zwischen Geräten, und "Premium" ist ein
   reiner Demo-Schalter OHNE jede echte Zahlung (siehe unlockPremiumDemo()) —
   es werden nirgends Zahlungsdaten abgefragt oder verarbeitet. Sobald ein
   echtes Backend existiert (Modul 5+), wird dieser Store 1:1 durch
   API-Calls (/api/profile, /api/credits, …) ersetzt; die Aufrufer
   (profile.html, community.html, challenge.js) ändern sich dabei nicht.
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
   * vergibt Credits und prüft neue Abzeichen.
   * @returns {{ creditsEarned: number, newBadges: Array }}
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

    const creditsEarned = 10 + Math.round(overall / 10);
    addCredits(profile, creditsEarned);

    const newBadges = checkBadgeConditions(profile);
    save(profile);
    return { creditsEarned, newBadges };
  }

  /**
   * Nach Abschluss eines Turniers aufrufen (jede:r Teilnehmer:in, nicht nur
   * der/die Sieger:in). Vergibt Teilnahme-Credits, bei Sieg zusätzlichen
   * Bonus + das "Turniersieger"-Abzeichen. Läuft für denselben `code` nur
   * EINMAL durch (schützt gegen Doppel-Vergabe, falls der Finale-Screen neu
   * geladen wird).
   * @returns {{ creditsEarned: number, newBadges: Array }}
   */
  function recordTournamentResult(profile, { code, won }) {
    if (code && profile.rewardedTournamentCodes.includes(code)) {
      return { creditsEarned: 0, newBadges: [] };
    }
    if (code) profile.rewardedTournamentCodes.push(code);

    profile.stats.tournamentsPlayed += 1;
    if (won) profile.stats.tournamentsWon += 1;

    const creditsEarned = won ? 40 : 15;
    addCredits(profile, creditsEarned);

    const newBadges = checkBadgeConditions(profile);
    save(profile);
    return { creditsEarned, newBadges };
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
    recordChallengeResult,
    recordTournamentResult,
    setPrivacy,
    resetAllLocalData,
  };
})(window);
