# FlowArena

Rap-Challenge-Plattform für Streamer & Creator. Nutzer:innen wählen Beat,
Schwierigkeit, Thema und Strophenanzahl, droppen Bars, teilen Recordings als
Posts und werden bewertet.

Der Name **FlowArena** ist ein Platzhalter — leicht austauschbar (Branding
lebt zentral in `assets/css/tokens.css` + `index.html`-Titel/Logo).

## Aktueller Stand: Modul 1–5 + Turniere + Social — Design-System, Spielablauf, KI, Community, Multiplayer, Freunde, Shop

Alle Module sind als eigenständiger **HTML/CSS/JS-Prototyp ohne
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
profile.html                    Profil (Credits, Premium, Abzeichen, eigene Posts)
community.html                  Community-Feed + Rangliste
tournament.html                 Turnier-Raum (Lobby, Runden, Voting, Finale)
shop.html                       Shop (Premium, Credits, Beats, Ball-Designs, Premium-Challenges, Belohnungen)
assets/css/tokens.css          Design-Tokens (Farben, Radien, Schatten, Motion)
assets/css/base.css            Reset + globale Styles
assets/css/components.css      Buttons, Cards, Toggles, Drawer, …
assets/css/layout.css          Nav, Hero, Beat-Animation, Footer
assets/css/challenge.css       Countdown, Word-Rack, Ergebnis-Screen
assets/css/beat-ball.css        Geteilt: Ball + Funken + Magma-Variablen (Vorschau UND echtes Gameplay, inkl. Ball-Design-Skins)
assets/css/profile.css          Profil-Layout (Avatar, Stats, Badges, Premium, Ausrüstung)
assets/css/community.css        Post-Karten, Feed, Rangliste
assets/css/home.css             Menü-Akkordeon, Panels, Gameplay-Vorschau
assets/css/tournament.css       Lobby, Spieler-Karten, Voting, Sieger-Reveal
assets/css/shop.css             Shop-Sektionen, Ball-Design-Karten, Belohnungen, Fairness-Hinweis
assets/css/ads.css              Werbe-Overlay (nur Free-Accounts, nie in Gameplay-Seiten)
assets/js/data.js              Gemeinsame Daten (Beats, Themen, Settings, GAMEPLAY_CONFIG, Shop-Kataloge)
assets/js/app.js               Startseiten-State, Rendering, Event-Handling
assets/js/home.js               Menü-Akkordeon-Logik, Gameplay-Vorschau-Animation, Mini-Panels
assets/js/spark-fx.js           Geteilte Funken-Partikel-Logik (Vorschau + echtes Gameplay)
assets/js/beat-clock.js         BeatClock: drift-freie BPM-Uhr (AudioContext-basiert)
assets/js/challenge.js         Spielablauf-State-Machine, Ball-Animation, Aufnahme, Ergebnis-Inszenierung
assets/js/rhyme-engine.js       Kuratierte Reimwort-Datenbank (Daten für den lokalen Provider)
assets/js/ai/registry.js        KI-Provider-Interfaces (RhymeProvider, EvaluationProvider, SpeechProvider)
assets/js/ai/rhyme-provider.local.js       Reimwörter — lokale Heuristik
assets/js/ai/evaluation-provider.local.js  Bewertung (8 Dimensionen) — lokale Heuristik
assets/js/ai/speech-provider.web.js        Speech-to-Text via Web Speech API
assets/js/profile-data.js       Profil-Store: Credits, Premium (Demo), Badges, Stats
assets/js/community-data.js     Community-Store: Feed-Posts, Likes (lokal)
assets/js/tournament-data.js    Turnier-Store: Räume, Runden, Voting, Gesamtstand (lokal)
assets/js/social-data.js        Freunde/Personen-Directory/Benachrichtigungen-Store (lokal)
assets/js/profile.js            Profilseiten-Logik
assets/js/community.js          Community-Seiten-Logik (Feed/Rangliste/Suche)
assets/js/tournament.js         Turnier-Raum-Logik (Lobby, Runden, Voting, Finale)
assets/js/notifications-ui.js   Geteiltes Glocken-Icon/Dropdown-Widget (alle Seiten)
assets/js/shop.js               Shop-Seiten-Logik (Premium, Credits, Beats, Ball-Designs, Challenges, Belohnungen)
assets/js/daily-rewards.js      Geteiltes Tages-Login-Belohnungs-Skript (alle Seiten, idempotent)
assets/js/ads.js                Werbe-Overlay-Logik (nur Free-Accounts, nur Zwischen-Menüs-Seiten)
assets/js/sound.js             Web-Audio Klicksound-, Beat-, Plopp- & Reveal-Engine
assets/css/social.css           Benachrichtigungs-Glocke, Personen-Karten, Datenschutz-Zeilen
docs/DESIGN_SYSTEM.md          UI-Richtlinien
docs/GAMEPLAY.md               Spielregeln, Timing, Strophen-/Reimlogik
docs/AI_ARCHITECTURE.md        KI-Provider-Verträge, Upgrade-Pfad, Content-Policy
docs/COMMUNITY.md               Profil/Credits/Premium/Community — Mechanik & Grenzen
docs/TOURNAMENTS.md             Turniere/Multiplayer — Mechanik & Grenzen dieses Prototyps
docs/SOCIAL.md                  Freunde/Suche/Benachrichtigungen/Datenschutz — Mechanik & Grenzen
docs/SHOP.md                    Shop/Premium/Credits/Werbung — Mechanik, Belohnungen & "Niemals Pay-to-Win"
scripts/serve.ps1              Minimaler statischer Dev-Server (PowerShell)
```

Siehe [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) für die UI-Richtlinien,
[`docs/GAMEPLAY.md`](docs/GAMEPLAY.md) für Spielregeln/Timing,
[`docs/AI_ARCHITECTURE.md`](docs/AI_ARCHITECTURE.md) für die austauschbare
KI-Provider-Architektur, [`docs/COMMUNITY.md`](docs/COMMUNITY.md) für
Profil/Credits/Premium/Community, [`docs/TOURNAMENTS.md`](docs/TOURNAMENTS.md)
für Turniere/Multiplayer, [`docs/SOCIAL.md`](docs/SOCIAL.md) für
Freunde/Suche/Benachrichtigungen/Datenschutz und [`docs/SHOP.md`](docs/SHOP.md)
für Shop/Premium/Credits/Werbung (jeweils inkl. ehrlicher Grenzen dieses
Prototyps).

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
`docs/DESIGN_SYSTEM.md` (Abschnitt 12) vorbereitet.

## Modul-Roadmap

1. ✅ Design-System & UI (Startseite, Einstellungen, Sound, Animation)
2. ✅ Spielablauf & Reimlogik (Countdown, Strophen/Zeilen, BPM-Ball mit Funken/Magma-Glow, automatische Aufnahme)
3. ✅ KI-Architektur (Reimwörter, 8-dimensionale Bewertung, STT, Roast-Modus — austauschbare Provider, aktuell lokale Heuristiken)
4. ✅ Community, Profile, Premium & Credits (lokal — kein echtes Backend, siehe docs/COMMUNITY.md)
5. ⏭️ Datenbank/Prisma-Setup + Auth (macht Profile/Posts/Payments echt statt lokal)
6. ⏳ Recording-Upload & Bewertung (persistent)
7. ⏳ Publish-Flow, Feed, Likes/Comments (echtes Backend statt localStorage)
8. ⏳ Admin-Bereich (Beat-Management)
9. ✅ Turniere / Multiplayer (lokal simuliert — Raum-Code, Lobby, synchrone Runden, Voting, Sieger; echtes Cross-Device-Multiplayer braucht ein Backend, siehe docs/TOURNAMENTS.md)
10. ✅ Community & Profil, Ausbau: Freundessystem, Personen-Suche, Benachrichtigungen, Datenschutzeinstellungen — nahtlos mit Turnieren verzahnt (lokal, siehe docs/SOCIAL.md)
11. ✅ Shop, Premium, Credits & Werbung (lokal simuliert — Ball-Designs, Premium-Challenges, Tages-/Wochen-Belohnungen, Wochenend-Bonus, Demo-Werbung; niemals Pay-to-Win, siehe docs/SHOP.md)
