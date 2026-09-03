# FlowArena — Turniere & Multiplayer (Modul 3)

## 1. Ehrlichkeit zuerst: die Grenzen dieses Prototyps

**Es gibt kein Backend und keine echte geräteübergreifende Synchronisation.**
Turniere leben komplett in `localStorage` DIESES EINEN BROWSERS
(`assets/js/tournament-data.js`, Key `flowarena.tournaments.v1`). Das bedeutet
konkret:

- Ein Raum-Code funktioniert **nur innerhalb desselben Browsers**, in dem das
  Turnier erstellt wurde — nicht zwischen zwei echten Geräten.
- Da auch das **Profil** pro Browser (nicht pro Tab) gilt, kann es in diesem
  Prototyp technisch nur EINE echte teilnehmende Person geben — Host und
  Beitretende:r sind, sobald sie denselben Browser nutzen, dieselbe Identität
  (`id: 'me'` in `tournament-data.js`).
- Um den kompletten Ablauf trotzdem allein durchspielen zu können, gibt es
  **"Bots hinzufügen (Demo)"** — simulierte Mitspieler:innen mit zufälligen
  Namen/Avataren und zufälligen, plausiblen Rundenergebnissen (kein echtes
  Audio, klar als **"🤖 Simulierter Take (Demo)"** gekennzeichnet).
- "Hochladen" bedeutet hier: das Ergebnis wird in den gemeinsamen
  Turnier-Datensatz in `localStorage` geschrieben (`submitRoundResult`) —
  das ist der ehrliche lokale Ersatz für einen echten Server-Upload.

Die Datenstruktur ist bewusst so geschnitten, dass ein echtes Backend
(WebSocket-Räume, echte Accounts, echter Datei-Upload) sie später ersetzen
kann, ohne dass `tournament.html`/`tournament.js` strukturell umgebaut werden
müssten — nur `tournament-data.js`s Funktionen würden gegen API-Calls
ausgetauscht.

## 2. Ablauf

```
index.html (erstellen/beitreten)
  → tournament.html: Lobby (Warten, Bots hinzufügen)
  → pro Runde: Countdown → Live (Beat-Ball, alle bekommen dieselben Wörter)
    → Voting (Takes ansehen, liken)
  → nach der letzten Runde: Finale (Sieger:in, Gesamtstand)
```

- **Erstellen** (`index.html`, Panel "Turnier erstellen"): Host wählt
  Schwierigkeit, Beat (nur bereits freigeschaltete, siehe Modul 4/Shop),
  Thema, Rundenzahl (1–5). `FlowTournament.createTournament()` generiert
  einen eindeutigen 4-stelligen Code und legt den Host als ersten Spieler an.
- **Beitreten** (`index.html`, Panel "Turnier beitreten"): reine
  Code-Eingabe (4 Ziffern), leitet zu `tournament.html?code=XXXX` weiter —
  der eigentliche Beitritt passiert dort zentral (`resolveEntry()` in
  `tournament.js`), damit Host-Pfad und Join-Pfad denselben Code nutzen.
- **Lobby**: Spieler-Karten poppen mit Plopp-Sound rein
  (`FlowSound.playPlop()`), wenn Bots hinzugefügt werden. Nur der Host sieht
  "Turnier starten" (ab 2 Spieler:innen aktiv). Zusätzlich zu zufälligen
  Demo-Bots kann der Host über "👥 Freund einladen" gespeicherte Freund:innen
  (siehe [`docs/SOCIAL.md`](SOCIAL.md)) mit echtem Namen/Avatar als
  simulierte Mitspieler:in hinzufügen (`isFriendInvite`-Kennzeichnung statt
  generischem Bot-Tag).
- **Runden**: `FlowTournament.startTournament()` generiert **alle** Runden
  im Voraus über `FlowAI.rhyme.generateStanza()` — **eine Reim-Familie pro
  Runde, garantiert dieselben 5 Wörter für alle Teilnehmenden** dieser Runde
  (Fairness). Die Live-Runde nutzt exakt dieselbe BPM-präzise Ball-/
  Word-Rack-Mechanik wie die Solo-Challenge (siehe `docs/GAMEPLAY.md`,
  Abschnitt 5) — eigenständig in `tournament.js` reimplementiert statt
  `challenge.js` zu refactoren, um den getesteten Solo-Ablauf nicht
  anzufassen (siehe Abschnitt 5 unten).
