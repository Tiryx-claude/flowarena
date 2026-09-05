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

**Diese Gameplay-Mechanik gilt identisch für ALLE Spielmodi** — egal ob
Einzelspieler, öffentliches Match, privates Turnier oder Freundes-Duell (alle
drei Mehrspieler-Varianten laufen technisch über dasselbe `tournament.js`,
siehe `docs/TOURNAMENTS.md`/`docs/SOCIAL.md`). Der **einzige** Unterschied
zwischen den Modi liegt in der **Bewertung am Ende**:

| Modus | Bewertung |
|---|---|
| Einzelspieler | Die KI bewertet den Rap (8 Dimensionen) und gibt Feedback/Kommentar. |
| Mehrspieler (Match/Turnier/Duell) | Die Community stimmt per Voting über die Aufnahmen der Teilnehmenden ab (KI-Score fließt zusätzlich als Basis in den Gesamtstand ein, siehe `docs/TOURNAMENTS.md` §3). |

Kästchen, Ball, Timing, Strophen-/Zeilenregeln, Reimwort-Vergabe und
Schwierigkeitsgrad sind in jedem Modus exakt gleich — siehe Abschnitt 3.

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

## 3. Kästchen-, Zeilen- & Strophenregeln (gilt für JEDEN Spielmodus)

**Wichtig:** Diese Kästchen-/Ball-Mechanik ist identisch in **jedem
Spielmodus** — Einzelspieler (`challenge.js`), Turnier/öffentliches Match/
privates Turnier/Freundes-Duell (`tournament.js`, das Turnier-Lobbys sowohl
über einen privat geteilten Code als auch über die "Freund einladen"-Funktion
unterstützt, siehe `docs/TOURNAMENTS.md`/`docs/SOCIAL.md`). Nur die
**Bewertung am Ende** unterscheidet sich zwischen den Modi (siehe Abschnitt
"Unterschied zwischen den Modi" unten) — die eigentliche Gameplay-Mechanik
bleibt überall exakt gleich.

