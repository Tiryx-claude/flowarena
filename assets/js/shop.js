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
    RESULT_ANIMATIONS, PROFILE_THEMES, PAYMENT_METHODS,
    findBallDesign, findAnimation, findTheme, findPremiumChallenge,
    findPaymentMethodLabel, findCreditPackageBonusLabel, getWeeklyChallengeLabel, getEarlyAccessPreview,
  } = window.FlowData;
  const t = window.FlowI18n.t;
  const tPlural = window.FlowI18n.tPlural;
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
      <p class="purchase-modal__note">${note || t("shop.purchaseDefaultNote")}</p>
      <div class="payment-method-grid" id="paymentMethodGrid">
        ${PAYMENT_METHODS.map((m, i) => `
          <button type="button" class="payment-method-opt ${i === 0 ? "is-selected" : ""}" data-method="${m.id}">
            <span class="payment-method-opt__icon">${m.icon}</span>
            <span>${findPaymentMethodLabel(m.id)}</span>
          </button>
        `).join("")}
      </div>
      <div class="purchase-modal__actions">
        <button class="btn btn-glass btn-sm" type="button" id="purchaseCancelBtn">${t("common.cancel")}</button>
        <button class="btn btn-primary btn-sm" type="button" id="purchaseConfirmBtn">${t("shop.confirmPurchaseBtn")}</button>
      </div>
      <p class="purchase-modal__disclaimer">${t("shop.purchaseDisclaimer")}</p>
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

  const DATE_LOCALE_MAP = { de: "de-DE", en: "en-GB", ru: "ru-RU" };
  function billingDateLabel(sinceTs) {
    if (!sinceTs) return null;
    const next = new Date(sinceTs + 30 * 24 * 60 * 60 * 1000);
    const locale = DATE_LOCALE_MAP[window.FlowI18n.getLocale()] || "de-DE";
    return next.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  /* ---------------------------------------------------------------------
     Premium
     --------------------------------------------------------------------- */
  function renderPremium() {
    if (profile.premium) {
      const nextBilling = billingDateLabel(profile.premiumSince);
      els.premiumBlock.innerHTML = `
        <div class="premium-hero premium-hero--active">
          <div class="premium-hero__badge">${t("shop.premiumActiveBadge")}</div>
          <p style="color:var(--text-muted); font-size:var(--fs-sm);">${t("shop.premiumActiveDesc")}</p>
          ${nextBilling ? `<p style="color:var(--text-dim); font-size:var(--fs-xs); margin-top:var(--sp-2);">${t("shop.nextBillingNote", { date: nextBilling, price: PREMIUM.priceLabel })}</p>` : ""}
          <button class="btn btn-glass btn-sm" id="cancelPremiumBtn" type="button" style="margin-top:var(--sp-4); border-color:rgba(255,75,92,0.4); color:#ff8a97;">${t("shop.cancelBtn")}</button>
          <p class="premium-card__note">${t("shop.premiumDemoNote")}</p>
        </div>
      `;
      const cancelBtn = $("#cancelPremiumBtn");
      cancelBtn?.addEventListener("click", () => {
        if (cancelBtn.dataset.confirming !== "true") {
          cancelBtn.dataset.confirming = "true";
          cancelBtn.textContent = t("shop.confirmCancelBtn");
          setTimeout(() => {
            if (cancelBtn.dataset.confirming === "true") {
              cancelBtn.dataset.confirming = "false";
              cancelBtn.textContent = t("shop.cancelBtn");
            }
          }, 4000);
          return;
        }
        FlowProfile.cancelPremiumDemo(profile);
        FlowPurchases?.addPurchase({ icon: "👑", label: t("shop.premiumCancelledPurchaseLabel"), priceLabel: "—", method: "—" });
        window.FlowSound?.playClick?.();
        showToast(t("shop.premiumCancelledToast"));
        FlowSocial?.addNotification({ icon: "👑", text: t("shop.premiumCancelledNotification") });
        refreshTopbar();
        renderAll();
      });
      return;
    }
    els.premiumBlock.innerHTML = `
      <div class="premium-hero">
        <div class="premium-hero__price">${PREMIUM.priceLabel}<span>${PREMIUM.billingLabel}</span></div>
        <ul class="premium-card__perks">
          <li>${t("shop.noAdsPerk")}</li>
          <li>${t("shop.unlimitedChallengesPerk", { limit: window.FlowData.FREE_DAILY_CHALLENGE_LIMIT })}</li>
          <li>${t("shop.allBeatsPerk")}</li>
          <li>${t("shop.allCosmeticsPerk")}</li>
          <li>${t("shop.allChallengesPerk")}</li>
          <li>${t("shop.earlyAccessPerk")}</li>
          <li>${t("shop.moreVersesPerk")}</li>
          <li>${t("shop.premiumBadgePerk")}</li>
        </ul>
        <p class="premium-hero__no-advantage">${t("shop.noAdvantageNote")}</p>
        <button class="btn btn-primary" id="premiumBtn" type="button">${t("shop.activatePremiumBtn")}</button>
        <p class="premium-card__note">${t("shop.premiumFooterNote")}</p>
      </div>
    `;
    $("#premiumBtn")?.addEventListener("click", () => {
      openPurchaseModal({
        icon: "👑",
        title: "FlowArena Premium",
        priceLabel: `${PREMIUM.priceLabel} ${PREMIUM.billingLabel}`,
        onConfirm: (method) => {
          FlowProfile.unlockPremiumDemo(profile);
          FlowPurchases?.addPurchase({ icon: "👑", label: t("shop.premiumActivatedPurchaseLabel"), priceLabel: PREMIUM.priceLabel, method: findPaymentMethodLabel(method.id) });
          window.FlowSound?.playConfirm?.();
          showToast(t("shop.premiumActivatedToast"));
          FlowSocial?.addNotification({ icon: "👑", text: t("shop.premiumActivatedNotification") });
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
          <span class="shop-card__name">${t("shop.creditPackageName", { n: pkg.credits })}</span>
        </div>
        ${pkg.bonusLabel ? `<span class="shop-card__meta" style="color:var(--neon-blue);">${findCreditPackageBonusLabel(pkg)}</span>` : ""}
        <div class="shop-card__action">
          <button class="btn btn-primary btn-sm" type="button" data-buy-credits="${pkg.id}">${t("shop.buyBtn", { price: pkg.priceLabel })}</button>
        </div>
      </div>
    `).join("");

    els.creditPackages.querySelectorAll("[data-buy-credits]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pkg = CREDIT_PACKAGES.find((p) => p.id === btn.dataset.buyCredits);
        openPurchaseModal({
          icon: "💎",
          title: t("shop.creditPackageName", { n: pkg.credits }),
          priceLabel: pkg.priceLabel,
          onConfirm: (method) => {
            FlowProfile.purchaseCreditsDemo(profile, pkg);
            FlowPurchases?.addPurchase({ icon: "💎", label: t("shop.creditsPurchasedLabel", { n: pkg.credits }), priceLabel: pkg.priceLabel, method: findPaymentMethodLabel(method.id) });
            window.FlowSound?.playConfirm?.();
            showToast(t("shop.creditsPurchasedToast", { n: pkg.credits }));
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
          <span class="shop-card__meta">${escapeHtml(beat.category)}${beat.premiumOnly ? t("shop.premiumBeatTag") : ""}</span>
          <div class="shop-card__action">
            ${unlocked
              ? `<span class="badge">${t("shop.unlockedBadge")}</span>`
              : `<button class="btn btn-glass btn-sm" type="button" data-shop-beat="${beat.id}">${t("shop.unlockCostBtn", { cost: beat.unlockCost })}</button>`}
          </div>
        </div>
      `;
    }).join("");

    els.beatCatalog.querySelectorAll("[data-shop-beat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const beat = BEATS.find((b) => b.id === btn.dataset.shopBeat);
        if (FlowProfile.unlockBeat(profile, beat)) {
          FlowPurchases?.addPurchase({ icon: "🎵", label: t("shop.beatUnlockedPurchaseLabel", { name: beat.name }), priceLabel: `${beat.unlockCost} 💎`, method: t("common.credits") });
          window.FlowSound?.playConfirm?.();
          showToast(t("shop.beatUnlockedToast", { name: beat.name }));
          refreshTopbar();
          renderBeats();
          renderPurchaseHistory();
        } else {
          window.FlowSound?.playClick?.();
          showToast(t("shop.notEnoughCreditsToast", { have: profile.credits, cost: beat.unlockCost }));
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Ball-Designs
     --------------------------------------------------------------------- */
  function renderBalls() {
    els.ballCatalog.innerHTML = BALL_DESIGNS.map((raw) => {
      const design = findBallDesign(raw.id);
      const unlocked = FlowProfile.isBallDesignUnlocked(profile, design);
      const equipped = profile.activeBallDesignId === design.id;
      let actionHtml;
      if (equipped) {
        actionHtml = `<span class="badge">${t("shop.equippedBadge")}</span>`;
      } else if (unlocked) {
        actionHtml = `<button class="btn btn-glass btn-sm" type="button" data-equip-ball="${design.id}">${t("shop.selectBtn")}</button>`;
      } else if (design.premiumOnly) {
        actionHtml = `<span class="badge" style="opacity:0.7;">${t("shop.premiumOnlyBadge")}</span>`;
      } else {
        actionHtml = `<button class="btn btn-glass btn-sm" type="button" data-unlock-ball="${design.id}">${t("shop.unlockCostBtn", { cost: design.price })}</button>`;
      }
      return `
        <div class="shop-card ball-card">
          <div class="ball-card__preview">
            <span class="ball-swatch" style="--ball-gradient:${design.gradient}; --ball-glow:${design.glow};"></span>
          </div>
          <div class="shop-card__head">
            <span class="shop-card__name">${escapeHtml(design.name)}</span>
          </div>
          <span class="shop-card__meta">${escapeHtml(design.desc)}${design.premiumOnly ? t("shop.premiumExclusiveTag") : ""}</span>
          <div class="shop-card__action">${actionHtml}</div>
        </div>
      `;
    }).join("");

    els.ballCatalog.querySelectorAll("[data-equip-ball]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const design = findBallDesign(btn.dataset.equipBall);
        FlowProfile.setActiveBallDesign(profile, design);
        window.FlowSound?.playSelect?.();
        showToast(t("shop.ballEquippedToast", { name: design.name }));
        renderBalls();
      });
    });
    els.ballCatalog.querySelectorAll("[data-unlock-ball]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const design = findBallDesign(btn.dataset.unlockBall);
        if (FlowProfile.unlockBallDesign(profile, design)) {
          FlowPurchases?.addPurchase({ icon: "⚪", label: t("shop.ballUnlockedPurchaseLabel", { name: design.name }), priceLabel: `${design.price} 💎`, method: t("common.credits") });
          window.FlowSound?.playConfirm?.();
          showToast(t("shop.ballUnlockedToast", { name: design.name }));
          refreshTopbar();
          renderBalls();
          renderPurchaseHistory();
        } else {
          window.FlowSound?.playClick?.();
          showToast(t("shop.notEnoughCreditsToast", { have: profile.credits, cost: design.price }));
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Modul 6 — Ergebnis-Animationen (kosmetisch)
     --------------------------------------------------------------------- */
  function renderAnimations() {
    if (!els.animationCatalog) return;
    els.animationCatalog.innerHTML = RESULT_ANIMATIONS.map((raw) => {
      const anim = findAnimation(raw.id);
      const unlocked = FlowProfile.isAnimationUnlocked(profile, anim);
      const equipped = profile.activeAnimationId === anim.id;
      let actionHtml;
      if (equipped) {
        actionHtml = `<span class="badge">${t("shop.equippedBadge")}</span>`;
      } else if (unlocked) {
        actionHtml = `<button class="btn btn-glass btn-sm" type="button" data-equip-anim="${anim.id}">${t("shop.selectBtn")}</button>`;
      } else if (anim.premiumOnly) {
        actionHtml = `<span class="badge" style="opacity:0.7;">${t("shop.premiumOnlyBadge")}</span>`;
      } else {
        actionHtml = `<button class="btn btn-glass btn-sm" type="button" data-unlock-anim="${anim.id}">${t("shop.unlockCostBtn", { cost: anim.price })}</button>`;
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
        const anim = findAnimation(btn.dataset.equipAnim);
        FlowProfile.setActiveAnimation(profile, anim);
        window.FlowSound?.playSelect?.();
        showToast(t("shop.animEquippedToast", { name: anim.name }));
        renderAnimations();
      });
    });
    els.animationCatalog.querySelectorAll("[data-unlock-anim]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const anim = findAnimation(btn.dataset.unlockAnim);
        if (FlowProfile.unlockAnimation(profile, anim)) {
          FlowPurchases?.addPurchase({ icon: "✨", label: t("shop.animUnlockedPurchaseLabel", { name: anim.name }), priceLabel: `${anim.price} 💎`, method: t("common.credits") });
          window.FlowSound?.playConfirm?.();
          showToast(t("shop.animUnlockedToast", { name: anim.name }));
          refreshTopbar();
          renderAnimations();
          renderPurchaseHistory();
        } else {
          window.FlowSound?.playClick?.();
          showToast(t("shop.notEnoughCreditsToast", { have: profile.credits, cost: anim.price }));
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Modul 6 — Profil-Designs (kosmetisch)
     --------------------------------------------------------------------- */
  function renderThemes() {
    if (!els.themeCatalog) return;
    els.themeCatalog.innerHTML = PROFILE_THEMES.map((raw) => {
      const theme = findTheme(raw.id);
      const unlocked = FlowProfile.isThemeUnlocked(profile, theme);
      const equipped = profile.activeThemeId === theme.id;
      let actionHtml;
      if (equipped) {
        actionHtml = `<span class="badge">${t("shop.equippedBadge")}</span>`;
      } else if (unlocked) {
        actionHtml = `<button class="btn btn-glass btn-sm" type="button" data-equip-theme="${theme.id}">${t("shop.selectBtn")}</button>`;
      } else if (theme.premiumOnly) {
        actionHtml = `<span class="badge" style="opacity:0.7;">${t("shop.premiumOnlyBadge")}</span>`;
      } else {
        actionHtml = `<button class="btn btn-glass btn-sm" type="button" data-unlock-theme="${theme.id}">${t("shop.unlockCostBtn", { cost: theme.price })}</button>`;
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
        const theme = findTheme(btn.dataset.equipTheme);
        FlowProfile.setActiveTheme(profile, theme);
        window.FlowSound?.playSelect?.();
        showToast(t("shop.themeEquippedToast", { name: theme.name }));
        renderThemes();
      });
    });
    els.themeCatalog.querySelectorAll("[data-unlock-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const theme = findTheme(btn.dataset.unlockTheme);
        if (FlowProfile.unlockTheme(profile, theme)) {
          FlowPurchases?.addPurchase({ icon: "🎨", label: t("shop.themeUnlockedPurchaseLabel", { name: theme.name }), priceLabel: `${theme.price} 💎`, method: t("common.credits") });
          window.FlowSound?.playConfirm?.();
          showToast(t("shop.themeUnlockedToast", { name: theme.name }));
          refreshTopbar();
          renderThemes();
          renderPurchaseHistory();
        } else {
          window.FlowSound?.playClick?.();
          showToast(t("shop.notEnoughCreditsToast", { have: profile.credits, cost: theme.price }));
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Premium-Challenges
     --------------------------------------------------------------------- */
  function renderPremiumChallenges() {
    els.premiumChallengeCatalog.innerHTML = PREMIUM_CHALLENGES.map((raw) => {
      const pc = findPremiumChallenge(raw.id);
      const beat = BEATS.find((b) => b.id === pc.beatId);
      const verseWord = tPlural("challenge.verse", pc.verses);
      return `
        <div class="shop-card">
          <div class="shop-card__head">
            <span class="shop-card__name">${escapeHtml(pc.name)}</span>
            <span class="shop-card__meta">${t(`common.difficulty.${pc.difficulty}`)}</span>
          </div>
          <span class="shop-card__meta">${escapeHtml(pc.desc)}</span>
          <span class="shop-card__meta">${beat?.name || pc.beatId} · ${findTopicLabel(pc.topic)} · ${pc.verses} ${verseWord}</span>
          <div class="shop-card__action">
            ${profile.premium
              ? `<button class="btn btn-primary btn-sm" type="button" data-play-challenge="${pc.id}">${t("shop.playChallengeBtn")}</button>`
              : `<span class="badge" style="opacity:0.7;">${t("shop.premiumOnlyBadge")}</span>`}
          </div>
        </div>
      `;
    }).join("");

    els.premiumChallengeCatalog.querySelectorAll("[data-play-challenge]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pc = findPremiumChallenge(btn.dataset.playChallenge);
        const settings = window.FlowData.loadSettings();
        window.FlowData.saveSettings({ ...settings, difficulty: pc.difficulty, beatId: pc.beatId, topic: pc.topic, verses: pc.verses });
        window.FlowSound?.playConfirm?.();
        showToast(t("shop.challengePreparingToast", { name: pc.name }));
        setTimeout(() => { window.location.href = "challenge.html"; }, 350);
      });
    });
  }

  /* ---------------------------------------------------------------------
     Modul 6 — Early Access (Premium-exklusive Vorschau, reine Demo)
     --------------------------------------------------------------------- */
  function renderEarlyAccess() {
    if (!els.earlyAccessBlock) return;
    const p = getEarlyAccessPreview();
    els.earlyAccessBlock.innerHTML = `
      <div class="shop-card early-access-card">
        <div class="shop-card__head">
          <span class="shop-card__name">${p.icon} ${escapeHtml(p.name)}</span>
        </div>
        <span class="shop-card__meta">${escapeHtml(p.desc)}</span>
        <div class="shop-card__action">
          ${profile.premium
            ? `<span class="badge">${t("shop.earlyAccessUnlockedBadge")}</span>`
            : `<span class="badge" style="opacity:0.7;">${t("shop.premiumOnlyBadge")}</span>`}
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
      <div class="event-banner">${t("shop.weekendBonusBanner")}</div>
    `;
  }

  function renderDailyLimitStatus() {
    if (!els.dailyLimitStatus) return;
    if (profile.premium) {
      els.dailyLimitStatus.innerHTML = `<p class="shop-section__hint" style="margin-bottom:var(--sp-5);">${t("shop.unlimitedChallengesNote")}</p>`;
      return;
    }
    const check = FlowProfile.canStartChallenge(profile);
    els.dailyLimitStatus.innerHTML = `<p class="shop-section__hint" style="margin-bottom:var(--sp-5);">${t("shop.remainingChallengesNote", { remaining: check.remaining, limit: check.limit })}</p>`;
  }

  function renderLoginStreak() {
    const streak = profile.login.streak || 0;
    // Position im 7-Tage-Zyklus, an der die letzte Belohnung vergeben wurde
    // (1..7); 0 = noch nie eingeloggt/belohnt.
    const cycleDay = streak > 0 ? ((streak - 1) % DAILY_LOGIN_REWARDS.length) + 1 : 0;
    const days = DAILY_LOGIN_REWARDS.map((r) => `
      <div class="login-day ${r.day === cycleDay ? "is-current" : ""} ${r.day < cycleDay ? "is-reached" : ""}">
        <div class="login-day__num">${t("shop.dayLabel", { n: r.day })}</div>
        <div class="login-day__reward">${r.ballDesignChance ? "🎨" : "💎"} ${r.credits}</div>
      </div>
    `).join("");
    els.loginStreak.innerHTML = `
      <div class="login-streak__days">${days}</div>
      <p class="login-streak__caption">${tPlural("shop.streakCaption", streak, { n: streak })}</p>
    `;
  }

  function renderWeeklyChallenge() {
    const wc = profile.weeklyChallenge;
    const progress = Math.min(wc.progress || 0, WEEKLY_CHALLENGE.target);
    const pct = Math.round((progress / WEEKLY_CHALLENGE.target) * 100);
    els.weeklyChallengeBlock.innerHTML = `
      <p style="font-size:var(--fs-sm); color:var(--text-muted); margin-bottom:var(--sp-2);">${getWeeklyChallengeLabel()}</p>
      <div class="weekly-progress"><div class="weekly-progress__fill" style="width:${pct}%;"></div></div>
      <p style="font-size:var(--fs-xs); color:var(--text-dim); margin-top:var(--sp-2);">
        ${wc.completed ? t("shop.weeklyRewardCollected", { n: WEEKLY_CHALLENGE.creditsReward }) : t("shop.weeklyRewardProgress", { progress, target: WEEKLY_CHALLENGE.target, n: WEEKLY_CHALLENGE.creditsReward })}
      </p>
    `;
  }

  /* ---------------------------------------------------------------------
     Modul 6 — Kaufhistorie
     --------------------------------------------------------------------- */
  function timeAgo(ts) {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return t("common.justNow");
    if (mins < 60) return t("common.timeAgoMin", { n: mins });
    const hours = Math.round(mins / 60);
    if (hours < 24) return t("common.timeAgoHours", { n: hours });
    return t("common.timeAgoDays", { n: Math.round(hours / 24) });
  }

  function renderPurchaseHistory() {
    if (!els.purchaseHistory) return;
    const list = FlowPurchases?.loadPurchases() || [];
    if (list.length === 0) {
      els.purchaseHistory.innerHTML = `<p class="empty-hint">${t("shop.noPurchasesYet")}</p>`;
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
  window.FlowI18n.onLocaleChange(renderAll);

  // Ankerlinks aus der Werbung (#premium, #balls, …) sanft anspringen.
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
})();
