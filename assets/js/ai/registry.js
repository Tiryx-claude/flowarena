/* =========================================================================
   FlowArena — KI-Provider-Registry (Modul 3: KI-Architektur)
   -------------------------------------------------------------------------
   Zentraler Anschlusspunkt für alle KI-Funktionen. Spiellogik (challenge.js)
   spricht NUR mit window.FlowAI.* — nie direkt mit einer konkreten
   Implementierung. Dadurch lässt sich jeder Provider einzeln austauschen
   (z.B. gegen ein echtes Sprachmodell über einen Backend-Endpoint), ohne
   dass Countdown/Strophen/Timer/UI-Code angefasst werden muss.

   Verträge (von den *.local.js / *.web.js Dateien implementiert):

   RhymeProvider.generateStanza({ difficulty, topic, excludeFamilyIds, count })
     → Promise<{ words: string[], ending, familyId, source }>
     Liefert GENAU `count` (Standard: GAMEPLAY_CONFIG.linesPerStanza, also 5)
     thematisch passende Endwörter für eine komplette Strophe — eins pro
     Zeile, alle aus derselben Reim-Familie. Liefert NIE ganze Zeilen/Strophen
     Text. `excludeFamilyIds` sorgt dafür, dass das Reimschema von Strophe zu
     Strophe wechselt.

   EvaluationProvider.evaluate({ transcript, difficulty, topic, totalVerses,
                                  usedFamilyIds, roastMode, timerAssist })
     → Promise<{
         overall, scores: { reim, flow, kreativitaet, originalitaet,
                             themenbezug, punchlines, unterhaltung },
         bracket, headline, comment, punchlineDetected, engineLabel, transcript
       }>
     Bewertet die aufgezeichnete Performance. `roastMode` schaltet einen
     frecheren, aber respektvollen Ton für den KI-Kommentar frei.

   SpeechProvider (kein Promise-Interface, event-getrieben):
     .isSupported: boolean
     .start(micStream?) → beginnt Live-Transkription
     .stop() → beendet Transkription
     .getTranscript() → aktueller Text-Stand

   Austausch-Beispiel: eine Datei `rhyme-provider.claude.js` implementiert
   dasselbe `generate()`-Interface, ruft dabei aber einen Backend-Endpoint
   (z.B. /api/ai/rhyme) auf, der intern die Claude API mit dem Prompt-Kontext
   (Thema, Schwierigkeit, bereits genutzte Reim-Familien) anspricht. Dann
   einfach am Ende dieser Datei `window.FlowAI.rhyme = ClaudeRhymeProvider`
   setzen — fertig, kein anderer Code ändert sich. Details + Sicherheitshinweis
   (API-Keys gehören NIE ins Client-JS) in docs/AI_ARCHITECTURE.md.
   ========================================================================= */

(function (window) {
  "use strict";

  window.FlowAI = window.FlowAI || {
    rhyme: null,
    evaluation: null,
    speech: null,
    meta: {
      // Sichtbar in der UI (Ergebnis-Screen), damit klar ist, welche Engine
      // gerade aktiv ist — wichtig, sobald mehrere Provider koexistieren.
      rhymeEngineLabel: "Lokale Heuristik",
      evaluationEngineLabel: "Lokale Heuristik",
    },
  };
})(window);
