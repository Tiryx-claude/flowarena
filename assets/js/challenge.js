/* =========================================================================
   FlowArena — Challenge Stage Logic (Modul 2: Spielablauf, Modul 3: KI)
   -------------------------------------------------------------------------
   KERNMECHANIK (siehe docs/GAMEPLAY.md für Details):
   - Jede Strophe hat GAMEPLAY_CONFIG.linesPerStanza Zeilen (Standard 5).
   - JEDE Zeile bekommt ein eigenes, vorgegebenes Endwort — nicht nur die
     letzte. Die KI liefert NUR diese Endwörter, nie Text/Zeilen/Strophen.
   - Der Spieler tippt nichts — es gibt kein Texteingabefeld. Er rappt live
     ins Mikrofon; die Website zeigt nur die Endwörter an.
   - Zeilenwechsel, Ball-Animation (Bounce + Sprung + Funken) und
     Beat-Klick-Track laufen alle auf DERSELBEN Uhr (assets/js/beat-clock.js,
     AudioContext-Zeit) — kein setInterval/CSS-Timing, kein Drift über die
     Challenge hinweg.
   - Jede neue Strophe bekommt eine neue Reim-Familie (nie dieselbe wie eine
     vorherige Strophe in dieser Challenge, bis der Vorrat erschöpft ist).

   State machine: intro -> countdown -> live (Strophen/Zeilen, beat-getaktet)
   -> evaluating -> results. Reimwörter, Live-Transkript und Bewertung laufen
   über die austauschbare KI-Architektur in window.FlowAI.* (siehe
   assets/js/ai/registry.js + docs/AI_ARCHITECTURE.md).
   ========================================================================= */

