# FlowArena — Community, Profile, Premium & Credits (Modul 4)

## 1. Ehrlichkeit zuerst: die Grenzen dieses Prototyps

Es gibt weiterhin **kein Backend** und **keine echten Accounts**. Alles in
diesem Modul lebt in `localStorage` — pro Browser, pro Gerät:

- **Kein echtes Login.** "Profil" = ein lokal gespeicherter Name/Avatar/Stand.
  Andere Geräte/Browser sehen dein Profil nicht.
- **Kein echter Community-Feed.** [`community-data.js`](../assets/js/community-data.js)
  seedet ein paar klar fiktive Beispiel-Posts (keine echten Personen) und
  ergänzt sie um das, was DU in diesem Browser veröffentlichst.
- **Kein echtes Premium/keine Zahlung.** Der "Premium aktivieren"-Button in
  [`profile.html`](../profile.html) ist ein reiner Demo-Schalter — es werden
  nirgends Zahlungsdaten abgefragt, verarbeitet oder abgebucht. Das ist
  bewusst so (Zahlungsflüsse gehören nicht in einen Client-only-Prototyp).

Sobald ein echtes Backend existiert (Modul 5+), ersetzen `/api/profile`,
`/api/posts`, `/api/payments` diese lokalen Stores 1:1 — die aufrufenden
Seiten (`profile.html`, `community.html`, `challenge.js`) ändern sich dabei
kaum, weil sie schon jetzt hinter klaren Funktionen (`FlowProfile.*`,
`FlowCommunity.*`) versteckt sind.

## 2. Profil ([`assets/js/profile-data.js`](../assets/js/profile-data.js))

`localStorage`-Key `flowarena.profile.v1`:

```js
{
  displayName, avatar,          // editierbar in profile.html
  credits, premium,             // Modul-4-Wirtschaft
  unlockedBeatIds,               // per Credits freigeschaltete Premium-Beats
  earnedBadgeIds,
  stats: {
    challengesCompleted, totalScore, bestScore,
    bestKreativitaet, bestEndwortNutzung,
    maxStanzasInOneRun, roastCompleted, topicsUsed,
  },
}
```

`recordChallengeResult()` wird von `challenge.js` nach jeder abgeschlossenen
Challenge aufgerufen: schreibt Stats fort, vergibt Credits
(`10 + Gesamtscore/10`, abgerundet) und prüft neue Abzeichen.

## 3. Credits-Wirtschaft

- **Verdienen:** Challenge abschließen (+10 bis +19, je nach Score),
  veröffentlichen (+15).
- **Ausgeben:** Premium-Beats einmalig freischalten (`Beat.unlockCost` in
  `data.js`, aktuell "Dark Trap Wave" für 60, "Midnight Cypher" für 45).
- Start-Guthaben: 40 Credits, damit man direkt etwas ausprobieren kann.

## 4. Premium

Perks (`GAMEPLAY_CONFIG.freeMaxStanzas` vs. `maxStanzas` in `data.js`):

| | Free | Premium (Demo) |
|---|---|---|
| Strophen pro Challenge | bis 5 | bis 10 |
| Premium-Beats | einzeln per Credits | alle sofort |
| Profil-Badge | — | 👑 Premium-Pill |

Der "+"-Stepper bei den Strophen bleibt am Free-Deckel bewusst klickbar
(nicht deaktiviert), damit der Premium-Hinweis-Toast überhaupt angezeigt
werden kann — erst am echten Maximum (10) wird er hart deaktiviert.

## 5. Abzeichen (Badges)

8 Stück in `FlowProfile.BADGES`, Bedingungen rein aus `profile.stats`
berechnet (`checkBadgeConditions()`) — z.B. "Erster Flow" (1. Challenge),
"Marathoner" (5+ Strophen in einem Lauf), "Century" (85+ Gesamtscore). Neu
freigeschaltete Badges werden auf dem Ergebnis-Screen direkt nach der
Challenge als pulsierendes Banner angezeigt (`challenge.js → renderResults`).

## 6. Community-Feed & Rangliste

[`community.html`](../community.html): drei Tabs.

- **Feed:** Post-Karten (Autor, Thema, Beat/BPM, Zeit, Score, Textausschnitt,
  Like-Button). Likes sind pro Browser (`localStorage`), kein echter
  Multi-User-Zähler.
- **Rangliste:** kombiniert die Scores der (fiktiven) Seed-Autoren mit
  deinem `profile.stats.bestScore`, korrekt einsortiert — "Du" wird
  hervorgehoben. Umschaltbar zwischen "Alle" und "Nur Freunde"; respektiert
  die Datenschutzeinstellung "In der Rangliste anzeigen" (siehe
  [`docs/SOCIAL.md`](SOCIAL.md)).
- **Suche:** Personen-Suche mit direktem "+ Freund"-Hinzufügen — siehe
  [`docs/SOCIAL.md`](SOCIAL.md) für das komplette Freundessystem,
  Benachrichtigungen und Datenschutzeinstellungen (Modul 4, Ausbau).

Veröffentlichen (`challenge.js → publishBtn`) legt einen echten Eintrag in
`flowarena.community.posts.v1` an (Text/Score/Meta — **keine Audiodatei**,
weil Blob-URLs nicht zuverlässig über Seitenwechsel hinweg persistieren und
Base64-Audio in `localStorage` schnell an Speichergrenzen stößt; die
Audio-Wiedergabe bleibt auf den Ergebnis-Screen direkt nach der Challenge
beschränkt).

## 7. Testabdeckung

Manuell durchgespielt: Premium-Demo-Aktivierung, Avatar-/Namensänderung,
Beat-Freischaltung (genug/zu wenig Credits), Strophen-Deckel-Hinweis,
komplette Challenge → Credits + neues Abzeichen → Veröffentlichen → Post
erscheint im Feed *und* in "Meine Posts" *und* in der Rangliste, jeweils mit
korrekt synchronisiertem Like-Stand. Keine Konsolenfehler in allen Läufen.
