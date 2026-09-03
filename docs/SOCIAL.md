# FlowArena — Freunde, Suche, Benachrichtigungen & Datenschutz (Modul 4, Ausbau)

Baut auf [`docs/COMMUNITY.md`](COMMUNITY.md) auf (Profil/Credits/Premium/Feed
bleiben unverändert) und verzahnt sich zusätzlich mit
[`docs/TOURNAMENTS.md`](TOURNAMENTS.md). Dieses Dokument beschreibt nur die
neuen Bausteine: Freundessystem, Personen-Suche, Benachrichtigungen und
Datenschutzeinstellungen.

## 1. Ehrlichkeit zuerst: die Grenzen dieses Prototyps

Wie bei jedem anderen Modul: **kein Backend, keine echten Accounts, keine
echte geräteübergreifende Synchronisation.**

- **"Freunde"** sind lokal in diesem Browser gespeicherte Referenzen auf
  Einträge einer wachsenden, ebenfalls rein lokalen Personen-Directory
  (`assets/js/social-data.js`, Key `flowarena.people-directory.v1`). Es gibt
  keine echte Freundschaftsanfrage/-bestätigung zwischen zwei Personen — ein
  Klick auf "+ Freund" trägt die Person sofort in deine eigene Liste ein
  (`flowarena.friends.v1`). Symmetrisch wäre das nur mit einem Backend
  sinnvoll (die andere Seite müsste zustimmen können).
- **Die Personen-Directory** startet mit den 4 fiktiven Seed-Personen aus
  `community-data.js` (MC Vega, Lyrika, Flowzone, Kleiner Reim) und wächst
  organisch, sobald du im selben Browser Turnier-Bots triffst
  (`rememberPerson()`, aufgerufen aus `tournament-data.js`). Es ist also
  keine echte Nutzer:innen-Datenbank, sondern ein Gedächtnis für "wem bin ich
  in diesem Browser schon begegnet".
- **Benachrichtigungen** (`flowarena.notifications.v1`, Deckel bei 30
  Einträgen) sind rein lokal ausgelöste Ereignisse innerhalb desselben
  Browsers (neues Abzeichen, Freund hinzugefügt, Premium aktiviert, Turnier
  beendet) — kein Push, kein Server, keine Zustellung an andere Personen.
- **Datenschutzeinstellungen** sind größtenteils symbolisch vorbereitet:
  "In der Rangliste anzeigen" hat eine echte, sofort sichtbare Wirkung
  (blendet die eigene Zeile in `community.html`/`index.html`-Mini-Rangliste
  aus). "Aktivität für Freunde sichtbar" hat aktuell **keine** sichtbare
  Wirkung, weil es ohne Backend keine andere Person gibt, die eine fremde
  Aktivität sehen könnte — der Schalter ist bewusst schon da, um die spätere
  echte Umsetzung nicht nachträglich ins UI einbauen zu müssen.

Sobald ein echtes Backend existiert, ersetzt `/api/friends/*`,
`/api/notifications/*` diese lokalen Stores — die aufrufenden Seiten bleiben
weitgehend unverändert, weil sie schon jetzt ausschließlich über
`window.FlowSocial.*` darauf zugreifen.

## 2. `assets/js/social-data.js` — `window.FlowSocial`

| Funktion | Zweck |
|---|---|
| `rememberPerson({name, avatar, score})` | Legt eine Person in der Directory an/aktualisiert sie (Bestwert-Score wird gemerged, nie verschlechtert). |
| `getPerson(id)` / `searchPeople(query)` | Lesen; Suche ist ein simpler Substring-Match auf den Namen, case-insensitive. |
| `loadFriends()` / `isFriend(id)` / `addFriend(person)` / `removeFriend(id)` | Freundesliste-CRUD. `addFriend()` verhindert Duplikate und löst automatisch eine Benachrichtigung aus. |
| `loadNotifications()` / `addNotification({icon, text})` / `unreadCount()` / `markAllRead()` | Benachrichtigungs-Store, neueste zuerst, Deckel 30 Einträge. |

Personen-IDs sind geslugte Namen (`slugify()`), damit dieselbe Person aus
verschiedenen Aufrufstellen (Turnier-Bot, Community-Post, manuelle Suche)
zuverlässig auf denselben Directory-Eintrag trifft.

## 3. `assets/js/notifications-ui.js` — geteiltes Glocken-Widget

Ein einziges Skript rendert das Glocken-Icon + Dropdown auf **allen** Seiten,
die die passende Nav-Markup (`#notifBellBtn`, `#notifDropdown`, `#notifList`)
einbinden (`index.html`, `profile.html`, `community.html`, `tournament.html`,
`challenge.html`). Es ist absichtlich defensiv geschrieben — fehlt
`window.FlowSocial` oder eines der DOM-Elemente, bricht es still ab (`return`)
statt einen Fehler zu werfen, damit eine Seite, die die Glocke (noch) nicht
einbindet, nicht kaputtgeht.