(function () {
  "use strict";

  const { loadSettings, findBeat, findTopicLabel, GAMEPLAY_CONFIG } = window.FlowData;
  const t = window.FlowI18n.t;
  const tPick = window.FlowI18n.tPick;
  const tList = window.FlowI18n.tList;
  const settings = loadSettings();
  const beat = findBeat(settings.beatId);
  const profile = window.FlowProfile.load();

  // Beat-Audiodatei (falls vorhanden) schon während der Intro-/Countdown-
  // Phase vorladen, damit sie beim tatsächlichen Start ohne Verzögerung
  // synchron mit der BeatClock loslegen kann (siehe assets/js/beat-audio.js).
  window.FlowBeatAudio?.preload(beat, window.FlowSound.getAudioContext());
  let lastResult = null; // für den Publish-Handler (Modul 4)

  const LINES_PER_STANZA = GAMEPLAY_CONFIG.linesPerStanza;
  const BEATS_PER_LINE = GAMEPLAY_CONFIG.beatsPerLine;
  const totalStanzas = Math.min(Math.max(settings.verses || 1, GAMEPLAY_CONFIG.minStanzas), GAMEPLAY_CONFIG.maxStanzas);
  const totalLines = totalStanzas * LINES_PER_STANZA;

  /* ---------------------------------------------------------------------
     DOM
     --------------------------------------------------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const screens = {
    intro: $("#screenIntro"),
    countdown: $("#screenCountdown"),
    live: $("#screenLive"),
    evaluating: $("#screenEvaluating"),
    results: $("#screenResults"),
  };

  const els = {
    introSummary: $("#introSummary"),
    dailyLimitHint: $("#dailyLimitHint"),
    dailyLimitBlock: $("#dailyLimitBlock"),
    dailyLimitCount: $("#dailyLimitCount"),
    dailyLimitText: $("#dailyLimitText"),
    micHint: $("#micHint"),
    beginBtn: $("#beginBtn"),
    countdownNumber: $("#countdownNumber"),
    countdownLabel: $("#countdownLabel"),
    verseBadge: $("#verseBadge"),
    verseChipValue: $("#verseChipValue"),
    wordRack: $("#wordRack"),
    lineTimerFill: $("#lineTimerFill"),
    abortBtn: $("#abortBtn"),
    recIndicator: $("#recIndicator"),
    recLabel: $("#recLabel"),
    evaluatingStatus: $("#evaluatingStatus"),
    scoreRing: $("#scoreRing"),
    scoreValue: $("#scoreValue"),
    scoreBurst: $("#scoreBurst"),
    scoreBreakdown: $("#scoreBreakdown"),
    engineBadge: $("#engineBadge"),
    creditsEarnedBadge: $("#creditsEarnedBadge"),
    badgeUnlockBanner: $("#badgeUnlockBanner"),
    resultsHeadline: $("#resultsHeadline"),
    resultsSub: $("#resultsSub"),
    aiCommentText: $("#aiCommentText"),
    punchlineBadge: $("#punchlineBadge"),
    transcriptText: $("#transcriptText"),
    audioPanel: $("#audioPanel"),
    audioPlayback: $("#audioPlayback"),
    downloadBtn: $("#downloadBtn"),
    publishBtn: $("#publishBtn"),
    retryBtn: $("#retryBtn"),
    toast: $("#toast"),
    wordRackWrap: $("#wordRackWrap"),
    linePreviewList: $("#linePreviewList"),
    gameBall: $("#gameBall"),
    gameSparkLayer: $("#gameSparkLayer"),
  };

  function playIfEnabled(fn) {
    if (settings.soundEnabled && typeof fn === "function") fn();
  }

  // Modul 5: aktives Ball-Design (Shop) anwenden — rein kosmetisch, siehe
  // docs/SHOP.md. Eine Quelle für die Farbwerte (assets/js/data.js), hier
  // nur als CSS-Variablen ans Ball-Element gereicht.
  (function applyBallSkin() {
    if (!els.gameBall) return;
    const design = window.FlowData.findBallDesign(profile.activeBallDesignId);
    els.gameBall.style.setProperty("--ball-gradient", design.gradient);
    els.gameBall.style.setProperty("--ball-glow", design.glow);
  })();

  // Modul 6: aktive Ergebnis-Animation (Shop) anwenden — rein kosmetisch,
  // wirkt auf den Score-Ring UND den Funken-Burst (verschachtelt, erbt die
  // CSS-Variablen), siehe assets/css/challenge.css.
  (function applyResultAnimationSkin() {
    if (!els.scoreRing) return;
    const anim = window.FlowData.findAnimation(profile.activeAnimationId);
    els.scoreRing.style.setProperty("--anim-color1", anim.color1);
    els.scoreRing.style.setProperty("--anim-color2", anim.color2);
  })();

  function showScreen(name) {
    // Setzt display direkt (statt nur [hidden]), damit kein inline/CSS-Style
    // auf einzelnen Screens die Sichtbarkeitssteuerung überschreiben kann.
    Object.entries(screens).forEach(([key, el]) => {
      if (!el) return;
      const visible = key === name;
      el.hidden = !visible;
      el.style.display = visible ? (el.dataset.display || "") : "none";
    });
  }

  let toastTimer = null;
  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2800);
  }

  /* ---------------------------------------------------------------------
     Intro-Zusammenfassung
     --------------------------------------------------------------------- */
  const difficultyLabel = () => t(`common.difficulty.${settings.difficulty}`);

  function renderIntroSummary() {
    if (!els.introSummary) return;
    els.introSummary.innerHTML = `
      <span class="chip" style="cursor:default;"><span class="chip__dot"></span><span class="chip__label">${t("settings.difficultyLabel")}</span><span class="chip__value">${difficultyLabel()}</span></span>
      <span class="chip" style="cursor:default;"><span class="chip__dot"></span><span class="chip__label">${t("home.tournamentCreate.beatLabel")}</span><span class="chip__value">${beat.name} · ${beat.bpm} BPM</span></span>
      <span class="chip" style="cursor:default;"><span class="chip__dot"></span><span class="chip__label">${t("settings.versesLabel")}</span><span class="chip__value">${totalStanzas}</span></span>
      <span class="chip" style="cursor:default;"><span class="chip__dot"></span><span class="chip__label">${t("settings.topicLabel")}</span><span class="chip__value">${findTopicLabel(settings.topic)}</span></span>
      ${settings.roastMode ? `<span class="chip" style="cursor:default;"><span class="chip__dot"></span><span class="chip__label">${t("challenge.modeLabel")}</span><span class="chip__value">${t("challenge.roastModeValue")}</span></span>` : ""}
      ${settings.streetMode ? `<span class="chip" style="cursor:default;"><span class="chip__dot"></span><span class="chip__label">${t("challenge.modeLabel")}</span><span class="chip__value">${t("challenge.streetModeValue")}</span></span>` : ""}
    `;
  }
  renderIntroSummary();
  window.FlowI18n.onLocaleChange(renderIntroSummary);

  /* ---------------------------------------------------------------------
     Modul 6: Free-Tageslimit — "unendlich Challenges" als echter Premium-
     Perk. Reine Zugriffsgrenze: läuft eine Challenge, wird sie exakt gleich
     bewertet wie mit Premium (siehe docs/SHOP.md). Geprüft direkt beim Laden
     dieser Seite (nicht erst beim Klick), damit auch direkte Navigation
     (z.B. Lesezeichen) das Limit respektiert.
     --------------------------------------------------------------------- */
  const limitCheck = window.FlowProfile.canStartChallenge(profile);
  if (!limitCheck.allowed) {
    if (els.beginBtn) els.beginBtn.hidden = true;
    if (els.micHint) els.micHint.hidden = true;
    if (els.dailyLimitHint) els.dailyLimitHint.hidden = true;
    if (els.dailyLimitText) {
      els.dailyLimitText.innerHTML = t("challenge.dailyLimitText", { n: `<span id="dailyLimitCount">${limitCheck.limit}</span>` });
    }
    if (els.dailyLimitBlock) els.dailyLimitBlock.hidden = false;
  } else if (els.dailyLimitHint && limitCheck.remaining <= 2 && limitCheck.limit !== Infinity) {
    els.dailyLimitHint.hidden = false;
    els.dailyLimitHint.textContent = t("challenge.dailyLimitRemaining", { remaining: limitCheck.remaining, limit: limitCheck.limit });
  }

  /* ---------------------------------------------------------------------
     Mikrofon & Aufnahme (MediaRecorder — separat von der Live-Transkription)
     --------------------------------------------------------------------- */
  let micStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordedBlobUrl = null;
  let micGranted = false;

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

  function setupRecorder() {
    if (!micStream || typeof MediaRecorder === "undefined") return;
    try {
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(micStream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };
      mediaRecorder.start();
    } catch (e) {
      mediaRecorder = null;
    }
  }

  function stopCapture() {
    window.FlowAI.speech?.stop();
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    micStream?.getTracks().forEach((t) => t.stop());
  }

  /* ---------------------------------------------------------------------
     BeatClock — EINE Uhr für Beat-Klicks, Ball-Animation UND Zeilenwechsel.
     Siehe assets/js/beat-clock.js für die Drift-Begründung.
     --------------------------------------------------------------------- */
  let clock = null;
  let rafId = null;
  let beatAudioSource = null; // echte Beat-Audiodatei (falls Beat.audioUrl gesetzt), siehe beat-audio.js
  let usingRealBeatAudio = false; // steuert, ob der synthetische Klick-Track zusätzlich läuft

  function startBeatClock() {
    const audioCtx = window.FlowSound.getAudioContext();
    clock = new window.FlowBeatClock({ bpm: beat.bpm, beatsPerLine: BEATS_PER_LINE, audioCtx });
    usingRealBeatAudio = false;

    // Beat-Klick-Track: immer hörbar (das IST der Beat, kein optionaler
    // UI-Sound) — sample-genau über die BeatClock-Uhr eingeplant. Läuft nur,
    // solange keine echte Beat-Audiodatei spielt (die bringt ihren eigenen
    // Rhythmus mit, ein zusätzlicher Klick würde nur stören).
    clock.onBeat = (beatIndex, time) => {
      if (!usingRealBeatAudio) window.FlowSound.playBeatTick(beatIndex % 4 === 0, time);
    };

    clock.start();
    startFrameLoop();

    // Echte Audiodatei erst NACH clock.start() anstoßen, da sie exakt bei
    // clock.startTime (jetzt gesetzt) einsetzen muss, um mit Ball/Takt
    // synchron zu bleiben (siehe beat-audio.js).
    if (beat.audioUrl) {
      window.FlowBeatAudio?.playLoop(beat, clock, audioCtx).then((source) => {
        if (source) {
          beatAudioSource = source;
          usingRealBeatAudio = true;
        }
        // Kein source (z.B. Ladefehler) -> usingRealBeatAudio bleibt false,
        // der synthetische Klick-Track läuft automatisch weiter.
      });
    }
  }

  function stopBeatClock() {
    clock?.stop();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    window.FlowBeatAudio?.stop(beatAudioSource);
    beatAudioSource = null;
  }

  /* ---------------------------------------------------------------------
     Visuelle Beat-Synchronisation: EIN weißer Ball hüpft BPM-genau auf dem
     gerade aktiven Wort-Kästchen (vertikal, jeden einzelnen Beat) und
     springt exakt beim Zeilenwechsel zum nächsten Kästchen (horizontal) —
     Funken + Magma-Glow markieren die Landung. Bewusst NUR ein Element statt
     mehrerer Figuren/Balken: klares, unabgelenktes Rhythmusgefühl. Alles
     direkt aus der BeatClock-Phase berechnet (kein CSS-Keyframe-Timer),
     siehe assets/css/beat-ball.css + challenge.css.
     --------------------------------------------------------------------- */
  const BALL_BOUNCE_HEIGHT = 26;
  const BALL_RADIUS = 10;
  let boxCenters = [];
  let measureResizeTimer = null;

  function measureBoxCenters() {
    if (!els.wordRackWrap) return;
    const wrapRect = els.wordRackWrap.getBoundingClientRect();
    boxCenters = $$("#wordRack .word-slot").map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - wrapRect.left + r.width / 2, y: r.top - wrapRect.top };
    });
  }

  window.addEventListener("resize", () => {
    clearTimeout(measureResizeTimer);
    measureResizeTimer = setTimeout(measureBoxCenters, 150);
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
  // den 4 reinen Takt-Kästchen davor — betont den eigentlichen "Treffer".
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

  // Paint-only Klassenwechsel (siehe .word-slot-Kommentar in challenge.css) —
  // markiert, auf welchem der 5 Kästchen der Ball gerade "steht".
  function setActiveBox(boxIndex) {
    $$("#wordRack .word-slot").forEach((el, i) => {
      el.classList.toggle("is-active", i === boxIndex);
    });
  }

  /* ---------------------------------------------------------------------
     Strophen-Wörter — vorausschauend & sequenziell über die austauschbare
     KI-Architektur geladen (window.FlowAI.rhyme), damit beim Erreichen einer
     Strophe die Wörter garantiert schon bereitstehen (kein Warten mitten im
     Beat). Sequenziell verkettet, weil excludeFamilyIds von der Reihenfolge
     abhängt (Strophe n+1 muss wissen, welche Familie Strophe n bekam).
     --------------------------------------------------------------------- */
  const usedFamilyIds = [];
  const resolvedStanzas = {}; // stanzaIndex -> { words, ending, familyId }
  let stanzaChain = Promise.resolve();

  function requestStanza(stanzaIndex) {
    if (stanzaIndex >= totalStanzas || stanzaIndex in resolvedStanzas) return;
    stanzaChain = stanzaChain
      .then(() => window.FlowAI.rhyme.generateStanza({
        difficulty: settings.difficulty,
        topic: settings.topic,
        excludeFamilyIds: usedFamilyIds,
        count: LINES_PER_STANZA,
        streetMode: settings.streetMode,
      }))
      .then((result) => {
        usedFamilyIds.push(result.familyId);
        resolvedStanzas[stanzaIndex] = result;
      })
      .catch(() => {
        // Defensive Degradierung: sollte bei der lokalen Heuristik nie
        // passieren, aber ein echter API-Provider könnte fehlschlagen.
        resolvedStanzas[stanzaIndex] = { words: ["Flow", "Show", "Go", "Pro", "Bro"], ending: "-o(w)", familyId: `fallback-${stanzaIndex}` };
      });
    return stanzaChain;
  }

  /* ---------------------------------------------------------------------
     Word-Rack Rendering
     --------------------------------------------------------------------- */
  function renderVerseBadge(stanzaIndex, lineInStanza) {
    const ending = resolvedStanzas[stanzaIndex]?.ending || "…";
    els.verseBadge.textContent = t("challenge.verseBadge", { stanza: stanzaIndex + 1, total: totalStanzas, line: lineInStanza + 1, lines: LINES_PER_STANZA, ending });
    els.verseChipValue.textContent = `${stanzaIndex + 1}/${totalStanzas}`;
  }

  // JEDE Zeile bekommt ihre eigene frische Reihe von BEATS_PER_LINE (5)
  // Kästchen: die ersten 4 sind reine Takt-Kästchen (immer leer), nur das
  // letzte zeigt das Reimwort dieser Zeile — von Zeilenbeginn an sichtbar
  // (der Ball "landet" später nur noch beat-genau darauf, siehe
  // docs/GAMEPLAY.md §3/§4). Gilt identisch in jedem Spielmodus.
  function renderWordRack(stanzaIndex, lineInStanza) {
    const stanza = resolvedStanzas[stanzaIndex];
    if (!stanza) return; // noch nicht geladen (sollte praktisch nie sichtbar werden)
    const word = stanza.words[lineInStanza];
    const boxes = [];
    for (let i = 0; i < BEATS_PER_LINE; i++) {
      if (i === BEATS_PER_LINE - 1) {
        boxes.push(`
          <div class="word-slot word-slot--word">
            <span class="word-slot__index">${i + 1}</span>
            <span class="word-slot__word">${word.toUpperCase()}</span>
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

    // "Neue Zeile rutscht sanft in Position" — Klassenwechsel + erzwungener
    // Reflow, damit die CSS-Animation bei JEDEM Zeilenwechsel neu abspielt
    // (dasselbe Muster wie beim Countdown-Pop, siehe runCountdown()).
    if (els.wordRackWrap) {
      els.wordRackWrap.classList.remove("is-entering");
      void els.wordRackWrap.offsetWidth; // Reflow erzwingen
      els.wordRackWrap.classList.add("is-entering");
    }
  }

  // Zeigt die nächsten bis zu 3 Zeilen DIESER Strophe leicht transparent an
  // (rein dekorativ — nie gemessen/für Ball-Positionierung genutzt), damit
  // man kommende Reimwörter früh sieht und sich vorausschauend einstellen
  // kann. Bewusst nur innerhalb der aktuellen Strophe (die Wörter der
  // nächsten Strophe stehen erst kurz vor deren Beginn sicher fest, siehe
  // requestStanza()) — der Strophenwechsel hat ohnehin sein eigenes
  // Banner (flashVerseBanner), das den Cut deutlich macht.
  function renderLinePreview(stanzaIndex, lineInStanza) {
    if (!els.linePreviewList) return;
    const stanza = resolvedStanzas[stanzaIndex];
    if (!stanza) { els.linePreviewList.innerHTML = ""; return; }

    const upcoming = [];
    for (let offset = 1; offset <= 3; offset++) {
      const idx = lineInStanza + offset;
      if (idx >= LINES_PER_STANZA) break;
      upcoming.push({ idx, word: stanza.words[idx] });
    }

    els.linePreviewList.innerHTML = upcoming.map((u, depth) => {
      const opacity = (0.55 - depth * 0.15).toFixed(2);
      const scale = (1 - depth * 0.04).toFixed(2);
      return `
        <div class="line-preview__item" style="--preview-depth:${depth}; --preview-opacity:${opacity}; --preview-scale:${scale};">
          <span class="line-preview__index">${u.idx + 1}</span>
          <span>${u.word.toUpperCase()}</span>
        </div>
      `;
    }).join("");
  }

  let verseBannerEl = null;
  function flashVerseBanner(text) {
    if (!verseBannerEl) {
      verseBannerEl = document.createElement("div");
      verseBannerEl.className = "verse-banner glass";
      document.body.appendChild(verseBannerEl);
    }
    verseBannerEl.textContent = text;
    verseBannerEl.classList.add("is-visible");
    setTimeout(() => verseBannerEl.classList.remove("is-visible"), 1300);
  }

  /* ---------------------------------------------------------------------
     Haupt-Frame-Loop: liest JEDEN Frame die BeatClock-Uhr, treibt Animation,
     Timer-Leiste UND Zeilenwechsel — alles aus derselben Zeitbasis, daher
     kein gegenseitiges Wegdriften über die Challenge hinweg.
     --------------------------------------------------------------------- */
  let globalLineIndex = 0; // 0-basiert, über die GESAMTE Challenge gezählt
  let displayedLineIndex = -1; // zuletzt gerenderte Zeile (vermeidet Doppel-Renders)
  let displayedBoxIndex = -1; // zuletzt "getroffenes" Kästchen INNERHALB der Zeile
  let finished = false;

  function startFrameLoop() {
    function frame() {
      if (!clock || !clock.running) return;
      const phase = clock.currentBeatPhase(); // kontinuierliche Beat-Zahl seit Challenge-Start

      const lineStart = clock.lineTime(globalLineIndex);
      const lineEnd = clock.lineTime(globalLineIndex + 1);
      const pct = Math.min(100, Math.max(0, ((clock.now() - lineStart) / (lineEnd - lineStart)) * 100));
      if (els.lineTimerFill) els.lineTimerFill.style.width = pct + "%";

      const stanzaIndex = Math.floor(globalLineIndex / LINES_PER_STANZA);
      const lineInStanza = globalLineIndex % LINES_PER_STANZA;

      if (displayedLineIndex !== globalLineIndex && resolvedStanzas[stanzaIndex]) {
        renderVerseBadge(stanzaIndex, lineInStanza);
        renderWordRack(stanzaIndex, lineInStanza);
        renderLinePreview(stanzaIndex, lineInStanza);
        measureBoxCenters(); // Kästchen-Positionen frisch nach dem Rendern messen
        displayedLineIndex = globalLineIndex;
        displayedBoxIndex = -1; // erzwingt sofortiges Landing auf Kästchen 1 der neuen Zeile
      }

      // Beat-genaue Position INNERHALB der Zeile (0..BEATS_PER_LINE-1) — der
      // Ball springt jeden Beat ein Kästchen weiter, landet erst beim letzten
      // (Index BEATS_PER_LINE-1) auf dem Reimwort. Siehe docs/GAMEPLAY.md §3.
      const beatsIntoLine = phase - globalLineIndex * BEATS_PER_LINE;
      const boxIndex = Math.min(BEATS_PER_LINE - 1, Math.max(0, Math.floor(beatsIntoLine)));

      updateBall(beatsIntoLine, boxIndex);

      if (boxIndex !== displayedBoxIndex) {
        spawnLandingSparks(boxIndex);
        setActiveBox(boxIndex);
        displayedBoxIndex = boxIndex;
      }

      if (!finished && clock.now() >= lineEnd) {
        advancePastLine(stanzaIndex, lineInStanza);
      }

      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  function advancePastLine(finishedStanzaIndex, finishedLineInStanza) {
    globalLineIndex++;

    if (globalLineIndex >= totalLines) {
      finished = true;
      finishChallenge();
      return;
    }

    const crossedIntoNewStanza = finishedLineInStanza === LINES_PER_STANZA - 1;
    if (crossedIntoNewStanza) {
      const nextStanzaIndex = finishedStanzaIndex + 1;
      playIfEnabled(window.FlowSound?.playConfirm);
      const ending = resolvedStanzas[nextStanzaIndex]?.ending;
      flashVerseBanner(ending
        ? t("challenge.stanzaCompleteBannerWithScheme", { n: finishedStanzaIndex + 1, ending })
        : t("challenge.stanzaCompleteBanner", { n: finishedStanzaIndex + 1 }));
      // Strophe übernächst schon mal anfordern, damit sie garantiert
      // rechtzeitig bereitsteht, bevor sie gebraucht wird.
      requestStanza(nextStanzaIndex + 1);
    } else {
      playIfEnabled(window.FlowSound?.playSelect);
    }
  }

  /* ---------------------------------------------------------------------
     Countdown
     --------------------------------------------------------------------- */
  function runCountdown(onDone) {
    showScreen("countdown");
    const goValue = t("challenge.countdownGoValue");
    const sequence = ["3", "2", "1", goValue];
    let i = 0;

    function step() {
      const value = sequence[i];
      const isGo = i === sequence.length - 1;
      els.countdownNumber.textContent = value;
      els.countdownNumber.style.animation = "none";
      void els.countdownNumber.offsetWidth; // reflow, damit die Pop-Animation jedes Mal neu triggert
      els.countdownNumber.style.animation = "";
      playIfEnabled(() => window.FlowSound?.playCountdown(isGo));
      els.countdownLabel.textContent = isGo ? t("challenge.countdownGoLabel") : t("challenge.countdownPreLabel");

      i++;
      if (i < sequence.length) {
        setTimeout(step, 800);
      } else {
        setTimeout(onDone, 550);
      }
    }
    step();
  }

  async function startLiveStage() {
    // Strophe 0 MUSS bereitstehen, bevor der Beat losläuft.
    await requestStanza(0);
    requestStanza(1); // vorausschauend, blockiert nicht

    globalLineIndex = 0;
    displayedLineIndex = -1;
    displayedBoxIndex = -1;
    finished = false;

    showScreen("live");
    renderVerseBadge(0, 0);
    renderWordRack(0, 0);
    renderLinePreview(0, 0);
    measureBoxCenters();
    spawnLandingSparks(0);
    setActiveBox(0);
    displayedLineIndex = 0; // initiales Rendern schon erledigt — Frame-Loop soll es nicht wiederholen
    displayedBoxIndex = 0;
    startBeatClock();

    if (micGranted) {
      els.recIndicator.classList.add("is-live");
      els.recLabel.textContent = t("challenge.recLive");
    } else {
      els.recLabel.textContent = t("challenge.recNone");
    }
  }

  /* ---------------------------------------------------------------------
     Ende der Challenge → Auswertung
     --------------------------------------------------------------------- */
  function finishChallenge() {
    stopBeatClock();
    stopCapture();
    els.recIndicator.classList.remove("is-live");
    els.recLabel.textContent = t("challenge.recDone");

    showScreen("evaluating");
    const statusSteps = tList("challenge.evaluatingSteps");
    let s = 0;
    els.evaluatingStatus.textContent = statusSteps[0];
    const statusTimer = setInterval(() => {
      s++;
      if (s < statusSteps.length) els.evaluatingStatus.textContent = statusSteps[s];
    }, 650);

    // MediaRecorder braucht einen Moment, um den finalen Blob zu liefern
    setTimeout(async () => {
      clearInterval(statusTimer);
      finalizeRecordingBlob();

      const transcript = window.FlowAI.speech?.getTranscript() || "";
      const allEndWords = Object.values(resolvedStanzas).flatMap((s) => s.words);

      // Läuft über die austauschbare KI-Architektur (Modul 3) — aktuell die
      // lokale Heuristik, später 1:1 durch einen echten Modell-Call ersetzbar.
      const result = await window.FlowAI.evaluation.evaluate({
        transcript,
        difficulty: settings.difficulty,
        topic: settings.topic,
        totalVerses: totalStanzas,
        usedFamilyIds,
        allEndWords,
        roastMode: settings.roastMode,
      });

      lastResult = result;

      // Modul 4: Credits/Stats/Badges aus dieser Challenge fortschreiben
      const progress = window.FlowProfile.recordChallengeResult(profile, {
        overall: result.overall,
        scores: result.scores,
        stanzaCount: totalStanzas,
        roastMode: settings.roastMode,
        topic: settings.topic,
      });

      showScreen("results");
      renderResults(result, progress);
    }, 2700);
  }

  function finalizeRecordingBlob() {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: recordedChunks[0].type || "audio/webm" });
    recordedBlobUrl = URL.createObjectURL(blob);
    els.audioPlayback.src = recordedBlobUrl;
    els.audioPanel.hidden = false;
  }

  /* ---------------------------------------------------------------------
     Ergebnis-Inszenierung: Score-Count-up, Partikel-Burst, Sound,
     gestaffelte Bewertungs-Zeilen. Die eigentliche Bewertung kommt bereits
     fertig von window.FlowAI.evaluation (siehe assets/js/ai/*).
     --------------------------------------------------------------------- */
  const DIMENSION_KEYS = ["reim", "endwortNutzung", "flow", "kreativitaet", "originalitaet", "themenbezug", "punchlines", "unterhaltung"];

  function spawnScoreBurst() {
    if (!els.scoreBurst) return;
    els.scoreBurst.innerHTML = "";
    const count = 12;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement("span");
      spark.className = "spark";
      spark.style.setProperty("--spark-angle", `${(360 / count) * i + (Math.random() * 12 - 6)}deg`);
      spark.style.setProperty("--spark-delay", `${Math.random() * 120}ms`);
      els.scoreBurst.appendChild(spark);
    }
  }

  function animateScoreRing(target, bracket) {
    const duration = 900;
    const start = performance.now();
    playIfEnabled(() => window.FlowSound?.playReveal(bracket));
    spawnScoreBurst();

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(target * eased);
      els.scoreRing.style.setProperty("--score", value);
      els.scoreValue.textContent = value;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderScoreBreakdown(scores) {
    if (!els.scoreBreakdown) return;
    els.scoreBreakdown.innerHTML = DIMENSION_KEYS.map((key, i) => `
      <div class="score-row" style="--row-delay:${i * 80}ms;">
        <span class="score-row__label">${t(`evaluation.dimensions.${key}`)}</span>
        <span class="score-row__track"><span class="score-row__fill" id="fill-${key}"></span></span>
        <span class="score-row__value">${scores[key]}</span>
      </div>
    `).join("");

    requestAnimationFrame(() => {
      Object.entries(scores).forEach(([key, value]) => {
        const fill = document.getElementById(`fill-${key}`);
        if (fill) fill.style.width = `${value}%`;
      });
    });
  }

  function renderResults(result, progress) {
    els.scoreRing.style.setProperty("--score", 0);
    els.scoreValue.textContent = "0";
    els.resultsHeadline.textContent = result.headline;
    const verseWord = window.FlowI18n.tPlural("challenge.verse", totalStanzas);
    els.resultsSub.textContent = t("challenge.resultsSub", { difficulty: difficultyLabel(), topic: findTopicLabel(settings.topic), verses: `${totalStanzas} ${verseWord}`, beat: beat.name })
      + (settings.roastMode ? t("challenge.resultsSubRoastSuffix") : "");
    if (els.engineBadge) els.engineBadge.textContent = t("challenge.engineBadge", { label: result.engineLabel });

    if (els.creditsEarnedBadge && progress) {
      els.creditsEarnedBadge.hidden = false;
      els.creditsEarnedBadge.textContent = t("challenge.creditsEarnedBadge", { n: progress.creditsEarned })
        + (progress.weekendBonusApplied ? t("challenge.weekendBonusSuffix") : "");
    }

    // Modul 5: Wochen-Challenge-Belohnung — eigene, kurze Benachrichtigung,
    // unabhängig vom Abzeichen-Banner (kein Abzeichen, nur Credits).
    if (progress?.weeklyChallenge?.completed) {
      showToast(t("challenge.weeklyChallengeToast", { n: progress.weeklyChallenge.creditsReward }));
      window.FlowSocial?.addNotification({ icon: "🗓️", text: t("challenge.weeklyChallengeNotification", { label: progress.weeklyChallenge.label, n: progress.weeklyChallenge.creditsReward }) });
    }

    if (els.badgeUnlockBanner && progress?.newBadges?.length) {
      els.badgeUnlockBanner.hidden = false;
      els.badgeUnlockBanner.innerHTML = progress.newBadges.map((b) =>
        `<span style="font-size:1.6rem;">${b.icon}</span><span><strong>${t("challenge.newBadgeLabel")}</strong> ${b.name} — <span style="color:var(--text-dim);">${b.desc}</span></span>`
      ).join("<br>");
      progress.newBadges.forEach((b) => {
        window.FlowSocial?.addNotification({ icon: b.icon, text: t("challenge.newBadgeNotification", { name: b.name }) });
      });
    }

    renderScoreBreakdown(result.scores);
    animateScoreRing(result.overall, result.bracket);

    els.aiCommentText.textContent = result.comment;
    if (els.punchlineBadge) els.punchlineBadge.hidden = !result.punchlineDetected;

    els.transcriptText.textContent = result.transcript || t("challenge.noTranscript");
  }

  /* ---------------------------------------------------------------------
     Events
     --------------------------------------------------------------------- */
  els.beginBtn?.addEventListener("click", async () => {
    els.beginBtn.disabled = true;
    els.beginBtn.textContent = t("challenge.requestingMic");

    // Modul 6: verbraucht einen der Free-Tages-Versuche (no-op mit Premium) —
    // erst HIER, nicht schon beim bloßen Anzeigen der Intro-Seite.
    window.FlowProfile.recordChallengeStart(profile);

    // AudioContext JETZT (im Klick-Handler = User-Geste) erzeugen/resumen,
    // unabhängig vom "Klick-Sounds"-Setting — der Beat-Klick-Track ist
    // Gameplay-Audio, kein optionaler UI-Sound.
    window.FlowSound.getAudioContext();
    playIfEnabled(window.FlowSound?.playClick);

    const granted = await requestMic();
    if (granted) {
      setupRecorder();
      if (window.FlowAI.speech?.isSupported) {
        window.FlowAI.speech.start();
      } else {
        showToast(t("challenge.micUnsupported"));
      }
    } else {
      showToast(t("challenge.micDenied"));
    }

    runCountdown(startLiveStage);
  });

  els.abortBtn?.addEventListener("click", () => {
    stopBeatClock();
    stopCapture();
    window.location.href = "index.html";
  });

  els.downloadBtn?.addEventListener("click", () => {
    if (!recordedBlobUrl) return;
    const a = document.createElement("a");
    a.href = recordedBlobUrl;
    a.download = `flowarena-take-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    playIfEnabled(window.FlowSound?.playClick);
  });

  els.publishBtn?.addEventListener("click", () => {
    if (!lastResult) return;
    playIfEnabled(window.FlowSound?.playConfirm);

    // Modul 4: landet im lokalen Community-Store (siehe community-data.js).
    // Ein echtes Backend (POST /api/posts) kommt mit Modul 5.
    window.FlowCommunity.addPost({
      authorName: profile.displayName,
      authorAvatar: profile.avatar,
      topic: settings.topic,
      beatName: beat.name,
      bpm: beat.bpm,
      overall: lastResult.overall,
      excerpt: lastResult.transcript
        ? `„${lastResult.transcript.slice(0, 120)}${lastResult.transcript.length > 120 ? "…" : ""}"`
        : t("challenge.publishedExcerptFallback"),
    });
    window.FlowProfile.addCredits(profile, 15);
    els.publishBtn.disabled = true;
    els.publishBtn.textContent = t("challenge.publishedBtn");
    showToast(t("challenge.publishedToast"));
  });

  els.retryBtn?.addEventListener("click", () => {
    window.location.reload();
  });

  window.addEventListener("beforeunload", () => {
    stopBeatClock();
    stopCapture();
  });
})();
