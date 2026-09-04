/* =========================================================================
   FlowArena — Turnier-Raum Logik (Modul 3)
   -------------------------------------------------------------------------
   Wiederverwendet bewusst dieselben Bausteine wie die Solo-Challenge
   (BeatClock, Word-Rack, Ball+Funken, KI-Bewertung) — eigenständig
   reimplementiert statt challenge.js zu refactoren, um den bereits
   getesteten Solo-Ablauf nicht anzufassen (siehe docs/TOURNAMENTS.md).
   ========================================================================= */

(function () {
  "use strict";

  const { GAMEPLAY_CONFIG, findBeat, findTopicLabel, loadSettings } = window.FlowData;
  const FlowProfile = window.FlowProfile;
  const FlowTournament = window.FlowTournament;
  const FlowCommunity = window.FlowCommunity;
  const FlowSocial = window.FlowSocial;

  const appSettings = loadSettings(); // nur für soundEnabled (UI-Klicks, nicht der Beat selbst)
  let profile = FlowProfile.load();

  const params = new URLSearchParams(window.location.search);
  const code = (params.get("code") || "").trim();

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function playIfEnabled(fn) {
    if (appSettings.soundEnabled && typeof fn === "function") fn();
  }

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const screens = {
    notFound: $("#screenNotFound"),
    lobby: $("#screenLobby"),
    roundIntro: $("#screenRoundIntro"),
    roundLive: $("#screenRoundLive"),
    roundVoting: $("#screenRoundVoting"),
    final: $("#screenFinal"),
  };

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      if (!el) return;
      const visible = key === name;
      el.hidden = !visible;
      el.style.display = visible ? "" : "none";
    });
  }

  const els = {
    creditsValue: $("#creditsValue"),
    roomCodeChipValue: $("#roomCodeChipValue"),
    roomCodeValue: $("#roomCodeValue"),
    playerGrid: $("#playerGrid"),
    hostLobbyActions: $("#hostLobbyActions"),
    inviteFriendBtn: $("#inviteFriendBtn"),
    inviteFriendPanel: $("#inviteFriendPanel"),
    addBotsBtn: $("#addBotsBtn"),
    startTournamentBtn: $("#startTournamentBtn"),
    waitingHint: $("#waitingHint"),
    leaveLobbyBtn: $("#leaveLobbyBtn"),
    roundIntroBadge: $("#roundIntroBadge"),
    countdownNumber: $("#countdownNumber"),
    countdownLabel: $("#countdownLabel"),
    roundProgressLive: $("#roundProgressLive"),
    roundLiveBadge: $("#roundLiveBadge"),
    wordRackWrap: $("#wordRackWrap"),
    linePreviewList: $("#linePreviewList"),
    wordRack: $("#wordRack"),
    gameBall: $("#gameBall"),
    gameSparkLayer: $("#gameSparkLayer"),
    lineTimerFill: $("#lineTimerFill"),
    roundProgressVoting: $("#roundProgressVoting"),
    votingRoundNumber: $("#votingRoundNumber"),
    submissionList: $("#submissionList"),
    hostVotingActions: $("#hostVotingActions"),
    nextRoundBtn: $("#nextRoundBtn"),
    waitingVoteHint: $("#waitingVoteHint"),
    winnerBurst: $("#winnerBurst"),
    winnerAvatar: $("#winnerAvatar"),
    winnerName: $("#winnerName"),
    standingsList: $("#standingsList"),
    saveClipBtn: $("#saveClipBtn"),
    shareResultBtn: $("#shareResultBtn"),
    toast: $("#toast"),
  };

  let toastTimer = null;
  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2800);
  }

  function refreshTopbar() {
    if (els.creditsValue) els.creditsValue.textContent = String(profile.credits);
    if (els.roomCodeChipValue) els.roomCodeChipValue.textContent = code || "----";
  }
  refreshTopbar();

  // Modul 5: aktives Ball-Design (Shop) anwenden — siehe challenge.js für
  // dieselbe Logik (bewusst dupliziert statt geteilt, siehe docs/TOURNAMENTS.md §5).
  (function applyBallSkin() {
    if (!els.gameBall) return;
    const design = window.FlowData.findBallDesign(profile.activeBallDesignId);
    els.gameBall.style.setProperty("--ball-gradient", design.gradient);
    els.gameBall.style.setProperty("--ball-glow", design.glow);
  })();

  /* ---------------------------------------------------------------------
     Turnier laden / beitreten
     --------------------------------------------------------------------- */
  let tournament = code ? FlowTournament.loadTournament(code) : null;
  let isHost = false;

  function resolveEntry() {
    if (!tournament) return "not_found";
    const already = tournament.players.find((p) => p.id === FlowTournament.ME_ID);
    if (already) {
      isHost = already.isHost;
      return tournament.status;
    }
    if (tournament.status !== "lobby") return "already_started";
    const res = FlowTournament.joinTournament(code, profile);
    if (!res.ok) return "not_found";
    tournament = res.tournament;
    isHost = false;
    return "lobby";
  }

  const entryState = resolveEntry();

  if (entryState === "not_found" || entryState === "already_started") {
    showScreen("notFound");
  } else if (entryState === "finished") {
    renderFinal();
    showScreen("final");
  } else if (entryState === "live") {
    // Reload mitten in einer laufenden Runde — kann die Beat-Mechanik nicht
    // sicher fortsetzen, zeigt stattdessen den Voting-Stand der aktuellen Runde.
    renderVotingScreen();
    showScreen("roundVoting");
  } else {
    setupLobby();
    showScreen("lobby");
  }

  /* ---------------------------------------------------------------------
     Lobby
     --------------------------------------------------------------------- */
  function renderPlayerGrid() {
    els.playerGrid.innerHTML = tournament.players.map((p) => `
      <div class="player-card ${p.isHost ? "is-host" : ""}">
        <div class="player-card__avatar">${p.avatar}</div>
        <div class="player-card__name">${escapeHtml(p.name)}</div>
        <div class="player-card__tag">${p.isHost ? "👑 Host" : p.isFriendInvite ? "👥 Freund (Demo)" : p.isBot ? "🤖 Bot (Demo)" : "Spieler:in"}</div>
      </div>
    `).join("");
  }

  function setupLobby() {
    els.roomCodeValue.textContent = tournament.code;
    renderPlayerGrid();

    if (isHost) {
      els.hostLobbyActions.hidden = false;
      els.waitingHint.hidden = true;
      els.startTournamentBtn.disabled = tournament.players.length < 2;
    } else {
      els.hostLobbyActions.hidden = true;
      els.waitingHint.hidden = false;
    }
  }

  function renderInvitePanel() {
    if (!els.inviteFriendPanel) return;
    const friends = FlowSocial?.loadFriends() || [];
    const alreadyIn = new Set(tournament.players.map((p) => p.name));
    const invitable = friends.filter((f) => !alreadyIn.has(f.name));

    if (invitable.length === 0) {
      els.inviteFriendPanel.innerHTML = `<p class="empty-hint" style="text-align:center;">${friends.length === 0 ? "Noch keine Freunde — füg welche in deinem Profil hinzu." : "Alle deine Freunde sind schon im Raum."}</p>`;
      return;
    }
    els.inviteFriendPanel.innerHTML = invitable.map((f) => `
      <div class="card-glass person-card">
        <div class="person-card__avatar">${f.avatar}</div>
        <div class="person-card__body"><div class="person-card__name">${escapeHtml(f.name)}</div></div>
        <button class="btn btn-primary btn-sm" type="button" data-invite-friend="${f.id}">Einladen</button>
      </div>
    `).join("");
  }

  els.inviteFriendBtn?.addEventListener("click", () => {
    els.inviteFriendPanel.hidden = !els.inviteFriendPanel.hidden;
    if (!els.inviteFriendPanel.hidden) renderInvitePanel();
    playIfEnabled(window.FlowSound?.playClick);
  });

  els.inviteFriendPanel?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-invite-friend]");
    if (!btn) return;
    const friends = FlowSocial?.loadFriends() || [];
    const friend = friends.find((f) => f.id === btn.dataset.inviteFriend);
    if (!friend) return;
    const added = FlowTournament.addFriendPlayer(tournament.code, friend);
    if (!added) return;
    tournament = FlowTournament.loadTournament(tournament.code);
    renderPlayerGrid();
    renderInvitePanel();
    els.startTournamentBtn.disabled = tournament.players.length < 2;
    playIfEnabled(window.FlowSound?.playPlop);
  });

  els.addBotsBtn?.addEventListener("click", () => {
    const added = FlowTournament.addBotPlayers(tournament.code, 1 + Math.floor(Math.random() * 2));
    tournament = FlowTournament.loadTournament(tournament.code);
    renderPlayerGrid();
    els.startTournamentBtn.disabled = tournament.players.length < 2;
    (added || []).forEach((_, i) => {
      setTimeout(() => playIfEnabled(window.FlowSound?.playPlop), i * 220);
    });
  });

  els.startTournamentBtn?.addEventListener("click", async () => {
    els.startTournamentBtn.disabled = true;
    els.startTournamentBtn.textContent = "Wird vorbereitet …";
    tournament = await FlowTournament.startTournament(tournament.code, GAMEPLAY_CONFIG);
    await initLiveFlow();
  });

  els.leaveLobbyBtn?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  /* ---------------------------------------------------------------------
     Mikrofon & Aufnahme (pro Runde ein frischer MediaRecorder, gleiche
     micStream über das ganze Turnier hinweg)
     --------------------------------------------------------------------- */
  let micStream = null;
  let micGranted = false;
  let currentRecorder = null;
  let currentChunks = [];
  let lastOwnAudioUrl = null;

  async function requestMic() {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micGranted = true;
      return true;
    } catch (e) {
      micGranted = false;
      return false;
    }
  }

  function startRoundRecording() {
    if (!micStream || typeof MediaRecorder === "undefined") return;
    try {
      currentChunks = [];
      currentRecorder = new MediaRecorder(micStream);
      currentRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) currentChunks.push(e.data); };
      currentRecorder.start();
    } catch (e) {
      currentRecorder = null;
    }
  }

  function stopRoundRecording() {
    return new Promise((resolve) => {
      if (!currentRecorder || currentRecorder.state === "inactive") { resolve(null); return; }
      currentRecorder.onstop = () => {
        if (currentChunks.length === 0) { resolve(null); return; }
        const blob = new Blob(currentChunks, { type: currentChunks[0].type || "audio/webm" });
        resolve(URL.createObjectURL(blob));
      };
      currentRecorder.stop();
    });
  }

  /* ---------------------------------------------------------------------
     BeatClock + Ball + Word-Rack für EINE Runde (identisches Prinzip wie
     challenge.js, siehe docs/GAMEPLAY.md Abschnitt 5)
     --------------------------------------------------------------------- */
  const beat = findBeat((tournament && tournament.settings.beatId) || "b2");
  const LINES_PER_ROUND = GAMEPLAY_CONFIG.linesPerStanza;
  const BEATS_PER_LINE = GAMEPLAY_CONFIG.beatsPerLine;
  const BALL_BOUNCE_HEIGHT = 26;
  const BALL_RADIUS = 10;

  let clock = null;
  let rafId = null;
  let boxCenters = [];
  let currentRoundWords = null;
  let currentRoundIdx = 0;
  let lineIndexInRound = 0;
  let displayedLine = -1;
  let displayedBoxIndex = -1; // zuletzt "getroffenes" Kästchen INNERHALB der Zeile

  function measureBoxCenters() {
    if (!els.wordRackWrap) return;
    const wrapRect = els.wordRackWrap.getBoundingClientRect();
    boxCenters = $$("#wordRack .word-slot").map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - wrapRect.left + r.width / 2, y: r.top - wrapRect.top };
    });
  }
  window.addEventListener("resize", () => {
    clearTimeout(window.__tResizeT);
    window.__tResizeT = setTimeout(measureBoxCenters, 150);
  });

  /** @param beatsIntoLine - Fließkomma-Beatzahl seit Zeilenbeginn (0..BEATS_PER_LINE) */
  function updateBall(beatsIntoLine, boxIndex) {
    if (!els.gameBall || !boxCenters.length) return;
    const target = boxCenters[boxIndex] || boxCenters[boxCenters.length - 1];
    if (!target) return;
    const frac = ((beatsIntoLine % 1) + 1) % 1;
    const bounce = Math.sin(frac * Math.PI);
    const y = target.y - BALL_BOUNCE_HEIGHT * bounce;
    els.gameBall.style.transform = `translate(${(target.x - BALL_RADIUS).toFixed(1)}px, ${(y - BALL_RADIUS * 2).toFixed(1)}px)`;
  }

  // Größerer Funken-Ausschlag beim Wort-Kästchen (letzte Position) als bei
  // den 4 reinen Takt-Kästchen davor — identisches Prinzip wie challenge.js.
  function spawnLandingSparks(boxIndex) {
    const target = boxCenters[boxIndex];
    if (!target) return;
    const isWordBox = boxIndex === BEATS_PER_LINE - 1;
    window.FlowSparkFX?.spawnSparks(els.gameSparkLayer, target.x, target.y + 6, {
      count: isWordBox ? 14 : 7,
      minDist: isWordBox ? 20 : 16,
      maxDist: isWordBox ? 40 : 28,
    });
  }

  function setActiveBox(boxIndex) {
    $$("#wordRack .word-slot").forEach((el, i) => {
      el.classList.toggle("is-active", i === boxIndex);
    });
  }

  // JEDE Zeile bekommt ihre eigene frische Reihe von BEATS_PER_LINE (5)
  // Kästchen: die ersten 4 sind reine Takt-Kästchen (immer leer), nur das
  // letzte zeigt das Reimwort dieser Zeile — identisches Prinzip wie
  // challenge.js, siehe docs/GAMEPLAY.md §3 ("gilt für alle Spielmodi").
  function renderWordRack() {
    if (!currentRoundWords) return;
    const word = currentRoundWords.words[lineIndexInRound];
    const boxes = [];
    for (let i = 0; i < BEATS_PER_LINE; i++) {
      if (i === BEATS_PER_LINE - 1) {
        boxes.push(`
          <div class="word-slot word-slot--word">
            <span class="word-slot__index">${i + 1}</span>
            <span class="word-slot__word">${escapeHtml(word.toUpperCase())}</span>
          </div>
        `);
      } else {
        boxes.push(`
          <div class="word-slot word-slot--tact">
            <span class="word-slot__index">${i + 1}</span>
            <span class="word-slot__tact-dot"></span>
          </div>
        `);
      }
    }
    els.wordRack.innerHTML = boxes.join("");
    if (els.roundLiveBadge && tournament) {
      els.roundLiveBadge.textContent = `Runde ${currentRoundIdx + 1} von ${tournament.rounds.length} · Zeile ${lineIndexInRound + 1} von ${LINES_PER_ROUND} · Reimschema ${currentRoundWords.ending}`;
    }

    // "Neue Zeile rutscht sanft in Position" — identisches Prinzip wie challenge.js.
    if (els.wordRackWrap) {
      els.wordRackWrap.classList.remove("is-entering");
      void els.wordRackWrap.offsetWidth; // Reflow erzwingen
      els.wordRackWrap.classList.add("is-entering");
    }
  }

  // Zeigt die nächsten bis zu 3 Zeilen DIESER Runde leicht transparent an —
  // identisches Prinzip wie challenge.js (rein dekorativ, nie für die
  // Ball-Positionierung genutzt).
  function renderLinePreview() {
    if (!els.linePreviewList || !currentRoundWords) return;
    const upcoming = [];
    for (let offset = 1; offset <= 3; offset++) {
      const idx = lineIndexInRound + offset;
      if (idx >= LINES_PER_ROUND) break;
      upcoming.push({ idx, word: currentRoundWords.words[idx] });
    }
    els.linePreviewList.innerHTML = upcoming.map((u, depth) => {
      const opacity = (0.55 - depth * 0.15).toFixed(2);
      const scale = (1 - depth * 0.04).toFixed(2);
      return `
        <div class="line-preview__item" style="--preview-depth:${depth}; --preview-opacity:${opacity}; --preview-scale:${scale};">
          <span class="line-preview__index">${u.idx + 1}</span>
          <span>${escapeHtml(u.word.toUpperCase())}</span>
        </div>
      `;
    }).join("");
  }

  function renderRoundProgress(container, currentIndex) {
    if (!container || !tournament) return;
    container.innerHTML = tournament.rounds.map((_, i) => `
      <span class="round-progress__dot ${i < currentIndex ? "is-done" : ""} ${i === currentIndex ? "is-current" : ""}"></span>
    `).join("");
  }

  function runCountdown() {
    return new Promise((resolve) => {
      const sequence = ["3", "2", "1", "Los!"];
      let i = 0;
      function step() {
        const value = sequence[i];
        els.countdownNumber.textContent = value;
        els.countdownNumber.style.animation = "none";
        void els.countdownNumber.offsetWidth;
        els.countdownNumber.style.animation = "";
        playIfEnabled(() => window.FlowSound?.playCountdown(value === "Los!"));
        els.countdownLabel.textContent = value === "Los!" ? "Beat läuft — alle rappen jetzt!" : "Mikro checken, Beat kommt gleich …";
        i++;
        if (i < sequence.length) setTimeout(step, 800);
        else setTimeout(resolve, 550);
      }
      step();
    });
  }

  function startBeatClockForRound() {
    const audioCtx = window.FlowSound.getAudioContext();
    clock = new window.FlowBeatClock({ bpm: beat.bpm, beatsPerLine: BEATS_PER_LINE, audioCtx });
    clock.onBeat = (beatIndex, time) => window.FlowSound.playBeatTick(beatIndex % 4 === 0, time);
    clock.start();
    startFrameLoop();
  }

  function stopBeatClockForRound() {
    clock?.stop();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function startFrameLoop() {
    function frame() {
      if (!clock || !clock.running) return;
      const phase = clock.currentBeatPhase(); // kontinuierliche Beat-Zahl seit Rundenstart

      const lineStart = clock.lineTime(lineIndexInRound);
      const lineEnd = clock.lineTime(lineIndexInRound + 1);
      const pct = Math.min(100, Math.max(0, ((clock.now() - lineStart) / (lineEnd - lineStart)) * 100));
      if (els.lineTimerFill) els.lineTimerFill.style.width = pct + "%";

      if (displayedLine !== lineIndexInRound) {
        renderWordRack();
        renderLinePreview();
        measureBoxCenters();
        displayedLine = lineIndexInRound;
        displayedBoxIndex = -1; // erzwingt sofortiges Landing auf Kästchen 1 der neuen Zeile
      }

      // Beat-genaue Position INNERHALB der Zeile (0..BEATS_PER_LINE-1) —
      // identisches Prinzip wie challenge.js, siehe docs/GAMEPLAY.md §3.
      const beatsIntoLine = phase - lineIndexInRound * BEATS_PER_LINE;
      const boxIndex = Math.min(BEATS_PER_LINE - 1, Math.max(0, Math.floor(beatsIntoLine)));

      updateBall(beatsIntoLine, boxIndex);

      if (boxIndex !== displayedBoxIndex) {
        spawnLandingSparks(boxIndex);
        setActiveBox(boxIndex);
        displayedBoxIndex = boxIndex;
      }

      if (clock.now() >= lineEnd) {
        if (lineIndexInRound < LINES_PER_ROUND - 1) {
          lineIndexInRound++;
          playIfEnabled(window.FlowSound?.playSelect);
        } else {
          finishRoundLive();
          return;
        }
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------------
     Turnier-Ablauf: Mikro → Runde 1 … N (Countdown, Live, Voting) → Finale
     --------------------------------------------------------------------- */
  async function initLiveFlow() {
    const granted = await requestMic();
    if (!granted) {
      showToast("🎙️ Kein Mikrofonzugriff — du kannst trotzdem mitmachen, nur ohne Aufnahme/echtes Transkript.");
    }
    // Speech-Recognition wird pro Runde in beginRound() (neu) gestartet,
    // damit jede Runde ihr eigenes, sauberes Transkript bekommt.
    await beginRound(0);
  }

  async function beginRound(roundIndex) {
    currentRoundWords = tournament.rounds[roundIndex];
    currentRoundIdx = roundIndex;
    lineIndexInRound = 0;
    displayedLine = -1;
    displayedBoxIndex = -1;

    els.roundIntroBadge.textContent = `Runde ${roundIndex + 1} von ${tournament.rounds.length}`;
    els.roundLiveBadge.textContent = `Runde ${roundIndex + 1} von ${tournament.rounds.length} · Reimschema ${currentRoundWords.ending}`;
    renderRoundProgress(els.roundProgressLive, roundIndex);

    showScreen("roundIntro");
    await runCountdown();

    showScreen("roundLive");
    renderWordRack();
    renderLinePreview();
    measureBoxCenters();
    spawnLandingSparks(0);
    setActiveBox(0);
    displayedLine = 0;
    displayedBoxIndex = 0;
    startRoundRecording();
    if (micGranted && window.FlowAI.speech?.isSupported) window.FlowAI.speech.start();
    startBeatClockForRound();

    // Bots reichen "gleichzeitig" ein, mit leichter Zufalls-Verzögerung für ein organisches Gefühl.
    setTimeout(() => {
      FlowTournament.simulateBotSubmissions(tournament.code, roundIndex);
    }, 1200 + Math.random() * 2000);
  }

  async function finishRoundLive() {
    stopBeatClockForRound();

    const transcript = window.FlowAI.speech?.getTranscript() || "";
    const audioUrl = await stopRoundRecording();
    window.FlowAI.speech?.stop();
    if (audioUrl) lastOwnAudioUrl = audioUrl;

    const result = await window.FlowAI.evaluation.evaluate({
      transcript,
      difficulty: tournament.settings.difficulty,
      topic: tournament.settings.topic,
      totalVerses: 1,
      usedFamilyIds: [currentRoundWords.familyId],
      allEndWords: currentRoundWords.words,
      roastMode: false,
    });

    FlowTournament.submitRoundResult(tournament.code, tournament.currentRoundIndex, FlowTournament.ME_ID, {
      overall: result.overall,
      excerpt: result.transcript ? `„${result.transcript.slice(0, 120)}${result.transcript.length > 120 ? "…" : ""}"` : null,
      audioUrl,
      isBot: false,
    });
    FlowTournament.simulateBotSubmissions(tournament.code, tournament.currentRoundIndex);
    tournament = FlowTournament.loadTournament(tournament.code);

    renderVotingScreen();
    showScreen("roundVoting");
  }

  /* ---------------------------------------------------------------------
     Voting
     --------------------------------------------------------------------- */
  function renderVotingScreen() {
    if (!tournament) return;
    const round = tournament.rounds[tournament.currentRoundIndex];
    if (els.votingRoundNumber) els.votingRoundNumber.textContent = String(tournament.currentRoundIndex + 1);
    renderRoundProgress(els.roundProgressVoting, tournament.currentRoundIndex);

    els.submissionList.innerHTML = tournament.players.map((player) => {
      const sub = round?.submissions?.[player.id];
      const isMe = player.id === FlowTournament.ME_ID;
      const voted = sub?.votedBy?.includes(FlowTournament.ME_ID);
      return `
        <div class="card-glass post-card submission-card ${isMe ? "submission-card__you" : ""}">
          <div class="post-card__avatar">${player.avatar}</div>
          <div class="post-card__body">
            <div class="post-card__head">
              <span class="post-card__author">${escapeHtml(player.name)}${isMe ? " (Du)" : ""}</span>
            </div>
            ${sub ? `
              <p class="post-card__excerpt">${sub.excerpt ? escapeHtml(sub.excerpt) : "Kein Transkript verfügbar."}</p>
              ${isMe && sub.audioUrl ? `<audio controls src="${sub.audioUrl}" style="width:100%; height:36px; margin:var(--sp-2) 0;"></audio>` : ""}
              ${player.isBot ? `<span class="bot-take-badge">🤖 Simulierter Take (Demo)</span>` : ""}
              <div class="post-card__footer" style="margin-top:var(--sp-3);">
                <span class="post-card__score">${sub.overall} Pkt.</span>
                ${!isMe
                  ? `<button class="like-btn ${voted ? "is-liked" : ""}" type="button" data-vote-player="${player.id}">${voted ? "❤️" : "🤍"} <span class="like-count">${sub.votes || 0}</span></button>`
                  : `<span class="like-btn" style="cursor:default;">❤️ ${sub.votes || 0}</span>`}
              </div>
            ` : `<p class="post-card__excerpt">Noch keine Einreichung …</p>`}
          </div>
        </div>
      `;
    }).join("");

    if (isHost) {
      els.hostVotingActions.hidden = false;
      els.waitingVoteHint.hidden = true;
      els.nextRoundBtn.textContent = tournament.currentRoundIndex >= tournament.rounds.length - 1 ? "🏁 Turnier beenden" : "Nächste Runde →";
    } else {
      els.hostVotingActions.hidden = true;
      els.waitingVoteHint.hidden = false;
    }
  }

  els.submissionList?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-vote-player]");
    if (!btn) return;
    tournament = FlowTournament.voteSubmission(tournament.code, tournament.currentRoundIndex, btn.dataset.votePlayer, FlowTournament.ME_ID);
    if (!tournament) return;
    playIfEnabled(() => window.FlowSound?.playToggle(true));
    renderVotingScreen();
  });

  els.nextRoundBtn?.addEventListener("click", async () => {
    els.nextRoundBtn.disabled = true;
    tournament = FlowTournament.advanceRound(tournament.code);
    if (tournament.status === "finished") {
      stopCaptureForGood();
      renderFinal();
      showScreen("final");
    } else {
      els.nextRoundBtn.disabled = false;
      await beginRound(tournament.currentRoundIndex);
    }
  });

  function stopCaptureForGood() {
    window.FlowAI.speech?.stop();
    micStream?.getTracks().forEach((t) => t.stop());
  }

  /* ---------------------------------------------------------------------
     Finale
     --------------------------------------------------------------------- */
  function spawnWinnerBurst() {
    if (!els.winnerBurst) return;
    els.winnerBurst.innerHTML = "";
    const count = 14;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement("span");
      spark.className = "spark";
      spark.style.setProperty("--spark-angle", `${(360 / count) * i + (Math.random() * 12 - 6)}deg`);
      spark.style.setProperty("--spark-delay", `${Math.random() * 150}ms`);
      els.winnerBurst.appendChild(spark);
    }
  }

  function renderFinal() {
    if (!tournament || tournament.rounds.length === 0) return;
    const standings = FlowTournament.computeStandings(tournament);
    const winner = standings[0];

    if (els.winnerAvatar) els.winnerAvatar.textContent = winner?.avatar || "🏆";
    if (els.winnerName) els.winnerName.textContent = winner ? `${winner.name}${winner.id === FlowTournament.ME_ID ? " (Du)" : ""}` : "—";

    if (els.standingsList) {
      els.standingsList.innerHTML = standings.map((r, i) => `
        <div class="leaderboard-row ${r.id === FlowTournament.ME_ID ? "is-you" : ""}">
          <span class="leaderboard-row__rank">#${i + 1}</span>
          <span class="leaderboard-row__avatar">${r.avatar}</span>
          <span class="leaderboard-row__name">${escapeHtml(r.name)}${r.id === FlowTournament.ME_ID ? " (Du)" : ""}${r.isBot ? " 🤖" : ""}</span>
          <span class="leaderboard-row__score">${r.totalScore} Pkt. · ${r.totalVotes} ❤️</span>
        </div>
      `).join("");
    }

    spawnWinnerBurst();
    const won = winner?.id === FlowTournament.ME_ID;
    playIfEnabled(() => window.FlowSound?.playReveal(won ? "top" : "mid"));

    if (tournament.shared && els.shareResultBtn) {
      els.shareResultBtn.disabled = true;
      els.shareResultBtn.textContent = "✓ Geteilt";
    }

    const progress = FlowProfile.recordTournamentResult(profile, { code: tournament.code, won });
    refreshTopbar();

    // Nur bei der ERSTEN Auswertung benachrichtigen (creditsEarned > 0), nicht
    // bei jedem Neuladen des Finale-Screens (siehe Dedup in recordTournamentResult).
    if (progress.creditsEarned > 0) {
      const myRank = FlowTournament.computeStandings(tournament).findIndex((r) => r.id === FlowTournament.ME_ID) + 1;
      const bonusNote = progress.weekendBonusApplied ? " (inkl. 🎉 Wochenend-Bonus)" : "";
      window.FlowSocial?.addNotification({
        icon: won ? "🏆" : "🎤",
        text: (won
          ? `Du hast das Turnier ${tournament.code} gewonnen!`
          : `Turnier ${tournament.code} beendet — Platz ${myRank} von ${standings.length}.`) + ` +${progress.creditsEarned} 💎${bonusNote}`,
      });
    }
    if (progress.newBadges.length) {
      showToast(`🏅 Neues Abzeichen: ${progress.newBadges[0].name}!`);
      progress.newBadges.forEach((b) => {
        window.FlowSocial?.addNotification({ icon: b.icon, text: `Neues Abzeichen freigeschaltet: ${b.name}` });
      });
    }
    // Modul 5: kosmetischer Bonus bei einem Sieg (Chance auf ein neues
    // Ball-Design, siehe FlowProfile.maybeAwardCosmetic).
    if (progress.cosmeticReward) {
      window.FlowSocial?.addNotification({ icon: "🎨", text: `Bonus-Belohnung: Ball-Design „${progress.cosmeticReward.name}“ freigeschaltet!` });
    }
  }

  els.saveClipBtn?.addEventListener("click", () => {
    if (!lastOwnAudioUrl) {
      showToast("Keine Aufnahme verfügbar (kein Mikrofonzugriff während des Turniers).");
      return;
    }
    const a = document.createElement("a");
    a.href = lastOwnAudioUrl;
    a.download = `flowarena-tournament-${tournament.code}-take.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    playIfEnabled(window.FlowSound?.playClick);
  });

  els.shareResultBtn?.addEventListener("click", () => {
    if (!tournament || tournament.shared) return;
    const standings = FlowTournament.computeStandings(tournament);
    const myIndex = standings.findIndex((r) => r.id === FlowTournament.ME_ID);
    const won = myIndex === 0;
    const b = findBeat(tournament.settings.beatId);

    FlowCommunity.addPost({
      authorName: profile.displayName,
      authorAvatar: profile.avatar,
      topic: tournament.settings.topic,
      beatName: b.name,
      bpm: b.bpm,
      overall: standings[myIndex]?.totalScore || 0,
      excerpt: won
        ? `„🏆 Turniersieg im Raum ${tournament.code}!“`
        : `„Turnier ${tournament.code} beendet — Platz ${myIndex + 1} von ${standings.length}.“`,
    });
    FlowProfile.addCredits(profile, 10);
    refreshTopbar();

    tournament.shared = true;
    FlowTournament.saveTournament(tournament);
    els.shareResultBtn.disabled = true;
    els.shareResultBtn.textContent = "✓ Geteilt";
    playIfEnabled(window.FlowSound?.playConfirm);
    showToast("📤 Ergebnis in der Community geteilt! +10 💎");
  });

  window.addEventListener("beforeunload", () => {
    stopBeatClockForRound();
    stopCaptureForGood();
  });
})();
