/* =========================================================================
   FlowArena — Tournament Store (Modul 3: Turniere & Multiplayer)
   -------------------------------------------------------------------------
   WICHTIG — Ehrlichkeit über die Grenzen dieses Prototyps (wie schon bei
   Community/Profil, siehe docs/COMMUNITY.md):
   Es gibt KEIN Backend und KEINE echte Geräte-übergreifende Synchronisation.
   Turniere leben komplett in localStorage DIESES EINEN BROWSERS. Ein
   Raum-Code funktioniert deshalb NUR, wenn Host und Beitretende dieselbe
   localStorage-Instanz teilen (z.B. zwei Tabs desselben Browsers) — nicht
   über echte Geräte hinweg. "Bots hinzufügen" simuliert weitere
   Teilnehmer:innen lokal, damit der komplette Ablauf (Lobby, gleichzeitige
   Runden, Voting, Sieger-Ermittlung) trotzdem allein durchgespielt werden
   kann. Die Datenstruktur ist bereits so geschnitten, dass ein echtes
   Backend (Modul 5+) sie 1:1 per WebSocket/API ersetzen kann, ohne dass
   tournament.js/index.html sich strukturell ändern müssten — siehe
   docs/TOURNAMENTS.md.
   ========================================================================= */

(function (window) {
  "use strict";

  const STORAGE_KEY = "flowarena.tournaments.v1";
  const ME_ID = "me"; // Diese eine echte Person in diesem Browser — egal ob Host oder Beigetretene:r

  const BOT_NAMES = ["MC Vega", "Lyrika", "Flowzone", "Kleiner Reim", "Silbensturm", "Reimrakete", "Bar-Baron", "Nachtschicht"];
  const BOT_AVATARS = ["🤖", "👾", "🎮", "🦾", "🧠", "🕹️"];
  const BOT_EXCERPTS = [
    "„...bleib auf der Spur, so wie ich's geplant hab...\"",
    "„...jede Zeile sitzt, kein Zufall, nur Plan...\"",
    "„...der Beat trägt mich, ich zähl nicht die Zeit...\"",
    "„...ruhig im Kopf, laut im Ton, das ist mein Style...\"",
    "„...ich reim mich durch, so wie ich's immer tu...\"",
  ];

  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveAll(all) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      /* localStorage evtl. nicht verfügbar — Turnier lebt dann nur für die Session */
    }
  }

  function generateCode(all) {
    let code;
    do {
      code = String(Math.floor(1000 + Math.random() * 9000));
    } while (all[code]);
    return code;
  }

  function loadTournament(code) {
    const all = loadAll();
    return all[code] || null;
  }

  function saveTournament(t) {
    const all = loadAll();
    all[t.code] = t;
    saveAll(all);
  }

  /** @param {Object} opts - { hostProfile, difficulty, beatId, topic, roundsTotal } */
  function createTournament({ hostProfile, difficulty, beatId, topic, roundsTotal }) {
    const all = loadAll();
    const code = generateCode(all);
    const tournament = {
      code,
      createdAt: Date.now(),
      settings: { difficulty, beatId, topic, roundsTotal },
      status: "lobby", // lobby -> live -> voting -> (nächste Runde: live/voting …) -> finished
      players: [{ id: ME_ID, name: hostProfile.displayName, avatar: hostProfile.avatar, isHost: true, isBot: false, joinedAt: Date.now() }],
      rounds: [],
      currentRoundIndex: 0,
    };
    all[code] = tournament;
    saveAll(all);
    return tournament;
  }

  /** @returns {{ ok: boolean, tournament?: Object, error?: string }} */
  function joinTournament(code, playerProfile) {
    const t = loadTournament(code);
    if (!t) return { ok: false, error: "not_found" };
    if (t.status !== "lobby") return { ok: false, error: "already_started" };

    const existing = t.players.find((p) => p.id === ME_ID);
    if (existing) {
      existing.name = playerProfile.displayName;
      existing.avatar = playerProfile.avatar;
      saveTournament(t);
      return { ok: true, tournament: t };
    }
    t.players.push({ id: ME_ID, name: playerProfile.displayName, avatar: playerProfile.avatar, isHost: false, isBot: false, joinedAt: Date.now() });
    saveTournament(t);
    return { ok: true, tournament: t };
  }

  /** Demo-Hilfsfunktion: fügt `count` simulierte Mitspieler:innen hinzu. */
  function addBotPlayers(code, count) {
    const t = loadTournament(code);
    if (!t || t.status !== "lobby") return null;
    const usedNames = new Set(t.players.map((p) => p.name));
    const added = [];
    for (let i = 0; i < count; i++) {
      const pool = BOT_NAMES.filter((n) => !usedNames.has(n));
      const name = (pool.length ? pool : BOT_NAMES)[Math.floor(Math.random() * (pool.length ? pool.length : BOT_NAMES.length))];
      usedNames.add(name);
      const avatar = BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)];
      const player = { id: `bot-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`, name, avatar, isHost: false, isBot: true, joinedAt: Date.now() };
      t.players.push(player);
      added.push(player);
      // Wächst die Personen-Directory (Modul 4, Ausbau) — macht Suche/Freunde
      // über die Zeit lebendiger, ohne ein Backend zu brauchen.
      window.FlowSocial?.rememberPerson({ name, avatar });
    }
    saveTournament(t);
    return added;
  }

  /**
   * Fügt eine:n gespeicherte:n Freund:in als (simulierte:n) Teilnehmer:in
   * hinzu — dieselbe Bot-Simulation wie addBotPlayers() (kein echtes
   * zweites Gerät), aber mit dem echten Namen/Avatar aus der Freundesliste
   * statt einem Zufallsnamen, plus `isFriendInvite` für eine persönlichere
   * Kennzeichnung in der UI.
   */
  function addFriendPlayer(code, friend) {
    const t = loadTournament(code);
    if (!t || t.status !== "lobby") return null;
    if (t.players.some((p) => p.name === friend.name)) return null;
    const player = { id: `friend-${Date.now()}-${Math.floor(Math.random() * 1000)}`, name: friend.name, avatar: friend.avatar, isHost: false, isBot: true, isFriendInvite: true, joinedAt: Date.now() };
    t.players.push(player);
    saveTournament(t);
    return player;
  }

  /**
   * Generiert alle Runden und startet Runde 1. JEDE Runde besteht aus
   * gameplayConfig.stanzasPerTournamentRound (3) Strophen hintereinander —
   * gleiche Reimwörter/Reimschema pro Strophe für ALLE Teilnehmenden
   * (Fairness), automatisch eine neue Reim-Familie pro Strophe (nicht nur
   * pro Runde), garantiert einzigartig über das GESAMTE Turnier hinweg
   * (usedFamilyIds wächst über alle Runden UND Strophen).
   * @param {Object} gameplayConfig - GAMEPLAY_CONFIG aus data.js (linesPerStanza, stanzasPerTournamentRound)
   */
  async function startTournament(code, gameplayConfig) {
    const t = loadTournament(code);
    if (!t) return null;

    const stanzasPerRound = gameplayConfig.stanzasPerTournamentRound || 3;
    const usedFamilyIds = [];
    const rounds = [];
    for (let i = 0; i < t.settings.roundsTotal; i++) {
      const stanzas = [];
      for (let s = 0; s < stanzasPerRound; s++) {
        const result = await window.FlowAI.rhyme.generateStanza({
          difficulty: t.settings.difficulty,
          topic: t.settings.topic,
          excludeFamilyIds: usedFamilyIds,
          count: gameplayConfig.linesPerStanza,
        });
        usedFamilyIds.push(result.familyId);
        stanzas.push({ words: result.words, ending: result.ending, familyId: result.familyId });
      }
      rounds.push({ roundIndex: i, stanzas, submissions: {} });
    }

    t.rounds = rounds;
    t.status = "live";
    t.currentRoundIndex = 0;
    saveTournament(t);
    return t;
  }

  function submitRoundResult(code, roundIndex, playerId, submission) {
    const t = loadTournament(code);
    if (!t || !t.rounds[roundIndex]) return null;
    t.rounds[roundIndex].submissions[playerId] = { votes: 0, votedBy: [], submittedAt: Date.now(), ...submission };
    saveTournament(t);
    return t;
  }

  /** Simuliert Einreichungen aller Bot-Spieler:innen für eine Runde (plausible Zufallswerte). */
  function simulateBotSubmissions(code, roundIndex) {
    const t = loadTournament(code);
    if (!t || !t.rounds[roundIndex]) return null;
    const round = t.rounds[roundIndex];
    t.players.filter((p) => p.isBot).forEach((p) => {
      if (round.submissions[p.id]) return;
      const overall = 55 + Math.floor(Math.random() * 40);
      round.submissions[p.id] = {
        overall,
        excerpt: BOT_EXCERPTS[Math.floor(Math.random() * BOT_EXCERPTS.length)],
        isBot: true,
        votes: 0,
        votedBy: [],
        submittedAt: Date.now(),
      };
      window.FlowSocial?.rememberPerson({ name: p.name, avatar: p.avatar, score: overall });
    });
    saveTournament(t);
    return t;
  }

  /** @returns {Object|null} aktualisiertes Turnier, oder null wenn schon gevotet/ungültig */
  function voteSubmission(code, roundIndex, submissionPlayerId, voterId) {
    const t = loadTournament(code);
    if (!t || !t.rounds[roundIndex]) return null;
    const sub = t.rounds[roundIndex].submissions[submissionPlayerId];
    if (!sub) return null;
    sub.votedBy = sub.votedBy || [];
    if (sub.votedBy.includes(voterId)) return t;
    sub.votedBy.push(voterId);
    sub.votes = sub.votedBy.length;
    saveTournament(t);
    return t;
  }

  function advanceRound(code) {
    const t = loadTournament(code);
    if (!t) return null;
    if (t.currentRoundIndex < t.rounds.length - 1) {
      t.currentRoundIndex += 1;
      t.status = "live";
    } else {
      t.status = "finished";
    }
    saveTournament(t);
    return t;
  }

  /**
   * Gesamtstand: Summe der Rundenpunkte + Community-Votes als Tie-Breaker
   * (jede Stimme zählt wie +3 Punkte) — Punkte bleiben der Haupttreiber,
   * Votes können bei knappem Ergebnis den Ausschlag geben, aber nie eine
   * schwache Performance zum Sieg tragen. Fairness: alle sehen dieselben
   * Reimwörter/denselben Beat pro Runde, dieselbe Bewertungslogik.
   */
  function computeStandings(t) {
    const totals = {};
    t.players.forEach((p) => { totals[p.id] = { score: 0, votes: 0 }; });
    t.rounds.forEach((r) => {
      Object.entries(r.submissions).forEach(([pid, sub]) => {
        if (!totals[pid]) totals[pid] = { score: 0, votes: 0 };
        totals[pid].score += sub.overall || 0;
        totals[pid].votes += sub.votes || 0;
      });
    });
    const rows = t.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isBot: p.isBot,
      totalScore: totals[p.id]?.score || 0,
      totalVotes: totals[p.id]?.votes || 0,
      combined: (totals[p.id]?.score || 0) + (totals[p.id]?.votes || 0) * 3,
    }));
    rows.sort((a, b) => b.combined - a.combined);
    return rows;
  }

  window.FlowTournament = {
    STORAGE_KEY,
    ME_ID,
    createTournament,
    loadTournament,
    saveTournament,
    joinTournament,
    addBotPlayers,
    addFriendPlayer,
    startTournament,
    submitRoundResult,
    simulateBotSubmissions,
    voteSubmission,
    advanceRound,
    computeStandings,
  };
})(window);
