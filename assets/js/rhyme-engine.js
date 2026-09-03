/* =========================================================================
   FlowArena — Rhyme Engine (Platzhalter-Datenbank für den lokalen KI-Provider)
   -------------------------------------------------------------------------
   KERNREGEL: Die KI liefert NIEMALS Rapzeilen oder ganze Strophen — nur die
   Endwörter. pro Strophe werden GAMEPLAY_CONFIG.linesPerStanza (Standard: 5)
   Wörter auf einmal geliefert, EINS pro Zeile, alle aus derselben Reim-
   Familie (gleiche Endung). Modul 3 ersetzt generateStanzaWords() 1:1 durch
   einen echten API-Call mit demselben Rückgabeformat — siehe
   docs/AI_ARCHITECTURE.md.

   "Reimschema" = welche Reim-Familie (Endung, z.B. "-eit") diese Strophe
   nutzt. Jede neue Strophe bekommt garantiert eine andere Familie als die
   vorherigen (bis der Vorrat erschöpft ist, dann Reset) — siehe
   pickRhymeStanza()/excludeFamilyIds.

   WICHTIG: Jede Familie hier ist eine Liste ECHTER, natürlich klingender
   deutscher Reimwörter (kein erzwungenes Füllmaterial). Eine Familie mit
   weniger als linesPerStanza Wörtern ist automatisch NICHT wählbar — die
   Auswahl-Logik überspringt sie dann und nimmt eine andere Familie
   (Anforderung: "keine unnatürlichen Wörter nur damit sich etwas reimt").
   ========================================================================= */

