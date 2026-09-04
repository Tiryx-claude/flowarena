/* =========================================================================
   FlowArena — Startseite: Menü-Akkordeon, Gameplay-Vorschau, Mini-Panels
   (Modul 1, überarbeitet)
   ========================================================================= */

(function () {
  "use strict";

  const { BEATS, findTopicLabel } = window.FlowData;
  const FlowProfile = window.FlowProfile;
  const FlowCommunity = window.FlowCommunity;
  const FlowTournament = window.FlowTournament;
  const t = window.FlowI18n.t;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------------------------------------------------------------------
     1) Menü-Akkordeon
     -------------------------------------------------------------------
     6 Panel-Buttons verhalten sich als Akkordeon (ein Panel offen, Klick auf
     ein anderes schließt das vorherige automatisch). "Einstellungen" ist
     bewusst KEIN Teil dieser Gruppe — es öffnet das bestehende Settings-
     Drawer-Overlay (app.js) unabhängig vom Akkordeon-Zustand und zeigt dort
     wie gehabt alle Felder gleichzeitig aufgeklappt.
     --------------------------------------------------------------------- */
  const menuBtns = $$(".menu-btn[data-panel]");
  const panels = $$(".menu-panel[data-panel]");

  function openPanel(key) {
    panels.forEach((p) => p.classList.toggle("is-open", p.dataset.panel === key));
    menuBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.panel === key));
  }

  menuBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      window.FlowSound?.playClick?.();
      openPanel(btn.dataset.panel);
      if (btn.dataset.panel === "leaderboard") renderLeaderboardPanel();
      if (btn.dataset.panel === "community") renderCommunityPanel();
      if (btn.dataset.panel === "shop") renderShopPanel();
      if (btn.dataset.panel === "tournament-create") renderTourneyBeatOptions();
    });
  });

  /* ---------------------------------------------------------------------
     2) Gameplay-Vorschau: weißer Ball hüpft BPM-getaktet über die Kästchen,
     Kästchen glühen wie Magma bei Kontakt, Funken beim Aufprall. Rein
     dekorativ (keine Audio-Wiedergabe nötig), läuft sofort beim Laden.
     --------------------------------------------------------------------- */
  // Zeigt IMMER genau EINE Zeile: boxesPerLine (5) Kästchen, die ersten 4
  // leer (nur Taktanzeige), das letzte mit dem Reimwort — identische
  // Mechanik wie das echte Gameplay (challenge.js), damit die Vorschau
  // wortwörtlich vorführt, wie sich eine echte Zeile anfühlt (siehe
  // docs/GAMEPLAY.md §3, "gilt für alle Spielmodi"). Nach jeder Zeile
  // wechselt das Demo-Wort (rein dekorativ, kein echtes Gameplay).
  function initGameplayPreview() {
    const track = $("#previewTrack");
    const ball = $("#previewBall");
    const sparkLayer = $("#previewSparkLayer");
    if (!track || !ball || !sparkLayer) return;

    // Modul 5: die Vorschau zeigt dasselbe Ball-Design, das im echten
    // Gameplay aktiv ist — ein kleiner, ehrlicher Vorgeschmack auf den
    // eigenen Shop-Look statt eines rein dekorativen Standard-Balls.
    const equippedDesign = window.FlowData.findBallDesign(FlowProfile.load().activeBallDesignId);
    ball.style.setProperty("--ball-gradient", equippedDesign.gradient);
    ball.style.setProperty("--ball-glow", equippedDesign.glow);

    const BOXES_PER_LINE = window.FlowData.GAMEPLAY_CONFIG.boxesPerLine; // 5 — identisch zum echten Gameplay
    // Rein dekorative Demo-Wörter (kein echtes Gameplay) — richten sich nach
    // der UI-Sprache, damit die Vorschau nicht wie ein unübersetzter Rest
    // wirkt. Echte Wortauswahl fürs Gameplay kommt aus rhyme-engine.js
    // (hier bewusst nicht nachgeladen, nur für diese kleine Vorschau).
    const DEMO_WORDS_BY_LOCALE = {
      de: ["RAUM", "BAUM", "KAUM", "TRAUM", "SCHAUM"],
      en: ["LIGHT", "NIGHT", "RIGHT", "FIGHT", "BRIGHT"],
      ru: ["СОК", "БОК", "СРОК", "УРОК", "ПОТОК"],
    };
    const DEMO_WORDS = DEMO_WORDS_BY_LOCALE[window.FlowI18n.getLocale()] || DEMO_WORDS_BY_LOCALE.de;
    const DEMO_BPM = 100;
    const secPerHop = 60 / DEMO_BPM; // 1 Kästchen pro Beat
    const bounceHeight = 26;

    let boxes = [];
    let centers = [];
    let demoWordIndex = 0;

    function renderLine() {
      const word = DEMO_WORDS[demoWordIndex % DEMO_WORDS.length];
      const html = [];
      for (let i = 0; i < BOXES_PER_LINE; i++) {
        if (i === BOXES_PER_LINE - 1) {
          html.push(`<div class="preview-box preview-box--word">${word}</div>`);
        } else {
          html.push(`<div class="preview-box preview-box--tact"><span class="preview-box__tact-dot"></span></div>`);
        }
      }
      track.innerHTML = html.join("");
      track.appendChild(ball);
      track.appendChild(sparkLayer);
      measure();
    }

    function measure() {
      boxes = $$(".preview-box");
      const trackRect = track.getBoundingClientRect();
      centers = boxes.map((b) => {
        const r = b.getBoundingClientRect();
        return { x: r.left - trackRect.left + r.width / 2, y: r.top - trackRect.top };
      });
    }

    renderLine();
    window.addEventListener("resize", () => {
      clearTimeout(window.__pvResizeT);
      window.__pvResizeT = setTimeout(measure, 150);
    });

    function spawnSparks(x, y, isWordBox) {
      window.FlowSparkFX?.spawnSparks(sparkLayer, x, y, {
        count: isWordBox ? 12 : 6,
        minDist: isWordBox ? 18 : 14,
        maxDist: isWordBox ? 34 : 26,
      });
    }

    let lastLandedIndex = -1;
    let hitTimer = null;

    const start = performance.now();
    function frame(now) {
      if (!centers.length) { requestAnimationFrame(frame); return; }

      const elapsedInLine = ((now - start) / 1000) % (secPerHop * BOXES_PER_LINE);
      const hopFloat = elapsedInLine / secPerHop;
      const boxIndex = Math.min(BOXES_PER_LINE - 1, Math.floor(hopFloat));
      const frac = hopFloat - Math.floor(hopFloat);

      const isNewLanding = boxIndex !== lastLandedIndex;
      if (isNewLanding && boxIndex === 0 && lastLandedIndex === BOXES_PER_LINE - 1) {
        // Zeile fertig durchlaufen — neues Demo-Wort für die "nächste Zeile".
        demoWordIndex++;
        renderLine();
      }

      const target = centers[boxIndex];
      if (!target) { requestAnimationFrame(frame); return; }

      const bounce = Math.sin(frac * Math.PI);
      const y = target.y - bounceHeight * bounce;
      ball.style.transform = `translate(${target.x - 10}px, ${y - 22}px)`;

      if (isNewLanding) {
        lastLandedIndex = boxIndex;
        const landed = boxes[boxIndex];
        if (landed) {
          landed.classList.add("is-hit");
          spawnSparks(target.x, target.y + 6, boxIndex === BOXES_PER_LINE - 1);
          // Bewusst stumm — reine Deko, kein Autoplay-Sound ohne Nutzer-Geste nötig.
          clearTimeout(hitTimer);
          hitTimer = setTimeout(() => landed.classList.remove("is-hit"), secPerHop * 900);
        }
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------------
     3) Mini-Rangliste (Panel "Rangliste") — dieselbe Logik wie community.js
     --------------------------------------------------------------------- */
  function renderLeaderboardPanel() {
    const el = $("#leaderboardMini");
    if (!el) return;
    const profile = FlowProfile.load();
    const posts = FlowCommunity.loadPosts().filter((p) => p.isSeed);
    const rows = posts.map((p) => ({ name: p.authorName, avatar: p.authorAvatar, score: p.overall, isYou: false }));
    rows.push({ name: profile.displayName, avatar: profile.avatar, score: profile.stats.bestScore, isYou: true });
    rows.sort((a, b) => b.score - a.score);

    el.innerHTML = rows.slice(0, 5).map((r, i) => `
      <div class="leaderboard-row ${r.isYou ? "is-you" : ""}">
        <span class="leaderboard-row__rank">#${i + 1}</span>
        <span class="leaderboard-row__avatar">${r.avatar}</span>
        <span class="leaderboard-row__name">${escapeHtml(r.name)}${r.isYou ? ` (${t("common.you")})` : ""}</span>
        <span class="leaderboard-row__score">${r.score} ${t("common.points")}</span>
      </div>
    `).join("");
  }

  /* ---------------------------------------------------------------------
     4) Mini-Feed (Panel "Community")
     --------------------------------------------------------------------- */
  function renderCommunityPanel() {
    const el = $("#communityMini");
    if (!el) return;
    const posts = FlowCommunity.loadPosts().slice(0, 3);
    el.innerHTML = posts.map((p) => `
      <div class="post-card glass">
        <div class="post-card__avatar">${p.authorAvatar}</div>
        <div class="post-card__body">
          <div class="post-card__head">
            <span class="post-card__author">${escapeHtml(p.authorName)}</span>
            <span class="post-card__meta">· ${findTopicLabel(p.topic)} · ${escapeHtml(p.beatName)}</span>
          </div>
          <p class="post-card__excerpt">${escapeHtml(p.excerpt)}</p>
          <div class="post-card__footer">
            <span class="post-card__score">${p.overall} Pkt.</span>
            <span class="like-btn" style="cursor:default;">❤️ ${p.likes}</span>
          </div>
        </div>
      </div>
    `).join("");
  }

  /* ---------------------------------------------------------------------
     5) Shop (Panel "Shop") — Beats per Credits freischalten, Premium-Teaser
     --------------------------------------------------------------------- */
  function renderShopPanel() {
    const el = $("#shopGrid");
    if (!el) return;
    const profile = FlowProfile.load();

    el.innerHTML = BEATS.map((beat) => {
      const unlocked = FlowProfile.isBeatUnlocked(profile, beat);
      return `
        <div class="shop-card">
          <div class="shop-card__head">
            <span class="shop-card__name">${beat.name}</span>
            <span class="shop-card__meta">${beat.bpm} BPM</span>
          </div>
          <span class="shop-card__meta">${beat.category}</span>
          <div class="shop-card__action">
            ${unlocked
              ? `<span class="badge">${t("home.shop.unlocked")}</span>`
              : `<button class="btn btn-glass btn-sm" type="button" data-shop-beat="${beat.id}">${t("home.shop.unlockBtn", { cost: beat.unlockCost })}</button>`}
          </div>
        </div>
      `;
    }).join("");

    el.querySelectorAll("[data-shop-beat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const beat = BEATS.find((b) => b.id === btn.dataset.shopBeat);
        const p = FlowProfile.load();
        if (FlowProfile.unlockBeat(p, beat)) {
          window.FlowSound?.playConfirm?.();
          const creditsEl = $("#creditsValue");
          if (creditsEl) creditsEl.textContent = String(p.credits);
          renderShopPanel();
        } else {
          window.FlowSound?.playClick?.();
          const toast = $("#toast");
          if (toast) {
            toast.textContent = t("toast.notEnoughCredits", { have: p.credits, cost: beat.unlockCost });
            toast.classList.add("is-visible");
            setTimeout(() => toast.classList.remove("is-visible"), 2800);
          }
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     6) Turnier erstellen (Panel "tournament-create")
     --------------------------------------------------------------------- */
  const tourneyState = { difficulty: "mittel", beatId: null, topic: "freestyle", rounds: 3 };

  function renderTourneyBeatOptions() {
    const sel = $("#tourneyBeatSelect");
    if (!sel) return;
    const profile = FlowProfile.load();
    const unlocked = BEATS.filter((b) => FlowProfile.isBeatUnlocked(profile, b));
    sel.innerHTML = unlocked.map((b) => `<option value="${b.id}">${escapeHtml(b.name)} · ${b.bpm} BPM</option>`).join("");
    if (!tourneyState.beatId || !unlocked.find((b) => b.id === tourneyState.beatId)) {
      tourneyState.beatId = unlocked[0]?.id || BEATS[0].id;
    }
    sel.value = tourneyState.beatId;
  }

  function renderTourneyRounds() {
    const val = $("#tourneyRoundsValue");
    if (val) val.textContent = String(tourneyState.rounds);
    const minus = $("#tourneyRoundsMinus");
    const plus = $("#tourneyRoundsPlus");
    if (minus) minus.disabled = tourneyState.rounds <= 1;
    if (plus) plus.disabled = tourneyState.rounds >= 5;
  }

  $$(".js-tourney-difficulty").forEach((btn) => {
    btn.addEventListener("click", () => {
      tourneyState.difficulty = btn.dataset.value;
      $$(".js-tourney-difficulty").forEach((b) => b.classList.toggle("is-active", b === btn));
      window.FlowSound?.playSelect?.();
    });
  });
  // Standardauswahl sichtbar machen
  $$(".js-tourney-difficulty").forEach((b) => b.classList.toggle("is-active", b.dataset.value === tourneyState.difficulty));

  $("#tourneyBeatSelect")?.addEventListener("change", (e) => { tourneyState.beatId = e.target.value; });
  $("#tourneyTopicSelect")?.addEventListener("change", (e) => { tourneyState.topic = e.target.value; });

  $("#tourneyRoundsMinus")?.addEventListener("click", () => {
    if (tourneyState.rounds <= 1) return;
    tourneyState.rounds -= 1;
    renderTourneyRounds();
    window.FlowSound?.playClick?.();
  });
  $("#tourneyRoundsPlus")?.addEventListener("click", () => {
    if (tourneyState.rounds >= 5) return;
    tourneyState.rounds += 1;
    renderTourneyRounds();
    window.FlowSound?.playClick?.();
  });

  $("#createTournamentBtn")?.addEventListener("click", () => {
    const profile = FlowProfile.load();
    window.FlowSound?.playConfirm?.();
    const tournament = FlowTournament.createTournament({
      hostProfile: profile,
      difficulty: tourneyState.difficulty,
      beatId: tourneyState.beatId,
      topic: tourneyState.topic,
      roundsTotal: tourneyState.rounds,
    });
    window.location.href = `tournament.html?code=${tournament.code}`;
  });

  /* ---------------------------------------------------------------------
     7) Turnier beitreten (Panel "tournament-join")
     --------------------------------------------------------------------- */
  const joinCodeInput = $("#joinCodeInput");
  joinCodeInput?.addEventListener("input", () => {
    joinCodeInput.value = joinCodeInput.value.replace(/\D/g, "").slice(0, 4);
  });

  $("#joinTournamentBtn")?.addEventListener("click", () => {
    const code = (joinCodeInput?.value || "").trim();
    if (code.length !== 4) {
      window.FlowSound?.playClick?.();
      const toast = $("#toast");
      if (toast) {
        toast.textContent = t("home.tournamentJoin.codeTooShort");
        toast.classList.add("is-visible");
        setTimeout(() => toast.classList.remove("is-visible"), 2400);
      }
      return;
    }
    window.FlowSound?.playConfirm?.();
    window.location.href = `tournament.html?code=${code}`;
  });

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  initGameplayPreview();
  renderTourneyBeatOptions();
  renderTourneyRounds();
  openPanel("play");

  // Mini-Panels sind nur beim Öffnen befüllt — bei Sprachwechsel trotzdem
  // alle neu zeichnen (billig, idempotent), damit kein Panel auf Deutsch
  // "hängen bleibt", falls es schon offen war.
  window.FlowI18n.onLocaleChange(() => {
    renderLeaderboardPanel();
    renderCommunityPanel();
    renderShopPanel();
  });
})();
