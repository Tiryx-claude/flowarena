# FlowArena — Shop, Premium, Credits & Werbung (Modul 5, Ausbau Modul 6)

## 1. Ehrlichkeit zuerst: die Grenzen dieses Prototyps

Wie jedes andere Modul in diesem Prototyp: **kein Backend, keine echten
Zahlungen.**

- **Premium (6,99 €/Monat) und alle Credits-Pakete sind reine
  Demo-Schalter.** Ein Klick auf "Kaufen (Demo)" oder "Premium aktivieren
  (Demo)" fragt **nirgends** Zahlungsdaten ab, verarbeitet nichts und
  bucht nichts ab — er schreibt lokal in `localStorage`
  (`assets/js/profile-data.js`: `unlockPremiumDemo()` /
  `purchaseCreditsDemo()`). Jeder Preis (`assets/js/data.js`: `PREMIUM`,
  `CREDIT_PACKAGES`) ist reine Anzeige, kein echter Checkout-Flow.
- **Werbung ist kein echtes Werbenetzwerk.** `assets/js/ads.js` zeigt
  ausschließlich hauseigene, klar als "Werbung (Demo)" gekennzeichnete
  Promo-Karten für FlowArenas eigene Features (Premium/Shop/Turniere) —
  keine externe Ad-SDK-Integration, kein Tracking, keine echten Anzeigen
  Dritter. Eine echte Drittanbieter-Integration würde echtes
  Consent-Management brauchen, das in einem Client-only-Prototyp nicht
  seriös nachgebaut werden kann.
- **"Besondere Events" sind Client-Datum-basiert, nicht server-gepusht.**
  Der Wochenend-Bonus (`FlowData.isWeekendBonusActive()`) schaut einfach
  auf `new Date().getDay()` der/des Spieler:in — es gibt keinen echten
  Event-Kalender, keine Server-Synchronisation, keine Zeitzonen-Angleichung.
- **Tages-Login-Serien und Wochen-Challenges leben nur in diesem Browser**
  (`profile.login`, `profile.weeklyChallenge` in `profile-data.js`) — kein
  geräteübergreifender Abgleich, keine echte Server-Uhr.
- Ein bekanntes theoretisches Restrisiko: da alles reines `localStorage`
  ist, könnten zwei gleichzeitig offene Tabs desselben Browsers in einem
  sehr engen Zeitfenster beide dieselbe Tages-Belohnung auslösen (klassische
  Read-Modify-Write-Race ohne echte Server-Transaktion) — in der Praxis
  selten und ohne Schaden (führt höchstens zu einer doppelten
  Benachrichtigung, nicht zu doppelten Credits, weil beide Tabs vom
  selben Ausgangsstand aus denselben Endwert berechnen). Ein echtes Backend
  würde das mit einer echten Transaktion lösen.
- **Die Zahlungsmethoden-Auswahl (Apple Pay/Google Pay/Kreditkarte/
  Debitkarte) im Kaufdialog ist rein dekorativ.** Es gibt keine echten
  Zahlungsfelder (keine Kartennummer-Eingabe, kein echtes Apple-/Google-Pay-
  SDK) — nur anklickbare Icons, die auswählen, welches Label in der
  Kaufhistorie landet. Siehe Abschnitt 12.
- **Die Kaufhistorie (`assets/js/purchase-data.js`) ist kein echter Beleg.**
  Sie lebt nur in `localStorage`, hat keine steuerliche/rechtliche
  Relevanz und dient ausschließlich der Nachvollziehbarkeit innerhalb
  dieses Prototyps.
- **`datenschutz.html`/`agb.html` sind keine rechtsverbindlichen Dokumente
  eines echten Unternehmens** — sie beschreiben ehrlich, was der Code
  tatsächlich tut, sagen das aber auch ausdrücklich selbst.

Sobald ein echtes Backend existiert, ersetzen `/api/payments`,
`/api/credits`, `/api/rewards` diese lokalen Stores 1:1 — die Aufrufer
(`shop.html`, `profile.html`, `challenge.js`, `tournament.js`) ändern sich
dabei kaum, weil sie schon jetzt ausschließlich über `window.FlowProfile.*`
und `window.FlowData.*` darauf zugreifen.

