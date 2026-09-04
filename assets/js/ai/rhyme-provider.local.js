/* =========================================================================
   FlowArena — RhymeProvider: local-mock (Modul 3)
   -------------------------------------------------------------------------
   Implementiert das RhymeProvider-Interface aus registry.js auf Basis der
   kuratierten Wortliste in rhyme-engine.js. `generateStanza()` ist bewusst
   async (Promise-basiert), obwohl die lokale Logik synchron ist — das ist
   exakt die Signatur, die ein echter API-Call später auch hätte.
   ========================================================================= */

(function (window) {
  "use strict";

  const LocalRhymeProvider = {
    async generateStanza({ difficulty, topic, excludeFamilyIds = [], count = 5, locale }) {
      // Reimwörter richten sich nach der aktuell gewählten UI-Sprache (siehe
      // docs/I18N.md) — ohne explizit übergebene Sprache wird die gerade
      // aktive App-Sprache verwendet, damit Gameplay & Sprache nie auseinanderlaufen.
      const activeLocale = locale || window.FlowI18n?.getLocale() || "de";
      const result = window.FlowRhyme.pickRhymeStanza({ difficulty, topic, excludeFamilyIds, count, locale: activeLocale });
      return { ...result, source: "local-mock" };
    },
  };

  window.FlowAI = window.FlowAI || {};
  window.FlowAI.rhyme = LocalRhymeProvider;
})(window);
