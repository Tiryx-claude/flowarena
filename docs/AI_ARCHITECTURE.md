# FlowArena — KI-Architektur (Modul 3)

Beschreibt, wie die KI-Funktionen angeschlossen sind, damit sie **austauschbar**
bleiben — heute lokale Heuristiken, morgen ein echtes Sprachmodell, ohne dass
die Spiellogik (`challenge.js`) angefasst werden muss.

## 1. Grundprinzip: Provider-Registry

```
challenge.js  ──spricht nur mit──▶  window.FlowAI.{rhyme, evaluation, speech}
                                              │
                                              ▼
                                   austauschbare Provider-Implementierung
                                   (aktuell: *.local.js / *.web.js)
```

Alle drei Provider werden in [`assets/js/ai/registry.js`](../assets/js/ai/registry.js)
als Interface deklariert (JSDoc-Kommentare mit exakten Signaturen) und von
je einer eigenen Datei implementiert:

| Provider | Interface-Methode | Aktuelle Implementierung |
|---|---|---|
| `FlowAI.rhyme` | `generateStanza({difficulty, topic, excludeFamilyIds, count})` → `Promise<{words: string[], ending, familyId, source}>` | [`rhyme-provider.local.js`](../assets/js/ai/rhyme-provider.local.js) — kuratierte Wortliste ([`rhyme-engine.js`](../assets/js/rhyme-engine.js)) |
| `FlowAI.evaluation` | `evaluate({transcript, difficulty, topic, totalVerses, usedFamilyIds, allEndWords, roastMode})` → `Promise<{overall, scores, bracket, headline, comment, punchlineDetected, engineLabel, transcript}>` | [`evaluation-provider.local.js`](../assets/js/ai/evaluation-provider.local.js) — Text-Heuristiken |
| `FlowAI.speech` | `isSupported`, `start()`, `stop()`, `getTranscript()` | [`speech-provider.web.js`](../assets/js/ai/speech-provider.web.js) — Web Speech API |

**Warum async/Promise-Interfaces, obwohl die lokale Logik synchron ist?**
Damit ein echter API-Call (Netzwerk-Request) später exakt dieselbe Signatur
erfüllt — `challenge.js` awaited bereits jetzt so, als käme die Antwort von
einem Server.

## 2. Upgrade-Pfad: einen Provider austauschen

Beispiel — Reimwörter auf ein echtes Sprachmodell umstellen:

1. Neue Datei `assets/js/ai/rhyme-provider.claude.js` erstellen, die dasselbe
   `generateStanza()`-Interface implementiert, intern aber
   `fetch("/api/ai/rhyme", …)` aufruft.
2. Am Dateiende `window.FlowAI.rhyme = ClaudeRhymeProvider;` setzen.
3. In `challenge.html`/`index.html` das `<script>`-Tag von
   `rhyme-provider.local.js` durch `rhyme-provider.claude.js` ersetzen (oder
   beide laden und die lokale Variante nur als Fallback nutzen, falls der
   Server nicht erreichbar ist).
4. **Fertig** — `challenge.js` ändert sich nicht, weil es nur `window.FlowAI.rhyme.generateStanza(...)` kennt.

**Wichtiger Sicherheitshinweis:** Ein echter Claude-/OpenAI-API-Key darf
**niemals** im Client-JS landen (jede:r Besucher:in könnte ihn im
Quellcode/Netzwerk-Tab auslesen). Ein "echter" Provider braucht daher immer
einen kleinen Backend-Endpoint (`/api/ai/rhyme`, `/api/ai/evaluate`), der den
Key serverseitig hält — das kommt mit dem Node/Prisma-Umstieg (Modul 4+).
Bis dahin bleiben die lokalen Heuristik-Provider die produktive Lösung.

## 3. Reimwörter

- `generateStanza()` liefert **`count` einzelne Wörter** (Standard: 5 — ein
  Wort pro Zeile der Strophe), nie eine ganze Zeile/Strophe Text — exakt wie
  vorgegeben. Alle `count` Wörter kommen aus derselben Reim-Familie.
- `excludeFamilyIds` sorgt dafür, dass das Reimschema (Wort-Endung, z.B.
  `-eit`, `-and`) von Strophe zu Strophe wechselt (siehe auch
  [`docs/GAMEPLAY.md`](GAMEPLAY.md)).
- `difficulty` steuert Wortlänge/Geläufigkeit, `topic` filtert nach
  thematisch passenden Wörtern. Eine Familie mit weniger als `count` echten
  Wörtern ist automatisch nicht wählbar — die Auswahl greift dann zu einer
  anderen Familie, statt Wörter zu erzwingen (`rhyme-engine.js →
  pickRhymeStanza`, mit der absichtlich dünn gehaltenen `-onne`-Familie als
  eingebautem Testfall für genau dieses Verhalten).

## 4. Speech-to-Text

- Web Speech API (`SpeechRecognition`), Sprache `de-DE`, `continuous: true`
  mit automatischem Neustart bei stillebedingtem `onend`.