## 2. Niemals Pay-to-Win

Das zentrale Versprechen dieses Moduls, durchgängig eingehalten:

**Premium und Credits kaufen NIE einen Gameplay-Vorteil.** Konkret NICHT
kaufbar: leichtere Reimwörter, eine großzügigere KI-Bewertung, mehr Zeit pro
Zeile/Beat, ein Vorteil in Turnier-Rangliste oder Voting. Was Premium/Credits
tatsächlich kaufen:

| Kategorie | Was es bringt | Wettbewerbsrelevant? |
|---|---|---|
| Komfort | Bis zu 10 statt 5 Strophen/Challenge, unbegrenzt Challenges/Tag (Free: 5) | Nein — jede Challenge wird identisch bewertet, unabhängig von Strophenzahl/Tageslimit |
| Zugriff | Premium-Beats, Premium-Challenges, Early Access | Nein — andere Beats/Themen/Vorschauen ändern nichts an der Bewertungslogik |
| Kosmetik | Ball-Designs, Ergebnis-Animationen, Profil-Designs | Nein — rein visuell, exakt gleiche Mechanik/Timing/Bewertung |
| Werbefreiheit | Keine Promo-Karten mehr zwischen Menüs | Nein — betrifft nur Free-Accounts, nie das Gameplay selbst |

Turniere, Rangliste und Community-Voting behandeln Premium- und
Free-Accounts technisch identisch (siehe `docs/TOURNAMENTS.md` §3) — dieselben
Reimwörter, derselbe Beat, dieselbe Bewertungs-Heuristik pro Runde für
alle Teilnehmenden.

## 3. Premium (`assets/js/data.js`: `PREMIUM`)

6,99 €/Monat (Demo). Perks: keine Werbung, unbegrenzt Challenges (Abschnitt
13), alle Premium-Beats, alle Premium-Ball-Designs/-Animationen/-Profil-
Designs, alle Premium-Challenges, Early Access (Abschnitt 12), bis zu 10
statt 5 Strophen/Challenge, 👑-Badge auf dem Profil.

Aktivierung/Kündigung laufen **zentral über [`shop.html`](../shop.html)**
(`#premium`) — `profile.html` zeigt nur noch den Status und verlinkt dorthin,
damit es nicht zwei unterschiedliche Kauf-Code-Pfade gibt.

- **Aktivieren:** `FlowProfile.unlockPremiumDemo()`, läuft über den
  Kaufbestätigungs-Dialog (Abschnitt 12) mit Zahlungsmethoden-Auswahl.
  Setzt `profile.premiumSince` (Zeitstempel), aus dem `shop.js` eine
  simulierte "nächste Abrechnung" (+30 Tage) anzeigt — rein informativ,
  keine echte Abo-Verwaltung.
- **Kündigen:** `FlowProfile.cancelPremiumDemo()`, jederzeit mit einem
  Klick (Zwei-Klick-Bestätigung wie beim Datenreset in `docs/SOCIAL.md`),
  **sofort wirksam**, keine Mindestlaufzeit, keine Kündigungsfrist. Ein
  gerade aktives Premium-exklusives Ball-Design/Animation/Profil-Design
  fällt dabei automatisch auf die Standard-Variante zurück (bleibt aber
  freigeschaltet und ist bei erneutem Premium sofort wieder wählbar).

## 4. Credits

- **Kaufen (Demo):** drei Pakete in `shop.html` (`CREDIT_PACKAGES` in
  `data.js`) — 100/550/1200 Credits, größere Pakete mit Bonus-Label.
  `FlowProfile.purchaseCreditsDemo()`.
- **Verdienen:**
  - Challenge abschließen (+10 bis +19, je nach Score — unverändert aus
    Modul 4, siehe `docs/COMMUNITY.md`).
  - Turnier abschließen (+15 Teilnahme / +40 Sieg — unverändert aus
    Modul 3, siehe `docs/TOURNAMENTS.md`).
  - **Tages-Login-Serie** (neu, Abschnitt 5).
  - **Wochen-Challenge** (neu, Abschnitt 6).
  - **Wochenend-Bonus** (neu, Abschnitt 7): +25 % auf alle
    Challenge-/Turnier-Credits an Samstagen/Sonntagen (lokale Client-Zeit).

