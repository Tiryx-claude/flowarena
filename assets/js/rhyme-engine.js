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

   MEHRSPRACHIGKEIT (siehe docs/I18N.md): RHYME_BANKS enthält eine komplett
   eigene, von Hand kuratierte Wortbank PRO SPRACHE (de/en/ru) — keine
   automatische Übersetzung der deutschen Wörter (die würde sich meistens
   nicht mehr reimen!). Jede Bank hat dieselbe Struktur (Familien mit id/
   ending/words), damit pickRhymeStanza() sprachunabhängig funktioniert.
   difficulty-Werte ("leicht"/"mittel"/"schwer") und topic-IDs sind interne,
   sprachneutrale Kennungen — identisch in allen drei Wortbänken, nur ihre
   ANZEIGE (Label) wird übersetzt (siehe common.difficulty/common.topics in
   assets/js/i18n-data.js).

   WICHTIG: Jede Familie hier ist eine Liste ECHTER, natürlich klingender
   Reimwörter der jeweiligen Sprache (kein erzwungenes Füllmaterial). Eine
   Familie mit weniger als linesPerStanza Wörtern ist automatisch NICHT
   wählbar — die Auswahl-Logik überspringt sie dann und nimmt eine andere
   Familie (Anforderung: "keine unnatürlichen Wörter nur damit sich etwas
   reimt"). Für Russisch gilt das auch für die durch Auslautverhärtung
   entstehenden Reime (z.B. "глаз"/"час" — beide enden gesprochen auf [-as]).
   ========================================================================= */

(function (window) {
  "use strict";

  // Jedes Wort: diff steuert Wortlänge/Komplexität, topics die thematische
  // Passung. "freestyle" und "random" sind offene Themen und akzeptieren
  // jedes Wort (siehe topicMatches unten). diff/topics-IDs sind identisch
  // in allen drei Sprachbänken.
  const RHYME_BANK_DE = [
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

  // Eigene, von Hand kuratierte englische Wortbank — echte, alltägliche
  // englische Reimwörter (kein maschinell übersetztes Deutsch).
  const RHYME_BANK_EN = [
    { id: "ight", ending: "-ight", words: [
      { w: "light", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "night", diff: "leicht", topics: ["freestyle", "street", "love", "random"] },
      { w: "sight", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "right", diff: "leicht", topics: ["freestyle", "battle", "motivation", "random"] },
      { w: "fight", diff: "leicht", topics: ["battle", "motivation", "street", "freestyle", "random"] },
      { w: "bright", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "might", diff: "mittel", topics: ["battle", "motivation", "random"] },
      { w: "flight", diff: "mittel", topics: ["freestyle", "motivation", "random"] },
      { w: "delight", diff: "mittel", topics: ["love", "freestyle", "random"] },
      { w: "insight", diff: "schwer", topics: ["motivation", "freestyle", "random"] },
    ]},
    { id: "ame", ending: "-ame", words: [
      { w: "game", diff: "leicht", topics: ["freestyle", "battle", "random"] },
      { w: "name", diff: "leicht", topics: ["freestyle", "motivation", "battle", "random"] },
      { w: "fame", diff: "leicht", topics: ["money", "motivation", "battle", "random"] },
      { w: "flame", diff: "leicht", topics: ["love", "freestyle", "random"] },
      { w: "shame", diff: "mittel", topics: ["battle", "freestyle", "random"] },
      { w: "blame", diff: "mittel", topics: ["battle", "freestyle", "random"] },
      { w: "came", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "tame", diff: "mittel", topics: ["battle", "freestyle", "random"] },
      { w: "frame", diff: "schwer", topics: ["freestyle", "random"] },
    ]},
    { id: "ind", ending: "-ind", words: [
      { w: "find", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "mind", diff: "leicht", topics: ["freestyle", "motivation", "love", "random"] },
      { w: "kind", diff: "leicht", topics: ["freestyle", "love", "random"] },
      { w: "blind", diff: "leicht", topics: ["freestyle", "battle", "random"] },
      { w: "grind", diff: "mittel", topics: ["money", "motivation", "street", "freestyle", "random"] },
      { w: "behind", diff: "mittel", topics: ["freestyle", "battle", "random"] },
      { w: "remind", diff: "mittel", topics: ["love", "freestyle", "random"] },
      { w: "unwind", diff: "schwer", topics: ["freestyle", "random"] },
    ]},
    { id: "ove", ending: "-ove", words: [
      { w: "love", diff: "leicht", topics: ["love", "freestyle", "random"] },
      { w: "above", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "dove", diff: "leicht", topics: ["love", "freestyle", "random"] },
      { w: "glove", diff: "mittel", topics: ["street", "freestyle", "random"] },
      { w: "shove", diff: "mittel", topics: ["battle", "street", "random"] },
    ]},
    { id: "old", ending: "-old", words: [
      { w: "old", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "gold", diff: "leicht", topics: ["money", "motivation", "freestyle", "random"] },
      { w: "cold", diff: "leicht", topics: ["street", "battle", "freestyle", "random"] },
      { w: "bold", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "hold", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "told", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "sold", diff: "mittel", topics: ["money", "street", "random"] },
      { w: "fold", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "untold", diff: "schwer", topics: ["freestyle", "random"] },
    ]},
    { id: "ay", ending: "-ay", words: [
      { w: "day", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "way", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "say", diff: "leicht", topics: ["freestyle", "battle", "random"] },
      { w: "play", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "stay", diff: "leicht", topics: ["love", "freestyle", "random"] },
      { w: "pray", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "gray", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "today", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "away", diff: "mittel", topics: ["love", "freestyle", "random"] },
      { w: "display", diff: "schwer", topics: ["battle", "freestyle", "random"] },
    ]},
    { id: "own", ending: "-own", words: [
      { w: "town", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "crown", diff: "leicht", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "down", diff: "leicht", topics: ["street", "battle", "freestyle", "random"] },
      { w: "frown", diff: "mittel", topics: ["battle", "freestyle", "random"] },
      { w: "gown", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "brown", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "clown", diff: "mittel", topics: ["battle", "freestyle", "random"] },
      { w: "renown", diff: "schwer", topics: ["motivation", "battle", "random"] },
    ]},
    { id: "ound", ending: "-ound", words: [
      { w: "sound", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "round", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "ground", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "found", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "bound", diff: "mittel", topics: ["freestyle", "motivation", "random"] },
      { w: "pound", diff: "mittel", topics: ["money", "street", "random"] },
      { w: "around", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "surround", diff: "schwer", topics: ["battle", "freestyle", "random"] },
      { w: "background", diff: "schwer", topics: ["freestyle", "random"] },
    ]},
    { id: "ire", ending: "-ire", words: [
      { w: "fire", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "desire", diff: "leicht", topics: ["love", "motivation", "freestyle", "random"] },
      { w: "wire", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "hire", diff: "mittel", topics: ["money", "freestyle", "random"] },
      { w: "tire", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "inspire", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "entire", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "require", diff: "schwer", topics: ["freestyle", "random"] },
      { w: "empire", diff: "schwer", topics: ["money", "motivation", "battle", "random"] },
    ]},
    // Bewusst dünn gehalten (< linesPerStanza) — testet die Auto-Skip-Logik
    // in pickRhymeStanza() genau wie die "-onne"-Familie der deutschen Bank.
    { id: "eal", ending: "-eal", words: [
      { w: "real", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "deal", diff: "leicht", topics: ["money", "street", "freestyle", "random"] },
      { w: "steal", diff: "leicht", topics: ["street", "battle", "random"] },
    ]},
  ];

  // Eigene, von Hand kuratierte russische Wortbank — echte, gebräuchliche
  // russische Reimwörter. Familie "az" nutzt bewusst die im Russischen
  // sehr verbreitete Auslautverhärtung (з → [s] am Wortende), z.B.
  // "глаз"/"час" — beide enden gesprochen auf [-as] und reimen sich daher
  // genauso echt wie gleich geschriebene Endungen.
  const RHYME_BANK_RU = [
    { id: "ok", ending: "-ок", words: [
      { w: "сок", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "бок", diff: "leicht", topics: ["freestyle", "battle", "random"] },
      { w: "срок", diff: "leicht", topics: ["motivation", "money", "freestyle", "random"] },
      { w: "урок", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "поток", diff: "mittel", topics: ["freestyle", "motivation", "random"] },
      { w: "восток", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "звонок", diff: "mittel", topics: ["love", "freestyle", "random"] },
      { w: "кусок", diff: "schwer", topics: ["money", "street", "random"] },
    ]},
    { id: "ov", ending: "-овь", words: [
      { w: "любовь", diff: "leicht", topics: ["love", "freestyle", "random"] },
      { w: "кровь", diff: "leicht", topics: ["battle", "street", "freestyle", "random"] },
      { w: "вновь", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "бровь", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "свекровь", diff: "schwer", topics: ["freestyle", "random"] },
      { w: "морковь", diff: "schwer", topics: ["freestyle", "random"] },
    ]},
    { id: "al", ending: "-ал", words: [
      { w: "зал", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "вокзал", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "финал", diff: "leicht", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "сигнал", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "канал", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "журнал", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "металл", diff: "mittel", topics: ["street", "battle", "freestyle", "random"] },
      { w: "идеал", diff: "schwer", topics: ["motivation", "love", "random"] },
      { w: "квартал", diff: "schwer", topics: ["money", "freestyle", "random"] },
    ]},
    { id: "it", ending: "-ит", words: [
      { w: "горит", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "говорит", diff: "leicht", topics: ["freestyle", "battle", "random"] },
      { w: "летит", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "звучит", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "кричит", diff: "mittel", topics: ["battle", "street", "freestyle", "random"] },
      { w: "молчит", diff: "mittel", topics: ["freestyle", "love", "random"] },
      { w: "стоит", diff: "mittel", topics: ["money", "freestyle", "random"] },
      { w: "творит", diff: "schwer", topics: ["motivation", "freestyle", "random"] },
    ]},
    { id: "om", ending: "-ом", words: [
      { w: "дом", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "гром", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "потом", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "кругом", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "трудом", diff: "mittel", topics: ["motivation", "money", "random"] },
      { w: "льдом", diff: "schwer", topics: ["freestyle", "random"] },
      { w: "стыдом", diff: "schwer", topics: ["battle", "freestyle", "random"] },
    ]},
    { id: "en", ending: "-ень", words: [
      { w: "день", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "тень", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "лень", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "олень", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "сирень", diff: "mittel", topics: ["love", "freestyle", "random"] },
      { w: "ступень", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "кремень", diff: "schwer", topics: ["battle", "motivation", "random"] },
      { w: "ремень", diff: "schwer", topics: ["street", "freestyle", "random"] },
    ]},
    { id: "hod", ending: "-ход", words: [
      { w: "ход", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "вход", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "выход", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "поход", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "доход", diff: "mittel", topics: ["money", "freestyle", "random"] },
      { w: "восход", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "приход", diff: "schwer", topics: ["freestyle", "random"] },
      { w: "обход", diff: "schwer", topics: ["battle", "street", "random"] },
    ]},
    { id: "ol", ending: "-оль", words: [
      { w: "боль", diff: "leicht", topics: ["love", "battle", "freestyle", "random"] },
      { w: "роль", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "соль", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "ноль", diff: "leicht", topics: ["money", "battle", "freestyle", "random"] },
      { w: "король", diff: "mittel", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "контроль", diff: "mittel", topics: ["motivation", "battle", "random"] },
      { w: "пароль", diff: "schwer", topics: ["freestyle", "random"] },
    ]},
    { id: "ir", ending: "-ир", words: [
      { w: "мир", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "пир", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "тир", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "эфир", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "кумир", diff: "mittel", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "вампир", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "банкир", diff: "schwer", topics: ["money", "random"] },
      { w: "командир", diff: "schwer", topics: ["battle", "street", "random"] },
    ]},
    // Bewusst dünn gehalten (< linesPerStanza) — testet die Auto-Skip-Logik
    // in pickRhymeStanza() genau wie die deutsche "-onne"-Familie.
    { id: "az", ending: "-аз", words: [
      { w: "глаз", diff: "leicht", topics: ["freestyle", "love", "random"] },
      { w: "час", diff: "leicht", topics: ["freestyle", "motivation", "random"] },
      { w: "раз", diff: "leicht", topics: ["freestyle", "random"] },
    ]},
  ];

  const RHYME_BANKS = { de: RHYME_BANK_DE, en: RHYME_BANK_EN, ru: RHYME_BANK_RU };

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
   * eine komplette Strophe — eine Familie, ein Wort pro Zeile. `locale`
   * wählt die Sprach-Wortbank (de/en/ru); ohne Angabe wird die aktuell
   * aktive UI-Sprache verwendet (siehe assets/js/i18n.js).
   * @returns {{ words: string[], ending: string, familyId: string }}
   */
  function pickRhymeStanza({ difficulty = "mittel", topic = "freestyle", excludeFamilyIds = [], count = 5, locale } = {}) {
    const activeLocale = locale || window.FlowI18n?.getLocale() || "de";
    const bank = RHYME_BANKS[activeLocale] || RHYME_BANKS.de;

    // Nur Familien, die überhaupt genug ECHTE Wörter besitzen, sind wählbar.
    let viable = bank.filter((f) => f.words.length >= count && !excludeFamilyIds.includes(f.id));

    // Vorrat erschöpft (alle nutzbaren Familien schon dran) → Reset erlauben
    if (viable.length === 0) {
      viable = bank.filter((f) => f.words.length >= count);
    }
    // Absoluter Fallback (sollte bei einer gepflegten Bank nie eintreten)
    if (viable.length === 0) {
      viable = bank.filter((f) => f.words.length > 0);
    }

    const family = shuffle(viable)[0];
    const words = shuffle(selectBestWords(family, difficulty, topic, count));

    return { words, ending: family.ending, familyId: family.id };
  }

  window.FlowRhyme = { pickRhymeStanza, RHYME_BANKS, RHYME_BANK: RHYME_BANK_DE };
})(window);
