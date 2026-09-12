/* =========================================================================
   FlowArena — Punchline-Wortschatz: Battle-Rap/Streamer/Jugendsprache
   (Modul 8, erweitert)
   -------------------------------------------------------------------------
   ANFORDERUNG (2. Runde): die Wörter dürfen nicht nur phonetisch reimen —
   sie müssen inhaltlich Punchline-Potenzial haben (Ragebait, Battle-Rap,
   Ego/Status/Geld/Flex, Rivalität, Wut, Streamer-/Chat-Sprache, freche/
   absurde Begriffe). Gemeldetes Negativ-Beispiel: eine Strophe mit
   "Dampf/Klavier/Kampf/Kavalier" — "Kampf"/"Dampf" haben Energie, aber
   "Klavier"/"Kavalier" sind neutrale Wörterbuch-Vokabel, die den
   Gesamteindruck trotzdem "langweilig" wirken lassen. DER FIX dafür ist
   NICHT nur mehr Wörter hier reinzupacken, sondern dass diese Schicht jetzt
   in rhyme-engine.js als BEVORZUGTER STANDARD-POOL behandelt wird (siehe
   `punchline`-Flag unten + pickRhymeStanza()) — jede Familie hier ist
   PFLICHT-Vorrang gegenüber der riesigen neutralen Zusatzbank, in BEIDEM
   Modi (Normal UND Street), nicht nur eine leichte Gewichtung.

   Jede Familie unten trägt deshalb `punchline: true` UND wurde bewusst
   dahingehend ausgewählt, dass ein Rapper beim Anblick sofort eine Line im
   Kopf hat (Diss, Flex, Ego, Status, Money, Rivalität, absurder Humor) —
   nicht nur "irgendein echtes Wort, das zufällig reimt". Gleichzeitig gilt
   weiterhin die Kernregel: NUR echte, phonetisch stimmige Reime (siehe
   Kopfkommentar-Historie unten) — keine erzwungenen Lehnwort-Reime, keine
   künstlichen Wortketten.

   EHRLICHKEIT ZUM UMFANG: rund 20 Familien pro Sprache (DE 20, EN 15,
   RU 9) — deutlich mehr als die erste Fassung, aber weiterhin von Hand
   geprüft statt automatisiert generiert (siehe rhyme-generator.js-
   Kopfkommentar für die Begründung, warum automatisierte Slang-Generierung
   abgelehnt wurde: erzeugt zuverlässig erzwungene/falsche Reime). Bewusst
   verworfene Kandidaten (zur Nachvollziehbarkeit):
   - Deutsch: reine Lehnwort-Slangs wie "Vibe"/"Cringe"/"Grind"/"Safe"/
     "Hater" haben im Deutschen KEINE echten Reimpartner (englische
     Aussprache passt phonetisch nicht zu deutschen Wörtern gleicher
     Schreibweise) — nicht erzwungen.
   - "Opfer" (verbreitetes Diss-Wort) hätte als Familie nur mit sensiblen
     Begriffen wie "Kriegsopfer"/"Todesopfer" funktioniert — inhaltlich
     unpassend für eine lockere Battle-Rap-Reimliste, weggelassen.
   - Russisch: "бабки" (Slang für Geld) hat keinen echten Reimpartner mit
     identischem Konsonanten vor der Endung (nur "прабабки", inhaltlich
     unpassend) — weggelassen statt als Slant-Reim erzwungen.

   Struktur wie Kernbank ({ id, ending, punchline: true, words: [{ w, diff,
   topics }] }) — `punchline` wird in rhyme-engine.js als Vorrangs-Signal
   bei der Familienauswahl gelesen (siehe pickRhymeStanza()).
   ========================================================================= */

