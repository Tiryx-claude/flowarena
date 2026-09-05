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

  // Themen-Schlüsselwörter PRO SPRACHE (siehe docs/I18N.md) — heuristische
  // Näherung, keine echte Sprachverständnis-Analyse. Fehlt ein Locale, wird
  // auf Deutsch zurückgefallen.
  const TOPIC_KEYWORDS_BY_LOCALE = {
    de: {
      love: ["liebe", "herz", "gefühl", "küss", "sehnsucht", "nah", "zärtlich", "baby", "für dich", "verlier"],
      money: ["geld", "cash", "bank", "reich", "million", "business", "hustle", "grind", "bezahl", "luxus"],
      street: ["straße", "block", "hood", "nacht", "gang", "ecke", "asphalt", "überleben", "viertel"],
      motivation: ["aufstieg", "kämpf", "ziel", "stark", "glaub", "aufgeben", "erfolg", "wille", "mut", "weiter"],
      battle: ["gegner", "schwach", "besieg", "king", "thron", "mic", "drop", "battle", "opp", "schlag"],
      humor: ["lustig", "witz", "lach", "komisch", "spaß", "clown", "albern", "quatsch"],
    },
    en: {
      love: ["love", "heart", "feel", "kiss", "longing", "close", "tender", "baby", "for you", "lose"],
      money: ["money", "cash", "bank", "rich", "million", "business", "hustle", "grind", "pay", "luxury"],
      street: ["street", "block", "hood", "night", "gang", "corner", "asphalt", "survive", "district"],
      motivation: ["rise", "fight", "goal", "strong", "believe", "give up", "success", "will", "courage", "keep going"],
      battle: ["opponent", "weak", "defeat", "king", "throne", "mic", "drop", "battle", "opp", "hit"],
      humor: ["funny", "joke", "laugh", "silly", "clown", "comic"],
    },
    ru: {
      love: ["любовь", "сердце", "чувств", "поцелу", "тоска", "рядом", "нежн", "детка", "для тебя", "теря"],
      money: ["деньг", "кэш", "банк", "богат", "миллион", "бизнес", "хастл", "грайнд", "плат", "роскош"],
      street: ["улиц", "квартал", "район", "ночь", "банда", "угол", "асфальт", "выжива", "двор"],
      motivation: ["взлёт", "бор", "цель", "силь", "вер", "сдава", "успех", "вол", "смел", "дальше"],
      battle: ["соперник", "слаб", "побед", "король", "трон", "микрофон", "дроп", "батл", "оппонент", "удар"],
      humor: ["смешн", "шутк", "смех", "глуп", "весел"],
    },
  };

  function currentTopicKeywords() {
    const locale = window.FlowI18n?.getLocale() || "de";
    return TOPIC_KEYWORDS_BY_LOCALE[locale] || TOPIC_KEYWORDS_BY_LOCALE.de;
  }

  function clamp(n, min = 30, max = 98) {
    return Math.max(min, Math.min(max, Math.round(n)));
  }

  function baseline(min = 55, max = 82) {
    return Math.round(min + Math.random() * (max - min));
  }

  // Deckt deutsche, englische UND russische Buchstaben gleichzeitig ab
  // (das Transkript kann in jeder der drei Sprachen vorliegen, siehe
  // docs/I18N.md — "Gameplay funktioniert in allen drei Sprachen identisch").
  function wordsOf(text) {
    return (text.toLowerCase().match(/[a-zäöüßа-яё]+/g) || []);
  }

  /* ---------- Einzelne Bewertungsdimensionen ---------- */

  function scoreReim(transcript, usedFamilyIds) {
    if (!transcript) return baseline(55, 78);
    const lower = transcript.toLowerCase();
    const locale = window.FlowI18n?.getLocale() || "de";
    const bank = window.FlowRhyme.RHYME_BANKS[locale] || window.FlowRhyme.RHYME_BANK;
    let hits = 0;
    usedFamilyIds.forEach((familyId) => {
      const family = bank.find((f) => f.id === familyId);
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
    const keywords = currentTopicKeywords()[topic];
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

  /* ---------- Kommentare/Headline/Engine-Label ----------
     Liegen NICHT mehr hier, sondern als Übersetzungs-Pools in
     assets/js/i18n-data.js (evaluation.comments.{normal,roast}.{top,mid,low},
     evaluation.headline.{top,mid,low}, evaluation.engineLabel) — dieselbe
     deutsche Formulierung 1:1 übernommen, plus Englisch/Russisch dazu. Der
     Roast-Modus bleibt in allen drei Sprachen IMMER auf die Performance
     bezogen (nie persönlich) und endet ermutigend (siehe docs/AI_ARCHITECTURE.md). */

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
      const headline = window.FlowI18n.t(`evaluation.headline.${bracket}`);
      const commentKey = `evaluation.comments.${roastMode ? "roast" : "normal"}.${bracket}`;
      const comment = window.FlowI18n.tPick(commentKey);
      const punchlineDetected = scores.punchlines >= 78;

      return {
        overall,
        scores,
        bracket,
        headline,
        comment,
        punchlineDetected,
        engineLabel: window.FlowI18n.t("evaluation.engineLabel"),
        transcript: hasTranscript ? cleanTranscript : null,
      };
    },
  };

  window.FlowAI = window.FlowAI || {};
  window.FlowAI.evaluation = LocalEvaluationProvider;
})(window);
