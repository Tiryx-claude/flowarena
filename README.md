# FlowArena

Rap-Challenge-Plattform für Streamer & Creator. Nutzer:innen wählen Beat,
Schwierigkeit, Thema und Strophenanzahl, droppen Bars, teilen Recordings als
Posts und werden bewertet.

Der Name **FlowArena** ist ein Platzhalter — leicht austauschbar (Branding
lebt zentral in `assets/css/tokens.css` + `index.html`-Titel/Logo).

## Aktueller Stand: Modul 1–3 — Design-System, Spielablauf & KI-Architektur

Alle drei Module sind als eigenständiger **HTML/CSS/JS-Prototyp ohne
Build-Tooling** umgesetzt, weil auf dieser Maschine kein Node.js installiert
ist. Läuft direkt im Browser, voll interaktiv (Einstellungen in
`localStorage`, Aufnahme über die native `MediaRecorder`/`SpeechRecognition`-API,
KI-Funktionen über eine austauschbare Provider-Architektur, siehe unten).

**Starten:**
```bash
# Variante A: Doppelklick auf index.html (funktioniert, aber ohne echten Server
# können manche Browser strikter mit relativen Pfaden umgehen)

# Variante B (empfohlen): kleiner lokaler Server, kein Node/Python nötig
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/serve.ps1
# dann im Browser: http://localhost:5500
```

### Struktur
```
index.html                    Startseite (Hero, Quick-Settings, Settings-Drawer)
challenge.html                 Challenge-Bühne (Countdown, Strophen, Auswertung)
assets/css/tokens.css          Design-Tokens (Farben, Radien, Schatten, Motion)
assets/css/base.css            Reset + globale Styles
assets/css/components.css      Buttons, Cards, Toggles, Drawer, …
assets/css/layout.css          Nav, Hero, Beat-Animation, Footer
assets/css/challenge.css       Countdown, Reimwort-Reveal, Ergebnis-Screen
assets/js/data.js              Gemeinsame Daten (Beats, Themen, Settings, GAMEPLAY_CONFIG)
assets/js/app.js               Startseiten-State, Rendering, Event-Handling
assets/js/beat-clock.js         BeatClock: drift-freie BPM-Uhr (AudioContext-basiert)
assets/js/challenge.js         Spielablauf-State-Machine, Word-Rack, Aufnahme, Ergebnis-Inszenierung
assets/js/rhyme-engine.js       Kuratierte Reimwort-Datenbank (Daten für den lokalen Provider)
assets/js/ai/registry.js        KI-Provider-Interfaces (RhymeProvider, EvaluationProvider, SpeechProvider)
assets/js/ai/rhyme-provider.local.js       Reimwörter — lokale Heuristik
assets/js/ai/evaluation-provider.local.js  Bewertung (7 Dimensionen) — lokale Heuristik
assets/js/ai/speech-provider.web.js        Speech-to-Text via Web Speech API
assets/js/sound.js             Web-Audio Klicksound-, Beat- & Reveal-Engine
docs/DESIGN_SYSTEM.md          UI-Richtlinien
docs/GAMEPLAY.md               Spielregeln, Timing, Strophen-/Reimlogik
docs/AI_ARCHITECTURE.md        KI-Provider-Verträge, Upgrade-Pfad, Content-Policy
scripts/serve.ps1              Minimaler statischer Dev-Server (PowerShell)
```

Siehe [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) für die UI-Richtlinien,
[`docs/GAMEPLAY.md`](docs/GAMEPLAY.md) für Spielregeln/Timing und
[`docs/AI_ARCHITECTURE.md`](docs/AI_ARCHITECTURE.md) für die austauschbare
KI-Provider-Architektur (Reimwörter, Bewertung, Speech-to-Text).

## Geplante Architektur (nächste Module)

Sobald Node.js verfügbar ist, wird daraus eine Next.js-App mit Prisma/PostgreSQL.
Die aktuelle UI ist bereits so gebaut, dass die Datenformen (Beat: `{id, name,
category, bpm}`, Settings: `{difficulty, beatId, verses, topic, streamerMode}`)
direkt auf die künftigen Prisma-Modelle passen.

### Datenmodell (Skizze)

- **User** — Profil, Abzeichen (Badges), Premium-Status
- **Challenge** — Thema, Schwierigkeitsstufe, Beat-Referenz, Verfasser
- **Recording** — Audio-Link, Text, Bewertung, Likes, Challenge-Referenz
- **Beat** — Dateipfad, Kategorie, BPM
- **Post** — geteilter Rap (verweist auf Recording), Likes, optional Comments
- **Badge**, **Like**, **Comment** — unterstützende Modelle

Beziehungen u.a.: `User 1—n Recording`, `Beat 1—n Challenge`, `Recording 1—1 Post`
(optional, beim Veröffentlichen), `Post n—n Like`, `Post 1—n Comment`.

### API-Module (geplant, modular je Domäne)

```
/api/auth/*            Login, Registrierung, Session
/api/challenges/*       Challenge-Start, Verlauf
/api/beats/*             Beat-Auswahl/-Liste
/api/recordings/*        Upload, Bewertung
/api/posts/*              Publish, Feed
/api/likes/*               Like/Unlike
/api/admin/beats/*          Beat-Management (Upload, Kategorisierung)
```

Jedes Modul bekommt einen eigenen Router/Service, damit künftige Features
(Turniere, neue Spielmodi, Ranglisten) andocken können, ohne bestehende Module
anzufassen — z.B. `Tournament` als eigenständiges Modell mit Referenz auf
`Challenge`, statt bestehende Tabellen zu verändern.

### Sobald Node.js verfügbar ist

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

Die Tailwind-Migration der Design-Tokens ist bereits in
`docs/DESIGN_SYSTEM.md` (Abschnitt 11) vorbereitet.

## Modul-Roadmap

1. ✅ Design-System & UI (Startseite, Einstellungen, Sound, Animation)
2. ✅ Spielablauf & Reimlogik (Countdown, Strophen/Zeilen, Aufnahme, Platzhalter-Bewertung)
3. ✅ KI-Architektur (Reimwörter, 7-dimensionale Bewertung, STT, Roast-Modus — austauschbare Provider, aktuell lokale Heuristiken)
4. ⏭️ Community, Profile, Premium & Credits
5. ⏳ Datenbank/Prisma-Setup + Auth
6. ⏳ Recording-Upload & Bewertung (persistent)
7. ⏳ Publish-Flow, Feed, Likes/Comments
8. ⏳ Admin-Bereich (Beat-Management)
9. ⏳ Turniere / weitere Spielmodi (andockbar)
