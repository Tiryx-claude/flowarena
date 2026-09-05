/* =========================================================================
   FlowArena — Rhyme Engine (Modul 3, generalüberholt in Modul 7)
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

   MODUL-7-AUSBAU — großer Wortschatz, Anti-Wiederholung, Street-Modus:
   Diese Datei enthält weiterhin die kleine, von Hand kuratierte KERNBANK
   (höchste Qualitätsstufe, s.u.) — die eigentliche Größe kommt aus
   assets/js/rhyme-data-generated.js (window.FlowRhymeGenerated, >20.000
   zusätzliche echte Wörter pro Sprache aus einer Skript-Pipeline, siehe
   Kopfkommentar dort für Herkunft/Grenzen). buildMergedBank() führt beide
   beim ersten Zugriff zusammen (+ für Deutsch: prozedural erzeugte
   Komposita aus assets/js/rhyme-generator.js). pickRhymeStanza() merkt sich
   zusätzlich bereits benutzte Wörter (localStorage) und bevorzugt frische
   Wörter, bis ein Großteil des Vorrats aufgebraucht ist (siehe
   USED_RESET_THRESHOLD) — siehe docs/GAMEPLAY.md Abschnitt "Reimwort-
   System" für die vollständige Erklärung.
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

  const CORE_BANKS = { de: RHYME_BANK_DE, en: RHYME_BANK_EN, ru: RHYME_BANK_RU };

  /* ---------------------------------------------------------------------
     Bank-Zusammenführung: Kernbank (von Hand, oben) + Zusatzbank
     (assets/js/rhyme-data-generated.js, siehe Kopfkommentar dort) + für
     Deutsch zusätzlich prozedural erzeugte Komposita (rhyme-generator.js).
     Läuft einmal pro Sprache und wird danach gecacht (die Datenmenge ist
     groß genug, dass sich das lohnt — kein Grund, bei jeder Strophe neu
     zusammenzuführen).
     --------------------------------------------------------------------- */
  const mergedBankCache = {};

  function buildMergedBank(locale) {
    if (mergedBankCache[locale]) return mergedBankCache[locale];

    const core = CORE_BANKS[locale] || CORE_BANKS.de;
    const generatedByLocale = window.FlowRhymeGenerated || {};
    const generated = generatedByLocale[locale] || [];

    // Alle bereits vorhandenen Wörter (lowercase) sammeln — sowohl für den
    // Komposita-Generator (keine Dopplungen) als auch generell.
    const seenLower = new Set();
    core.forEach((f) => f.words.forEach((w) => seenLower.add(w.w.toLowerCase())));
    generated.forEach((f) => f.words.forEach((w) => seenLower.add(w.w.toLowerCase())));

    const bank = core.map((f) => ({ ...f, words: f.words.slice() }));

    // Deutsch: aus JEDER Kernfamilie ein paar frische Komposita generieren
    // und der SELBEN Familie hinzufügen (reimen sich ja weiterhin exakt
    // gleich — nur ein neues, längeres Wort mit demselben Ausklang).
    if (window.FlowRhymeGenerator && locale === "de") {
      bank.forEach((f) => {
        // Nur von den ursprünglichen (nicht schon generierten) Wörtern
        // dieser Familie ausgehen, um keine Präfix-auf-Präfix-Ketten zu bilden.
        const baseWords = f.words.slice();
        baseWords.forEach((w) => {
          const compounds = window.FlowRhymeGenerator.generateCompounds(w, locale, seenLower);
          f.words.push(...compounds);
        });
      });
    }

    // Zusatzbank anhängen (jede Familie dort ist bereits intern dedupliziert
    // und gegen die Kernbank abgeglichen — siehe rhyme-data-generated.js).
    generated.forEach((f) => bank.push(f));

    mergedBankCache[locale] = bank;
    return bank;
  }

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

  // Gewichtete Familien-Auswahl nach Schwierigkeit: eine rein zufällige
  // Familienwahl (wie zuvor) ignoriert, WELCHE Wörter die Familie überhaupt
  // enthält — eine Familie ganz ohne "leicht"-Wörter liefert dann auf
  // "Leicht" trotzdem nur mittelschwere/schwere Wörter, weil innerhalb der
  // Familie nichts Passenderes existiert. Jede Familie bekommt deshalb ein
  // Gewicht = (Anzahl passender Schwierigkeitswörter + 1) — der "+1" hält
  // auch schwächer passende Familien im Spiel (Vielfalt bleibt erhalten),
  // aber gut passende Familien werden im Schnitt deutlich häufiger gewählt.
  function countDiffMatches(family, difficulty) {
    let n = 0;
    family.words.forEach((w) => { if (w.diff === difficulty) n++; });
    return n;
  }

  // Manche Reim-Familien bestehen (sprachlich bedingt) fast nur aus
  // Vorsilben-Varianten EINES einzigen Verbs (z.B. "-ehmen" praktisch nur
  // "nehmen/abnehmen/mitnehmen/...", "-ommen" praktisch nur "kommen/...").
  // Innerhalb so einer Familie kann selbst die beste Wortauswahl keine
  // echte Wurzel-Vielfalt herbeizaubern — deshalb werden solche Familien
  // hier schon bei der AUSWAHL abgewertet (nicht ausgeschlossen, falls es
  // zu Thema/Schwierigkeit keine bessere Alternative gibt). Wichtig ist
  // dabei nicht nur die ANZAHL verschiedener Wurzeln, sondern wie stark
  // sich die Familie auf eine einzelne Wurzel KONZENTRIERT — eine Familie
  // mit 3 Wurzeln, von denen eine 60% aller Wörter stellt, ist genauso
  // eintönig wie eine mit nur 2 Wurzeln. coreStem/wordStem sind weiter
  // unten definiert, aber als function-Deklarationen gehoisted.
  const familyDiversityCache = new Map();
  function familyMaxRootShare(family) {
    if (familyDiversityCache.has(family.id)) return familyDiversityCache.get(family.id);
    const counts = new Map();
    family.words.forEach((w) => {
      const root = coreStem(wordStem(w.w, family.ending));
      counts.set(root, (counts.get(root) || 0) + 1);
    });
    const maxCount = Math.max(...counts.values());
    const share = maxCount / family.words.length;
    familyDiversityCache.set(family.id, share);
    return share;
  }

  function pickFamilyWeighted(families, difficulty) {
    const weights = families.map((f) => {
      const base = countDiffMatches(f, difficulty) + 1;
      const share = familyMaxRootShare(f);
      // Über 50% Anteil einer einzigen Wurzel: deutlich abwerten. Über 30%:
      // leicht abwerten. Darunter: keine Strafe (gesunde Vielfalt).
      if (share > 0.5) return base * 0.15;
      if (share > 0.3) return base * 0.5;
      return base;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < families.length; i++) {
      r -= weights[i];
      if (r <= 0) return families[i];
    }
    return families[families.length - 1];
  }

  /* ---------------------------------------------------------------------
     Stamm-Ähnlichkeit: erkennt, ob zwei Wörter wahrscheinlich nur
     Flexions-/Zusammensetzungs-Formen DESSELBEN Worts sind (z.B. "kommt"/
     "kommst"/"gekommen", oder "arbeiten"/"mitarbeiten") — genau das erzeugt
     "künstliche, fast identische Wortreihen" innerhalb einer Strophe, auch
     wenn jedes einzelne Wort für sich technisch echt ist und reimt. Wird
     doppelt genutzt: (1) INNERHALB einer Strophe, um Vielfalt zu erzwingen
     (siehe selectBestWords), (2) ÜBER Strophen hinweg als Teil der
     Anti-Wiederholung (siehe usedStems unten) — "Wohnung" benutzt, kurz
     danach "Wohnungen" ist kein wirklich neues Wort.
     --------------------------------------------------------------------- */
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const prev = new Array(n + 1);
    const curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= n; j++) prev[j] = curr[j];
    }
    return prev[n];
  }

  // Wortstamm = Wort ohne die (gemeinsame) Reim-Endung dieser Familie —
  // der Teil, der die eigentliche WORTBEDEUTUNG/-wurzel trägt.
  function wordStem(word, familyEnding) {
    const w = word.toLowerCase();
    const end = (familyEnding || "").replace(/^-/, "").toLowerCase();
    if (end && w.endsWith(end) && w.length > end.length) {
      return w.slice(0, w.length - end.length);
    }
    return w;
  }

  // Bekannte trennbare/untrennbare Verb-Vorsilben (+ Umgangssprache) sowie
  // Präfixe aus dem Englischen/Russischen. Wichtig für Fälle wie
  // "mitgemacht/rumgemacht/angemacht/ausgemacht" — die Reim-FAMILIE
  // ("-emacht") teilt sich die Endung von "gemacht", aber die eigentliche
  // Wortwurzel ("machen") steckt nach dem Endung-Abschneiden noch als
  // Restfragment ("g") im Stamm, nicht als offensichtlich gemeinsamer
  // Teilstring — ohne Vorsilben-Abzug würden solche reinen Präfix-
  // Varianten eines einzigen Verbs fälschlich als "verschieden genug"
  // durchgehen. Nach Sprache getrennt ist hier nicht nötig (Deutsch/
  // Englisch = lateinische Schrift, Russisch = kyrillische Schrift —
  // eine Kollision zwischen den Listen ist praktisch ausgeschlossen).
  const KNOWN_PREFIXES = [
    // Trennbare Vorsilben (+ umgangssprachliche Kurzformen: rum=herum,
    // rein=herein, raus=heraus, rüber=herüber, rauf=herauf, runter=herunter)
    "herum", "zurück", "zusammen", "entgegen", "empor", "weiter", "wieder",
    "kaputt", "hierher", "dorthin", "dahinter", "herunter", "herüber",
    "hinüber", "hinunter", "hinauf", "zwischen", "gegenüber", "mit", "rum",
    "rein", "raus", "rüber", "nüber", "rauf", "runter", "nauf", "nunter",
    "auf", "aus", "ein", "vor", "nach", "über", "unter", "durch", "weg",
    "her", "hin", "los", "fest", "statt", "dahin", "davon", "daher",
    "darauf", "daran", "davor", "dazu", "dar", "teil", "hoch", "frei",
    "tief", "fern", "klar", "gegen", "nieder", "gleich", "an", "ab", "um",
    "zu", "bei",
    // Untrennbare Vorsilben (be-, ge-, er-, ver-, zer-, ent-, emp-, miss-)
    "ver", "ent", "emp", "zer", "miss", "be", "er", "ge",
    // Englisch
    "over", "under", "mis", "re", "un", "out", "pre", "up",
    // Russisch (Aspekt-/Richtungspräfixe)
    "пере", "про", "при", "под", "над", "раз", "воз", "из", "до",
    "по", "за", "вы", "от", "на", "об", "у", "в", "с",
  ].sort((a, b) => b.length - a.length);

  // "Kern"-Stamm: zusätzlich zur Reim-Endung wiederholt bekannte Vorsilben
  // vom Wortanfang abziehen (z.B. "anzugreifen" → "an" UND "zu" abziehen,
  // "hierhergekommen" → "hier"+"her"+"ge" abziehen). Iteration ist bei
  // Doppel-Vorsilben nötig, um bis zur eigentlichen Wortwurzel vorzudringen
  // — jede Abzug-Runde macht den Stamm strikt kürzer, die Schleife endet
  // also garantiert; die Obergrenze ist nur eine zusätzliche Sicherung.
  // Global memoisiert: bei großen Familien (z.B. Englisch "-ing" mit
  // knapp 3000 Wörtern) taucht derselbe Stamm-String über viele
  // Vergleiche hinweg immer wieder auf — ohne Cache würde die
  // Vorsilben-Schleife (bis zu 5 Runden × ~70 Präfixe) bei jedem
  // einzelnen Vergleich neu durchlaufen, was bei Tausenden von
  // Wörtern × Hunderten von Anti-Wiederholungs-Einträgen spürbar
  // langsam wird.
  const coreStemCache = new Map();
  function coreStem(stem) {
    const cached = coreStemCache.get(stem);
    if (cached !== undefined) return cached;
    let s = stem;
    for (let i = 0; i < 5; i++) {
      let stripped = null;
      for (const p of KNOWN_PREFIXES) {
        if (s.length > p.length && s.startsWith(p)) {
          stripped = s.slice(p.length);
          break;
        }
      }
      if (stripped === null) break;
      s = stripped;
    }
    coreStemCache.set(stem, s);
    return s;
  }

  // Reiner String-Vergleich zweier Stämme (ohne Vorsilben-Abzug) —
  // Teilstring-Enthaltensein bei Mindestlänge ODER kleiner
  // Bearbeitungsabstand relativ zur Länge (= reine Flexionsform).
  function rawStemsSimilar(a, b) {
    if (a === b) return true;
    if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return true;
    const minLen = Math.min(a.length, b.length);
    if (minLen < 3) return false;
    const maxAllowedDist = Math.max(1, Math.floor(minLen * 0.3));
    if (Math.abs(a.length - b.length) > maxAllowedDist) return false;
    return levenshtein(a, b) <= maxAllowedDist;
  }

  function stemsAreSimilar(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (rawStemsSimilar(a, b)) return true;
    // Gleicher Kern nach Abzug einer bekannten Vorsilbe (z.B.
    // "mitgemacht"/"ausgemacht" → beide Kern "g" nach Abzug der
    // Reim-Endung "-emacht" und der Vorsilben "mit"/"aus", oder
    // "diene"/"bediene"/"verdiene" → beide Kern "d") — dasselbe
    // Basisverb, nur mit anderem Präfix, gilt als "zu ähnlich". WICHTIG:
    // das läuft unabhängig davon, wie kurz die rohen Stämme sind — sonst
    // würde z.B. "d" (diene) nie mit "bed" (bediene) verglichen, weil der
    // rohe Vergleich bei sehr kurzen Stämmen schon vorher abbricht.
    const ca = coreStem(a);
    const cb = coreStem(b);
    if (ca === a && cb === b) return false;
    if (ca === cb) return true;
    return rawStemsSimilar(ca, cb);
  }

  // Anti-Wiederholung über Strophen hinweg braucht nur ein RECENCY-Fenster,
  // kein unbegrenzt wachsendes Gedächtnis — sonst würde der fuzzy
  // Stamm-Abgleich (kein O(1)-Set-Lookup wie bei exakten Wörtern) über eine
  // lange Session hinweg immer teurer. 300 Stämme entsprechen bei 5
  // Wörtern/Strophe rund 60 zurückliegenden Strophen — mehr als genug, um
  // sich "frisch" anzufühlen, ohne unbegrenzt zu wachsen.
  const STEM_HISTORY_LIMIT = 300;

  function pushRecentStem(stemHistory, stem) {
    stemHistory.push(stem);
    if (stemHistory.length > STEM_HISTORY_LIMIT) stemHistory.shift();
  }

  /* ---------------------------------------------------------------------
     Anti-Wiederholung: bereits benutzte Wörter UND ihre Wortstämme merken
     (pro Sprache, in localStorage) und bei der Auswahl stark abwerten, bis
     ein Großteil des verfügbaren Wortschatzes durch ist — erst DANN dürfen
     Wörter wieder auftauchen ("Jede Runde soll sich frisch und einzigartig
     anfühlen", "bereits verwendete Wörter sollen möglichst lange nicht
     erneut erscheinen"). Der Stamm-Abgleich verhindert zusätzlich, dass
     eine bloße Flexionsform eines schon benutzten Worts (Plural, andere
     Zeitform, …) als "neu" durchgeht. Blockiert nie hart (ein zu kleiner
     Pool würde sonst das Spiel stoppen) — sie ist eine starke Präferenz in
     der Bewertung, kein Ausschluss.
     --------------------------------------------------------------------- */
  const USED_WORDS_KEY = "flowarena.usedRhymeWords.v2";
  const USED_RESET_THRESHOLD = 0.85; // ab 85% "verbraucht" wird zurückgesetzt

  function loadUsedWords(locale) {
    try {
      const all = JSON.parse(localStorage.getItem(USED_WORDS_KEY) || "{}");
      const entry = all[locale];
      if (Array.isArray(entry)) return { words: new Set(entry), stems: [] }; // Alt-Format (v1), ohne Stämme
      const stems = (entry?.stems || []).slice(-STEM_HISTORY_LIMIT); // beim Laden auf das Fenster kappen (falls älterer Stand größer war)
      return { words: new Set(entry?.words || []), stems };
    } catch (e) {
      return { words: new Set(), stems: [] };
    }
  }

  function saveUsedWords(locale, used) {
    try {
      const all = JSON.parse(localStorage.getItem(USED_WORDS_KEY) || "{}");
      all[locale] = { words: Array.from(used.words), stems: used.stems };
      localStorage.setItem(USED_WORDS_KEY, JSON.stringify(all));
    } catch (e) {
      /* localStorage evtl. nicht verfügbar — Anti-Wiederholung lebt dann nur für die Session */
    }
  }

  function countDistinctWords(bank) {
    let n = 0;
    bank.forEach((f) => { n += f.words.length; });
    return n;
  }

  /**
   * Wählt bis zu `count` Wörter aus einer Familie, bevorzugt exakte
   * Thema+Schwierigkeit-Treffer, füllt bei Bedarf mit dem nächstbesten
   * Match auf (nie mit erfundenen Wörtern — nur mit echten Wörtern
   * derselben Familie, die also garantiert weiterhin sauber reimen).
   * `used` (bereits benutzte Wörter/Stämme) senkt die Punktzahl deutlich
   * (Anti-Wiederholung), `streetMode` hebt Battle-Themen-Treffer und
   * höhere Schwierigkeit an (siehe docs/GAMEPLAY.md, "Street-Modus"). Nach
   * der Bewertung folgt eine GIERIGE Auswahl mit Stamm-Diversität: Wörter,
   * deren Stamm einem bereits FÜR DIESE STROPHE gewählten Wort zu ähnlich
   * ist, werden übersprungen — verhindert künstliche Reihen wie "kommt,
   * kommen, gekommen, ankommen" in derselben Strophe (siehe
   * stemsAreSimilar oben). Reicht die Vielfalt der Familie nicht aus, wird
   * trotzdem aufgefüllt (nie eine unvollständige Strophe).
   */
  function selectBestWords(family, difficulty, topic, count, used, streetMode) {
    // Cross-Strophen-Historie einmal VORAB in ein Set aus Kern-Stämmen
    // umwandeln (O(Historie), einmal pro Aufruf) statt für JEDES Wort der
    // Familie die ganze Historie einzeln fuzzy zu durchsuchen (O(Familie ×
    // Historie) — bei großen Familien wie dem englischen "-ing" mit knapp
    // 3000 Wörtern und bis zu 300 Historie-Einträgen sonst fast eine
    // Million teure Vergleiche PRO Strophe). Der O(1)-Set-Lookup auf dem
    // Kern-Stamm erkennt weiterhin Präfix-Varianten desselben Worts
    // ("kommt" vorhin benutzt → "ankommt" jetzt abgewertet), verliert nur
    // die feinere Editierdistanz-Erkennung für reine Cross-Strophen-
    // Flexionsformen — die bleibt innerhalb einer Strophe (unten) erhalten,
    // wo sie mit maximal `count` Einträgen ohnehin billig ist.
    const usedCoreStems = new Set((used?.stems || []).map((s) => coreStem(s)));
    const scored = family.words.map((word) => {
      let score = 0;
      if (topicMatches(word, topic)) score += 2;
      if (word.diff === difficulty) score += 1;
      if (streetMode) {
        if (word.topics.includes("battle")) score += 3;
        if (word.diff !== "leicht") score += 2;
      }
      const stem = wordStem(word.w, family.ending);
      if (used?.words?.has(word.w.toLowerCase())) score -= 5;
      else if (usedCoreStems.has(coreStem(stem))) score -= 3;
      return { word, score, stem };
    });
    scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);

    const picked = [];
    const pickedStems = [];
    for (const s of scored) {
      if (picked.length >= count) break;
      if (pickedStems.some((ps) => stemsAreSimilar(ps, s.stem))) continue;
      picked.push(s);
      pickedStems.push(s.stem);
    }
    // Auffüllen, falls die Familie zu wenig echte Stamm-Vielfalt bietet —
    // dann lieber eine ähnliche Form als eine unvollständige Strophe. Die
    // nötige Wiederholung wird dabei möglichst BREIT verteilt (jeweils die
    // am wenigsten vertretene Kern-Wurzel zuerst), statt sich auf ein-zwei
    // Wörter zu konzentrieren — z.B. "miene/biene/diene/verdiene/bediene"
    // wird zu "miene/biene/diene/verdiene" + genau EINE weitere Dopplung,
    // statt dieselbe Wurzel gleich dreimal aufzufüllen.
    if (picked.length < count) {
      const remaining = scored.filter((s) => !picked.includes(s));
      while (picked.length < count && remaining.length > 0) {
        const coreCounts = new Map();
        picked.forEach((p) => {
          const c = coreStem(p.stem);
          coreCounts.set(c, (coreCounts.get(c) || 0) + 1);
        });
        let bestIdx = 0;
        let bestCount = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const c = coreCounts.get(coreStem(remaining[i].stem)) || 0;
          if (c < bestCount) {
            bestCount = c;
            bestIdx = i;
            if (bestCount === 0) break;
          }
        }
        picked.push(remaining[bestIdx]);
        remaining.splice(bestIdx, 1);
      }
    }
    return picked.slice(0, count).map((s) => ({ w: s.word.w, stem: s.stem }));
  }

  /**
   * Liefert `count` Endwörter (Standard: GAMEPLAY_CONFIG.linesPerStanza) für
   * eine komplette Strophe — eine Familie, ein Wort pro Zeile. `locale`
   * wählt die Sprach-Wortbank (de/en/ru); ohne Angabe wird die aktuell
   * aktive UI-Sprache verwendet (siehe assets/js/i18n.js). `streetMode`
   * schaltet härtere Battle-Rap-Reimwörter/-Themen frei (siehe
   * selectBestWords) — Standardmodus bleibt neutral/allgemein.
   * @returns {{ words: string[], ending: string, familyId: string }}
   */
  function pickRhymeStanza({ difficulty = "mittel", topic = "freestyle", excludeFamilyIds = [], count = 5, locale, streetMode = false } = {}) {
    const activeLocale = locale || window.FlowI18n?.getLocale() || "de";
    const bank = buildMergedBank(activeLocale);

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

    // Anti-Wiederholung: bei Bedarf zurücksetzen, wenn der Großteil des
    // Sprach-Wortschatzes schon "verbraucht" ist (siehe USED_RESET_THRESHOLD).
    let used = loadUsedWords(activeLocale);
    const totalWords = countDistinctWords(bank);
    if (totalWords > 0 && used.words.size / totalWords >= USED_RESET_THRESHOLD) {
      used = { words: new Set(), stems: [] };
    }

    const family = pickFamilyWeighted(viable, difficulty);
    const picked = shuffle(selectBestWords(family, difficulty, topic, count, used, streetMode));
    const words = picked.map((p) => p.w);

    picked.forEach((p) => {
      used.words.add(p.w.toLowerCase());
      pushRecentStem(used.stems, p.stem);
    });
    saveUsedWords(activeLocale, used);

    return { words, ending: family.ending, familyId: family.id };
  }

  window.FlowRhyme = {
    pickRhymeStanza,
    buildMergedBank,
    // RHYME_BANKS/RHYME_BANK bleiben aus Kompatibilitätsgründen erhalten
    // (z.B. evaluation-provider.local.js sucht darüber die Endung einer
    // benutzten Familie) — zeigen jetzt auf die VOLLE, zusammengeführte
    // Bank (Kernbank + Zusatzbank + Komposita), nicht mehr nur die Kernbank.
    get RHYME_BANKS() {
      return {
        de: buildMergedBank("de"),
        en: buildMergedBank("en"),
        ru: buildMergedBank("ru"),
      };
    },
    get RHYME_BANK() {
      return buildMergedBank("de");
    },
  };
})(window);
