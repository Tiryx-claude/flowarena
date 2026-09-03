# FlowArena — Spielablauf & Reimlogik (Modul 2, überarbeitet)

Beschreibt die Spiel-Regeln, den State-Machine-Ablauf und die BPM-Synchronisation.
Implementiert in [`challenge.html`](../challenge.html) +
[`assets/js/challenge.js`](../assets/js/challenge.js) +
[`assets/js/beat-clock.js`](../assets/js/beat-clock.js).

## 1. Kernregel

**Die KI schreibt NIEMALS den Rap.** Sie liefert ausschließlich die
vorgegebenen **Endwörter** — ein Wort pro Zeile, nie eine fertige Zeile, nie
eine Strophe. Der Mensch improvisiert und spricht den kompletten Text selbst,
live ins Mikrofon. Es gibt **kein Texteingabefeld** — die Seite zeigt nur die
Endwörter an.

## 2. Ablauf (State Machine)

```
intro → countdown (3,2,1,Los!) → live (Strophen × Zeilen, beat-getaktet) → evaluating → results
```

- **intro**: Zeigt die Modul-1-Einstellungen, fragt bei Klick auf "Los geht's"
  Mikrofonzugriff an (optional — ohne Zugriff läuft die Challenge trotzdem,
  nur ohne Aufnahme/Transkript/Bewertung der Stimme).
- **countdown**: 3 → 2 → 1 → "Los!", danach startet die BeatClock (siehe unten).
- **live**: Strophen-Schleife mit dem 5-Wörter-Rack, siehe unten.
- **evaluating**: kurze simulierte Ladezeit (Platzhalter-Statustexte), danach Bewertung.
- **results**: Score, 8-dimensionale Bewertung, KI-Kommentar, Transkript, Audio-Player.

## 3. Strophen- & Zeilenregeln — JEDE Zeile hat ein Endwort