(function (window) {
  "use strict";

  // Jedes Wort: diff steuert Wortlänge/Komplexität, topics die thematische
  // Passung. "freestyle" und "random" sind offene Themen und akzeptieren
  // jedes Wort (siehe topicMatches unten).
  const RHYME_BANK = [
    { id: "aum", ending: "-aum", words: [
      { w: "Raum", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Baum", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "kaum", diff: "leicht", topics: ["freestyle", "battle", "random"] },
      { w: "Traum", diff: "leicht", topics: ["motivation", "love", "freestyle", "random"] },
      { w: "Schaum", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Saum", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Freiraum", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "Spielraum", diff: "schwer", topics: ["motivation", "battle", "random"] },
      { w: "Zwischenraum", diff: "schwer", topics: ["freestyle", "random"] },
    ]},
    { id: "and", ending: "-and", words: [
      { w: "Rand", diff: "leicht", topics: ["street", "battle", "freestyle", "random"] },
      { w: "Land", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "Sand", diff: "leicht", topics: ["freestyle", "street", "random"] },
      { w: "Wand", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Hand", diff: "leicht", topics: ["freestyle", "love", "random"] },
      { w: "Band", diff: "leicht", topics: ["freestyle", "love", "random"] },
      { w: "Verstand", diff: "mittel", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "Gegenstand", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Verband", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Unbekannt", diff: "schwer", topics: ["street", "freestyle", "random"] },
      { w: "Widerstand", diff: "schwer", topics: ["battle", "motivation", "random"] },
    ]},
    { id: "eld", ending: "-eld", words: [
      { w: "Geld", diff: "leicht", topics: ["money", "freestyle", "random"] },
      { w: "Feld", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "Welt", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "Zelt", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Held", diff: "mittel", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "Umwelt", diff: "schwer", topics: ["freestyle", "random"] },
    ]},
    { id: "erz", ending: "-erz", words: [
      { w: "Herz", diff: "leicht", topics: ["love", "freestyle", "random"] },
      { w: "Schmerz", diff: "leicht", topics: ["love", "battle", "freestyle", "random"] },
      { w: "Scherz", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Kommerz", diff: "mittel", topics: ["money", "random"] },
      { w: "Erz", diff: "mittel", topics: ["freestyle", "random"] },
    ]},
    { id: "acht", ending: "-acht", words: [
      { w: "Macht", diff: "leicht", topics: ["battle", "motivation", "street", "freestyle", "random"] },
      { w: "Nacht", diff: "leicht", topics: ["street", "love", "freestyle", "random"] },
      { w: "Pracht", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Schlacht", diff: "mittel", topics: ["battle", "street", "random"] },
      { w: "Verdacht", diff: "mittel", topics: ["street", "battle", "random"] },
      { w: "Bedacht", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "Übermacht", diff: "schwer", topics: ["battle", "random"] },
      { w: "Zwietracht", diff: "schwer", topics: ["battle", "random"] },
    ]},
    { id: "ier", ending: "-ier", words: [
      { w: "Tier", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Bier", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "Papier", diff: "mittel", topics: ["money", "freestyle", "random"] },
      { w: "Quartier", diff: "mittel", topics: ["street", "freestyle", "random"] },
      { w: "Revier", diff: "mittel", topics: ["street", "battle", "random"] },
      { w: "Klavier", diff: "schwer", topics: ["freestyle", "random"] },
      { w: "Kavalier", diff: "schwer", topics: ["love", "random"] },
    ]},
    { id: "oss", ending: "-oss", words: [
      { w: "Boss", diff: "leicht", topics: ["money", "street", "battle", "freestyle", "random"] },
      { w: "Schloss", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Verstoß", diff: "mittel", topics: ["street", "battle", "random"] },
      { w: "Koloss", diff: "schwer", topics: ["battle", "random"] },
      { w: "Amboss", diff: "schwer", topics: ["motivation", "battle", "random"] },
    ]},
    { id: "eit", ending: "-eit", words: [
      { w: "Zeit", diff: "leicht", topics: ["freestyle", "motivation", "love", "random"] },
      { w: "Wahrheit", diff: "leicht", topics: ["freestyle", "battle", "random"] },
      { w: "Klarheit", diff: "mittel", topics: ["freestyle", "motivation", "random"] },
      { w: "Freiheit", diff: "mittel", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "Sicherheit", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Einsamkeit", diff: "mittel", topics: ["love", "random"] },
      { w: "Möglichkeit", diff: "mittel", topics: ["motivation", "random"] },
      { w: "Einigkeit", diff: "schwer", topics: ["motivation", "battle", "random"] },
      { w: "Ewigkeit", diff: "schwer", topics: ["love", "motivation", "random"] },
      { w: "Unendlichkeit", diff: "schwer", topics: ["motivation", "random"] },
    ]},
    { id: "icht", ending: "-icht", words: [
      { w: "Licht", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "Sicht", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Pflicht", diff: "leicht", topics: ["motivation", "battle", "random"] },
      { w: "Gesicht", diff: "leicht", topics: ["freestyle", "love", "battle", "random"] },
      { w: "Nicht", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "Gewicht", diff: "mittel", topics: ["motivation", "battle", "random"] },
      { w: "Verzicht", diff: "mittel", topics: ["motivation", "love", "random"] },
      { w: "Bericht", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Einsicht", diff: "mittel", topics: ["motivation", "random"] },
      { w: "Unterricht", diff: "schwer", topics: ["freestyle", "random"] },
      { w: "Übersicht", diff: "schwer", topics: ["freestyle", "random"] },
    ]},
    { id: "ang", ending: "-ang", words: [
      { w: "Klang", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Gang", diff: "leicht", topics: ["street", "battle", "freestyle", "random"] },
      { w: "Zwang", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Anfang", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "Empfang", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Gesang", diff: "schwer", topics: ["freestyle", "random"] },
    ]},
    { id: "on", ending: "-on", words: [
      { w: "Ton", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Sohn", diff: "leicht", topics: ["freestyle", "love", "random"] },
      { w: "schon", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Lohn", diff: "mittel", topics: ["money", "motivation", "random"] },
      { w: "Krone", diff: "mittel", topics: ["battle", "motivation", "random"] },
      { w: "Thron", diff: "schwer", topics: ["battle", "motivation", "random"] },
    ]},
    // Bewusst dünn gehalten (nur 3 Wörter < linesPerStanza) — dient als
    // Testfall für die Auto-Skip-Logik in pickRhymeStanza(): Familien mit
    // zu wenig echten Wörtern werden automatisch übersprungen statt mit
    // erzwungenen Fantasiewörtern aufgefüllt.
    { id: "onne", ending: "-onne", words: [
      { w: "Sonne", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "Tonne", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "Wonne", diff: "mittel", topics: ["love", "random"] },
    ]},
  ];

  function topicMatches(word, topic) {
    return topic === "freestyle" || topic === "random" || word.topics.includes(topic);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Wählt bis zu `count` Wörter aus einer Familie, bevorzugt exakte
   * Thema+Schwierigkeit-Treffer, füllt bei Bedarf mit dem nächstbesten
   * Match auf (nie mit erfundenen Wörtern — nur mit echten Wörtern
   * derselben Familie, die also garantiert weiterhin sauber reimen).
   */
  function selectBestWords(family, difficulty, topic, count) {
    const scored = family.words.map((word) => {
      let score = 0;
      if (topicMatches(word, topic)) score += 2;
      if (word.diff === difficulty) score += 1;
      return { word, score };
    });
    scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);
    return scored.slice(0, count).map((s) => s.word.w);
  }

  /**
   * Liefert `count` Endwörter (Standard: GAMEPLAY_CONFIG.linesPerStanza) für
   * eine komplette Strophe — eine Familie, ein Wort pro Zeile.
   * @returns {{ words: string[], ending: string, familyId: string }}
   */
  function pickRhymeStanza({ difficulty = "mittel", topic = "freestyle", excludeFamilyIds = [], count = 5 }) {
    // Nur Familien, die überhaupt genug ECHTE Wörter besitzen, sind wählbar.
    let viable = RHYME_BANK.filter((f) => f.words.length >= count && !excludeFamilyIds.includes(f.id));

    // Vorrat erschöpft (alle nutzbaren Familien schon dran) → Reset erlauben
    if (viable.length === 0) {
      viable = RHYME_BANK.filter((f) => f.words.length >= count);
    }
    // Absoluter Fallback (sollte bei einer gepflegten Bank nie eintreten)
    if (viable.length === 0) {
      viable = RHYME_BANK.filter((f) => f.words.length > 0);
    }

    const family = shuffle(viable)[0];
    const words = shuffle(selectBestWords(family, difficulty, topic, count));

    return { words, ending: family.ending, familyId: family.id };
  }

  window.FlowRhyme = { pickRhymeStanza, RHYME_BANK };
})(window);
