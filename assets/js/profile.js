/* =========================================================================
   FlowArena — Profile Page Logic (Modul 4)
   ========================================================================= */

(function () {
  "use strict";

  const FlowProfile = window.FlowProfile;
  const FlowCommunity = window.FlowCommunity;
  const FlowSocial = window.FlowSocial;
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
    equippedBall: $("#equippedBall"),
    ownPosts: $("#ownPosts"),
    friendSearchInput: $("#friendSearchInput"),
    friendSearchResults: $("#friendSearchResults"),
    friendsList: $("#friendsList"),
    privacyLeaderboardToggle: $("#privacyLeaderboardToggle"),
    privacyActivityToggle: $("#privacyActivityToggle"),
    resetDataBtn: $("#resetDataBtn"),
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
      FlowSocial?.addNotification({ icon: "👑", text: "Premium aktiviert (Demo) — alle Beats & 10 Strophen freigeschaltet." });
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

  function renderEquippedBall() {
    if (!els.equippedBall) return;
    const design = window.FlowData.findBallDesign(profile.activeBallDesignId);
    els.equippedBall.innerHTML = `
      <span class="ball-swatch" style="--ball-gradient:${design.gradient}; --ball-glow:${design.glow};"></span>
      <div>
        <div class="equipped-ball__name">${escapeHtml(design.name)}</div>
        <div class="equipped-ball__desc">${escapeHtml(design.desc)}</div>
      </div>
    `;
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

  /* ---------------------------------------------------------------------
     Freunde
     --------------------------------------------------------------------- */
  function renderFriends() {
    if (!els.friendsList) return;
    const friends = FlowSocial?.loadFriends() || [];
    if (friends.length === 0) {
      els.friendsList.innerHTML = `<p class="empty-hint">Noch keine Freunde — such oben nach einem Namen.</p>`;
      return;
    }
    els.friendsList.innerHTML = `<div class="person-list">${friends.map((f) => `
      <div class="card-glass person-card">
        <div class="person-card__avatar">${f.avatar}</div>
        <div class="person-card__body">
          <div class="person-card__name">${escapeHtml(f.name)}</div>
          <div class="person-card__meta">Freund:in seit ${timeAgo(f.addedAt)}</div>
        </div>
        <button class="btn btn-glass btn-sm" type="button" data-remove-friend="${f.id}">Entfernen</button>
      </div>
    `).join("")}</div>`;
  }

  function renderFriendSearch(query) {
    if (!els.friendSearchResults) return;
    if (!query) {
      els.friendSearchResults.hidden = true;
      els.friendSearchResults.innerHTML = "";
      return;
    }
    els.friendSearchResults.hidden = false;
    const results = FlowSocial?.searchPeople(query) || [];
    if (results.length === 0) {
      els.friendSearchResults.innerHTML = `<p class="empty-hint">Niemand gefunden.</p>`;
      return;
    }
    els.friendSearchResults.innerHTML = results.slice(0, 6).map((p) => {
      const friend = FlowSocial.isFriend(p.id);
      return `
        <div class="card-glass person-card">
          <div class="person-card__avatar">${p.avatar}</div>
          <div class="person-card__body">
            <div class="person-card__name">${escapeHtml(p.name)}</div>
            <div class="person-card__meta">Bestwert ${p.bestScore} Pkt.</div>
          </div>
          <button class="btn ${friend ? "btn-glass" : "btn-primary"} btn-sm" type="button" data-add-friend="${p.id}" ${friend ? "disabled" : ""}>${friend ? "✓ Freund" : "+ Freund"}</button>
        </div>
      `;
    }).join("");
  }

  els.friendSearchInput?.addEventListener("input", () => renderFriendSearch(els.friendSearchInput.value.trim()));

  els.friendSearchResults?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-friend]");
    if (!btn || btn.disabled) return;
    const person = FlowSocial.getPerson(btn.dataset.addFriend);
    if (!person) return;
    FlowSocial.addFriend(person);
    window.FlowSound?.playConfirm?.();
    showToast(`👥 ${person.name} zu deinen Freunden hinzugefügt.`);
    renderFriendSearch(els.friendSearchInput.value.trim());
    renderFriends();
  });

  els.friendsList?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-friend]");
    if (!btn) return;
    FlowSocial.removeFriend(btn.dataset.removeFriend);
    window.FlowSound?.playClick?.();
    renderFriends();
  });

  /* ---------------------------------------------------------------------
     Datenschutz
     --------------------------------------------------------------------- */
  function renderPrivacy() {
    const setToggle = (el, isOn) => {
      if (!el) return;
      el.classList.toggle("is-on", isOn);
      el.setAttribute("aria-checked", String(isOn));
    };
    setToggle(els.privacyLeaderboardToggle, profile.privacy.showOnLeaderboard);
    setToggle(els.privacyActivityToggle, profile.privacy.showActivityToFriends);
  }

  els.privacyLeaderboardToggle?.addEventListener("click", () => {
    FlowProfile.setPrivacy(profile, "showOnLeaderboard", !profile.privacy.showOnLeaderboard);
    window.FlowSound?.playToggle?.(profile.privacy.showOnLeaderboard);
    renderPrivacy();
  });
  els.privacyActivityToggle?.addEventListener("click", () => {
    FlowProfile.setPrivacy(profile, "showActivityToFriends", !profile.privacy.showActivityToFriends);
    window.FlowSound?.playToggle?.(profile.privacy.showActivityToFriends);
    renderPrivacy();
  });

  els.resetDataBtn?.addEventListener("click", () => {
    if (els.resetDataBtn.dataset.confirming !== "true") {
      els.resetDataBtn.dataset.confirming = "true";
      els.resetDataBtn.textContent = "Wirklich ALLES löschen? Nochmal klicken zum Bestätigen";
      setTimeout(() => {
        if (els.resetDataBtn.dataset.confirming === "true") {
          els.resetDataBtn.dataset.confirming = "false";
          els.resetDataBtn.textContent = "Alle Daten löschen";
        }
      }, 4000);
      return;
    }
    FlowProfile.resetAllLocalData();
    window.location.href = "index.html";
  });

  function renderAll() {
    renderHeader();
    renderStats();
    renderPremiumCard();
    renderBadges();
    renderEquippedBall();
    renderOwnPosts();
    renderFriends();
    renderPrivacy();
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
