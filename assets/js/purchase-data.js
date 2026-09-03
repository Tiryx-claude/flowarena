/* =========================================================================
   FlowArena — Kaufhistorie (Modul 6: Faires Monetarisierungssystem)
   -------------------------------------------------------------------------
   WICHTIG — Ehrlichkeit: das hier ist eine reine LOKALE Quittungs-Liste,
   kein echtes Zahlungsprotokoll und kein echter Beleg. Es gibt kein
   Backend, keine echte Zahlungsabwicklung, keine steuerlich relevante
   Rechnung — siehe docs/SHOP.md. Jeder Eintrag entsteht ausschließlich,
   wenn shop.js/profile.js eine Demo-Aktion abschließt (Premium aktiviert,
   Credits "gekauft", ein kosmetischer Gegenstand freigeschaltet, Premium
   gekündigt) — nie durch eine echte Transaktion.
   ========================================================================= */

(function (window) {
  "use strict";

  const STORAGE_KEY = "flowarena.purchases.v1";
  const MAX_ENTRIES = 50;

  function loadPurchases() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function savePurchases(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
    } catch (e) {
      /* localStorage evtl. nicht verfügbar — Historie lebt dann nur für die Session */
    }
  }

  /** @param {Object} entry - { icon, label, priceLabel, method } — method ist
   * entweder ein PAYMENT_METHODS-Label ("Apple Pay" …) oder "Credits" für
   * einen Kauf mit virtueller Währung statt echtem Geld. */
  function addPurchase(entry) {
    const list = loadPurchases();
    list.unshift({
      id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: Date.now(),
      icon: entry.icon || "🧾",
      label: entry.label,
      priceLabel: entry.priceLabel,
      method: entry.method,
    });
    savePurchases(list);
  }

  window.FlowPurchases = {
    STORAGE_KEY,
    loadPurchases,
    addPurchase,
  };
})(window);
