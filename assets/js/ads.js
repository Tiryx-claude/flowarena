/* =========================================================================
   FlowArena — Werbung (Modul 5: Shop, Premium, Credits & Werbung)
   -------------------------------------------------------------------------
   WICHTIG — Ehrlichkeit: das hier ist KEIN echtes Werbenetzwerk. Es gibt
   keine echte Ad-SDK-Integration, kein Tracking, keine externen Anzeigen —
   nur ein paar hauseigene, klar als "Werbung (Demo)" gekennzeichnete Promo-
   Karten für FlowArenas eigene Features (Premium/Shop/Turniere). Eine echte
   Drittanbieter-Integration würde echtes Consent-Management brauchen, das
   in einem Client-only-Prototyp nicht seriös nachgebaut werden kann/soll —
   siehe docs/SHOP.md.

   Regeln (siehe Modul-5-Anforderung):
   - NUR für Free-Accounts (profile.premium === true → sofort kein Werbung).
   - NIE während einer Rap-Runde oder eines Turniers — dieses Skript wird
     deshalb bewusst NICHT in challenge.html/tournament.html eingebunden,
     nur auf "Zwischen-Menüs"-Seiten (index/community/profile/shop.html).
   - Ratenbegrenzt (COOLDOWN_MS), damit es beim schnellen Durchklicken
     mehrerer Menüseiten nicht bei jeder einzelnen erneut aufploppt.
   ========================================================================= */

(function () {
  "use strict";

  const FlowProfile = window.FlowProfile;
  if (!FlowProfile) return;

  // Demo-Taktung, damit sich das Verhalten beim Testen zeigt — ein echtes
  // Produkt würde hier eher an Sitzungen/Minuten im zweistelligen Bereich denken.
  const COOLDOWN_MS = 90 * 1000;
  const STORAGE_KEY = "flowarena.ads.lastShown.v1";

  const AD_SLOTS = [
    { icon: "👑", title: "FlowArena Premium", text: "Keine Werbung mehr, exklusive Beats, Ball-Designs & Challenges.", cta: "Zu Premium →", href: "shop.html#premium" },
    { icon: "🎨", title: "Neu im Shop", text: "Frische Ball-Designs sind da — hol dir deinen Look für die Bühne.", cta: "Shop öffnen →", href: "shop.html#balls" },
    { icon: "🏆", title: "Turnier-Saison", text: "Turniere spielen, Community-Ruhm sichern — jetzt mitmachen.", cta: "Turnier erstellen →", href: "index.html" },
  ];

  function lastShown() {
    try { return Number(localStorage.getItem(STORAGE_KEY) || 0); } catch (e) { return 0; }
  }
  function markShown() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) { /* ignore */ }
  }

  function showAd() {
    const slot = AD_SLOTS[Math.floor(Math.random() * AD_SLOTS.length)];
    const overlay = document.createElement("div");
    overlay.className = "ad-overlay";
    overlay.innerHTML = `
      <div class="ad-card">
        <div class="ad-card__label">📢 Werbung (Demo) · nur für Free-Accounts</div>
        <div class="ad-card__icon">${slot.icon}</div>
        <div class="ad-card__title">${slot.title}</div>
        <p class="ad-card__text">${slot.text}</p>
        <div class="ad-card__actions">
          <a class="btn btn-primary btn-sm" href="${slot.href}">${slot.cta}</a>
          <button class="btn btn-glass btn-sm" type="button" id="adSkipBtn" disabled>Überspringen (<span id="adSkipCount">3</span>)</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-visible"));

    let count = 3;
    const skipBtn = overlay.querySelector("#adSkipBtn");
    const countEl = overlay.querySelector("#adSkipCount");
    const timer = setInterval(() => {
      count--;
      if (countEl) countEl.textContent = String(count);
      if (count <= 0) {
        clearInterval(timer);
        if (skipBtn) {
          skipBtn.disabled = false;
          skipBtn.textContent = "Überspringen ✕";
        }
      }
    }, 1000);

    function close() {
      clearInterval(timer);
      overlay.classList.remove("is-visible");
      setTimeout(() => overlay.remove(), 250);
    }
    skipBtn?.addEventListener("click", () => { if (!skipBtn.disabled) close(); });
    overlay.addEventListener("click", (e) => { if (e.target === overlay && skipBtn && !skipBtn.disabled) close(); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const profile = FlowProfile.load();
    if (profile.premium) return; // Premium = werbefrei, siehe docs/SHOP.md
    if (Date.now() - lastShown() < COOLDOWN_MS) return;
    markShown();
    setTimeout(showAd, 900); // kurzer Versatz, damit die Seite zuerst sichtbar/nutzbar ist
  });
})();
