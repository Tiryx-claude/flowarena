/* =========================================================================
   FlowArena — Generative Reimwort-Ergänzung (Modul 7-Ausbau)
   -------------------------------------------------------------------------
   WICHTIG — Ehrlichkeit: Das hier ist KEIN echtes Sprachmodell und kein
   API-Call. "Die KI generiert neue Reimwörter" bedeutet konkret: eine
   lokale, regelbasierte Kompositions-Heuristik, austauschbar gegen einen
   echten Modell-Call (siehe docs/AI_ARCHITECTURE.md) wie jeder andere
   Provider in diesem Prototyp.

   FRÜHERE VERSION (verworfen): eine erste Fassung hängte blind ein
   Präfix-Wort (Vor-/Nach-/Über-/...) vor JEDES Kernbank-Wort. Test im
   Browser zeigte: das erzeugt für viele Basiswörter Nicht-Wörter
   ("Nachtraum", "Vorbaum", "Übertraum" klingen falsch/verwirrend — nur
   "Raum" selbst ist im Deutschen ungewöhnlich kompositionsfreudig, die
   meisten anderen Nomen sind es nicht). Das widerspricht der Kernregel
   dieser ganzen Datei ("keine unnatürlichen Wörter nur damit sich etwas
   reimt", siehe rhyme-engine.js Kopfkommentar) — deshalb jetzt durch eine
   von Hand geprüfte Zuordnungsliste ersetzt: JEDES erzeugte Kompositum
   unten ist ein tatsächlich existierendes deutsches Wort, keine
   Rate-Verkettung. Kleinerer Ertrag (ein paar Dutzend statt hunderte
   Wörter), dafür garantiert echt.

   Warum nur Deutsch: deutsche Substantiv-Komposition ist die einzige der
   drei Sprachen, bei der sich neue, verständliche Wörter überhaupt so
   verlässlich von Hand zuordnen lassen. Englische Präfigierung
   (un-/re-/over-) erzeugt oft Nicht-Wörter, russische Verb-Präfigierung
   bräuchte Kasus-/Aspekt-Regeln. Für EN/RU kommt die Frische stattdessen
   aus dem riesigen echten Wortschatz in rhyme-data-generated.js plus der
   Anti-Wiederholungs-Logik in rhyme-engine.js.
   ========================================================================= */

(function (window) {
  "use strict";

  // Jeder Eintrag: von Hand geprüft, dass es sich um ein tatsächlich
  // existierendes, verständliches deutsches Wort handelt (kein
  // Nicht-Wort-Risiko wie bei blinder Präfix-Verkettung).
  const VERIFIED_COMPOUNDS = {
    Raum: ["Vorraum", "Unterraum", "Nebenraum", "Hauptraum", "Großraum", "Rückraum"],
    Land: ["Vorland", "Hinterland", "Neuland", "Grenzland"],
    Welt: ["Unterwelt", "Vorwelt", "Gegenwelt"],
    Ton: ["Unterton", "Grundton", "Nebenton", "Halbton"],
    Licht: ["Rücklicht", "Vorlicht", "Gegenlicht", "Nachtlicht"],
    Zeit: ["Vorzeit", "Unzeit", "Neuzeit", "Freizeit"],
    Feld: ["Vorfeld", "Umfeld", "Brachfeld", "Schlachtfeld"],
    Held: ["Superheld", "Volksheld", "Antiheld"],
    Krone: ["Zahnkrone", "Baumkrone"],
    Gang: ["Vorgang", "Rückgang", "Umgang", "Übergang", "Ausgang", "Eingang"],
    Klang: ["Nachklang", "Beiklang", "Wohlklang"],
    Sicht: ["Vorsicht", "Rücksicht", "Absicht", "Weitsicht"],
    Boss: ["Unterboss"],
  };

  /**
   * Liefert von Hand geprüfte Kompositum-Kandidaten für ein bestehendes
   * Reimwort (nur Deutsch — siehe Kopfkommentar).
   * @param {{w:string, diff:string, topics:string[]}} word
   * @param {string} locale
   * @param {Set<string>} existingLower - bereits vorhandene Wörter (lowercase),
   *   damit kein Duplikat entsteht (z.B. "Vorgang" existiert evtl. schon).
   * @returns {Array<{w:string, diff:string, topics:string[], generated:boolean}>}
   */
  function generateCompounds(word, locale, existingLower) {
    if (locale !== "de" || !word) return [];
    const candidates = VERIFIED_COMPOUNDS[word.w];
    if (!candidates) return [];
    const out = [];
    candidates.forEach((candidate) => {
      const key = candidate.toLowerCase();
      if (existingLower.has(key)) return;
      existingLower.add(key);
      // Kompositum = immer die schwerste Stufe (länger/ungewöhnlicher als
      // das Ausgangswort) — passt zur "seltener/komplexer"-Anforderung für
      // die Schwierigkeitsstufe "schwer".
      out.push({ w: candidate, diff: "schwer", topics: word.topics.slice(), generated: true });
    });
    return out;
  }

  window.FlowRhymeGenerator = { generateCompounds, VERIFIED_COMPOUNDS };
})(window);
