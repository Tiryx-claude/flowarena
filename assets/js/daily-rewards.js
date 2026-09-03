/* =========================================================================
   FlowArena — Tages-Login-Belohnung (Modul 5: Shop, Premium, Credits)
   -------------------------------------------------------------------------
   Geteiltes, defensives Widget-Skript (wie assets/js/notifications-ui.js):
   auf jeder Seite eingebunden, prüft einmal pro Kalendertag (idempotent —
   sicher mehrfach aufrufbar, egal welche Seite zuerst geladen wird), ob eine
   neue Tages-Belohnung fällig ist, und meldet sie über das bestehende
   Benachrichtigungssystem statt mit einem eigenen, aufdringlichen Popup.
   Siehe docs/SHOP.md für die Belohnungs-Tabelle und die ehrlichen Grenzen
   (kein Server-Push, rein Client-Datum-basiert).
   ========================================================================= */

(function () {
  "use strict";

  const FlowProfile = window.FlowProfile;
  if (!FlowProfile) return;

  const profile = FlowProfile.load();
  const result = FlowProfile.recordDailyLogin(profile);
  if (!result.rewarded) return;

  const creditsEl = document.getElementById("creditsValue");
  if (creditsEl) creditsEl.textContent = String(profile.credits);

  const bonusText = result.unlockedBallDesign
    ? ` + neues Ball-Design „${result.unlockedBallDesign.name}“!`
    : "";
  window.FlowSocial?.addNotification({
    icon: "🎁",
    text: `Tages-Bonus (Tag ${result.day}, Serie ${result.streak}): +${result.creditsEarned} Credits${bonusText}`,
  });
})();
