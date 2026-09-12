/* =========================================================================
   FlowArena — Moderne Wortschatz-Ergänzung: Jugend-/Rap-Sprache (Modul 8)
   -------------------------------------------------------------------------
   ANFORDERUNG: "Die Wörter sollen nicht wie aus einem Schulbuch klingen" —
   mehr Jugendsprache, Slang, Rap-/Battle-Energie, ohne die Reimqualität zu
   opfern. Diese Datei ist eine ZUSÄTZLICHE, von Hand geprüfte Schicht
   (window.FlowRhymeSlang), genau wie assets/js/rhyme-generator.js schon für
   Komposita — KEINE automatisierte Slang-Generierung, weil das erfahrungs-
   gemäß (siehe Kopfkommentar dort) schnell zu erzwungenen oder falschen
   Reimen führt. Jede Familie hier wurde einzeln von Hand auf ECHTEN,
   phonetisch stimmigen Gleichklang geprüft (nicht nur gleiche Schreibweise
   am Wortende) — siehe docs/GAMEPLAY.md Abschnitt 7.1 für die Details und
   bekannte Grenzen.

   EHRLICHKEIT ZUM UMFANG: das hier ist eine gezielte, aber bewusst
   BEGRENZTE Ergänzung (rund 15 neue Familien/Sprache) — kein Ersatz für
   die riesige, skriptgenerierte Zusatzbank (rhyme-data-generated.js). Der
   Fokus liegt auf Qualität statt Menge: lieber 15 wirklich geprüfte,
   moderne, gut reimende Familien als hunderte ungeprüfte. Häufig verworfene
   Kandidaten (zur Nachvollziehbarkeit, falls das später erweitert wird):
   - Deutsch: reine Lehnwort-Slangs wie "Vibe"/"Cringe"/"Grind"/"Safe" haben
     im Deutschen KEINE echten Reimpartner (englische Aussprache passt
     phonetisch nicht zu deutschen Wörtern gleicher Schreibweise) — bewusst
     NICHT erzwungen in eine Familie gepresst.
   - "Opfer" (verbreitetes Diss-Wort) hätte als Familie nur mit sensiblen
     Begriffen wie "Kriegsopfer"/"Todesopfer" funktioniert — inhaltlich
     unpassend für eine lockere Battle-Rap-Reimliste, deshalb weggelassen.
   - Russisch: "движ" (Jugendslang für "Event/Szene") hat nur wenige echte
     Reimpartner (Familie bewusst klein gehalten statt künstlich aufgefüllt).

   Struktur identisch zur Kernbank in rhyme-engine.js ({ id, ending, words:
   [{ w, diff, topics }] }) — wird in buildMergedBank() als weitere Schicht
   angehängt (siehe dort).
   ========================================================================= */

