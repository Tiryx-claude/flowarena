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
  const FlowPurchases = window.FlowPurchases;
  const {
    BEATS, PREMIUM, CREDIT_PACKAGES, BALL_DESIGNS, PREMIUM_CHALLENGES,
    DAILY_LOGIN_REWARDS, WEEKLY_CHALLENGE, isWeekendBonusActive, findTopicLabel,
    RESULT_ANIMATIONS, PROFILE_THEMES, PAYMENT_METHODS, EARLY_ACCESS_PREVIEW,
  } = window.FlowData;
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
    animationCatalog: $("#animationCatalog"),
    themeCatalog: $("#themeCatalog"),
    premiumChallengeCatalog: $("#premiumChallengeCatalog"),
    earlyAccessBlock: $("#earlyAccessBlock"),
    eventBanner: $("#eventBanner"),
    dailyLimitStatus: $("#dailyLimitStatus"),
    loginStreak: $("#loginStreak"),
    weeklyChallengeBlock: $("#weeklyChallengeBlock"),
    purchaseHistory: $("#purchaseHistory"),
    purchaseModalOverlay: $("#purchaseModalOverlay"),
    purchaseModal: $("#purchaseModal"),
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
     Kaufbestätigung (Demo) — Zahlungsmethoden-Auswahl für ECHTE-Geld-Käufe
     (Premium, Credits-Pakete). Rein dekorativ: keine Zahlungsfelder, keine
     echte Verarbeitung, siehe docs/SHOP.md.
     --------------------------------------------------------------------- */
  function openPurchaseModal({ icon, title, priceLabel, note, onConfirm }) {
    if (!els.purchaseModalOverlay || !els.purchaseModal) {
      onConfirm(PAYMENT_METHODS[0]);
      return;
    }
    let selectedId = PAYMENT_METHODS[0].id;
    els.purchaseModal.innerHTML = `
      <div class="purchase-modal__icon">${icon}</div>
      <h3 class="purchase-modal__title">${escapeHtml(title)}</h3>
      <div class="purchase-modal__price">${priceLabel}</div>
      <p class="purchase-modal__note">${note || "Preis vor dem Kauf sichtbar — Demo, keine echte Zahlung."}</p>
      <div class="payment-method-grid" id="paymentMethodGrid">
        ${PAYMENT_METHODS.map((m, i) => `
          <button type="button" class="payment-method-opt ${i === 0 ? "is-selected" : ""}" data-method="${m.id}">
            <span class="payment-method-opt__icon">${m.icon}</span>
            <span>${m.label}</span>
          </button>
        `).join("")}
      </div>
      <div class="purchase-modal__actions">
        <button class="btn btn-glass btn-sm" type="button" id="purchaseCancelBtn">Abbrechen</button>
        <button class="btn btn-primary btn-sm" type="button" id="purchaseConfirmBtn">Kauf bestätigen</button>
      </div>
      <p class="purchase-modal__disclaimer">🔒 Demo — es werden keine echten Zahlungsdaten abgefragt, gespeichert oder verarbeitet.</p>
    `;

    const grid = els.purchaseModal.querySelector("#paymentMethodGrid");
    grid.querySelectorAll("[data-method]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedId = btn.dataset.method;
        grid.querySelectorAll("[data-method]").forEach((b) => b.classList.toggle("is-selected", b === btn));
        window.FlowSound?.playSelect?.();
      });
    });

    function close() {
      els.purchaseModalOverlay.hidden = true;
      els.purchaseModal.innerHTML = "";
    }
    els.purchaseModal.querySelector("#purchaseCancelBtn").addEventListener("click", () => {
      window.FlowSound?.playClick?.();
      close();
    });
    els.purchaseModal.querySelector("#purchaseConfirmBtn").addEventListener("click", () => {
      const method = PAYMENT_METHODS.find((m) => m.id === selectedId);
      close();
      onConfirm(method);
    });
    els.purchaseModalOverlay.addEventListener("click", (e) => {
      if (e.target === els.purchaseModalOverlay) close();
    }, { once: true });
    els.purchaseModalOverlay.hidden = false;
  }

  function billingDateLabel(sinceTs) {
    if (!sinceTs) return null;
    const next = new Date(sinceTs + 30 * 24 * 60 * 60 * 1000);
    return next.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  /* ---------------------------------------------------------------------
     Premium
     --------------------------------------------------------------------- */
  function renderPremium() {
    if (profile.premium) {
      const nextBilling = billingDateLabel(profile.premiumSince);
      els.premiumBlock.innerHTML = `
        <div class="premium-hero premium-hero--active">
          <div class="premium-hero__badge">👑 Premium aktiv</div>
          <p style="color:var(--text-muted); font-size:var(--fs-sm);">Keine Werbung, alle Premium-Beats, alle Ball-Designs/Animationen/Profil-Designs, alle Premium-Challenges, Early Access und bis zu 10 Strophen pro Challenge.</p>
          ${nextBilling ? `<p style="color:var(--text-dim); font-size:var(--fs-xs); margin-top:var(--sp-2);">Simulierte nächste Abrechnung: ${nextBilling} (${PREMIUM.priceLabel}) — bricht ab, sobald du kündigst.</p>` : ""}
          <button class="btn btn-glass btn-sm" id="cancelPremiumBtn" type="button" style="margin-top:var(--sp-4); border-color:rgba(255,75,92,0.4); color:#ff8a97;">Abo kündigen</button>
          <p class="premium-card__note">Demo-Status, lokal in diesem Browser gespeichert — keine echte Zahlung, kein echtes Abo. Jederzeit mit einem Klick kündbar, keine Mindestlaufzeit.</p>
        </div>
      `;
      const cancelBtn = $("#cancelPremiumBtn");
      cancelBtn?.addEventListener("click", () => {
        if (cancelBtn.dataset.confirming !== "true") {
          cancelBtn.dataset.confirming = "true";
          cancelBtn.textContent = "Wirklich kündigen? Nochmal klicken zum Bestätigen";
          setTimeout(() => {
            if (cancelBtn.dataset.confirming === "true") {
              cancelBtn.dataset.confirming = "false";
              cancelBtn.textContent = "Abo kündigen";
            }
          }, 4000);
          return;
        }
        FlowProfile.cancelPremiumDemo(profile);
        FlowPurchases?.addPurchase({ icon: "👑", label: "Premium gekündigt", priceLabel: "—", method: "—" });
        window.FlowSound?.playClick?.();
        showToast("Premium gekündigt — ab sofort wieder Free (keine Nachzahlung, keine Sperrfrist).");
        FlowSocial?.addNotification({ icon: "👑", text: "Premium gekündigt — Free-Tarif ist ab sofort aktiv." });
        refreshTopbar();
        renderAll();
      });
      return;
    }
    els.premiumBlock.innerHTML = `
      <div class="premium-hero">
        <div class="premium-hero__price">${PREMIUM.priceLabel}<span>${PREMIUM.billingLabel}</span></div>
        <ul class="premium-card__perks">
          <li>Keine Werbung mehr</li>
          <li>Unbegrenzt Challenges (Free: ${window.FlowData.FREE_DAILY_CHALLENGE_LIMIT}/Tag)</li>
          <li>Alle Premium-Beats sofort freigeschaltet</li>
          <li>Alle Premium-Ball-Designs &amp; -Animationen &amp; -Profil-Designs</li>
          <li>Alle Premium-Challenges freigeschaltet</li>
          <li>Früher Zugang zu neuen Features (Early Access)</li>
          <li>Bis zu 10 statt 5 Strophen pro Challenge</li>
          <li>👑 Premium-Badge auf deinem Profil</li>
        </ul>
        <p class="premium-hero__no-advantage">⚖️ Kein Gameplay-Vorteil: gleiche Reimwörter, gleiche Bewertung, gleiche Chancen im Wettbewerb wie Free.</p>
        <button class="btn btn-primary" id="premiumBtn" type="button">Premium aktivieren (Demo)</button>
        <p class="premium-card__note">Jederzeit kündbar, keine Mindestlaufzeit. Reiner Demo-Schalter für diesen Prototyp — es wird keine Zahlung verarbeitet und nichts abgebucht.</p>
      </div>
    `;
    $("#premiumBtn")?.addEventListener("click", () => {
      openPurchaseModal({
        icon: "👑",
        title: "FlowArena Premium",
        priceLabel: `${PREMIUM.priceLabel} ${PREMIUM.billingLabel}`,
        onConfirm: (method) => {
          FlowProfile.unlockPremiumDemo(profile);
          FlowPurchases?.addPurchase({ icon: "👑", label: "Premium aktiviert", priceLabel: PREMIUM.priceLabel, method: method.label });
          window.FlowSound?.playConfirm?.();
          showToast("👑 Premium aktiviert (Demo)!");
          FlowSocial?.addNotification({ icon: "👑", text: "Premium aktiviert (Demo) — keine Werbung mehr, alle Beats/Ball-Designs/Challenges freigeschaltet." });
          refreshTopbar();
          renderAll();
        },
      });
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
        openPurchaseModal({
          icon: "💎",
          title: `${pkg.credits} Credits`,
          priceLabel: pkg.priceLabel,
          onConfirm: (method) => {
            FlowProfile.purchaseCreditsDemo(profile, pkg);
            FlowPurchases?.addPurchase({ icon: "💎", label: `${pkg.credits} Credits gekauft`, priceLabel: pkg.priceLabel, method: method.label });
            window.FlowSound?.playConfirm?.();
            showToast(`💎 +${pkg.credits} Credits gutgeschrieben (Demo-Kauf, keine echte Zahlung).`);
            refreshTopbar();
            renderPurchaseHistory();
          },
        });
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
          FlowPurchases?.addPurchase({ icon: "🎵", label: `Beat „${beat.name}“ freigeschaltet`, priceLabel: `${beat.unlockCost} 💎`, method: "Credits" });
          window.FlowSound?.playConfirm?.();
          showToast(`🎵 ${beat.name} freigeschaltet!`);
          refreshTopbar();
          renderBeats();
          renderPurchaseHistory();
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
          FlowPurchases?.addPurchase({ icon: "⚪", label: `Ball-Design „${design.name}“ freigeschaltet`, priceLabel: `${design.price} 💎`, method: "Credits" });
          window.FlowSound?.playConfirm?.();
          showToast(`⚪ ${design.name} freigeschaltet!`);
          refreshTopbar();
          renderBalls();
          renderPurchaseHistory();
        } else {
          window.FlowSound?.playClick?.();
          showToast(`🔒 Nicht genug Credits (${profile.credits}/${design.price} 💎).`);
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Modul 6 — Ergebnis-Animationen (kosmetisch)
     --------------------------------------------------------------------- */
  function renderAnimations() {
    if (!els.animationCatalog) return;
    els.animationCatalog.innerHTML = RESULT_ANIMATIONS.map((anim) => {
      const unlocked = FlowProfile.isAnimationUnlocked(profile, anim);
      const equipped = profile.activeAnimationId === anim.id;
      let actionHtml;
      if (equipped) {
        actionHtml = `<span class="badge">✓ Ausgerüstet</span>`;
      } else if (unlocked) {
        actionHtml = `<button class="btn btn-glass btn-sm" type="button" data-equip-anim="${anim.id}">Auswählen</button>`;
      } else if (anim.premiumOnly) {
        actionHtml = `<span class="badge" style="opacity:0.7;">🔒 Nur mit Premium</span>`;
      } else {
        actionHtml = `<button class="btn btn-glass btn-sm" type="button" data-unlock-anim="${anim.id}">🔒 Freischalten — ${anim.price} 💎</button>`;
      }
      return `
        <div class="shop-card ball-card">
          <div class="ball-card__preview">
            <span class="anim-swatch" style="background: linear-gradient(135deg, ${anim.color1}, ${anim.color2});"></span>
          </div>
          <div class="shop-card__head">
            <span class="shop-card__name">${escapeHtml(anim.name)}</span>
          </div>
          <span class="shop-card__meta">${escapeHtml(anim.desc)}</span>
          <div class="shop-card__action">${actionHtml}</div>
        </div>
      `;
    }).join("");

    els.animationCatalog.querySelectorAll("[data-equip-anim]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const anim = RESULT_ANIMATIONS.find((a) => a.id === btn.dataset.equipAnim);
        FlowProfile.setActiveAnimation(profile, anim);
        window.FlowSound?.playSelect?.();
        showToast(`✨ ${anim.name} ausgerüstet.`);
        renderAnimations();
      });
    });
    els.animationCatalog.querySelectorAll("[data-unlock-anim]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const anim = RESULT_ANIMATIONS.find((a) => a.id === btn.dataset.unlockAnim);
        if (FlowProfile.unlockAnimation(profile, anim)) {
          FlowPurchases?.addPurchase({ icon: "✨", label: `Animation „${anim.name}“ freigeschaltet`, priceLabel: `${anim.price} 💎`, method: "Credits" });
          window.FlowSound?.playConfirm?.();
          showToast(`✨ ${anim.name} freigeschaltet!`);
          refreshTopbar();
          renderAnimations();
          renderPurchaseHistory();
        } else {
          window.FlowSound?.playClick?.();
          showToast(`🔒 Nicht genug Credits (${profile.credits}/${anim.price} 💎).`);
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Modul 6 — Profil-Designs (kosmetisch)
     --------------------------------------------------------------------- */
  function renderThemes() {
    if (!els.themeCatalog) return;
    els.themeCatalog.innerHTML = PROFILE_THEMES.map((theme) => {
      const unlocked = FlowProfile.isThemeUnlocked(profile, theme);
      const equipped = profile.activeThemeId === theme.id;
      let actionHtml;
      if (equipped) {
        actionHtml = `<span class="badge">✓ Ausgerüstet</span>`;
      } else if (unlocked) {
        actionHtml = `<button class="btn btn-glass btn-sm" type="button" data-equip-theme="${theme.id}">Auswählen</button>`;
      } else if (theme.premiumOnly) {
        actionHtml = `<span class="badge" style="opacity:0.7;">🔒 Nur mit Premium</span>`;
      } else {
        actionHtml = `<button class="btn btn-glass btn-sm" type="button" data-unlock-theme="${theme.id}">🔒 Freischalten — ${theme.price} 💎</button>`;
      }
      return `
        <div class="shop-card ball-card">
          <div class="ball-card__preview" style="background:${theme.gradient || "var(--surface)"}; border-radius:var(--r-md);"></div>
          <div class="shop-card__head">
            <span class="shop-card__name">${escapeHtml(theme.name)}</span>
          </div>
          <span class="shop-card__meta">${escapeHtml(theme.desc)}</span>
          <div class="shop-card__action">${actionHtml}</div>
        </div>
      `;
    }).join("");

    els.themeCatalog.querySelectorAll("[data-equip-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const theme = PROFILE_THEMES.find((t) => t.id === btn.dataset.equipTheme);
        FlowProfile.setActiveTheme(profile, theme);
        window.FlowSound?.playSelect?.();
        showToast(`🎨 ${theme.name} ausgerüstet.`);
        renderThemes();
      });
    });
    els.themeCatalog.querySelectorAll("[data-unlock-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const theme = PROFILE_THEMES.find((t) => t.id === btn.dataset.unlockTheme);
        if (FlowProfile.unlockTheme(profile, theme)) {
          FlowPurchases?.addPurchase({ icon: "🎨", label: `Profil-Design „${theme.name}“ freigeschaltet`, priceLabel: `${theme.price} 💎`, method: "Credits" });
          window.FlowSound?.playConfirm?.();
          showToast(`🎨 ${theme.name} freigeschaltet!`);
          refreshTopbar();
          renderThemes();
          renderPurchaseHistory();
        } else {
          window.FlowSound?.playClick?.();
          showToast(`🔒 Nicht genug Credits (${profile.credits}/${theme.price} 💎).`);
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
     Modul 6 — Early Access (Premium-exklusive Vorschau, reine Demo)
     --------------------------------------------------------------------- */
  function renderEarlyAccess() {
    if (!els.earlyAccessBlock) return;
    const p = EARLY_ACCESS_PREVIEW;
    els.earlyAccessBlock.innerHTML = `
      <div class="shop-card early-access-card">
        <div class="shop-card__head">
          <span class="shop-card__name">${p.icon} ${escapeHtml(p.name)}</span>
        </div>
        <span class="shop-card__meta">${escapeHtml(p.desc)}</span>
        <div class="shop-card__action">
          ${profile.premium
            ? `<span class="badge">✓ Freigeschaltet (Vorschau)</span>`
            : `<span class="badge" style="opacity:0.7;">🔒 Nur mit Premium</span>`}
        </div>
      </div>
    `;
  }

  /* ---------------------------------------------------------------------
     Belohnungen: Event-Banner, Login-Serie, Wochen-Challenge, Tageslimit
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

  function renderDailyLimitStatus() {
    if (!els.dailyLimitStatus) return;
    if (profile.premium) {
      els.dailyLimitStatus.innerHTML = `<p class="shop-section__hint" style="margin-bottom:var(--sp-5);">👑 Mit Premium: unbegrenzt Challenges pro Tag.</p>`;
      return;
    }
    const check = FlowProfile.canStartChallenge(profile);
    els.dailyLimitStatus.innerHTML = `<p class="shop-section__hint" style="margin-bottom:var(--sp-5);">🎤 Heute noch ${check.remaining} von ${check.limit} kostenlosen Challenges übrig.</p>`;
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

  /* ---------------------------------------------------------------------
     Modul 6 — Kaufhistorie
     --------------------------------------------------------------------- */
  function timeAgo(ts) {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return "gerade eben";
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    return `vor ${Math.round(hours / 24)} Tag(en)`;
  }

  function renderPurchaseHistory() {
    if (!els.purchaseHistory) return;
    const list = FlowPurchases?.loadPurchases() || [];
    if (list.length === 0) {
      els.purchaseHistory.innerHTML = `<p class="empty-hint">Noch keine Käufe — hier landet jede Demo-Aktion aus diesem Shop.</p>`;
      return;
    }
    els.purchaseHistory.innerHTML = list.map((p) => `
      <div class="purchase-row">
        <span class="purchase-row__icon">${p.icon}</span>
        <div class="purchase-row__body">
          <div class="purchase-row__label">${escapeHtml(p.label)}</div>
          <div class="purchase-row__meta">${escapeHtml(p.method)} · ${timeAgo(p.createdAt)}</div>
        </div>
        <span class="purchase-row__price">${escapeHtml(p.priceLabel)}</span>
      </div>
    `).join("");
  }

  function renderAll() {
    profile = FlowProfile.load();
    renderPremium();
    renderCreditPackages();
    renderBeats();
    renderBalls();
    renderAnimations();
    renderThemes();
    renderPremiumChallenges();
    renderEarlyAccess();
    renderEventBanner();
    renderDailyLimitStatus();
    renderLoginStreak();
    renderWeeklyChallenge();
    renderPurchaseHistory();
  }

  renderAll();

  // Ankerlinks aus der Werbung (#premium, #balls, …) sanft anspringen.
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
})();