Auslöser für echte Benachrichtigungen (alle bereits verdrahtet):

- Neues Abzeichen freigeschaltet — `challenge.js` (Solo) und `tournament.js`
  (nach einem Turnier).
- Premium (Demo) aktiviert — `profile.js`.
- Freund:in hinzugefügt — `social-data.js` (`addFriend()`).
- Turnier beendet (gewonnen/verloren, mit Platzierung) — `tournament.js`,
  einmalig pro Turnier-Code (nutzt dieselbe `progress.creditsEarned > 0`-
  Bedingung, die auch schon die Credits-Vergabe vor Mehrfachbelohnung
  schützt, siehe `docs/TOURNAMENTS.md` §3).

Cross-Tab-Sync: ein `storage`-Event-Listener rendert das Badge neu, wenn ein
anderer Tab desselben Browsers eine Benachrichtigung schreibt.

## 4. Freundessystem — Einstiegspunkte

- **`profile.html`** ("👥 Freunde"): Such-Feld filtert live über die gesamte
  Personen-Directory; Ergebnisse zeigen einen "+ Freund"-Button
  (deaktiviert + "✓ Freund", falls schon befreundet). Darunter die eigene
  Freundesliste mit "Entfernen".
- **`community.html`** (Tab "🔍 Suche"): dieselbe Such-/Hinzufügen-Logik wie
  in `profile.html`, damit man Freunde direkt aus dem Community-Kontext
  heraus findet.
- **`community.html`** (Tab "🏆 Rangliste"): Umschalter "Alle" / "Nur
  Freunde" — im Freunde-Modus werden ausschließlich `loadFriends()`-Einträge
  (Score aus `getPerson(id).bestScore`) plus die eigene Zeile gezeigt, mit
  Leerstand-Hinweis, falls noch keine Freunde eingetragen sind.
- **`tournament.html`** (Lobby, nur Host): Button "👥 Freund einladen" öffnet
  ein Panel mit der eigenen Freundesliste; ein Klick ruft
  `FlowTournament.addFriendPlayer()` auf, was — genau wie
  "Bots hinzufügen (Demo)" — eine simulierte Mitspieler:in mit dem echten
  Namen/Avatar der/des Freund:in anlegt (`isFriendInvite: true`), in der
  Spieler-Karte als "👥 Freund (Demo)" statt "🤖 Bot (Demo)" gekennzeichnet.
  Ein zweiter Klick auf dieselbe Person ist blockiert, sobald sie schon im
  Raum ist ("Alle deine Freunde sind schon im Raum.").

## 5. Datenschutz & Datenlöschung (`profile.html`)

`FlowProfile.setPrivacy(profile, key, value)` schreibt `profile.privacy.*`
sofort in `localStorage`; `renderLeaderboard()` in `community.js` und die
Mini-Rangliste auf `index.html` respektieren `showOnLeaderboard`, indem sie
die eigene Zeile beim Aufbau der Rangliste komplett weglassen (nicht nur
verstecken), falls der Schalter aus ist.

"Alle lokalen Daten löschen" (`FlowProfile.resetAllLocalData()`) entfernt
**alle** `flowarena.*`-Keys aus `localStorage` (Profil, Community-Posts,
Turniere, Freunde, Benachrichtigungen, Personen-Directory, Einstellungen) und
leitet danach zur Startseite. Aus Konsistenz mit dem Rest der App (keine
nativen `confirm()`-Dialoge) ist das ein Zwei-Klick-Muster: der erste Klick
ändert nur den Button-Text zur Bestätigungsaufforderung (4 Sekunden Zeitfenster,
danach automatischer Reset des Buttons), erst der zweite Klick löscht wirklich.

## 6. Testabdeckung

Manuell durchgespielt: Glocken-Dropdown auf `index.html` (Leerstand-Text),
Freund-Suche + Hinzufügen in `profile.html` (inkl. sofortiger
Benachrichtigung), Freund-Entfernen, Datenschutz-Toggle "Rangliste" (An→Aus→
An, Wirkung sofort sichtbar in `community.html`), Community-Suche-Tab
(Live-Filter, "✓ Freund"-Zustand konsistent mit Profil-Seite), Rangliste
"Nur Freunde" (korrekt gefiltert inkl. eigener Zeile), Turnier-Lobby
"Freund einladen" (Panel, Einladen, korrekte Spieler-Karten-Kennzeichnung,
Re-Klick-Schutz). Keine neuen Konsolenfehler in allen Läufen (die beiden seit
früheren Modulen bekannten, harmlosen Alt-Fehler in `app.js:312`/`home.js:111`
— stale Konsolen-Einträge aus früheren Navigationen in derselben Browser-Tab-
Sitzung — sind unverändert vorhanden und nicht durch dieses Modul verursacht).