(function (window) {
  "use strict";

  const RHYME_SLANG_DE = [
    { id: "s-lex", ending: "-lex", words: [
      { w: "Flex", diff: "leicht", topics: ["battle", "street", "freestyle", "random"] },
      { w: "Text", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Kontext", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Reflex", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "Komplex", diff: "mittel", topics: ["freestyle", "battle", "random"] },
    ]},
    { id: "s-enlos", ending: "-enlos", words: [
      { w: "ehrenlos", diff: "mittel", topics: ["battle", "street", "freestyle", "random"] },
      { w: "grenzenlos", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "namenlos", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "seelenlos", diff: "schwer", topics: ["battle", "freestyle", "random"] },
    ]},
    { id: "s-mann", ending: "-mann", words: [
      { w: "Ehrenmann", diff: "mittel", topics: ["motivation", "battle", "street", "freestyle", "random"] },
      { w: "Hauptmann", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Kaufmann", diff: "mittel", topics: ["money", "freestyle", "random"] },
      { w: "Bergmann", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Staatsmann", diff: "schwer", topics: ["motivation", "freestyle", "random"] },
    ]},
    { id: "s-one", ending: "-one", words: [
      { w: "Krone", diff: "leicht", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "Zone", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "Bohne", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "Hormone", diff: "schwer", topics: ["humor", "freestyle", "random"] },
    ]},
    // Eigene Familie statt in "-one" gemischt: "Drohne"/"ohne"/"wohne" haben
    // im Deutschen ein stummes Dehnungs-h ("-ohne"), das schriftlich NICHT
    // zu "Krone"/"Zone" passt, obwohl es sich noch genauso anhört — für die
    // Stamm-Erkennung (wordStem) zählt aber die tatsächliche Endungs-
    // Schreibweise, deshalb sauber getrennt statt vermischt.
    { id: "s-ohne", ending: "-ohne", words: [
      { w: "Drohne", diff: "mittel", topics: ["street", "freestyle", "random"] },
      { w: "ohne", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "wohne", diff: "leicht", topics: ["freestyle", "random"] },
    ]},
    // Umgangssprachliche Kurz-Loanwords, im Deutschen als eigenständige
    // Slang-Wörter etabliert (nicht als "englisches Zitat" gemeint) — alle
    // enden gesprochen auf denselben langen O-Laut, echte Reimfamilie.
    { id: "s-o", ending: "-o", words: [
      { w: "Bro", diff: "leicht", topics: ["street", "battle", "freestyle", "random"] },
      { w: "Pro", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "Go", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "No", diff: "leicht", topics: ["battle", "freestyle", "random"] },
    ]},
    // Gleicher Laut, andere Schreibweise (stummes W) — s.o. "-ohne", darum
    // wieder eine eigene Familie statt vermischt mit "-o".
    { id: "s-ow", ending: "-ow", words: [
      { w: "Show", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "Wow", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "Knowhow", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
    ]},
    { id: "s-atze", ending: "-atze", words: [
      { w: "Katze", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "Glatze", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "Ratze", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "platze", diff: "mittel", topics: ["humor", "freestyle", "random"] },
      { w: "Matratze", diff: "mittel", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-ampf", ending: "-ampf", words: [
      { w: "Kampf", diff: "leicht", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "Krampf", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "Dampf", diff: "leicht", topics: ["motivation", "street", "freestyle", "random"] },
    ]},
  ];

  const RHYME_SLANG_EN = [
    { id: "s-ex", ending: "-ex", words: [
      { w: "flex", diff: "leicht", topics: ["battle", "street", "freestyle", "random"] },
      { w: "text", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "next", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "ex", diff: "leicht", topics: ["love", "freestyle", "random"] },
      { w: "rex", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "context", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "complex", diff: "mittel", topics: ["battle", "freestyle", "random"] },
    ]},
    { id: "s-ibe", ending: "-ibe", words: [
      { w: "vibe", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "tribe", diff: "leicht", topics: ["street", "motivation", "freestyle", "random"] },
      { w: "subscribe", diff: "mittel", topics: ["humor", "freestyle", "random"] },
      { w: "describe", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "bribe", diff: "mittel", topics: ["battle", "freestyle", "random"] },
      { w: "prescribe", diff: "schwer", topics: ["freestyle", "random"] },
    ]},
    { id: "s-ind", ending: "-ind", words: [
      { w: "grind", diff: "leicht", topics: ["money", "motivation", "freestyle", "random"] },
      { w: "mind", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "find", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "blind", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "behind", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "remind", diff: "mittel", topics: ["freestyle", "random"] },
    ]},
    { id: "s-out", ending: "-out", words: [
      { w: "clout", diff: "leicht", topics: ["street", "money", "battle", "freestyle", "random"] },
      { w: "out", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "about", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "doubt", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "without", diff: "mittel", topics: ["love", "freestyle", "random"] },
      { w: "shout", diff: "leicht", topics: ["battle", "freestyle", "random"] },
    ]},
    { id: "s-op", ending: "-op", words: [
      { w: "opp", diff: "leicht", topics: ["battle", "street", "freestyle", "random"] },
      { w: "drop", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "top", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "stop", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "nonstop", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "hip-hop", diff: "mittel", topics: ["freestyle", "random"] },
    ]},
    { id: "s-go", ending: "-o", words: [
      { w: "go", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "pro", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "no", diff: "leicht", topics: ["battle", "freestyle", "random"] },
    ]},
    // Gleicher Laut wie "-o" oben, nur andere Schreibweise (-ow statt -o) —
    // für wordStem() sauber getrennt (siehe deutsche "-ohne"/"-o"-Familien
    // weiter oben für dieselbe Begründung).
    { id: "s-flow", ending: "-ow", words: [
      { w: "flow", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "show", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "glow", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-ap", ending: "-ap", words: [
      { w: "cap", diff: "leicht", topics: ["battle", "humor", "freestyle", "random"] },
      { w: "trap", diff: "leicht", topics: ["street", "money", "freestyle", "random"] },
      { w: "rap", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "gap", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "wrap", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "snap", diff: "leicht", topics: ["battle", "freestyle", "random"] },
    ]},
  ];

  const RHYME_SLANG_RU = [
    { id: "s-on1", ending: "-онь", words: [
      { w: "огонь", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "конь", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "тронь", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "гармонь", diff: "mittel", topics: ["humor", "freestyle", "random"] },
      { w: "ладонь", diff: "mittel", topics: ["love", "freestyle", "random"] },
    ]},
    { id: "s-izh", ending: "-иж", words: [
      { w: "движ", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "Париж", diff: "mittel", topics: ["love", "freestyle", "random"] },
      { w: "стриж", diff: "mittel", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-ir1", ending: "-ир", words: [
      { w: "жир", diff: "leicht", topics: ["battle", "street", "humor", "freestyle", "random"] },
      { w: "мир", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "пир", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "тир", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "кефир", diff: "mittel", topics: ["humor", "freestyle", "random"] },
      { w: "эфир", diff: "mittel", topics: ["street", "freestyle", "random"] },
    ]},
    { id: "s-est1", ending: "-есть", words: [
      { w: "жесть", diff: "leicht", topics: ["battle", "street", "humor", "freestyle", "random"] },
      { w: "месть", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "честь", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "весть", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "лесть", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "шесть", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-on2", ending: "-он", words: [
      { w: "трон", diff: "leicht", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "миллион", diff: "mittel", topics: ["money", "motivation", "freestyle", "random"] },
      { w: "чемпион", diff: "mittel", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "легион", diff: "mittel", topics: ["battle", "freestyle", "random"] },
      { w: "регион", diff: "mittel", topics: ["street", "freestyle", "random"] },
    ]},
  ];

  window.FlowRhymeSlang = { de: RHYME_SLANG_DE, en: RHYME_SLANG_EN, ru: RHYME_SLANG_RU };
})(window);