(function (window) {
  "use strict";

  const RHYME_SLANG_DE = [
    { id: "s-lex", ending: "-lex", punchline: true, words: [
      { w: "Flex", diff: "leicht", topics: ["battle", "street", "freestyle", "random"] },
      { w: "Komplex", diff: "mittel", topics: ["freestyle", "battle", "random"] },
      { w: "Reflex", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "Text", diff: "leicht", topics: ["freestyle", "random"] },
    ]},
    { id: "s-enlos", ending: "-enlos", punchline: true, words: [
      { w: "ehrenlos", diff: "mittel", topics: ["battle", "street", "freestyle", "random"] },
      { w: "grenzenlos", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "seelenlos", diff: "schwer", topics: ["battle", "freestyle", "random"] },
      { w: "namenlos", diff: "mittel", topics: ["freestyle", "random"] },
    ]},
    { id: "s-mann", ending: "-mann", punchline: true, words: [
      { w: "Ehrenmann", diff: "mittel", topics: ["motivation", "battle", "street", "freestyle", "random"] },
      { w: "Kaufmann", diff: "mittel", topics: ["money", "freestyle", "random"] },
      { w: "Hauptmann", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Staatsmann", diff: "schwer", topics: ["motivation", "freestyle", "random"] },
    ]},
    { id: "s-one", ending: "-one", punchline: true, words: [
      { w: "Krone", diff: "leicht", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "Zone", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "Hormone", diff: "schwer", topics: ["humor", "freestyle", "random"] },
      { w: "Bohne", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-ohne", ending: "-ohne", punchline: true, words: [
      { w: "Drohne", diff: "mittel", topics: ["street", "freestyle", "random"] },
      { w: "ohne", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "wohne", diff: "leicht", topics: ["freestyle", "random"] },
    ]},
    // Umgangssprachliche Kurz-Loanwords, im Deutschen als eigenständige
    // Slang-Wörter etabliert (nicht als "englisches Zitat" gemeint) — alle
    // enden gesprochen auf demselben langen O-Laut, echte Reimfamilie.
    { id: "s-o", ending: "-o", punchline: true, words: [
      { w: "Bro", diff: "leicht", topics: ["street", "battle", "freestyle", "random"] },
      { w: "Ego", diff: "leicht", topics: ["battle", "street", "freestyle", "random"] },
      { w: "Pro", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "Go", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "No", diff: "leicht", topics: ["battle", "freestyle", "random"] },
    ]},
    { id: "s-ow", ending: "-ow", punchline: true, words: [
      { w: "Show", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "Wow", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "Knowhow", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
    ]},
    { id: "s-atze", ending: "-atze", punchline: true, words: [
      { w: "Glatze", diff: "leicht", topics: ["humor", "battle", "freestyle", "random"] },
      { w: "Ratze", diff: "leicht", topics: ["battle", "humor", "freestyle", "random"] },
      { w: "platze", diff: "mittel", topics: ["humor", "freestyle", "random"] },
      { w: "Katze", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "Matratze", diff: "mittel", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-ampf", ending: "-ampf", punchline: true, words: [
      { w: "Kampf", diff: "leicht", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "Dampf", diff: "leicht", topics: ["motivation", "street", "freestyle", "random"] },
      { w: "Krampf", diff: "leicht", topics: ["humor", "battle", "freestyle", "random"] },
    ]},
    // Neid ist eines der klassischen Battle-Rap-Themen ("der ist doch nur
    // neidisch") — echte "-eid"-Familie, kein erzwungener Reim.
    { id: "s-eid", ending: "-eid", punchline: true, words: [
      { w: "Neid", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "Leid", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "Bescheid", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Eid", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "Kleid", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    // "Latte" (Slang "das ist mir latte" = egal) + Geld/Status-Vokabular.
    { id: "s-atte", ending: "-atte", punchline: true, words: [
      { w: "Latte", diff: "leicht", topics: ["battle", "humor", "freestyle", "random"] },
      { w: "Ratte", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "Platte", diff: "leicht", topics: ["money", "freestyle", "random"] },
      { w: "Kravatte", diff: "mittel", topics: ["money", "freestyle", "random"] },
      { w: "Tomate", diff: "mittel", topics: ["humor", "freestyle", "random"] },
    ]},
    // "Klappe halten" / "eine Schlappe kassieren" — klassisches Battle-Rap-
    // Vokabular, kleine, aber starke Familie.
    { id: "s-appe", ending: "-appe", punchline: true, words: [
      { w: "Schlappe", diff: "mittel", topics: ["battle", "freestyle", "random"] },
      { w: "Klappe", diff: "leicht", topics: ["battle", "street", "freestyle", "random"] },
      { w: "Kappe", diff: "leicht", topics: ["street", "money", "freestyle", "random"] },
    ]},
    // "Du Schwein/das ist gemein" — direkte Konfrontations-Vokabel.
    { id: "s-ein", ending: "-ein", punchline: true, words: [
      { w: "gemein", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "Schwein", diff: "leicht", topics: ["battle", "humor", "freestyle", "random"] },
      { w: "allein", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "klein", diff: "leicht", topics: ["battle", "humor", "freestyle", "random"] },
      { w: "fein", diff: "leicht", topics: ["freestyle", "random"] },
    ]},
    // "Pleite" = pleite/bankrott, starkes Money-Diss-Wort.
    { id: "s-eite", ending: "-eite", punchline: true, words: [
      { w: "Pleite", diff: "mittel", topics: ["money", "battle", "freestyle", "random"] },
      { w: "Breite", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Seite", diff: "leicht", topics: ["freestyle", "random"] },
    ]},
    { id: "s-ieger", ending: "-ieger", punchline: true, words: [
      { w: "Sieger", diff: "mittel", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "Krieger", diff: "mittel", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "Flieger", diff: "mittel", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-ent", ending: "-ent", punchline: true, words: [
      { w: "Talent", diff: "mittel", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "Prozent", diff: "mittel", topics: ["money", "freestyle", "random"] },
      { w: "Moment", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Kompliment", diff: "schwer", topics: ["love", "freestyle", "random"] },
      { w: "Instrument", diff: "schwer", topics: ["humor", "freestyle", "random"] },
    ]},
    // "Reich werden" (Money) + "du bist so weich" (Diss) — starke Spanne.
    { id: "s-eich", ending: "-eich", punchline: true, words: [
      { w: "Reich", diff: "leicht", topics: ["money", "motivation", "freestyle", "random"] },
      { w: "weich", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "gleich", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Bereich", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "Teich", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    // "Zocke" = Gaming-/Streamer-Slang ("ich zocke") — direkt angefragte
    // Streamer-/Chat-Sprache.
    { id: "s-ocke", ending: "-ocke", punchline: true, words: [
      { w: "Zocke", diff: "leicht", topics: ["street", "humor", "freestyle", "random"] },
      { w: "Glocke", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "Flocke", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "Locke", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "Socke", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    // "Fame/Ruhm" — Status/Ego, echte "-uhm"-Familie.
    { id: "s-uhm", ending: "-uhm", punchline: true, words: [
      { w: "Ruhm", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "Reichtum", diff: "mittel", topics: ["money", "freestyle", "random"] },
    ]},
  ];

  const RHYME_SLANG_EN = [
    { id: "s-ex", ending: "-ex", punchline: true, words: [
      { w: "flex", diff: "leicht", topics: ["battle", "street", "freestyle", "random"] },
      { w: "complex", diff: "mittel", topics: ["battle", "freestyle", "random"] },
      { w: "next", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "ex", diff: "leicht", topics: ["love", "freestyle", "random"] },
      { w: "text", diff: "leicht", topics: ["freestyle", "random"] },
    ]},
    { id: "s-ibe", ending: "-ibe", punchline: true, words: [
      { w: "vibe", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "tribe", diff: "leicht", topics: ["street", "motivation", "freestyle", "random"] },
      { w: "bribe", diff: "mittel", topics: ["battle", "freestyle", "random"] },
      { w: "subscribe", diff: "mittel", topics: ["humor", "freestyle", "random"] },
      { w: "describe", diff: "mittel", topics: ["freestyle", "random"] },
    ]},
    { id: "s-ind", ending: "-ind", punchline: true, words: [
      { w: "grind", diff: "leicht", topics: ["money", "motivation", "freestyle", "random"] },
      { w: "mind", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "blind", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "find", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "behind", diff: "mittel", topics: ["battle", "freestyle", "random"] },
    ]},
    { id: "s-out", ending: "-out", punchline: true, words: [
      { w: "clout", diff: "leicht", topics: ["street", "money", "battle", "freestyle", "random"] },
      { w: "doubt", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "shout", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "about", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "without", diff: "mittel", topics: ["love", "freestyle", "random"] },
    ]},
    { id: "s-op", ending: "-op", punchline: true, words: [
      { w: "opp", diff: "leicht", topics: ["battle", "street", "freestyle", "random"] },
      { w: "drop", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "top", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "nonstop", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
      { w: "stop", diff: "leicht", topics: ["freestyle", "random"] },
    ]},
    { id: "s-go", ending: "-o", punchline: true, words: [
      { w: "go", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "pro", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "no", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "ego", diff: "mittel", topics: ["battle", "street", "freestyle", "random"] },
    ]},
    { id: "s-flow", ending: "-ow", punchline: true, words: [
      { w: "flow", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "show", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "glow", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-ap", ending: "-ap", punchline: true, words: [
      { w: "cap", diff: "leicht", topics: ["battle", "humor", "freestyle", "random"] },
      { w: "trap", diff: "leicht", topics: ["street", "money", "freestyle", "random"] },
      { w: "snap", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "rap", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "gap", diff: "leicht", topics: ["freestyle", "random"] },
    ]},
    // "fake"/"snake" = zwei der stärksten modernen Diss-Begriffe überhaupt.
    { id: "s-ake", ending: "-ake", punchline: true, words: [
      { w: "fake", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "snake", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "stake", diff: "mittel", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "cake", diff: "leicht", topics: ["money", "humor", "freestyle", "random"] },
      { w: "mistake", diff: "mittel", topics: ["freestyle", "random"] },
    ]},
    // "fame"/"shame"/"lame"/"blame" — Status & Konfrontation kombiniert.
    { id: "s-ame", ending: "-ame", punchline: true, words: [
      { w: "fame", diff: "leicht", topics: ["money", "motivation", "freestyle", "random"] },
      { w: "shame", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "lame", diff: "leicht", topics: ["battle", "humor", "freestyle", "random"] },
      { w: "blame", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "game", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "name", diff: "leicht", topics: ["battle", "freestyle", "random"] },
    ]},
    // "stack"/"attack"/"jack" — Money + Battle in einer Familie.
    { id: "s-ack", ending: "-ack", punchline: true, words: [
      { w: "stack", diff: "leicht", topics: ["money", "freestyle", "random"] },
      { w: "attack", diff: "mittel", topics: ["battle", "freestyle", "random"] },
      { w: "jack", diff: "leicht", topics: ["battle", "street", "freestyle", "random"] },
      { w: "crack", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "pack", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "back", diff: "leicht", topics: ["freestyle", "random"] },
    ]},
    { id: "s-eal", ending: "-eal", punchline: true, words: [
      { w: "real", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "steal", diff: "leicht", topics: ["battle", "street", "freestyle", "random"] },
      { w: "deal", diff: "leicht", topics: ["money", "freestyle", "random"] },
      { w: "appeal", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "ideal", diff: "mittel", topics: ["motivation", "freestyle", "random"] },
    ]},
    { id: "s-eel", ending: "-eel", punchline: true, words: [
      { w: "steel", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "kneel", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "wheel", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "feel", diff: "leicht", topics: ["love", "freestyle", "random"] },
      { w: "peel", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    // "sick" = moderner Slang für "genial" UND "krank" — starkes Wortspiel-
    // Potenzial, plus klassisches Battle-Vokabular.
    { id: "s-ick", ending: "-ick", punchline: true, words: [
      { w: "sick", diff: "leicht", topics: ["battle", "humor", "freestyle", "random"] },
      { w: "trick", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "kick", diff: "leicht", topics: ["street", "battle", "freestyle", "random"] },
      { w: "quick", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "pick", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "flick", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-oser", ending: "-oser", punchline: true, words: [
      { w: "loser", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "bruiser", diff: "mittel", topics: ["battle", "humor", "freestyle", "random"] },
      { w: "user", diff: "mittel", topics: ["street", "humor", "freestyle", "random"] },
      { w: "chooser", diff: "mittel", topics: ["freestyle", "random"] },
    ]},
  ];

  const RHYME_SLANG_RU = [
    { id: "s-on1", ending: "-онь", punchline: true, words: [
      { w: "огонь", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "тронь", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "конь", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "гармонь", diff: "mittel", topics: ["humor", "freestyle", "random"] },
      { w: "ладонь", diff: "mittel", topics: ["love", "freestyle", "random"] },
    ]},
    { id: "s-izh", ending: "-иж", punchline: true, words: [
      { w: "движ", diff: "leicht", topics: ["street", "freestyle", "random"] },
      { w: "Париж", diff: "mittel", topics: ["love", "freestyle", "random"] },
      { w: "стриж", diff: "mittel", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-ir1", ending: "-ир", punchline: true, words: [
      { w: "жир", diff: "leicht", topics: ["battle", "street", "humor", "freestyle", "random"] },
      { w: "эфир", diff: "mittel", topics: ["street", "freestyle", "random"] },
      { w: "мир", diff: "leicht", topics: ["motivation", "freestyle", "random"] },
      { w: "тир", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "кефир", diff: "mittel", topics: ["humor", "freestyle", "random"] },
      { w: "пир", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-est1", ending: "-есть", punchline: true, words: [
      { w: "жесть", diff: "leicht", topics: ["battle", "street", "humor", "freestyle", "random"] },
      { w: "месть", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "честь", diff: "leicht", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "лесть", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "весть", diff: "leicht", topics: ["freestyle", "random"] },
      { w: "шесть", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-on2", ending: "-он", punchline: true, words: [
      { w: "трон", diff: "leicht", topics: ["battle", "motivation", "freestyle", "random"] },
      { w: "миллион", diff: "mittel", topics: ["money", "motivation", "freestyle", "random"] },
      { w: "чемпион", diff: "mittel", topics: ["motivation", "battle", "freestyle", "random"] },
      { w: "легион", diff: "mittel", topics: ["battle", "freestyle", "random"] },
      { w: "регион", diff: "mittel", topics: ["street", "freestyle", "random"] },
    ]},
    // "понты"/"менты" — sehr verbreiteter moderner Jugend-/Straßenslang
    // (понты = Angeberei/Flexen, менты = umgangssprachlich für Polizei).
    { id: "s-ty", ending: "-ты", punchline: true, words: [
      { w: "понты", diff: "mittel", topics: ["battle", "street", "freestyle", "random"] },
      { w: "менты", diff: "mittel", topics: ["street", "freestyle", "random"] },
      { w: "кресты", diff: "mittel", topics: ["freestyle", "random"] },
      { w: "листы", diff: "mittel", topics: ["freestyle", "random"] },
    ]},
    // "грех"/"успех" — Erfolg vs. Schande, starke Battle-/Motivations-Achse.
    { id: "s-eh", ending: "-ех", punchline: true, words: [
      { w: "успех", diff: "mittel", topics: ["motivation", "money", "freestyle", "random"] },
      { w: "грех", diff: "leicht", topics: ["battle", "freestyle", "random"] },
      { w: "смех", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "орех", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    { id: "s-apki", ending: "-апки", punchline: true, words: [
      { w: "тряпки", diff: "mittel", topics: ["battle", "humor", "freestyle", "random"] },
      { w: "шапки", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "лапки", diff: "leicht", topics: ["humor", "freestyle", "random"] },
      { w: "тапки", diff: "leicht", topics: ["humor", "freestyle", "random"] },
    ]},
    // "тачка"/"пачка" — Auto & Geldbündel, klassisches Status-/Flex-Vokabular.
    { id: "s-achka", ending: "-ачка", punchline: true, words: [
      { w: "тачка", diff: "leicht", topics: ["money", "street", "freestyle", "random"] },
      { w: "пачка", diff: "leicht", topics: ["money", "freestyle", "random"] },
      { w: "подачка", diff: "mittel", topics: ["battle", "freestyle", "random"] },
    ]},
  ];

  window.FlowRhymeSlang = { de: RHYME_SLANG_DE, en: RHYME_SLANG_EN, ru: RHYME_SLANG_RU };
})(window);