## 5. Tages-Login-Belohnung

`assets/js/daily-rewards.js` — auf jeder Seite eingebunden (defensiv,
idempotent: prüft `profile.login.lastLoginDate` gegen das heutige Datum,
tut bei einem zweiten Aufruf am selben Tag nichts). 7-Tage-Zyklus
(`DAILY_LOGIN_REWARDS` in `data.js`, 5→8→10→12→15→18→30 Credits), Serie
bricht ab, sobald ein Kalendertag komplett ausgelassen wird
(`isConsecutiveDay()`). Tag 7 hat zusätzlich eine Chance auf ein
zufälliges, noch nicht freigeschaltetes Ball-Design statt nur Credits —
Belohnung wird über das bestehende Benachrichtigungssystem gemeldet
(kein eigenes, aufdringliches Popup, siehe `docs/SOCIAL.md`). Fortschritt
sichtbar in `shop.html` → Belohnungen.

## 6. Wochen-Challenge

Eine statische, wöchentlich zurückgesetzte Aufgabe
(`WEEKLY_CHALLENGE` in `data.js`: aktuell "3 Challenges abschließen" →
+35 Credits). `FlowProfile.bumpWeeklyChallenge()` wird nach jeder
abgeschlossenen Solo-Challenge aufgerufen (`recordChallengeResult()`),
zählt auf `profile.weeklyChallenge.progress` und vergibt die Belohnung
**genau einmal** pro ISO-Woche (`isoWeekKey()`, setzt sich automatisch
zurück, sobald eine neue Woche beginnt). In diesem Prototyp bewusst eine
einzige, feste Challenge statt echter Rotation — eine rotierende Auswahl
bräuchte einen Server, der bestimmt, welche Woche welche Aufgabe zeigt.

## 7. Wochenend-Bonus ("besonderes Event")

`FlowData.isWeekendBonusActive()` — an Samstagen/Sonntagen (lokale
Client-Zeit) werden alle über `recordChallengeResult()`/
`recordTournamentResult()` vergebenen Credits um 25 % erhöht
(`applyWeekendBonus()`, gerundet). In `shop.html` als Banner sichtbar,
wenn aktiv. Bewusst deterministisch statt eines echten, server-gepflegten
Event-Kalenders — reicht für den "es gibt gerade etwas Besonderes"-Effekt,
ohne ein Backend vorauszusetzen.

## 8. Ball-Designs (kosmetisch)

`BALL_DESIGNS` in `data.js`: 5 Designs, 2 davon (Inferno, Gold Rush)
**premium-exklusiv** (nie per Credits kaufbar — echte Exklusivität), die
übrigen 2 bezahlten (Neon Purple, Ice Blue, je 90 Credits) für alle
Accounts erreichbar. Ausgewählt wird das aktive Design über
`FlowProfile.setActiveBallDesign()`, angewendet als CSS-Variablen
(`--ball-gradient`/`--ball-glow`) direkt am Ball-Element — **eine
Quelle** für die Farbwerte (`data.js`), keine Duplizierung in CSS. Wirkt
identisch in der Solo-Challenge (`challenge.js`), im Turnier
(`tournament.js`) und in der Homepage-Vorschau (`home.js`) — dieselbe
Stelle, aus der auch `docs/GAMEPLAY.md` bereits die geteilte
Ball/Funken-Optik dokumentiert.

## 9. Premium-Challenges

`PREMIUM_CHALLENGES` in `data.js`: 3 kuratierte Beat/Thema/Strophen-Presets,
exklusiv für Premium. "Jetzt spielen" speichert das Preset über die
normalen `FlowData.saveSettings()` und leitet zu `challenge.html` weiter —
**derselbe Code-Pfad** wie eine normale, selbst eingestellte Challenge.
Es gibt keine separate, leichtere Bewertungslogik für Premium-Challenges.

## 10. Werbung

`assets/js/ads.js` + `assets/css/ads.css`. Regeln:

- Nur für Free-Accounts (`profile.premium === true` → sofort kein Ad-Code
  läuft mehr an).
