/* =========================================================================
   FlowArena — Benachrichtigungs-Glocke (geteilt über mehrere Seiten)
   -------------------------------------------------------------------------
   Erwartet folgendes Markup irgendwo auf der Seite (siehe index.html /
   community.html / profile.html / tournament.html):
   <div class="notif-wrap">
     <button id="notifBellBtn">🔔<span id="notifBadge" hidden></span></button>
     <div id="notifDropdown" hidden>
       <div class="notif-dropdown__head">…<button id="notifMarkReadBtn">…</button></div>
       <div id="notifList"></div>
     </div>
   </div>
   No-op, falls dieses Markup auf einer Seite fehlt.
   ========================================================================= */

(function (window) {
  "use strict";

  const FlowSocial = window.FlowSocial;
  if (!FlowSocial) return;
  const t = window.FlowI18n.t;

  const bellBtn = document.getElementById("notifBellBtn");
  const badge = document.getElementById("notifBadge");
  const dropdown = document.getElementById("notifDropdown");
  const list = document.getElementById("notifList");
  const markReadBtn = document.getElementById("notifMarkReadBtn");
  if (!bellBtn || !dropdown || !list) return;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function timeAgo(ts) {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return t("common.justNow");
    if (mins < 60) return t("common.timeAgoMin", { n: mins });
    const hours = Math.round(mins / 60);
    if (hours < 24) return t("common.timeAgoHours", { n: hours });
    return t("common.timeAgoDays", { n: Math.round(hours / 24) });
  }

  function renderBadge() {
    const count = FlowSocial.unreadCount();
    if (count > 0) {
      badge.hidden = false;
      badge.textContent = String(count > 9 ? "9+" : count);
    } else {
      badge.hidden = true;
    }
  }

  function renderList() {
    const items = FlowSocial.loadNotifications();
    if (items.length === 0) {
      list.innerHTML = `<p class="empty-hint" style="padding:var(--sp-4);">${t("common.noNotifications")}</p>`;
      return;
    }
    list.innerHTML = items.map((n) => `
      <div class="notif-item ${n.read ? "" : "is-unread"}">
        <span class="notif-item__icon">${n.icon}</span>
        <span class="notif-item__body">
          <span class="notif-item__text">${escapeHtml(n.text)}</span>
          <span class="notif-item__time">${timeAgo(n.createdAt)}</span>
        </span>
      </div>
    `).join("");
  }

  function toggleDropdown(open) {
    const willOpen = open != null ? open : dropdown.hidden;
    dropdown.hidden = !willOpen;
    if (willOpen) {
      renderList();
      window.FlowSound?.playClick?.();
    }
  }

  bellBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  markReadBtn?.addEventListener("click", () => {
    FlowSocial.markAllRead();
    renderBadge();
    renderList();
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.hidden && !e.target.closest(".notif-wrap")) {
      toggleDropdown(false);
    }
  });

  renderBadge();
  // Badge-Zähler live halten, falls sich in einem anderen Tab desselben
  // Browsers etwas ändert (localStorage-"storage"-Event).
  window.addEventListener("storage", () => renderBadge());
  window.FlowI18n.onLocaleChange(() => { if (!dropdown.hidden) renderList(); });
})(window);