- Jede Strophe hat `GAMEPLAY_CONFIG.linesPerStanza` Zeilen (Standard: **5**).
- **Alle 5 Zeilen** bekommen je ein eigenes, vorgegebenes Endwort — nicht nur
  die letzte. Alle 5 Wörter einer Strophe kommen aus derselben Reim-Familie
  (gleiche Endung, z.B. „-eit").
- Das Word-Rack zeigt **alle 5 Wörter gleichzeitig** an:
  `[ RAUM ] [ BAUM ] [ KAUM ] [ TRAUM ] [ SCHAUM ]` — erledigte Zeilen
  abgeschwächt mit Haken, die aktive Zeile groß/glühend hervorgehoben,
  kommende Zeilen dezent im Hintergrund (`assets/css/challenge.css → .word-slot`).
- Jede neue Strophe bekommt garantiert eine **andere Reim-Familie** als alle
  vorherigen Strophen dieser Challenge (`excludeFamilyIds` in
  [`rhyme-engine.js`](../assets/js/rhyme-engine.js)), bis der Wortvorrat
  erschöpft ist — dann Reset.
- Strophenanzahl kommt aus den Modul-1-Einstellungen (`verses`,
  `GAMEPLAY_CONFIG.minStanzas`–`maxStanzas`, aktuell 1–10).

## 4. Timing — strikt BPM-synchron, kein freier Modus mehr

Es gibt **keine** "Timer-Unterstützung an/aus"-Option mehr (Modul-2-Rewrite):
Der Zeilenwechsel ist immer exakt an den Beat gekoppelt, das ist jetzt die
Kernmechanik selbst, nicht mehr optional.

- `GAMEPLAY_CONFIG.beatsPerLine` (Standard: **4** = ein Takt) legt fest, nach
  wie vielen Beats eine Zeile endet.
- `msPerBeat = 60000 / bpm`, `lineDuration = beatsPerLine × msPerBeat`.
- Der BPM-Wert kommt direkt vom gewählten Beat (`Beat.bpm` in `data.js`) —
  90 BPM läuft spürbar langsamer als 150 BPM, siehe Abschnitt 6.

## 5. BPM-Synchronisation — `BeatClock`

**Problem der alten Implementierung:** Beat-Klick-Sound lief über
`setInterval`, die Ball-Animation über eine CSS-`animation-duration`, der
Zeilenwechsel über `requestAnimationFrame` + `performance.now()` — drei
unabhängige Uhren, die über eine längere Challenge auseinanderdriften können.

**Lösung:** [`assets/js/beat-clock.js`](../assets/js/beat-clock.js) definiert
eine einzige `BeatClock`-Klasse, die auf `AudioContext.currentTime` basiert —
derselben Uhr, nach der der Web-Audio-Scheduler selbst Töne abspielt:

- `beatTime(n)` / `lineTime(n)` berechnen jeden Zeitpunkt **direkt aus einem
  festen Ursprung** (`startTime + n × Intervall`), nie durch wiederholtes
  Aufaddieren — dadurch kann sich über viele Zeilen/Strophen hinweg kein
  Fehler aufsummieren.
- Beat-Sounds werden per **Look-ahead-Scheduler** (25ms-Tick, 120ms
  Vorausschau) sample-genau eingeplant (`osc.start(audioTime)`), statt sofort
  abgespielt zu werden.
- `currentBeatPhase()` liefert jeden Frame frisch die aktuelle Beat-Phase
  (z.B. `2.4` = 40% durch Beat 2) — Basis für die Ball-Animation.
- **Ein** `requestAnimationFrame`-Loop in `challenge.js` liest diese Uhr pro
  Frame und treibt drei Dinge synchron an: Ball-Position, die
  Zeilen-Timer-Leiste, und den Zeilenwechsel-Check
  (`clock.now() >= clock.lineTime(n+1)`).

**Ball-Verhalten (Modul-2-Rewrite):** Statt mehrerer dekorativer Figuren/
Balken gibt es genau **ein** Element — einen weißen Ball
(`assets/css/beat-ball.css`), der auf dem aktuell aktiven Wort-Kästchen
**jeden einzelnen Beat** hoch- und runterhüpft (vertikal, aus
`currentBeatPhase() % 1`) und **exakt beim Zeilenwechsel** zum nächsten
Kästchen springt (horizontal, `updateBall()` in `challenge.js`). Die
Kästchen-Positionen werden per `getBoundingClientRect()` gemessen
(`measureBoxCenters()`), einmalig direkt nach jedem Zeilenwechsel-Render —
`.word-slot` transitioniert deshalb bewusst **nur** paint-Eigenschaften
(Farbe/Schatten/Transform), nie layoutverändernde wie `font-size`/`padding`,
damit die gemessene Position stabil bleibt und die Reihe nicht "hüpft". Bei
jeder Landung: **Funken** (`assets/js/spark-fx.js`) + das Kästchen glüht wie
**Magma** (`--magma-*`-Variablen, geteilt mit der Homepage-Vorschau, siehe
`docs/DESIGN_SYSTEM.md`). Bewusst nur EIN Anker statt mehrerer bewegter
Elemente — klares Rhythmusgefühl ohne Ablenkung vom eigentlichen Rap.

Der Beat-Klick-Track selbst ist weiterhin ein **synthetischer Platzhalter**
(`FlowSound.playBeatTick`, siehe `assets/js/sound.js`) — es liegen noch keine
echten Beat-Audiodateien vor (`Beat.audioUrl` ist aktuell überall `null`,
siehe Abschnitt 8). Er läuft **unabhängig vom "Klick-Sounds"-Setting**, weil
er Gameplay-Audio ist, kein optionaler UI-Sound.

## 6. Getestete BPM-Werte

Das Beat-Roster deckt bewusst 90 / 120 / 150 BPM ab (`data.js`):

| Beat | BPM |
|---|---|
| Boom Bap Classic | 90 |
| Neon Drive | 120 |
| Dark Trap Wave | 150 |

Alle drei wurden manuell durchgespielt: Ball-Animation, Zeilen-Timer und
Zeilenwechsel liefen bei allen dreien sichtbar synchron zum jeweiligen Tempo
(90 BPM spürbar langsamer/entspannter als 150 BPM), ohne Konsolenfehler.

## 7. Schwierigkeitsgrad → Wort-Komplexität (nicht Geschwindigkeit!)

`difficulty` beeinflusst **ausschließlich** die Auswahl der Endwörter
(Länge/Geläufigkeit), niemals das Timing:

| Schwierigkeit | Charakteristik |
|---|---|
| Leicht | kurze, geläufige Wörter (z.B. "Zeit", "Geld", "Herz") |
| Mittel | mittlere Länge/Geläufigkeit (z.B. "Freiheit", "Verstand") |
| Schwer | längere/seltenere, aber natürliche Wörter (z.B. "Einigkeit", "Übermacht") |

## 8. Beat-Daten & Admin-Anbindung

`Beat` in `data.js`: `{ id, name, category, bpm, audioUrl }`. `audioUrl` ist
für alle aktuellen Beats `null` — es gibt noch keinen Beat-Upload/Admin-Bereich
und keine echten Audiodateien. Das Gameplay ist aber bereits darauf
vorbereitet: Sobald ein Beat eine echte Datei bekommt, kann die Wiedergabe
darauf umgestellt werden, **ohne** `BEATS_PER_LINE`/`BeatClock`/Zeilenwechsel-
Logik anzufassen — die BPM sind so oder so die zentrale Zeitbasis, unabhängig
davon, ob der Ton synthetisch oder eine echte Datei ist. Neue Beats werden
einfach als weiterer Eintrag in `BEATS` ergänzt.

## 9. Aufnahme, Live-Transkript, Auswertung

- **Aufnahme**: `MediaRecorder` (Browser-nativ) zeichnet Mikrofon-Audio als
  `audio/webm`-Blob auf. Beginnt automatisch mit dem Beat (kein manueller
  Start), endet automatisch nach der letzten Zeile der letzten Strophe
  (`finishChallenge()` stoppt Recorder + Speech-Recognition + BeatClock im
  selben Zug). Abspielbar, herunterladbar (`<a download>`), veröffentlichbar
  in den lokalen Community-Feed (`FlowCommunity.addPost`, siehe
  `docs/COMMUNITY.md`) — die Audiodatei selbst bleibt dabei lokal auf dem
  Ergebnis-Screen, nur Text/Score landen im Post (siehe dort, Abschnitt 6).
- **Live-Transkript**: `SpeechRecognition`/`webkitSpeechRecognition` (Web
  Speech API), nur zur Nachbearbeitung — NICHT die Eingabemethode während des
  Spiels. Ohne Unterstützung/Freigabe: sauberer Fallback, die Challenge bleibt
  spielbar.
- **Bewertung**: `evaluateSession()`-Äquivalent in
  `assets/js/ai/evaluation-provider.local.js` — 8 Dimensionen, siehe
  [`docs/AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md). Lokale Heuristik, kein
  echtes Sprachmodell — deutlich als solche gekennzeichnet.

## 10. Schnittstellen für Modul 3 (KI-Architektur)

```js
// assets/js/rhyme-engine.js + ai/rhyme-provider.local.js
FlowAI.rhyme.generateStanza({ difficulty, topic, excludeFamilyIds, count })
  → { words: string[], ending, familyId }
// count = GAMEPLAY_CONFIG.linesPerStanza (Standard 5). Liefert EIN Wort pro
// Zeile, nie Text/Zeilen. Wird zu einem echten API-Call, der thematisch
// passende, natürlich klingende Endwörter liefert.

// assets/js/ai/evaluation-provider.local.js
FlowAI.evaluation.evaluate({ transcript, difficulty, topic, totalVerses,
                              usedFamilyIds, allEndWords, roastMode })
  → { overall, scores: { reim, endwortNutzung, flow, kreativitaet,
                          originalitaet, themenbezug, punchlines, unterhaltung },
      bracket, headline, comment, punchlineDetected, engineLabel, transcript }
```

Details, Content-Policy (Roast-Modus) und Upgrade-Pfad:
[`docs/AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md).

## 11. Grundlage für Turniere, Community & Shop

Der Challenge-Ablauf ist so geschnitten, dass er von genau EINER
Einstellungsquelle (`loadSettings()`, aktuell `localStorage`) startet und mit
genau EINEM Ergebnis-Objekt endet (`result` aus
`FlowAI.evaluation.evaluate(...)`, siehe Abschnitt 10) — das ist der
Anschlusspunkt für alles, was später darauf aufbaut:

- **Community** (bereits verdrahtet): `finishChallenge()` → `renderResults()`
  → Klick auf "Veröffentlichen" → `FlowCommunity.addPost({ authorName,
  authorAvatar, topic, beatName, bpm, overall, excerpt })` — landet im Feed
  auf `community.html` und im eigenen Profil. Siehe `docs/COMMUNITY.md`.
- **Shop/Credits** (bereits verdrahtet): direkt im Anschluss an die
  Bewertung ruft `finishChallenge()` `FlowProfile.recordChallengeResult(...)`
  auf — vergibt Credits, aktualisiert Stats, prüft neue Abzeichen. Der Shop
  (`index.html`-Panel + `profile.html`) liest/schreibt denselben
  `FlowProfile`-Store, komplett unabhängig vom Challenge-Ablauf selbst.
- **Turniere** (Modul 3, inzwischen gebaut): `tournament.html`/`tournament.js`
  nutzen genau dieses Prinzip — eigene Einstellungsquelle
  (`tournament.settings` statt `loadSettings()`), eigene BeatClock-/
  Word-Rack-/Ball-Instanz pro Runde, und dasselbe `FlowAI.evaluation`-Ergebnis
  fließt in `FlowTournament.submitRoundResult()` statt in
  `FlowProfile.recordChallengeResult()` direkt. Details, warum dabei bewusst
  NICHT `challenge.js` selbst wiederverwendet/refactored wurde (Risiko für
  den getesteten Solo-Ablauf), sowie die kompletten Fairness-/
  Multiplayer-Mechanik: [`docs/TOURNAMENTS.md`](TOURNAMENTS.md).