- **Nie** in `challenge.html` oder `tournament.html` eingebunden — die
  beiden Dateien laden das Skript schlicht nicht, das ist strukturell
  erzwungen, nicht nur eine Laufzeit-Prüfung.
- Nur auf "Zwischen-Menüs"-Seiten (`index.html`, `community.html`,
  `profile.html`, `shop.html`), ratenbegrenzt (`COOLDOWN_MS`, Demo-Wert
  90 Sekunden) über `flowarena.ads.lastShown.v1`, damit schnelles
  Durchklicken mehrerer Menüseiten nicht bei jeder einzelnen erneut
  aufploppt.
- Skippable (3 Sekunden Mindestanzeige, dann "Überspringen ✕"), mit
  direktem CTA-Link zum beworbenen Feature (z. B. `shop.html#premium`).

## 12. Kaufbestätigung, Zahlungsmethoden & Kaufhistorie (Modul 6)

- **Kaufbestätigung:** `shop.js` → `openPurchaseModal()` — für jeden
  ECHTEN-Geld-Kauf (Premium, Credits-Pakete) zeigt ein Dialog Preis,
  Artikel und eine Auswahl aus `PAYMENT_METHODS` (Apple Pay, Google Pay,
  Kreditkarte, Debitkarte — `assets/js/data.js`), bevor irgendetwas
  passiert. Kein Zahlungsfeld, keine Eingabe — nur anklickbare Icons.
  Erst nach explizitem "Kauf bestätigen" wird die eigentliche
  Freischaltungs-Funktion aufgerufen. Credits-Ausgaben für kosmetische
  Inhalte (Ball-Designs/Animationen/Profil-Designs/Beats) laufen weiter
  als einzelner Klick ohne diesen Dialog (kein zusätzliches "echtes Geld"
  im Spiel, du gibst bereits verdiente/gekaufte Credits aus), werden aber
  ebenfalls in der Kaufhistorie protokolliert.
- **Kaufhistorie:** [`assets/js/purchase-data.js`](../assets/js/purchase-data.js)
  (`window.FlowPurchases`, Key `flowarena.purchases.v1`, Deckel 50
  Einträge) — jede abgeschlossene Shop-Aktion (Premium aktiviert/gekündigt,
  Credits gekauft, Beat/Ball-Design/Animation/Profil-Design freigeschaltet)
  landet dort mit Icon, Label, Preis/Kosten, gewählter "Zahlungsmethode"
  (oder `"Credits"`) und Zeitstempel. Sichtbar in `shop.html` → 🧾
  Kaufhistorie. Kein echter Beleg (siehe Abschnitt 1).

## 13. Free-Tageslimit ("unendlich Challenges" als Premium-Perk)

`FREE_DAILY_CHALLENGE_LIMIT` (`data.js`, aktuell 5) begrenzt, wie oft ein
Free-Account **eine Challenge STARTEN** kann — nicht, wie sie bewertet
wird. `FlowProfile.canStartChallenge()` prüft das Limit, `recordChallengeStart()`
verbraucht einen Versuch (erst beim tatsächlichen Klick auf "Los geht's",
nicht schon beim Öffnen der Intro-Seite). Zwei Prüfstellen:

- **Autoritativ:** `challenge.js` selbst, direkt beim Laden — zeigt bei
  erreichtem Limit einen Block "⏳ Tageslimit erreicht" mit Premium-CTA
  statt des Start-Buttons. Greift auch bei direkter Navigation.
  Bei ≤2 verbleibenden Versuchen erscheint stattdessen ein dezenter Hinweis.
- **UX-Abkürzung:** `app.js`s "Challenge starten"-Button prüft vorab und
  zeigt einen Toast statt zu navigieren — spart den Umweg über
  `challenge.html`, ist aber keine zweite Wahrheitsquelle.

Premium: `canStartChallenge()` liefert immer `{ allowed: true, remaining:
Infinity }`. Setzt sich täglich lokal zurück (`dailyChallengeCount.date`).

## 14. Ergebnis-Animationen & Profil-Designs (kosmetisch, Modul 6)

Zwei weitere rein kosmetische Kategorien, nach demselben Muster wie
Ball-Designs (Abschnitt 8):