- Jede Strophe hat `GAMEPLAY_CONFIG.linesPerStanza` Zeilen (Standard: **5**)
  und damit 5 Endwörter aus derselben Reim-Familie (gleiche Endung, z.B. „-eit").
- **Jede Zeile hat genau `GAMEPLAY_CONFIG.boxesPerLine` Kästchen (Standard: 5)**
  — unabhängig von der Strophengröße (reiner Zufall, dass beide Zahlen 5
  sind: Zeilen/Strophe und Kästchen/Zeile sind zwei getrennte Werte).
  - Die **ersten `boxesPerLine - 1` Kästchen (Standard: 4) sind IMMER leer**
    und dienen nur als BPM-Taktanzeige — kein Text, nur ein pulsierender
    Punkt (`.word-slot--tact` in `assets/css/challenge.css`).
  - **Nur das letzte Kästchen** (Index `boxesPerLine - 1`) zeigt das
    Reimwort dieser Zeile (`.word-slot--word`) — sichtbar ab Zeilenbeginn,
    damit genug Zeit bleibt, die Zeile darauf hin zu planen.
  - Der Ball springt **im BPM-Takt über alle `boxesPerLine` Kästchen** —
    ein Kästchen pro Beat, `renderWordRack()`/`updateBall()` in
    `challenge.js` (bzw. dasselbe Prinzip in `tournament.js`). Man rappt
    frei während der ersten 4 Beats/Kästchen und landet das Reimwort exakt,
    wenn der Ball im 5. Kästchen ankommt.
  - Jede neue Zeile bekommt ihre **eigene, frische Reihe** dieser
    `boxesPerLine` Kästchen (nicht alle 5 Zeilen-Wörter der Strophe
    gleichzeitig sichtbar) — Fortschritt innerhalb der Strophe zeigt
    stattdessen der Badge „Strophe X von Y · Zeile A von 5 · Reimschema …“.
  - **Zeilen-Vorschau** (`#linePreviewList`, `renderLinePreview()` in
    `challenge.js`/`tournament.js`): unter der aktuellen (großen) Zeile
    zeigt eine dezente Liste die nächsten bis zu 3 Zeilen dieser Strophe —
    leicht transparent, mit wachsendem Abstand blasser (Tiefenstaffelung
    per `--preview-depth`), damit man kommende Reimwörter früh sieht und
    sich vorausschauend darauf einstellen kann. Bewusst nur innerhalb der
    aktuellen Strophe (letzte 1-2 Zeilen einer Strophe zeigen entsprechend
    weniger Vorschau-Einträge) — die Wörter der nächsten Strophe stehen
    erst kurz vor deren Beginn sicher fest, und der Strophenwechsel hat
    ohnehin sein eigenes Banner (`flashVerseBanner()`). Rein dekorativ:
    diese Liste wird **nie** für die Ball-Positionierung gemessen, ist also
    frei und ohne Risiko für die Beat-Synchronisation animierbar — jedes
    Vorschau-Item ist ein bei jedem Zeilenwechsel frisch eingefügter
    DOM-Knoten, wodurch seine CSS-„enter"-Animation automatisch neu
    abspielt (kein JS-Timing nötig, `assets/css/challenge.css`
    `.line-preview__item`/`@keyframes preview-item-in`).
  - **Sanfter Zeilenwechsel:** `#wordRackWrap` (Kästchen + Ball + Funken als
    EINE Einheit) rutscht bei jedem Zeilenwechsel mit einer kurzen
    `translateY`-Animation weich in Position (`.is-entering`,
    `@keyframes line-rack-enter`) — bewusst **kein** Opacity-Fade (der Ball
    darf beim Wechsel nie kurz unsichtbar werden) und bewusst auf dem
    WRAPPER statt auf den einzelnen Kästchen: Ball und Funken sind absolut
    relativ zu diesem Wrapper positioniert, wandern die Animation also 1:1
    mit — die gemessene relative Position Kästchen↔Wrapper (`boxCenters`,
    siehe Abschnitt 5) ändert sich durch eine gemeinsame
    Eltern-Transform-Verschiebung nicht, weshalb `measureBoxCenters()`
    unabhängig vom Animationsstand jederzeit korrekt misst.
- Nach jeder abgeschlossenen Strophe wird automatisch eine **neue,
  garantiert andere Reim-Familie** samt neuem Reimschema generiert
  (`excludeFamilyIds` in [`rhyme-engine.js`](../assets/js/rhyme-engine.js)),
  bis der Wortvorrat erschöpft ist — dann Reset.
- Strophenanzahl wird vor Spielstart gewählt (z.B. 3, 4 oder 5) —
  `GAMEPLAY_CONFIG.minStanzas`–`maxStanzas`, aktuell 1–10, Free-Deckel bei 5
  (`freeMaxStanzas`, siehe `docs/SHOP.md`).

## 4. Timing — strikt BPM-synchron, kein freier Modus mehr

Es gibt **keine** "Timer-Unterstützung an/aus"-Option mehr (Modul-2-Rewrite):
Der Zeilenwechsel ist immer exakt an den Beat gekoppelt, das ist jetzt die
Kernmechanik selbst, nicht mehr optional.

- `GAMEPLAY_CONFIG.beatsPerLine` (Standard: **5**, = `boxesPerLine`, siehe
  Abschnitt 3) legt fest, nach wie vielen Beats eine Zeile endet — ein Beat
  pro Kästchen, der Ball braucht also `beatsPerLine` Beats, um einmal durch
  die ganze Zeile (4 Takt-Kästchen + 1 Wort-Kästchen) zu hüpfen.
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

**Ball-Verhalten (Modul-2-Rewrite, Kästchen-Redesign siehe Abschnitt 3):**
Statt mehrerer dekorativer Figuren/Balken gibt es genau **ein** Element —
einen weißen Ball (`assets/css/beat-ball.css`, Skin je nach Shop-Auswahl,
siehe `docs/SHOP.md`). Er hüpft **jeden einzelnen Beat** vertikal (aus
`currentBeatPhase() % 1`, genauer: `beatsIntoLine % 1`) UND springt dabei
**bei jedem Beat auch horizontal zum jeweils nächsten der 5 Kästchen einer
Zeile** (`updateBall(beatsIntoLine, boxIndex)` in `challenge.js`, wobei
`boxIndex = floor(beatsIntoLine)`) — landet also 4× auf einem leeren
Takt-Kästchen und beim 5. Beat exakt auf dem Wort-Kästchen. Die
Kästchen-Positionen werden per `getBoundingClientRect()` gemessen
(`measureBoxCenters()`), einmalig direkt nach jedem Zeilenwechsel-Render (die
5 Kästchen werden pro Zeile komplett neu erzeugt) — `.word-slot`
transitioniert deshalb bewusst **nur** paint-Eigenschaften (Farbe/Schatten/
Transform), nie layoutverändernde wie `font-size`/`padding`, damit die
gemessene Position stabil bleibt und die Reihe nicht "hüpft". Bei **jeder**
Landung (auch auf den Takt-Kästchen): **Funken** (`assets/js/spark-fx.js`) —
auf dem Wort-Kästchen deutlich größer/mehr als auf den Takt-Kästchen, um den
eigentlichen "Treffer" hervorzuheben — und das Kästchen glüht kurz (Wort-
Kästchen: volles Magma-Glühen, `--magma-*`-Variablen, geteilt mit der
Homepage-Vorschau, siehe `docs/DESIGN_SYSTEM.md`; Takt-Kästchen: dezenterer
Blau-Puls). Bewusst nur EIN Anker statt mehrerer bewegter Elemente — klares
Rhythmusgefühl ohne Ablenkung vom eigentlichen Rap. **Identisch implementiert
in `tournament.js`** (siehe `docs/TOURNAMENTS.md` §5, warum dort bewusst
eigenständig statt geteilt) und als Lehrbeispiel in der Homepage-Vorschau
(`home.js`, `index.html`), damit man den echten Rhythmus schon vor dem
ersten Klick auf "Challenge starten" sieht.

Beats OHNE echte Audiodatei (`Beat.audioUrl === null`) nutzen weiterhin einen
**synthetischen Platzhalter-Klick** (`FlowSound.playBeatTick`, siehe
`assets/js/sound.js`). Seit dem Beat-Upload (BEACH/BERMUDA/TALLY, siehe
Abschnitt 8) gibt es zusätzlich echte Beat-Audiodateien: `assets/js/
beat-audio.js` lädt/dekodiert die Datei (gecacht pro URL) und startet sie
geloopt **exakt bei `clock.startTime`** — derselben AudioContext-Zeit, die
auch Ball-Animation und Zeilenwechsel treibt (siehe Abschnitt 5), also ohne
zweiten Timer und ohne Drift-Risiko. Läuft ein echter Beat, wird der
synthetische Klick für diese Challenge/Runde automatisch stummgeschaltet
(ein echter Song bringt seinen eigenen Rhythmus mit). Beides — synthetischer
Klick UND echte Datei — ist **Gameplay-Audio, unabhängig vom "Klick-Sounds"-
Setting**, kein optionaler UI-Sound.

## 6. Getestete BPM-Werte

Das Beat-Roster deckt aktuell 75–150 BPM ab (`data.js`):

| Beat | BPM | Audio |
|---|---|---|
| Cloud Drift | 75 | synthetischer Klick |
| Boom Bap Classic | 90 | synthetischer Klick |
| Midnight Cypher | 86 | synthetischer Klick |
| Street Anthem | 100 | synthetischer Klick |
| BEACH | 120 | echte Datei |
| BERMUDA | 130 | echte Datei |
| TALLY | 142 | echte Datei |
| Dark Trap Wave | 150 | synthetischer Klick |

Manuell durchgespielt (Solo-Challenge UND Turnier): Ball-Animation,
Zeilen-Timer und Zeilenwechsel liefen bei allen getesteten Tempi sichtbar
synchron zum jeweiligen Beat — bei den drei echten Audiodateien inklusive
hörbarer Song-Wiedergabe ohne Drift zum Ball, ohne Konsolenfehler.

## 7. Schwierigkeitsgrad → Wort-Komplexität (nicht Geschwindigkeit!)

`difficulty` beeinflusst **ausschließlich** die Auswahl der Endwörter
(Länge/Geläufigkeit), niemals das Timing:

| Schwierigkeit | Charakteristik |
|---|---|
| Leicht | kurze, geläufige Wörter (z.B. "Zeit", "Geld", "Herz") |
| Mittel | mittlere Länge/Geläufigkeit (z.B. "Freiheit", "Verstand") |
| Schwer | längere/seltenere, aber natürliche Wörter (z.B. "Einigkeit", "Übermacht") |

### 7.1 Reimwort-System (Modul 7, generalüberholt) — Umfang, Anti-Wiederholung, Street-Modus

Das Reimwort-System besteht seit Modul 7 aus drei Schichten, alle in
[`assets/js/rhyme-engine.js`](../assets/js/rhyme-engine.js) zusammengeführt:

1. **Kernbank** (in `rhyme-engine.js` selbst) — die ursprüngliche, von Hand
   geschriebene Wortliste (~90 Wörter/Sprache), höchste Qualitätsstufe.
2. **Zusatzbank** ([`assets/js/rhyme-data-generated.js`](../assets/js/rhyme-data-generated.js))
   — **>24.000 zusätzliche echte Wörter** (Deutsch ~8.700, Englisch ~7.500,
   Russisch ~8.800), einmalig durch eine Skript-Pipeline aus öffentlichen
   Frequenzwortlisten erzeugt (siehe Kopfkommentar dort für die vollständige
   Methodik — Filterung nach Sperrliste/Länge/Skript, Gruppierung nach
   Reimfamilie, Häufigkeits-basierte Schwierigkeitsstufe). **Ehrlichkeit:**
   das ist ein Ergebnis einer automatisierten Pipeline, kein 1:1 von Hand
   geprüftes Wörterbuch wie die Kernbank — bekannte Grenzen (vereinzelte
   Eigennamen/Fremdwörter) stehen im Kopfkommentar der Datei.
3. **Generative Ergänzung** ([`assets/js/rhyme-generator.js`](../assets/js/rhyme-generator.js),
   nur Deutsch) — eine kleine, von Hand geprüfte Zuordnungsliste echter
   Komposita (z.B. "Raum" → "Vorraum"/"Unterraum"/"Nebenraum"/…). **Wichtig:**
   eine frühere Fassung verkettete blind Präfixe (Vor-/Nach-/Über-/…) mit
   JEDEM Kernbank-Wort — ein Test im Browser zeigte, dass das für viele
   Basiswörter Nicht-Wörter erzeugt ("Nachtraum", "Vorbaum" klingen falsch;
   nur wenige deutsche Nomen sind so kompositionsfreudig wie "Raum"). Das
   verletzt die Kernregel ("keine unnatürlichen Wörter nur damit sich etwas
   reimt", siehe Abschnitt 1) — deshalb jetzt durch echte, geprüfte
   Zuordnungen ersetzt statt automatischer Verkettung. Für Englisch/Russisch
   bewusst nicht eingesetzt (Präfigierungsregeln dort unzuverlässiger, siehe
   Kopfkommentar der Datei) — die Frische kommt dort ausschließlich aus dem
   riesigen echten Wortschatz der Zusatzbank plus Anti-Wiederholung (Punkt 4).

4. **Anti-Wiederholung**: `pickRhymeStanza()` merkt sich pro Sprache, welche
   Wörter bereits benutzt wurden (`localStorage`,
   `flowarena.usedRhymeWords.v1`) und wertet sie bei der nächsten Auswahl
   deutlich ab (kein hartes Ausschließen — ein zu kleiner Wortpool würde
   sonst das Spiel blockieren). Erst wenn **75%** des gesamten
   Sprach-Wortschatzes "verbraucht" sind, wird zurückgesetzt. Zusätzlich
   bekommt jede neue Strophe automatisch eine neue Reim-Familie
   (`excludeFamilyIds`, siehe Abschnitt 3) — Wiederholung ist also auf zwei
   Ebenen (Familie UND Einzelwort) unwahrscheinlich gemacht.

5. **Themenfeld** (`topic`): `freestyle` (offen), `love`, `money`, `street`,
   `motivation`, `battle`, `humor`, `random`. Wörter der Zusatzbank bekommen
   ihre Themen zusätzlich zu `freestyle`/`random` über einen
   Stichwort-Abgleich (Teilstring-Heuristik, siehe Kopfkommentar der
   generierten Datei) — kein echtes Sprachverständnis, aber ausreichend, um
   Runden spürbar zum gewählten Stil passen zu lassen.

6. **Street-Modus** (`settings.streetMode`, unabhängiger Ein/Aus-Schalter vor
   Spielbeginn, siehe Einstellungs-Drawer bzw. Turnier-erstellen-Panel):
   verändert **nur** die Wortauswahl-Gewichtung in `selectBestWords()` — Battle-
   Themen-Treffer und nicht-"leicht"-Schwierigkeit bekommen einen deutlichen
   Punktebonus, wodurch Strophen im Street-Modus spürbar härter/
   konfrontativer ausfallen (mehr "Gegner"/"Sieg"/"Krone"/"Niederlage"-Vokabular,
   seltener die einfachsten Wörter). Ausgeschaltet bleibt die Auswahl neutral
   und themenoffen wie zuvor. **Beide Modi nutzen exakt dasselbe Spielsystem**
   (Timing, Bewertung, Strophen-/Zeilenregeln) — nur welche Wörter
   ausgewählt werden, unterscheidet sich. Bewusst keine Freischaltung von
   Obszönitäten/Slurs — die Zusatzbank-Sperrliste gilt in JEDEM Modus
   identisch (siehe Kopfkommentar von `rhyme-data-generated.js`).

Neue Sprache/neue Wörter/neues Thema ergänzen: siehe
[`docs/I18N.md`](I18N.md) Abschnitt 6.

## 8. Beat-Daten & echte Audiodateien

`Beat` in `data.js`: `{ id, name, category, bpm, audioUrl, premiumOnly?,
unlockCost? }`. Es gibt weiterhin keinen echten Beat-Upload/Admin-Bereich
(kein Backend) — neue Beats werden von Hand als weiterer Eintrag in `BEATS`
ergänzt und ihre Datei manuell unter `assets/audio/beats/` abgelegt.

**Erste drei echte Beat-Audiodateien** (statt reiner Platzhalter):

| Beat | Datei | BPM | Producer-Credit |
|---|---|---|---|
| BEACH | `assets/audio/beats/beach.mp3` | 120 | @cmllerx @n4vyn4vy |
| BERMUDA | `assets/audio/beats/bermuda.mp3` | 130 | @cmllerx @rio leyva |
| TALLY | `assets/audio/beats/tally.mp3` | 142 | @cmllerx @prod.drumma |

Regel für die Integration weiterer echter Beats (wie hier angewandt): gibt es
bereits einen Platzhalter mit **exakt derselben BPM**, wird dessen `name`/
`category`/`audioUrl` ersetzt (ID und Premium-/Preis-Status bleiben
unangetastet, damit nichts anderswo referenziert bricht — siehe "BEACH"
ersetzt den 120-BPM-Platzhalter "Neon Drive" unter derselben ID `b4`). Gibt
es noch keinen Platzhalter mit dieser BPM, wird ein neuer Eintrag ergänzt
("BERMUDA"/"TALLY", neue IDs `b7`/`b8`). Alle anderen Beats bleiben
unverändert.

`category` zeigt bei den drei echten Beats bewusst den Producer-Credit
(`"@cmllerx @…"`) statt eines Genres — an exakt der Stelle, an der bei den
übrigen Beats sonst "Trap"/"Boom Bap"/… steht (Beat-Liste im
Einstellungs-Drawer, Shop-Katalog, Turnier-erstellen-Auswahl) — die Credits
sind dadurch überall sichtbar, ohne dass an der UI selbst etwas geändert
werden musste. Der native `<select>` in der Turnier-Auswahl hängt den
Credit zusätzlich an den Options-Text an (`renderTourneyBeatOptions()` in
`home.js`), da ein `<option>` keine zweite Zeile darstellen kann.

**Wiedergabe** läuft über `assets/js/beat-audio.js`: lädt/dekodiert die
Datei per `fetch` + `AudioContext.decodeAudioData` (gecacht pro URL, wird
schon während Intro/Countdown bzw. Turnier-Lobby vorgeladen), startet sie
als geloopten `AudioBufferSourceNode` **exakt bei `clock.startTime`** — der
IDENTISCHEN AudioContext-Zeit, aus der auch Ball-Animation und
Zeilenwechsel berechnet werden (siehe Abschnitt 5) — und schaltet dafür den
synthetischen Klick-Track für diese Challenge/Runde ab. Schlägt das Laden
fehl (z.B. Datei nicht erreichbar), fällt automatisch auf den synthetischen
Klick zurück, die Challenge bricht nicht ab. `BEATS_PER_LINE`/`BeatClock`/
Zeilenwechsel-Logik selbst musste dafür nicht angefasst werden — die BPM
ist so oder so die zentrale Zeitbasis, unabhängig davon, ob der Ton
synthetisch oder eine echte Datei ist. Gilt identisch für Solo-Challenge
(`challenge.js`) und Turnier (`tournament.js`).

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
