/* =========================================================================
   FlowArena — Profile Page Logic (Modul 4)
   ========================================================================= */

(function () {
  "use strict";

  const FlowProfile = window.FlowProfile;
  const FlowCommunity = window.FlowCommunity;
  let profile = FlowProfile.load();

  const $ = (sel) => document.querySelector(sel);

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const els = {
    creditsValue: $("#creditsValue"),
    avatarBtn: $("#avatarBtn"),
    avatarPicker: $("#avatarPicker"),
    displayNameInput: $("#displayNameInput"),
    profileStatusBadges: $("#profileStatusBadges"),
    statGrid: $("#statGrid"),
    premiumCard: $("#premiumCard"),
    badgeGrid: $("#badgeGrid"),
    ownPosts: $("#ownPosts"),
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

  function timeAgo(ts) {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    return `vor ${Math.round(hours / 24)} Tag(en)`;
  }

  /* ---------------------------------------------------------------------
     Rendering
     --------------------------------------------------------------------- */
  function renderHeader() {
    els.creditsValue.textContent = String(profile.credits);
    els.avatarBtn.textContent = profile.avatar;
    els.displayNameInput.value = profile.displayName;

    els.profileStatusBadges.innerHTML = profile.premium
      ? `<span class="badge">👑 Premium</span>`
      : `<span class="chip" style="cursor:default;"><span class="chip__dot"></span><span class="chip__label">Status</span><span class="chip__value">Free</span></span>`;
  }

  function renderStats() {
    const s = profile.stats;
    const avg = s.challengesCompleted > 0 ? Math.round(s.totalScore / s.challengesCompleted) : 0;
    const stats = [
      { value: s.challengesCompleted, label: "Challenges" },
      { value: avg, label: "Ø Score" },
      { value: s.bestScore, label: "Bestwert" },
      { value: `${profile.earnedBadgeIds.length}/${FlowProfile.BADGES.length}`, label: "Abzeichen" },
    ];
    els.statGrid.innerHTML = stats.map((s) => `
      <div class="card-glass stat-card">
        <div class="stat-card__value">${s.value}</div>
        <div class="stat-card__label">${s.label}</div>
      </div>
    `).join("");
  }

  function renderPremiumCard() {
    if (profile.premium) {
      els.premiumCard.innerHTML = `
        <h2 class="section-title">👑 Premium aktiv</h2>
        <p style="color:var(--text-muted); font-size:var(--fs-sm);">
          Du hast Zugriff auf alle Beats und bis zu 10 Strophen pro Challenge.
        </p>
        <p class="premium-card__note">Demo-Status, lokal in diesem Browser gespeichert — keine echte Zahlung, kein echtes Abo.</p>
      `;
      return;
    }
    els.premiumCard.innerHTML = `
      <h2 class="section-title">👑 FlowArena Premium</h2>
      <ul class="premium-card__perks">
        <li>Alle Premium-Beats sofort freigeschaltet (sonst per Credits)</li>
        <li>Bis zu 10 statt 5 Strophen pro Challenge</li>
        <li>Premium-Badge auf deinem Profil</li>
      </ul>
      <button class="btn btn-primary" id="premiumBtn" type="button">Premium aktivieren (Demo)</button>
      <p class="premium-card__note">Reiner Demo-Schalter für diesen Prototyp — es wird keine Zahlung verarbeitet und nichts abgebucht.</p>
    `;
    $("#premiumBtn")?.addEventListener("click", () => {
      FlowProfile.unlockPremiumDemo(profile);
      window.FlowSound?.playConfirm?.();
      showToast("👑 Premium aktiviert (Demo)!");
      renderHeader();
      renderPremiumCard();
    });
  }

  function renderBadges() {
    els.badgeGrid.innerHTML = FlowProfile.BADGES.map((b) => {
      const earned = profile.earnedBadgeIds.includes(b.id);
      return `
        <div class="badge-item ${earned ? "is-earned" : "is-locked"}" title="${b.desc}">
          <div class="badge-item__icon">${earned ? b.icon : "🔒"}</div>
          <div class="badge-item__name">${b.name}</div>
          <div class="badge-item__desc">${b.desc}</div>
        </div>
      `;
    }).join("");
  }

  function renderOwnPosts() {
    const posts = FlowCommunity.loadOwnPosts();
    if (posts.length === 0) {
      els.ownPosts.innerHTML = `<p class="empty-hint">Noch nichts veröffentlicht — nach einer Challenge kannst du deinen Take mit „Veröffentlichen" in die Community stellen.</p>`;
      return;
    }
    els.ownPosts.innerHTML = `<div class="own-posts-list">${posts.map((p) => `
      <div class="post-card glass">
        <div class="post-card__avatar">${p.authorAvatar}</div>
        <div class="post-card__body">
          <div class="post-card__head">
            <span class="post-card__author">${escapeHtml(p.authorName)}</span>
            <span class="post-card__meta">· ${escapeHtml(p.beatName)} · ${timeAgo(p.createdAt)}</span>
          </div>
          <p class="post-card__excerpt">${escapeHtml(p.excerpt)}</p>
          <div class="post-card__footer">
            <span class="post-card__score">${p.overall} Pkt.</span>
            <span class="like-btn" style="cursor:default;">❤️ ${p.likes}</span>
          </div>
        </div>
      </div>
    `).join("")}</div>`;
  }

  function renderAll() {
    renderHeader();
    renderStats();
    renderPremiumCard();
    renderBadges();
    renderOwnPosts();
  }

  /* ---------------------------------------------------------------------
     Events
     --------------------------------------------------------------------- */
  els.avatarBtn.addEventListener("click", () => {
    if (els.avatarPicker.hidden) {
      els.avatarPicker.innerHTML = FlowProfile.AVATAR_OPTIONS.map((a) =>
        `<button class="avatar-picker__opt" type="button" data-avatar="${a}">${a}</button>`
      ).join("");
      els.avatarPicker.hidden = false;
    } else {
      els.avatarPicker.hidden = true;
    }
  });

  els.avatarPicker.addEventListener("click", (e) => {
    const btn = e.target.closest(".avatar-picker__opt");
    if (!btn) return;
    profile.avatar = btn.dataset.avatar;
    FlowProfile.save(profile);
    els.avatarPicker.hidden = true;
    window.FlowSound?.playSelect?.();
    renderHeader();
  });

  document.addEventListener("click", (e) => {
    if (!els.avatarPicker.hidden && !e.target.closest(".profile-avatar-wrap")) {
      els.avatarPicker.hidden = true;
    }
  });

  els.displayNameInput.addEventListener("change", () => {
    const value = els.displayNameInput.value.trim();
    profile.displayName = value || "Anonymer MC";
    els.displayNameInput.value = profile.displayName;
    FlowProfile.save(profile);
    showToast("✓ Name gespeichert");
  });

  renderAll();
})();
