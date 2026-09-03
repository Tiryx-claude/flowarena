/* =========================================================================
   FlowArena — Community Page Logic (Modul 4)
   ========================================================================= */

(function () {
  "use strict";

  const FlowProfile = window.FlowProfile;
  const FlowCommunity = window.FlowCommunity;
  const { findTopicLabel } = window.FlowData;
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
    feedView: $("#feedView"),
    leaderboardView: $("#leaderboardView"),
    feedList: $("#feedList"),
    leaderboardList: $("#leaderboardList"),
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
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    return `vor ${Math.round(hours / 24)} Tag(en)`;
  }

  /* ---------------------------------------------------------------------
     Feed
     --------------------------------------------------------------------- */
  function renderFeed() {
    const posts = FlowCommunity.loadPosts();
    if (posts.length === 0) {
      els.feedList.innerHTML = `<p class="empty-hint">Noch keine Posts — sei der/die Erste!</p>`;
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
            <span class="post-card__score">${p.overall} Pkt.</span>
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
     Leaderboard — Seed-Autoren (aus ihren Beispiel-Posts) + du selbst
     --------------------------------------------------------------------- */
  function renderLeaderboard() {
    const posts = FlowCommunity.loadPosts().filter((p) => p.isSeed);
    const rows = posts.map((p) => ({ name: p.authorName, avatar: p.authorAvatar, score: p.overall, isYou: false }));
    rows.push({ name: profile.displayName, avatar: profile.avatar, score: profile.stats.bestScore, isYou: true });
    rows.sort((a, b) => b.score - a.score);

    els.leaderboardList.innerHTML = rows.map((r, i) => `
      <div class="leaderboard-row ${r.isYou ? "is-you" : ""}">
        <span class="leaderboard-row__rank">#${i + 1}</span>
        <span class="leaderboard-row__avatar">${r.avatar}</span>
        <span class="leaderboard-row__name">${escapeHtml(r.name)}${r.isYou ? " (Du)" : ""}</span>
        <span class="leaderboard-row__score">${r.score} Pkt.</span>
      </div>
    `).join("");

    if (profile.stats.challengesCompleted === 0) {
      els.leaderboardList.insertAdjacentHTML("beforeend", `<p class="empty-hint" style="margin-top:var(--sp-3);">Du hast noch keine Challenge abgeschlossen — dein Bestwert steht noch bei 0.</p>`);
    }
  }

  /* ---------------------------------------------------------------------
     Tabs
     --------------------------------------------------------------------- */
  els.tabFeed.addEventListener("click", () => {
    els.tabFeed.classList.add("is-active");
    els.tabLeaderboard.classList.remove("is-active");
    els.feedView.hidden = false;
    els.leaderboardView.hidden = true;
    window.FlowSound?.playClick?.();
  });

  els.tabLeaderboard.addEventListener("click", () => {
    els.tabLeaderboard.classList.add("is-active");
    els.tabFeed.classList.remove("is-active");
    els.leaderboardView.hidden = false;
    els.feedView.hidden = true;
    window.FlowSound?.playClick?.();
  });

  renderFeed();
  renderLeaderboard();

  // Direktlink von der Startseite (Rangliste-Panel → community.html#leaderboard)
  if (window.location.hash === "#leaderboard") {
    els.tabLeaderboard.click();
  }
})();
