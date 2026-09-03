/* =========================================================================
   FlowArena — Shop Page Logic (Modul 5: Shop, Premium, Credits & Werbung)
   -------------------------------------------------------------------------
   Siehe docs/SHOP.md für die ehrlichen Grenzen (Demo-Zahlungen, kein
   Backend) und das "Niemals Pay-to-Win"-Versprechen, das diese Seite
   durchgängig einhält: jeder Kauf hier ist Komfort/Zugriff/Kosmetik/
   Werbefreiheit — nie ein Vorteil im eigentlichen Wettbewerb.
   ========================================================================= */

(function () {
  "use strict";

  const FlowProfile = window.FlowProfile;
  const FlowSocial = window.FlowSocial;
  const { BEATS, PREMIUM, CREDIT_PACKAGES, BALL_DESIGNS, PREMIUM_CHALLENGES, DAILY_LOGIN_REWARDS, WEEKLY_CHALLENGE, isWeekendBonusActive, findTopicLabel } = window.FlowData;
  let profile = FlowProfile.load();

  const $ = (sel) => document.querySelector(sel);

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const els = {
    creditsValue: $("#creditsValue"),
    profileAvatarLink: $("#profileAvatarLink"),
    premiumBlock: $("#premiumBlock"),
    creditPackages: $("#creditPackages"),
    beatCatalog: $("#beatCatalog"),
    ballCatalog: $("#ballCatalog"),
    premiumChallengeCatalog: $("#premiumChallengeCatalog"),
    eventBanner: $("#eventBanner"),
    loginStreak: $("#loginStreak"),
    weeklyChallengeBlock: $("#weeklyChallengeBlock"),
    toast: $("#toast"),
  };

  function refreshTopbar() {
    els.creditsValue.textContent = String(profile.credits);
    els.profileAvatarLink.textContent = profile.avatar;
  }
  refreshTopbar();

  let toastTimer = null;
  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2800);
  }

  /* ---------------------------------------------------------------------
     Premium
     --------------------------------------------------------------------- */
  function renderPremium() {
    if (profile.premium) {
      els.premiumBlock.innerHTML = `
        <div class="premium-hero premium-hero--active">
          <div class="premium-hero__badge">👑 Premium aktiv</div>
          <p style="color:var(--text-muted); font-size:var(--fs-sm);">Keine Werbung, alle Premium-Beats, alle Ball-Designs, alle Premium-Challenges und bis zu 10 Strophen pro Challenge.</p>
          <p class="premium-card__note">Demo-Status, lokal in diesem Browser gespeichert — keine echte Zahlung, kein echtes Abo.</p>
        </div>
      `;
      return;
    }
    els.premiumBlock.innerHTML = `
      <div class="premium-hero">
        <div class="premium-hero__price">${PREMIUM.priceLabel}<span>${PREMIUM.billingLabel}</span></div>
        <ul class="premium-card__perks">
          <li>Keine Werbung mehr</li>
          <li>Alle Premium-Beats sofort freigeschaltet</li>
          <li>Alle Premium-Ball-Designs freigeschaltet</li>
          <li>Alle Premium-Challenges freigeschaltet</li>
          <li>Bis zu 10 statt 5 Strophen pro Challenge</li>
          <li>👑 Premium-Badge auf deinem Profil</li>
        </ul>
        <p class="premium-hero__no-advantage">⚖️ Kein Gameplay-Vorteil: gleiche Reimwörter, gleiche Bewertung, gleiche Chancen im Wettbewerb wie Free.</p>
        <button class="btn btn-primary" id="premiumBtn" type="button">Premium aktivieren (Demo)</button>
        <p class="premium-card__note">Reiner Demo-Schalter für diesen Prototyp — es wird keine Zahlung verarbeitet und nichts abgebucht.</p>
      </div>
    `;
    $("#premiumBtn")?.addEventListener("click", () => {
      FlowProfile.unlockPremiumDemo(profile);
      window.FlowSound?.playConfirm?.();
      showToast("👑 Premium aktiviert (Demo)!");
      FlowSocial?.addNotification({ icon: "👑", text: "Premium aktiviert (Demo) — keine Werbung mehr, alle Beats/Ball-Designs/Challenges freigeschaltet." });
      refreshTopbar();
      renderAll();
    });
  }

  /* ---------------------------------------------------------------------
     Credits-Pakete
     --------------------------------------------------------------------- */
  function renderCreditPackages() {
    els.creditPackages.innerHTML = CREDIT_PACKAGES.map((pkg) => `
      <div class="shop-card">
        <div class="shop-card__head">
          <span class="shop-card__name">💎 ${pkg.credits} Credits</span>
        </div>
        ${pkg.bonusLabel ? `<span class="shop-card__meta" style="color:var(--neon-blue);">${pkg.bonusLabel}</span>` : ""}
        <div class="shop-card__action">
          <button class="btn btn-primary btn-sm" type="button" data-buy-credits="${pkg.id}">${pkg.priceLabel} — Kaufen (Demo)</button>
        </div>
      </div>
    `).join("");

    els.creditPackages.querySelectorAll("[data-buy-credits]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pkg = CREDIT_PACKAGES.find((p) => p.id === btn.dataset.buyCredits);
        FlowProfile.purchaseCreditsDemo(profile, pkg);
        window.FlowSound?.playConfirm?.();
        showToast(`💎 +${pkg.credits} Credits gutgeschrieben (Demo-Kauf, keine echte Zahlung).`);
        refreshTopbar();
      });
    });
  }

  /* ---------------------------------------------------------------------
     Beats
     --------------------------------------------------------------------- */
  function renderBeats() {
    els.beatCatalog.innerHTML = BEATS.map((beat) => {
      const unlocked = FlowProfile.isBeatUnlocked(profile, beat);
      return `
        <div class="shop-card">
          <div class="shop-card__head">
            <span class="shop-card__name">${escapeHtml(beat.name)}</span>
            <span class="shop-card__meta">${beat.bpm} BPM</span>
          </div>
          <span class="shop-card__meta">${escapeHtml(beat.category)}${beat.premiumOnly ? " · 👑 Premium-Beat" : ""}</span>
          <div class="shop-card__action">
            ${unlocked
              ? `<span class="badge">✓ Freigeschaltet</span>`
              : `<button class="btn btn-glass btn-sm" type="button" data-shop-beat="${beat.id}">🔒 Freischalten — ${beat.unlockCost} 💎</button>`}
          </div>
        </div>
      `;
    }).join("");

    els.beatCatalog.querySelectorAll("[data-shop-beat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const beat = BEATS.find((b) => b.id === btn.dataset.shopBeat);
        if (FlowProfile.unlockBeat(profile, beat)) {
          window.FlowSound?.playConfirm?.();
          showToast(`🎵 ${beat.name} freigeschaltet!`);
          refreshTopbar();
          renderBeats();
        } else {
          window.FlowSound?.playClick?.();
          showToast(`🔒 Nicht genug Credits (${profile.credits}/${beat.unlockCost} 💎).`);
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Ball-Designs
     --------------------------------------------------------------------- */
  function renderBalls() {
    els.ballCatalog.innerHTML = BALL_DESIGNS.map((design) => {
      const unlocked = FlowProfile.isBallDesignUnlocked(profile, design);
      const equipped = profile.activeBallDesignId === design.id;
      let actionHtml;
      if (equipped) {
        actionHtml = `<span class="badge">✓ Ausgerüstet</span>`;
      } else if (unlocked) {
        actionHtml = `<button class="btn btn-glass btn-sm" type="button" data-equip-ball="${design.id}">Auswählen</button>`;
      } else if (design.premiumOnly) {
        actionHtml = `<span class="badge" style="opacity:0.7;">🔒 Nur mit Premium</span>`;
      } else {
        actionHtml = `<button class="btn btn-glass btn-sm" type="button" data-unlock-ball="${design.id}">🔒 Freischalten — ${design.price} 💎</button>`;
      }
      return `
        <div class="shop-card ball-card">
          <div class="ball-card__preview">
            <span class="ball-swatch" style="--ball-gradient:${design.gradient}; --ball-glow:${design.glow};"></span>
          </div>
          <div class="shop-card__head">
            <span class="shop-card__name">${escapeHtml(design.name)}</span>
          </div>
          <span class="shop-card__meta">${escapeHtml(design.desc)}${design.premiumOnly ? " · 👑 Premium-exklusiv" : ""}</span>
          <div class="shop-card__action">${actionHtml}</div>
        </div>
      `;
    }).join("");

    els.ballCatalog.querySelectorAll("[data-equip-ball]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const design = BALL_DESIGNS.find((d) => d.id === btn.dataset.equipBall);
        FlowProfile.setActiveBallDesign(profile, design);
        window.FlowSound?.playSelect?.();
        showToast(`⚪ ${design.name} ausgerüstet.`);
        renderBalls();
      });
    });
    els.ballCatalog.querySelectorAll("[data-unlock-ball]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const design = BALL_DESIGNS.find((d) => d.id === btn.dataset.unlockBall);
        if (FlowProfile.unlockBallDesign(profile, design)) {
          window.FlowSound?.playConfirm?.();
          showToast(`⚪ ${design.name} freigeschaltet!`);
          refreshTopbar();
          renderBalls();
        } else {
          window.FlowSound?.playClick?.();
          showToast(`🔒 Nicht genug Credits (${profile.credits}/${design.price} 💎).`);
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Premium-Challenges
     --------------------------------------------------------------------- */
  function renderPremiumChallenges() {
    const difficultyLabel = { leicht: "Leicht", mittel: "Mittel", schwer: "Schwer" };
    els.premiumChallengeCatalog.innerHTML = PREMIUM_CHALLENGES.map((pc) => {
      const beat = BEATS.find((b) => b.id === pc.beatId);
      return `
        <div class="shop-card">
          <div class="shop-card__head">
            <span class="shop-card__name">${escapeHtml(pc.name)}</span>
            <span class="shop-card__meta">${difficultyLabel[pc.difficulty] || pc.difficulty}</span>
          </div>
          <span class="shop-card__meta">${escapeHtml(pc.desc)}</span>
          <span class="shop-card__meta">${beat?.name || pc.beatId} · ${findTopicLabel(pc.topic)} · ${pc.verses} Strophen</span>
          <div class="shop-card__action">
            ${profile.premium
              ? `<button class="btn btn-primary btn-sm" type="button" data-play-challenge="${pc.id}">▶️ Jetzt spielen</button>`
              : `<span class="badge" style="opacity:0.7;">🔒 Nur mit Premium</span>`}
          </div>
        </div>
      `;
    }).join("");

    els.premiumChallengeCatalog.querySelectorAll("[data-play-challenge]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pc = PREMIUM_CHALLENGES.find((p) => p.id === btn.dataset.playChallenge);
        const settings = window.FlowData.loadSettings();
        window.FlowData.saveSettings({ ...settings, difficulty: pc.difficulty, beatId: pc.beatId, topic: pc.topic, verses: pc.verses });
        window.FlowSound?.playConfirm?.();
        showToast(`🏅 ${pc.name} wird vorbereitet …`);
        setTimeout(() => { window.location.href = "challenge.html"; }, 350);
      });
    });
  }

  /* ---------------------------------------------------------------------
     Belohnungen: Event-Banner, Login-Serie, Wochen-Challenge
     --------------------------------------------------------------------- */
  function renderEventBanner() {
    if (!isWeekendBonusActive()) {
      els.eventBanner.innerHTML = "";
      return;
    }
    els.eventBanner.innerHTML = `
      <div class="event-banner">🎉 Wochenend-Bonus aktiv — +25% Credits auf Challenges &amp; Turniere (heute &amp; morgen, nach deiner lokalen Uhrzeit).</div>
    `;
  }

  function renderLoginStreak() {
    const streak = profile.login.streak || 0;
    // Position im 7-Tage-Zyklus, an der die letzte Belohnung vergeben wurde
    // (1..7); 0 = noch nie eingeloggt/belohnt.
    const cycleDay = streak > 0 ? ((streak - 1) % DAILY_LOGIN_REWARDS.length) + 1 : 0;
    const days = DAILY_LOGIN_REWARDS.map((r) => `
      <div class="login-day ${r.day === cycleDay ? "is-current" : ""} ${r.day < cycleDay ? "is-reached" : ""}">
        <div class="login-day__num">Tag ${r.day}</div>
        <div class="login-day__reward">${r.ballDesignChance ? "🎨" : "💎"} ${r.credits}</div>
      </div>
    `).join("");
    els.loginStreak.innerHTML = `
      <div class="login-streak__days">${days}</div>
      <p class="login-streak__caption">Aktuelle Serie: ${streak} Tag${streak === 1 ? "" : "e"} am Stück.</p>
    `;
  }

  function renderWeeklyChallenge() {
    const wc = profile.weeklyChallenge;
    const progress = Math.min(wc.progress || 0, WEEKLY_CHALLENGE.target);
    const pct = Math.round((progress / WEEKLY_CHALLENGE.target) * 100);
    els.weeklyChallengeBlock.innerHTML = `
      <p style="font-size:var(--fs-sm); color:var(--text-muted); margin-bottom:var(--sp-2);">${WEEKLY_CHALLENGE.label}</p>
      <div class="weekly-progress"><div class="weekly-progress__fill" style="width:${pct}%;"></div></div>
      <p style="font-size:var(--fs-xs); color:var(--text-dim); margin-top:var(--sp-2);">
        ${wc.completed ? `✓ Belohnung eingesammelt: +${WEEKLY_CHALLENGE.creditsReward} 💎 (diese Woche)` : `${progress}/${WEEKLY_CHALLENGE.target} Challenges — Belohnung: +${WEEKLY_CHALLENGE.creditsReward} 💎`}
      </p>
    `;
  }

  function renderAll() {
    profile = FlowProfile.load();
    renderPremium();
    renderCreditPackages();
    renderBeats();
    renderBalls();
    renderPremiumChallenges();
    renderEventBanner();
    renderLoginStreak();
    renderWeeklyChallenge();
  }

  renderAll();

  // Ankerlinks aus der Werbung (#premium, #balls, …) sanft anspringen.
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
})();
