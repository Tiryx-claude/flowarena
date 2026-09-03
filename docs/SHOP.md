# FlowArena — Shop, Premium, Credits & Werbung (Modul 5)

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
| Komfort | Bis zu 10 statt 5 Strophen/Challenge | Nein — beide Varianten werden identisch bewertet, mehr Strophen ist mehr Aufwand, kein Vorteil pro Strophe |
| Zugriff | Premium-Beats, Premium-Challenges | Nein — andere Beats/Themen ändern nichts an der Bewertungslogik |
| Kosmetik | Ball-Designs | Nein — rein visuell, exakt gleiche Ball-Mechanik/Timing |
| Werbefreiheit | Keine Promo-Karten mehr zwischen Menüs | Nein — betrifft nur Free-Accounts, nie das Gameplay selbst |

Turniere, Rangliste und Community-Voting behandeln Premium- und
Free-Accounts technisch identisch (siehe `docs/TOURNAMENTS.md` §3) — dieselben
Reimwörter, derselbe Beat, dieselbe Bewertungs-Heuristik pro Runde für
alle Teilnehmenden.

## 3. Premium (`assets/js/data.js`: `PREMIUM`)

6,99 €/Monat (Demo). Perks: keine Werbung, alle Premium-Beats, alle
Premium-Ball-Designs (Inferno, Gold Rush), alle Premium-Challenges, bis zu
10 statt 5 Strophen/Challenge, 👑-Badge auf dem Profil. Aktivierbar über
[`shop.html`](../shop.html) (Hauptort) oder weiterhin über
[`profile.html`](../profile.html) (identischer Code-Pfad,
`FlowProfile.unlockPremiumDemo()`).

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

## 11. Testabdeckung

Manuell durchgespielt: `shop.html` komplett (Premium-Status-Anzeige,
Credits-Paket-Kauf, Beat-Freischaltung, Ball-Design freischalten +
ausrüsten, Premium-Challenge → korrekt vorbefüllte `challenge.html`,
Belohnungen-Sektion), Ball-Design sichtbar identisch in Vorschau
(`index.html`) UND echtem Gameplay (`challenge.html`), Tages-Login-Serie
(Streak-Anzeige, Benachrichtigung, Idempotenz bei mehrfachem Laden am
selben Tag geprüft), Wochen-Challenge (Fortschritt, Einmal-Vergabe der
Belohnung geprüft), Werbe-Overlay (Anzeige nur ohne Premium, Cooldown,
Skip-Button-Timing, sauberes Schließen), `profile.html` "🎨 Ausrüstung"
zeigt das aktive Ball-Design korrekt. Keine neuen Konsolenfehler in allen
Läufen (die von früheren Modulen bekannten, harmlosen Alt-Einträge in
`app.js:312`/`home.js:111` sind unverändert vorhanden und nicht durch
dieses Modul verursacht).
