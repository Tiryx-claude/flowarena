/* =========================================================================
   FlowArena — App Logic (Modul 1: Design-System & UI)
   -------------------------------------------------------------------------
   Rein clientseitig, kein Backend nötig. State wird in localStorage
   gehalten, damit die Einstellungen die Seite überleben. Die Datenformen
   (Beat: {id, name, category, bpm}, Settings: {difficulty, beatId, verses,
   topic, streamerMode}) sind bewusst so gewählt, dass sie später 1:1 auf
   die Prisma-Modelle (Beat, Challenge) und die API-Endpunkte aus Modul 2+
   abbildbar sind.
   ========================================================================= */

(function () {
  "use strict";

  const { BEATS, TOPICS, GAMEPLAY_CONFIG, loadSettings, saveSettings } = window.FlowData;
  const FlowProfile = window.FlowProfile;
  const t = window.FlowI18n.t;

  let state = loadSettings();
  let profile = FlowProfile.load();

  function playIfEnabled(fn) {
    if (state.soundEnabled && typeof fn === "function") fn();
  }

  /* ---------------------------------------------------------------------
     DOM-Referenzen
     --------------------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const els = {
    difficultyOpts: $$(".js-difficulty-opt"),
    beatList: $("#beatList"),
    topicSelect: $("#topicSelect"),
    streamerToggle: $("#streamerToggle"),
    soundToggle: $("#soundToggle"),
    roastToggle: $("#roastToggle"),
    streetModeToggle: $("#streetModeToggle"),
    drawer: $("#settingsDrawer"),
    drawerOverlay: $("#drawerOverlay"),
    openSettingsBtns: $$(".js-open-settings"),
    closeSettingsBtn: $("#closeSettingsBtn"),
    saveSettingsBtn: $("#saveSettingsBtn"),
    startChallengeBtn: $("#startChallengeBtn"),
    toast: $("#toast"),
    creditsValue: $("#creditsValue"),
    profileAvatarLink: $("#profileAvatarLink"),
    languageSwitch: $("#languageSwitch"),
  };

  /* ---------------------------------------------------------------------
     Sprachumschalter (Einstellungen) — siehe assets/js/i18n.js/docs/I18N.md
     --------------------------------------------------------------------- */
  function renderLanguageSwitch() {
    if (!els.languageSwitch) return;
    const current = window.FlowI18n.getLocale();
    els.languageSwitch.innerHTML = window.FlowI18n.SUPPORTED_LOCALES.map((loc) => {
      const meta = window.FlowI18n.LOCALE_META[loc];
      return `
        <button type="button" class="lang-switch__opt ${loc === current ? "is-active" : ""}" data-locale="${loc}">
          <span class="lang-switch__flag">${meta.flag}</span>
          <span>${meta.native}</span>
        </button>
      `;
    }).join("");
  }
  els.languageSwitch?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-locale]");
    if (!btn) return;
    playIfEnabled(window.FlowSound?.playSelect);
    window.FlowI18n.setLocale(btn.dataset.locale);
  });
  // Bei jedem Sprachwechsel: Switcher-Zustand + alle JS-generierten Inhalte
  // dieser Seite neu zeichnen (data-i18n-Attribute übernimmt applyTranslations()
  // in i18n.js selbst automatisch).
  window.FlowI18n.onLocaleChange(() => {
    renderLanguageSwitch();
    renderAll();
  });

  /* ---------------------------------------------------------------------
     Rendering
     --------------------------------------------------------------------- */
  function renderDifficulty() {
    els.difficultyOpts.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.value === state.difficulty);
    });
  }

  function renderBeatList() {
    if (!els.beatList) return;
    els.beatList.innerHTML = BEATS.map((beat) => {
      const locked = !FlowProfile.isBeatUnlocked(profile, beat);
      return `
      <div class="beat-card ${beat.id === state.beatId ? "is-active" : ""} ${locked ? "is-locked" : ""}" data-beat-id="${beat.id}" role="button" tabindex="0">
        <div class="beat-card__info">
          <span class="beat-card__name">${beat.name}</span>
          <span class="beat-card__meta">${beat.category}</span>
        </div>
        ${locked
          ? `<span class="beat-card__lock">🔒 ${beat.unlockCost} 💎</span>`
          : `<span class="beat-card__bpm">${beat.bpm} BPM</span>`}
      </div>
    `;
    }).join("");
  }

  function renderProfileBits() {
    if (els.creditsValue) els.creditsValue.textContent = String(profile.credits);
    if (els.profileAvatarLink) els.profileAvatarLink.textContent = profile.avatar;
  }

  function renderTopic() {
    if (els.topicSelect) els.topicSelect.value = state.topic;
  }

  function renderToggle(el, isOn) {
    if (!el) return;
    el.classList.toggle("is-on", isOn);
    el.setAttribute("aria-checked", String(isOn));
  }

  function renderToggles() {
    renderToggle(els.streamerToggle, state.streamerMode);
    renderToggle(els.soundToggle, state.soundEnabled);
    renderToggle(els.roastToggle, state.roastMode);
    renderToggle(els.streetModeToggle, state.streetMode);
  }

  function renderAll() {
    renderDifficulty();
    renderBeatList();
    renderTopic();
    renderToggles();
    renderProfileBits();
    renderLanguageSwitch();
  }

  /* ---------------------------------------------------------------------
     Drawer
     --------------------------------------------------------------------- */
  function openDrawer() {
    // Profil frisch laden (z.B. falls im Shop-Panel gerade Credits
    // verdient wurden) — Beat-Liste/Schwierigkeit/Thema/Street-/Streamer-
    // Modus sind jetzt direkt im "Spielen"-Panel und brauchen kein Öffnen
    // der Drawer mehr, siehe dort.
    profile = FlowProfile.load();
    renderProfileBits();

    els.drawer?.classList.add("is-open");
    els.drawerOverlay?.classList.add("is-open");
    els.drawer?.setAttribute("aria-hidden", "false");
    playIfEnabled(window.FlowSound?.playClick);
  }

  function closeDrawer() {
    els.drawer?.classList.remove("is-open");
    els.drawerOverlay?.classList.remove("is-open");
    els.drawer?.setAttribute("aria-hidden", "true");
  }

  /* ---------------------------------------------------------------------
     Toast
     --------------------------------------------------------------------- */
  let toastTimer = null;
  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
  }

  /* ---------------------------------------------------------------------
     Events
     --------------------------------------------------------------------- */
  els.difficultyOpts.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.difficulty = btn.dataset.value;
      playIfEnabled(window.FlowSound?.playSelect);
      renderDifficulty();
    });
  });

  els.beatList?.addEventListener("click", (e) => {
    const card = e.target.closest(".beat-card");
    if (!card) return;
    const beat = BEATS.find((b) => b.id === card.dataset.beatId);
    if (!beat) return;

    if (!FlowProfile.isBeatUnlocked(profile, beat)) {
      const unlocked = FlowProfile.unlockBeat(profile, beat);
      if (unlocked) {
        playIfEnabled(window.FlowSound?.playConfirm);
        showToast(t("toast.beatUnlocked", { name: beat.name, cost: beat.unlockCost }));
        renderProfileBits();
      } else {
        playIfEnabled(window.FlowSound?.playClick);
        showToast(t("toast.notEnoughCredits", { have: profile.credits, cost: beat.unlockCost }));
        return; // Beat bleibt gesperrt, nicht auswählen
      }
    }

    state.beatId = beat.id;
    playIfEnabled(window.FlowSound?.playSelect);
    renderBeatList();
  });

  els.topicSelect?.addEventListener("change", (e) => {
    state.topic = e.target.value;
    playIfEnabled(window.FlowSound?.playSelect);
  });

  els.streamerToggle?.addEventListener("click", () => {
    state.streamerMode = !state.streamerMode;
    playIfEnabled(() => window.FlowSound?.playToggle(state.streamerMode));
    renderToggles();
  });

  els.roastToggle?.addEventListener("click", () => {
    state.roastMode = !state.roastMode;
    playIfEnabled(() => window.FlowSound?.playToggle(state.roastMode));
    renderToggles();
  });

  els.streetModeToggle?.addEventListener("click", () => {
    state.streetMode = !state.streetMode;
    playIfEnabled(() => window.FlowSound?.playToggle(state.streetMode));
    renderToggles();
  });

  els.soundToggle?.addEventListener("click", () => {
    // Ton für DIESES Toggle immer hörbar spielen, wenn wir gerade AN schalten,
    // damit man sofort ein Feedback hört; beim Ausschalten bleibt es still.
    const willBeOn = !state.soundEnabled;
    state.soundEnabled = willBeOn;
    if (willBeOn) window.FlowSound?.playToggle(true);
    renderToggles();
  });

  els.openSettingsBtns.forEach((btn) => btn.addEventListener("click", openDrawer));
  els.closeSettingsBtn?.addEventListener("click", () => {
    playIfEnabled(window.FlowSound?.playClick);
    closeDrawer();
  });
  els.drawerOverlay?.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  els.saveSettingsBtn?.addEventListener("click", () => {
    saveSettings(state);
    playIfEnabled(window.FlowSound?.playConfirm);
    closeDrawer();
    showToast(t("settings.savedToast"));
  });

  els.startChallengeBtn?.addEventListener("click", () => {
    // Modul 6: Free-Tageslimit vorab prüfen — vermeidet den Umweg über
    // challenge.html, das dieselbe Prüfung ohnehin autoritativ durchführt
    // (siehe challenge.js). Nur eine UX-Abkürzung, keine zweite Wahrheitsquelle.
    const limitCheck = FlowProfile.canStartChallenge(FlowProfile.load());
    if (!limitCheck.allowed) {
      showToast(t("toast.dailyLimitReached", { limit: limitCheck.limit }));
      return;
    }

    saveSettings(state);
    playIfEnabled(window.FlowSound?.playConfirm);
    // Modul 3 hängt sich hier später ein (echte KI-Reimwörter/-Bewertung).
    // Aktuell: POST /api/challenges/start { difficulty, beatId, verses, topic, streamerMode }
    console.info("[FlowArena] Challenge-Start mit Einstellungen:", state);
    showToast(t("toast.challengePreparing"));
    setTimeout(() => {
      window.location.href = "challenge.html";
    }, 350);
  });

  // Allgemeiner, dezenter Klick-Sound auf allen .btn / .chip Elementen,
  // die keinen eigenen Sound-Handler haben (progressive enhancement)
  document.addEventListener("click", (e) => {
    const target = e.target.closest(".btn-glass, .btn-icon, .nav__link");
    if (target) playIfEnabled(window.FlowSound?.playClick);
  });

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  renderAll();
})();
