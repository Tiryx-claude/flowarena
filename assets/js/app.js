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

  let state = loadSettings();
  let profile = FlowProfile.load();

  function maxStanzasAllowed() {
    return profile.premium ? GAMEPLAY_CONFIG.maxStanzas : GAMEPLAY_CONFIG.freeMaxStanzas;
  }

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
    versesValue: $("#versesValue"),
    versesMinus: $("#versesMinus"),
    versesPlus: $("#versesPlus"),
    topicSelect: $("#topicSelect"),
    streamerToggle: $("#streamerToggle"),
    soundToggle: $("#soundToggle"),
    roastToggle: $("#roastToggle"),
    drawer: $("#settingsDrawer"),
    drawerOverlay: $("#drawerOverlay"),
    openSettingsBtns: $$(".js-open-settings"),
    closeSettingsBtn: $("#closeSettingsBtn"),
    saveSettingsBtn: $("#saveSettingsBtn"),
    startChallengeBtn: $("#startChallengeBtn"),
    quickChips: $("#quickSettingsChips"),
    toast: $("#toast"),
    creditsValue: $("#creditsValue"),
    profileAvatarLink: $("#profileAvatarLink"),
  };

  /* ---------------------------------------------------------------------
     Rendering
     --------------------------------------------------------------------- */
  function currentBeat() {
    return BEATS.find((b) => b.id === state.beatId) || BEATS[0];
  }

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

  function renderVerses() {
    const max = maxStanzasAllowed();
    if (state.verses > max) state.verses = max;
    if (els.versesValue) els.versesValue.textContent = String(state.verses);
    if (els.versesMinus) els.versesMinus.disabled = state.verses <= GAMEPLAY_CONFIG.minStanzas;
    // Am absoluten Maximum (auch für Premium) wirklich deaktivieren; am
    // Free-Deckel bleibt "+" klickbar, damit der Premium-Hinweis erscheint.
    if (els.versesPlus) els.versesPlus.disabled = state.verses >= GAMEPLAY_CONFIG.maxStanzas;
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
  }

  function renderQuickChips() {
    if (!els.quickChips) return;
    const beat = currentBeat();
    const difficultyLabel = { leicht: "Leicht", mittel: "Mittel", schwer: "Schwer" }[state.difficulty];
    const topicLabel = TOPICS.find((t) => t.id === state.topic)?.label ?? state.topic;

    els.quickChips.innerHTML = `
      <button class="chip js-open-settings" type="button"><span class="chip__dot"></span><span class="chip__label">Schwierigkeit</span><span class="chip__value">${difficultyLabel}</span></button>
      <button class="chip js-open-settings" type="button"><span class="chip__dot"></span><span class="chip__label">Beat</span><span class="chip__value">${beat.name}</span></button>
      <button class="chip js-open-settings" type="button"><span class="chip__dot"></span><span class="chip__label">Strophen</span><span class="chip__value">${state.verses}</span></button>
      <button class="chip js-open-settings" type="button"><span class="chip__dot"></span><span class="chip__label">Thema</span><span class="chip__value">${topicLabel}</span></button>
      <button class="chip js-open-settings" type="button"><span class="chip__dot"></span><span class="chip__label">Streamer-Modus</span><span class="chip__value">${state.streamerMode ? "An" : "Aus"}</span></button>
    `;
    // Re-bind, da innerHTML neue Elemente erzeugt hat
    $$(".js-open-settings", els.quickChips).forEach((btn) => btn.addEventListener("click", openDrawer));
  }

  function renderAll() {
    renderDifficulty();
    renderBeatList();
    renderVerses();
    renderTopic();
    renderToggles();
    renderQuickChips();
    renderProfileBits();
  }

  /* ---------------------------------------------------------------------
     Drawer
     --------------------------------------------------------------------- */
  function openDrawer() {
    // Profil frisch laden (z.B. falls im Shop-Panel gerade ein Beat per
    // Credits freigeschaltet wurde) und Beat-Liste/Strophen-Deckel neu rendern.
    profile = FlowProfile.load();
    renderBeatList();
    renderVerses();
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
      renderQuickChips();
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
        showToast(`✓ „${beat.name}" freigeschaltet! (−${beat.unlockCost} 💎)`);
        renderProfileBits();
      } else {
        playIfEnabled(window.FlowSound?.playClick);
        showToast(`🔒 Nicht genug Credits (${profile.credits}/${beat.unlockCost} 💎) — Challenges bringen mehr, oder Premium in deinem Profil.`);
        return; // Beat bleibt gesperrt, nicht auswählen
      }
    }

    state.beatId = beat.id;
    playIfEnabled(window.FlowSound?.playSelect);
    renderBeatList();
    renderQuickChips();
  });

  els.versesMinus?.addEventListener("click", () => {
    if (state.verses <= GAMEPLAY_CONFIG.minStanzas) return;
    state.verses -= 1;
    playIfEnabled(window.FlowSound?.playClick);
    renderVerses();
    renderQuickChips();
  });

  els.versesPlus?.addEventListener("click", () => {
    const max = maxStanzasAllowed();
    if (state.verses >= max) {
      if (!profile.premium && max < GAMEPLAY_CONFIG.maxStanzas) {
        showToast(`🔒 Ab ${GAMEPLAY_CONFIG.freeMaxStanzas + 1} Strophen brauchst du Premium — siehe dein Profil.`);
      }
      return;
    }
    state.verses += 1;
    playIfEnabled(window.FlowSound?.playClick);
    renderVerses();
    renderQuickChips();
  });

  els.topicSelect?.addEventListener("change", (e) => {
    state.topic = e.target.value;
    playIfEnabled(window.FlowSound?.playSelect);
    renderQuickChips();
  });

  els.streamerToggle?.addEventListener("click", () => {
    state.streamerMode = !state.streamerMode;
    playIfEnabled(() => window.FlowSound?.playToggle(state.streamerMode));
    renderToggles();
    renderQuickChips();
  });

  els.roastToggle?.addEventListener("click", () => {
    state.roastMode = !state.roastMode;
    playIfEnabled(() => window.FlowSound?.playToggle(state.roastMode));
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
    showToast("✓ Einstellungen gespeichert");
  });

  els.startChallengeBtn?.addEventListener("click", () => {
    saveSettings(state);
    playIfEnabled(window.FlowSound?.playConfirm);
    // Modul 3 hängt sich hier später ein (echte KI-Reimwörter/-Bewertung).
    // Aktuell: POST /api/challenges/start { difficulty, beatId, verses, topic, streamerMode }
    console.info("[FlowArena] Challenge-Start mit Einstellungen:", state);
    showToast("🎤 Challenge wird vorbereitet …");
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