- **"Gleichzeitig"**: Die eine echte Person rappt live (Mikrofon, echte
  Aufnahme, echtes Transkript falls unterstützt). Bot-Einreichungen werden
  mit einer kleinen Zufalls-Verzögerung (1,2–3,2s) im Hintergrund simuliert,
  damit es sich nicht mechanisch anfühlt.
- **Voting**: pro Runde eine Karte je Teilnehmer:in. Nur die eigene Karte hat
  einen echten Audio-Player; man kann jede ANDERE Karte genau einmal liken.
  Der Host schaltet die nächste Runde frei (kein Auto-Timer — bewusst, für
  vorhersehbares Timing statt Druck).
- **Finale**: `computeStandings()` — siehe Abschnitt 3.

## 3. Fairness & Gesamtwertung

- Alle Teilnehmenden einer Runde bekommen **denselben Beat und dieselben
  Reimwörter** — niemand hat einen inhaltlichen Vorteil.
- Gesamtstand = Summe der Rundenpunkte (KI-Bewertung, siehe
  `docs/AI_ARCHITECTURE.md`) **plus** Community-Votes als Tie-Breaker
  (jede Stimme zählt wie +3 Punkte). Punkte bleiben der Haupttreiber —
  Popularität allein kann eine schwache Performance nicht zum Sieg tragen,
  kann aber bei knappem Ergebnis den Ausschlag geben.
- Ergebnisse pro Turnier werden nur **einmal** belohnt (Credits/Abzeichen),
  auch wenn der Finale-Screen neu geladen wird (`rewardedTournamentCodes` in
  `profile-data.js`) — ebenso das Teilen in die Community (`tournament.shared`-
  Flag), damit sich Credits nicht durch Neuladen vervielfachen lassen.

## 4. Belohnungen

| Ereignis | Credits | Sonstiges |
|---|---|---|
| Turnier beendet (nicht gewonnen) | +15 💎 | — |
| Turnier gewonnen | +40 💎 | Abzeichen "🏆 Turniersieger" |
| Ergebnis in Community geteilt | +10 💎 | Post im Feed (Text/Score, kein Audio-Upload) |

## 5. Warum `tournament.js` `challenge.js` nicht wiederverwendet

`docs/GAMEPLAY.md` (Abschnitt 11) hatte vorgeschlagen, den Challenge-Ablauf
so zu bauen, dass ein Turnier-Modus dort andocken kann. Bei der Umsetzung
wurde bewusst **keine** gemeinsame Runden-Engine extrahiert, sondern
`tournament.js` reimplementiert dieselbe BeatClock-/Word-Rack-/Ball-Logik
eigenständig — aus Vorsicht: ein Refactoring von `challenge.js` hätte den
bereits ausführlich getesteten Solo-Ablauf riskiert, obwohl der Nutzen
(weniger Code) das Risiko in diesem Stadium nicht aufgewogen hätte. Geteilt
wurden dagegen die risikoarmen, rein visuellen/Daten-Bausteine:
`assets/css/beat-ball.css`, `assets/js/spark-fx.js`, `assets/js/rhyme-engine.js`
+ die KI-Provider, `assets/js/profile-data.js`, `assets/js/community-data.js`.
Eine echte gemeinsame Runden-Engine ist ein sinnvoller nächster
Refactoring-Schritt, sobald beide Abläufe eine Weile stabil gelaufen sind.

## 6. Bekannte Grenzen (bewusste Vereinfachungen)

- Ein Reload mitten in einer laufenden Runde kann diese nicht sicher
  fortsetzen — `tournament.js` zeigt stattdessen den Voting-Stand der
  aktuellen Runde.
- "Clip speichern" lädt die eigene letzte Aufnahme herunter (`<a download>`);
  es gibt keine Video-/Kurzclip-Erstellung (die Aufnahme ist ohnehin
  audio-only, siehe `docs/GAMEPLAY.md`).
- "Top der Woche" ist noch nicht als eigene, zeitlich gefilterte Ansicht
  gebaut — die bestehende Rangliste (`community.html`) deckt den Bedarf
  vorerst ab; eine echte Wochen-Auswertung braucht echte Mehrbenutzer-Daten
  mit Zeitstempeln aus einem Backend.