- **Limitierungen** (bewusst in Kauf genommen für einen kostenlosen,
  serverlosen Prototyp): nur Chromium-Browser, braucht Internetzugriff
  (Browser schickt Audio an den Spracherkennungsdienst des Herstellers),
  funktioniert nicht von `file://` aus, keine Wort-Zeitstempel.
- Fällt sauber zurück auf "kein Transkript" — die Challenge, die Aufnahme und
  die Bewertung funktionieren trotzdem (Bewertung nutzt dann plausible
  Schätzwerte statt textbasierter Analyse, klar als solche im Code markiert).
- Austausch-Kandidat für höhere Genauigkeit/Offline-Fähigkeit: ein
  `speech-provider.whisper.js`, der den aufgenommenen Audio-Blob an einen
  Backend-Endpoint (Whisper-API o.ä.) schickt.

## 5. Bewertung — acht Dimensionen

| Dimension | Heuristik (lokal, Platzhalter) |
|---|---|
| Reimqualität | Zielreim-Endungen im Transkript wiedergefunden? |
| Endwort-Nutzung | Wie viele der konkret vorgegebenen Endwörter tauchen im Transkript auf? |
| Flow | Wortmenge relativ zur erwarteten Zeilenzahl |
| Kreativität | Type-Token-Ratio (Anteil einzigartiger Wörter) |
| Originalität | Anteil längerer/selteneren Wörter als grobe Näherung |
| Themenbezug | Treffer gegen eine kleine Keyword-Liste je Thema |
| Punchlines | Varianz der Segmentlängen als Rhythmus-Proxy |
| Unterhaltungswert | Komposit aus Kreativität + Punchlines + Flow |

Gewichtung des Gesamt-Scores: Reimqualität 18 %, Endwort-Nutzung 16 %, Flow
14 %, Kreativität 12 %, Originalität 10 %, Themenbezug 10 %, Punchlines 10 %,
Unterhaltungswert 10 % (einstellbar in `evaluation-provider.local.js → weights`).

"Endwort-Nutzung" ist die direkteste Messung der Kernregel: Wurden die
tatsächlich vorgegebenen Wörter (nicht nur die Reim-Endung) im Transkript
wiedergefunden? Da wir keine Zeilen-Zeitstempel haben, wird nur geprüft, OB
das Wort irgendwo vorkommt — nicht, ob exakt am Zeilenende.

**Alles hier ist explizit eine grobe, text-basierte Näherung — kein echtes
Sprachmodell.** Ohne Transkript (kein Mikro/keine Spracherkennung) werden
plausible Schätzwerte statt Analyse-Ergebnisse zurückgegeben, damit die
Challenge nie hart fehlschlägt.

Ein echter Provider (Modul-3-Upgrade) würde stattdessen Transkript + Metadaten
an ein Sprachmodell schicken und könnte zusätzlich **echte Audio-Analyse**
(Rhythmus/Timing direkt aus der Tonspur statt nur aus dem Text, phonetische
statt nur textuelle Reimprüfung) liefern.

## 6. Roast-Modus — Content-Policy

Der Roast-Modus (Einstellung `roastMode`, Toggle in Modul 1) schaltet einen
frecheren Ton für `comment` frei. Regeln, die **beide** Kommentar-Pools
(`normal` und `roast`) einhalten:

- Bezieht sich **ausschließlich auf die Performance** (Timing, Reime,
  Zögern, Wortwahl) — nie auf Aussehen, Identität, Herkunft oder sonstige
  persönliche Merkmale.
- Kein Ton, der als beleidigend statt spielerisch-neckend gelesen wird.
- Endet **immer** auf einer ermutigenden Note, auch im `low`-Bracket.
- Gleiche Bracket-Logik (`top`/`mid`/`low`) wie im Normal-Modus — Roast
  ändert nur den Ton, nicht die zugrunde liegende Bewertung.

Ein echter Modell-Provider müsste diese Regeln als Teil des System-Prompts
übernehmen (z.B. explizite Guardrails gegen Kommentare zu Identität/Aussehen).

## 7. Ergebnis-Inszenierung

Rein UI-seitig in `challenge.js` (`animateScoreRing`, `spawnScoreBurst`,
`renderScoreBreakdown`), unabhängig von der KI-Anbindung:

- Score-Ring zählt animiert von 0 auf den finalen Wert hoch (900ms, easeOutCubic).
- Kurzer Partikel-"Burst" um den Score-Ring beim Reveal.
- Soundeffekt (`FlowSound.playReveal(bracket)`) — Tonhöhe variiert je nach
  Bewertungs-Bracket (top/mid/low), aber immer positiv/ermutigend im Klang.
- Die 8 Bewertungszeilen faden gestaffelt ein, Balken animieren auf ihre Breite.

## 8. Transparenz in der UI

Der Ergebnis-Screen zeigt ein kleines **Engine-Badge**
("🧠 KI-Engine: Lokale Heuristik v1"), das aus `result.engineLabel` befüllt
wird. Sobald ein echter Provider aktiv ist, ändert sich dieser Text
automatisch (z.B. "Claude 3.5" o.ä.) — Nutzer:innen sehen also immer, welche
Engine gerade ausgewertet hat.
