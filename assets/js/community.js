/* =========================================================================
   FlowArena — Community Page Logic (Modul 4)
   ========================================================================= */

(function () {
  "use strict";

  const FlowProfile = window.FlowProfile;
  const FlowCommunity = window.FlowCommunity;
  const FlowSocial = window.FlowSocial;
  const { findTopicLabel } = window.FlowData;
  const t = window.FlowI18n.t;
  const profile = FlowProfile.load();

  const $ = (sel) => document.querySelector(sel);

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const els = {
    creditsValue: $("#creditsValue"),
    profileAvatarLink: $("#profileAvatarLink"),
    tabFeed: $("#tabFeed"),
    tabLeaderboard: $("#tabLeaderboard"),
    tabSearch: $("#tabSearch"),
    feedView: $("#feedView"),
    leaderboardView: $("#leaderboardView"),
    searchView: $("#searchView"),
    feedList: $("#feedList"),
    leaderboardList: $("#leaderboardList"),
    lbScopeAll: $("#lbScopeAll"),
    lbScopeFriends: $("#lbScopeFriends"),
    peopleSearchInput: $("#peopleSearchInput"),
    searchResults: $("#searchResults"),
    toast: $("#toast"),
  };

  els.creditsValue.textContent = String(profile.credits);
  els.profileAvatarLink.textContent = profile.avatar;

  let toastTimer = null;
  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
  }

  function timeAgo(ts) {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 60) return t("common.timeAgoMin", { n: mins });
    const hours = Math.round(mins / 60);
    if (hours < 24) return t("common.timeAgoHours", { n: hours });
    return t("common.timeAgoDays", { n: Math.round(hours / 24) });
  }

  /* ---------------------------------------------------------------------
     Feed
     --------------------------------------------------------------------- */
  function renderFeed() {
    const posts = FlowCommunity.loadPosts();
    if (posts.length === 0) {
      els.feedList.innerHTML = `<p class="empty-hint">${t("community.noPostsYet")}</p>`;
      return;
    }
    els.feedList.innerHTML = posts.map((p) => {
      const liked = FlowCommunity.isLiked(p.id);
      return `
      <div class="post-card glass">
        <div class="post-card__avatar">${p.authorAvatar}</div>
        <div class="post-card__body">
          <div class="post-card__head">
            <span class="post-card__author">${escapeHtml(p.authorName)}</span>
            <span class="post-card__meta">· ${findTopicLabel(p.topic)} · ${escapeHtml(p.beatName)} (${p.bpm} BPM) · ${timeAgo(p.createdAt)}</span>
          </div>
          <p class="post-card__excerpt">${escapeHtml(p.excerpt)}</p>
          <div class="post-card__footer">
            <span class="post-card__score">${p.overall} ${t("common.points")}</span>
            <button class="like-btn ${liked ? "is-liked" : ""}" type="button" data-post-id="${p.id}">
              ${liked ? "❤️" : "🤍"} <span class="like-count">${p.likes}</span>
            </button>
          </div>
        </div>
      </div>
    `;
    }).join("");
  }

  els.feedList.addEventListener("click", (e) => {
    const btn = e.target.closest(".like-btn");
    if (!btn) return;
    const result = window.FlowCommunity.toggleLike(btn.dataset.postId);
    if (!result) return;
    btn.classList.toggle("is-liked", result.liked);
    btn.querySelector(".like-count").textContent = result.likes;
    btn.firstChild.textContent = result.liked ? "❤️ " : "🤍 ";
    window.FlowSound?.playToggle?.(result.liked);
  });

  /* ---------------------------------------------------------------------
     Leaderboard — "Alle" (Seed-Autoren) oder "Nur Freunde" (deine
     Freundesliste), jeweils + du selbst (außer du hast dich per
     Datenschutz-Einstellung aus der Rangliste ausgeblendet).
     --------------------------------------------------------------------- */
  let leaderboardScope = "all";

  function renderLeaderboard() {
    let rows;
    if (leaderboardScope === "friends") {
      rows = (FlowSocial?.loadFriends() || []).map((f) => {
        const person = FlowSocial.getPerson(f.id);
        return { name: f.name, avatar: f.avatar, score: person?.bestScore ?? 0, isYou: false };
      });
    } else {
      const posts = FlowCommunity.loadPosts().filter((p) => p.isSeed);
      rows = posts.map((p) => ({ name: p.authorName, avatar: p.authorAvatar, score: p.overall, isYou: false }));
    }

    if (profile.privacy.showOnLeaderboard) {
      rows.push({ name: profile.displayName, avatar: profile.avatar, score: profile.stats.bestScore, isYou: true });
    }
    rows.sort((a, b) => b.score - a.score);

    if (rows.length === 0) {
      els.leaderboardList.innerHTML = `<p class="empty-hint">${t("community.noFriendsLeaderboard")}</p>`;
      return;
    }

    els.leaderboardList.innerHTML = rows.map((r, i) => `
      <div class="leaderboard-row ${r.isYou ? "is-you" : ""}">
        <span class="leaderboard-row__rank">#${i + 1}</span>
        <span class="leaderboard-row__avatar">${r.avatar}</span>
        <span class="leaderboard-row__name">${escapeHtml(r.name)}${r.isYou ? ` (${t("common.you")})` : ""}</span>
        <span class="leaderboard-row__score">${r.score} ${t("common.points")}</span>
      </div>
    `).join("");

    if (leaderboardScope === "all" && profile.privacy.showOnLeaderboard && profile.stats.challengesCompleted === 0) {
      els.leaderboardList.insertAdjacentHTML("beforeend", `<p class="empty-hint" style="margin-top:var(--sp-3);">${t("community.noChallengesYet")}</p>`);
    }
  }

  els.lbScopeAll?.addEventListener("click", () => {
    leaderboardScope = "all";
    els.lbScopeAll.classList.add("is-active");
    els.lbScopeFriends.classList.remove("is-active");
    renderLeaderboard();
    window.FlowSound?.playClick?.();
  });
  els.lbScopeFriends?.addEventListener("click", () => {
    leaderboardScope = "friends";
    els.lbScopeFriends.classList.add("is-active");
    els.lbScopeAll.classList.remove("is-active");
    renderLeaderboard();
    window.FlowSound?.playClick?.();
  });

  /* ---------------------------------------------------------------------
     Suche — Personen-Directory (Seed-Personen + begegnete Turnier-Bots)
     --------------------------------------------------------------------- */
  function renderSearch(query) {
    if (!els.searchResults) return;
    const results = FlowSocial ? FlowSocial.searchPeople(query) : [];
    if (results.length === 0) {
      els.searchResults.innerHTML = `<p class="empty-hint">${t("community.noPersonFound")}</p>`;
      return;
    }
    els.searchResults.innerHTML = results.map((p) => {
      const friend = FlowSocial.isFriend(p.id);
      return `
        <div class="card-glass person-card">
          <div class="person-card__avatar">${p.avatar}</div>
          <div class="person-card__body">
            <div class="person-card__name">${escapeHtml(p.name)}</div>
            <div class="person-card__meta">${t("profile.personBestScore", { score: p.bestScore })}</div>
          </div>
          <button class="btn ${friend ? "btn-glass" : "btn-primary"} btn-sm" type="button" data-friend-id="${p.id}" ${friend ? "disabled" : ""}>
            ${friend ? t("profile.friendAddedBtn") : t("profile.addFriendBtn")}
          </button>
        </div>
      `;
    }).join("");
  }

  els.peopleSearchInput?.addEventListener("input", () => renderSearch(els.peopleSearchInput.value));

  els.searchResults?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-friend-id]");
    if (!btn || btn.disabled) return;
    const person = FlowSocial.getPerson(btn.dataset.friendId);
    if (!person) return;
    FlowSocial.addFriend(person);
    window.FlowSound?.playConfirm?.();
    showToast(t("profile.friendAddedToast", { name: person.name }));
    renderSearch(els.peopleSearchInput?.value || "");
  });

  /* ---------------------------------------------------------------------
     Tabs
     --------------------------------------------------------------------- */
  const tabButtons = [els.tabFeed, els.tabLeaderboard, els.tabSearch];
  const tabViews = { [els.tabFeed?.id]: els.feedView, [els.tabLeaderboard?.id]: els.leaderboardView, [els.tabSearch?.id]: els.searchView };

  function activateTab(btn) {
    tabButtons.forEach((b) => b?.classList.toggle("is-active", b === btn));
    Object.entries(tabViews).forEach(([id, view]) => { if (view) view.hidden = id !== btn.id; });
    window.FlowSound?.playClick?.();
  }

  els.tabFeed?.addEventListener("click", () => activateTab(els.tabFeed));
  els.tabLeaderboard?.addEventListener("click", () => { activateTab(els.tabLeaderboard); renderLeaderboard(); });
  els.tabSearch?.addEventListener("click", () => { activateTab(els.tabSearch); renderSearch(els.peopleSearchInput?.value || ""); });

  renderFeed();
  renderLeaderboard();
  window.FlowI18n.onLocaleChange(() => {
    renderFeed();
    renderLeaderboard();
    if (!els.searchView.hidden) renderSearch(els.peopleSearchInput?.value || "");
  });

  // Direktlink von der Startseite (Rangliste-Panel → community.html#leaderboard)
  if (window.location.hash === "#leaderboard") {
    els.tabLeaderboard.click();
  }
})();
