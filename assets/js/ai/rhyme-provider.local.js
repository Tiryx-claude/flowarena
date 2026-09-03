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
    async generateStanza({ difficulty, topic, excludeFamilyIds = [], count = 5 }) {
      const result = window.FlowRhyme.pickRhymeStanza({ difficulty, topic, excludeFamilyIds, count });
      return { ...result, source: "local-mock" };
    },
  };

  window.FlowAI = window.FlowAI || {};
  window.FlowAI.rhyme = LocalRhymeProvider;
})(window);