- **Ergebnis-Animationen** (`RESULT_ANIMATIONS` in `data.js`): verändern
  nur die Farben von Score-Ring und Funken-Burst auf dem Ergebnis-Screen
  (`--anim-color1`/`--anim-color2` CSS-Variablen, gesetzt in `challenge.js`
  `applyResultAnimationSkin()`, siehe `assets/css/challenge.css`). 2 von 4
  Premium-exklusiv (Aurora Flow, Gold Shower).
- **Profil-Designs** (`PROFILE_THEMES` in `data.js`): ein alternativer
  Hintergrund-Verlauf für den Profil-Header (`profile.js` setzt
  `el.style.backgroundImage`). 2 von 4 Premium-exklusiv (Cyber, Aurora).

Beide über `FlowProfile.is*Unlocked()`/`unlock*()`/`setActive*()`
verwaltet — exakt dasselbe Muster wie Ball-Designs, bewusst dupliziert
statt generalisiert (drei kurze, unabhängig lesbare Funktionspaare statt
einer abstrakten "Kosmetik-Engine").

## 15. Early Access (Demo-Vorschau, Modul 6)

`EARLY_ACCESS_PREVIEW` in `data.js` — eine einzelne, statische Karte in
`shop.html`, premium-gated. Da dieser Prototyp keine echte
Feature-Pipeline hat, macht die Karte selbst im Text transparent, dass es
sich um eine reine Demo-Vorschau handelt ("noch kein echtes Feature") —
kein vorgetäuschter Rollout.

## 16. Rechtliches: Datenschutz & AGB (Modul 6)

[`datenschutz.html`](../datenschutz.html) und [`agb.html`](../agb.html) —
eigenständige, im gleichen dunklen Stil gehaltene Seiten, verlinkt aus
`shop.html` (§ Rechtliches) und dem Footer von `index.html`. Beide sagen
explizit, dass FlowArena ein Software-Prototyp ohne reale
Geschäftstätigkeit ist, und beschreiben trotzdem ehrlich und vollständig,
was der Code tatsächlich tut (kein Server, nur `localStorage`,
Mikrofon/Aufnahme bleibt lokal, keine echten Zahlungsdaten, kein echtes
Werbenetzwerk, jederzeit kündbar, Preise immer vor dem Kauf sichtbar).
Ersetzt keine echte Rechtsberatung.

## 17. Testabdeckung

Manuell durchgespielt: `shop.html` komplett (Premium aktivieren über den
Kaufdialog mit Zahlungsmethoden-Auswahl, Premium kündigen inkl.
Zwei-Klick-Bestätigung und Rückfall premium-exklusiver Auswahl auf
Standard, Credits-Paket-Kauf über denselben Dialog, Beat-Freischaltung,
Ball-Design/Animation/Profil-Design freischalten + ausrüsten,
Premium-Challenge → korrekt vorbefüllte `challenge.html`,
Belohnungen-Sektion inkl. Free-Tageslimit-Anzeige, Early-Access-Karte,
Kaufhistorie mit korrekten Einträgen), Ball-Design UND Ergebnis-Animation
sichtbar identisch in Vorschau/Gameplay (`index.html`/`challenge.html`)
bzw. auf dem Ergebnis-Screen, Profil-Design sichtbar auf `profile.html`,
Free-Tageslimit (Blockbildschirm bei erreichtem Limit, dezenter Hinweis
bei ≤2 verbleibend, korrektes Hochzählen beim Start, Premium = unbegrenzt),
Tages-Login-Serie (Streak-Anzeige, Benachrichtigung, Idempotenz bei
mehrfachem Laden am selben Tag geprüft), Wochen-Challenge (Fortschritt,
Einmal-Vergabe der Belohnung geprüft), Werbe-Overlay (Anzeige nur ohne
Premium, Cooldown, Skip-Button-Timing, sauberes Schließen),
`datenschutz.html`/`agb.html` (Rendering, Links). Keine neuen
Konsolenfehler in allen Läufen (die von früheren Modulen bekannten,
harmlosen Alt-Einträge in `app.js:312`/`home.js:111` sind unverändert
vorhanden und nicht durch dieses Modul verursacht).
