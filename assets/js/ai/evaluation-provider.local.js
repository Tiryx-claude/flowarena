/* =========================================================================
   FlowArena — EvaluationProvider: local-mock (Modul 3)
   -------------------------------------------------------------------------
   Bewertet Reimqualität, Endwort-Nutzung, Flow, Kreativität, Originalität,
   Themenbezug, Punchlines und Unterhaltungswert. WICHTIG: Das ist eine lokale, rein
   text-/heuristikbasierte Näherung (keine echte Sprachmodell-Analyse) —
   ausführlich als solche gekennzeichnet, damit niemand die Zahlen für bare
   Münze nimmt. Ersetzbar durch einen echten Modell-Call mit identischem
   Rückgabeformat (siehe registry.js).

   Roast-Modus: schaltet einen frecheren Kommentar-Ton frei, bleibt aber
   IMMER auf die Performance bezogen (Reime, Timing, Zögern) — nie auf
   Aussehen, Identität oder sonstige persönliche Merkmale. Endet immer
   ermutigend. Content-Policy ausführlich in docs/AI_ARCHITECTURE.md.
   ========================================================================= */

(function (window) {
  "use strict";

  const TOPIC_KEYWORDS = {
    love: ["liebe", "herz", "gefühl", "küss", "sehnsucht", "nah", "zärtlich", "baby", "für dich", "verlier"],
    money: ["geld", "cash", "bank", "reich", "million", "business", "hustle", "grind", "bezahl", "luxus"],
    street: ["straße", "block", "hood", "nacht", "gang", "ecke", "asphalt", "überleben", "viertel"],
    motivation: ["aufstieg", "kämpf", "ziel", "stark", "glaub", "aufgeben", "erfolg", "wille", "mut", "weiter"],
    battle: ["gegner", "schwach", "besieg", "king", "thron", "mic", "drop", "battle", "opp", "schlag"],
  };

  function clamp(n, min = 30, max = 98) {
    return Math.max(min, Math.min(max, Math.round(n)));
  }

  function baseline(min = 55, max = 82) {
    return Math.round(min + Math.random() * (max - min));
  }

  function wordsOf(text) {
    return (text.toLowerCase().match(/[a-zäöüß]+/g) || []);
  }

  /* ---------- Einzelne Bewertungsdimensionen ---------- */

  function scoreReim(transcript, usedFamilyIds) {
    if (!transcript) return baseline(55, 78);
    const lower = transcript.toLowerCase();
    let hits = 0;
    usedFamilyIds.forEach((familyId) => {
      const family = window.FlowRhyme.RHYME_BANK.find((f) => f.id === familyId);
      const ending = family?.ending.replace("-", "") || "";
      if (ending && lower.includes(ending)) hits++;
    });
    return clamp(45 + (hits / Math.max(usedFamilyIds.length, 1)) * 50);
  }

  function scoreEndwortNutzung(transcript, allEndWords) {
    // Misst direkt die Kernregel: wurden die vorgegebenen Endwörter im
    // Transkript wiedergefunden? (Ohne Zeitstempel pro Zeile können wir nur
    // prüfen, OB das Wort irgendwo vorkommt — nicht, ob exakt am Zeilenende.)
    if (!allEndWords || allEndWords.length === 0) return baseline(55, 75);
    if (!transcript) return baseline(50, 70);
    const lower = transcript.toLowerCase();
    const hits = allEndWords.filter((w) => lower.includes(w.toLowerCase())).length;
    return clamp(35 + (hits / allEndWords.length) * 65);
  }

  function scoreFlow(transcript, totalVerses) {
    if (!transcript) return baseline(58, 80);
    const wordCount = wordsOf(transcript).length;
    const expected = totalVerses * 4 * 9; // ~9 Wörter/Freestyle-Zeile als Richtwert
    const ratio = wordCount / Math.max(expected, 1);
    return clamp(50 + ratio * 50);
  }

  function scoreKreativitaet(transcript) {
    if (!transcript) return baseline(55, 75);
    const words = wordsOf(transcript);
    if (!words.length) return baseline(55, 75);
    const unique = new Set(words);
    return clamp(40 + (unique.size / words.length) * 60);
  }

  function scoreOriginalitaet(transcript) {
    // Grobe Näherung: Anteil längerer/selteneren Wörter als Hinweis auf
    // ungewöhnlichere Wortwahl statt Standard-Vokabular.
    if (!transcript) return baseline(50, 75);
    const words = wordsOf(transcript);
    if (!words.length) return baseline(50, 75);
    const longWords = words.filter((w) => w.length >= 7).length;
    return clamp(45 + (longWords / words.length) * 90);
  }

  function scoreThemenbezug(transcript, topic) {
    const keywords = TOPIC_KEYWORDS[topic];
    if (!keywords) return clamp(baseline(60, 82)); // freestyle/random/battle ohne feste Liste → neutral
    if (!transcript) return baseline(50, 72);
    const lower = transcript.toLowerCase();
    const hits = keywords.filter((k) => lower.includes(k)).length;
    return clamp(40 + Math.min(hits, 5) * 12);
  }

  function scorePunchlines(transcript) {
    // Näherung: Varianz der Segmentlängen (durch Satzzeichen/Pausen grob
    // getrennt) als Hinweis auf rhythmische "Setup–Punch"-Struktur.
    if (!transcript) return baseline(50, 74);
    const segments = transcript.split(/[.!?,]+/).map((s) => s.trim()).filter(Boolean);
    if (segments.length < 2) return clamp(baseline(45, 65));
    const lengths = segments.map((s) => wordsOf(s).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
    return clamp(45 + Math.min(variance, 20) * 3.2);
  }

  function scoreUnterhaltung(scores) {
    // Komposit-Näherung aus Kreativität, Punchlines und Flow — echte
    // Unterhaltung ist subjektiv, das hier ist bewusst nur ein Proxy.
    const blend = scores.kreativitaet * 0.35 + scores.punchlines * 0.4 + scores.flow * 0.25;
    return clamp(blend + (Math.random() * 8 - 4));
  }

  /* ---------- Kommentar-Pools ---------- */

  const COMMENTS = {
    normal: {
      top: [
        "Yo, das saß! Deine Reime kamen so sauber wie ein frisch gepresstes Shirt — weiter so! 🔥",
        "Respekt — du hast das Reimschema gerockt, als wär's dein Job. Nächstes Level ist bereit für dich. 🎤",
        "Das war richtig stark! Flow, Timing, Reime — heute war einfach dein Tag. 👑",
      ],
      mid: [
        "Solide Runde! Ein, zwei Reime waren etwas wackelig, aber der Flow saß größtenteils. 👏",
        "Nicht schlecht! Mit ein bisschen mehr Mut bei den Reimwörtern holst du beim nächsten Mal noch mehr raus. 💪",
        "Guter Versuch — du hast das Thema getroffen, an der Reim-Präzision ist noch Luft nach oben. 🎯",
      ],
      low: [
        "Erste Runde, erste Erfahrung — jeder Rapper hat mal klein angefangen. Beim nächsten Take sitzt's besser! 🌱",
        "War etwas holprig, aber du bist drangeblieben — genau das zählt. Nimm den Beat nochmal, du hast das drauf. 🎧",
        "Kein Grund zur Sorge: Timing und Reime brauchen Wiederholung. Nächste Runde wird smoother. 🔁",
      ],
    },
    roast: {
      top: [
        "Okay, ok, Show-off! Du wusstest genau, dass diese Punchline sitzt, und hast trotzdem so getan als wär's nix. 😏🔥",
        "Ich hab nach Fehlern gesucht — Fehlanzeige. Entweder du hast geübt, oder du bist einfach unfair gut. 👑",
        "Selbst dein Zögern klang geplant. Respekt, du Show-Off — aber lass auch mal was für die anderen übrig. 🎤",
      ],
      mid: [
        "Da war 'ne Zeile, bei der selbst der Beat kurz gezweifelt hat — aber der Rest hat's rausgerissen. 😄",
        "Dein Flow hatte kurz einen Rage-Quit-Moment, aber du bist wieder reingekommen. Ehre, dass du weitergemacht hast. 👏",
        "Ein Reim davon reimte sich eher 'auf Verdacht' — aber hey, mutig war's allemal. 🎯",
      ],
      low: [
        "Das war... mutig. Der Beat hat länger durchgehalten als der Reim, aber du warst wenigstens laut genug. 😅",
        "Ich glaub, dein Reimwort hat sich kurz selbst gesucht und nicht gefunden — aber Comeback-Potenzial ist da. 🎧",
        "Okay, das brauchte definitiv einen zweiten Take. Aber ehrlich: schlimmere Freestyles hab ich schon gehört. 🔁",
      ],
    },
  };

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* ---------- Provider ---------- */

  const LocalEvaluationProvider = {
    async evaluate({ transcript, difficulty, topic, totalVerses, usedFamilyIds = [], allEndWords = [], roastMode = false }) {
      const hasTranscript = !!(transcript && transcript.trim().length > 10);
      const cleanTranscript = hasTranscript ? transcript.trim() : "";

      const scores = {
        reim: scoreReim(cleanTranscript, usedFamilyIds),
        endwortNutzung: scoreEndwortNutzung(cleanTranscript, allEndWords),
        flow: scoreFlow(cleanTranscript, totalVerses),
        kreativitaet: scoreKreativitaet(cleanTranscript),
        originalitaet: scoreOriginalitaet(cleanTranscript),
        themenbezug: scoreThemenbezug(cleanTranscript, topic),
      };
      scores.punchlines = scorePunchlines(cleanTranscript);
      scores.unterhaltung = scoreUnterhaltung(scores);

      const weights = { reim: 0.18, endwortNutzung: 0.16, flow: 0.14, kreativitaet: 0.12, originalitaet: 0.1, themenbezug: 0.1, punchlines: 0.1, unterhaltung: 0.1 };
      const overall = clamp(
        Object.entries(weights).reduce((sum, [key, w]) => sum + scores[key] * w, 0)
      );

      const bracket = overall >= 82 ? "top" : overall >= 62 ? "mid" : "low";
      const headline = {
        top: "🔥 Absolute Ansage!",
        mid: "👏 Solide Runde!",
        low: "💪 Nächstes Mal sitzt's noch besser",
      }[bracket];

      const pool = roastMode ? COMMENTS.roast : COMMENTS.normal;
      const comment = pick(pool[bracket]);
      const punchlineDetected = scores.punchlines >= 78;

      return {
        overall,
        scores,
        bracket,
        headline,
        comment,
        punchlineDetected,
        engineLabel: "Lokale Heuristik v1",
        transcript: hasTranscript ? cleanTranscript : null,
      };
    },
  };

  window.FlowAI = window.FlowAI || {};
  window.FlowAI.evaluation = LocalEvaluationProvider;
})(window);
