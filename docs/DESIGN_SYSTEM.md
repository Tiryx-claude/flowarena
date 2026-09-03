# FlowArena — Design-System & UI-Richtlinien (Modul 1)

Dieses Dokument beschreibt die visuelle Sprache der Plattform. Alle Werte sind
als CSS-Variablen in [`assets/css/tokens.css`](../assets/css/tokens.css)
implementiert — diese Datei ist die "single source of truth".

## 1. Grundprinzip

Schwarze Basis, zwei Neon-Akzente (Lila + Blau), Glas-Effekte, weiche Schatten,
runde Formen, spürbare aber dezente Bewegung. Die Ästhetik zielt auf ein
Publikum aus Streamer:innen und Hip-Hop-/Rap-Communities: dunkel, clubbig,
technisch, aber aufgeräumt und lesbar.

## 2. Farben

| Token | Wert | Verwendung |
|---|---|---|
| `--bg` | `#06060a` | Seitenhintergrund |
| `--bg-elevated` | `#0b0b12` | erhöhte Flächen (z.B. Cards ohne Glas) |
| `--surface` | `rgba(255,255,255,.045)` | Chips, Inputs, Icon-Buttons |
| `--border` | `rgba(255,255,255,.09)` | Standard-Rahmen |
| `--text` / `--text-muted` / `--text-dim` | `#f5f4fb` / `#a7a3b8` / `#6f6b81` | Text-Hierarchie |
| `--neon-purple` | `#b537f5` | Primärakzent, CTAs, aktive Zustände |
| `--neon-blue` | `#29d3ff` | Sekundärakzent, Info/Metadaten (z.B. BPM) |
| `--gradient-accent` | `linear-gradient(135deg, purple → blue)` | Primär-Buttons, Logo, aktive Slider |

**Regel:** Neon-Farben werden **sparsam** für Aktion/Status eingesetzt (CTA,
aktive Auswahl, Fokus, Erfolg), nicht flächig für Dekoration. Der Rest der UI
bleibt monochrom dunkel, damit die Akzente wirken.

## 3. Typografie

- **Display/Headings:** `Space Grotesk` (600/700) — kantig, technisch, gut für
  große Zahlen/BPM-Anzeigen.
- **Fließtext/UI:** `Inter` (400/500/600) — hohe Lesbarkeit in kleinen Größen.
- Fluid Type Scale über `clamp()` (`--fs-xs` … `--fs-3xl`), skaliert automatisch
  zwischen Mobile und Desktop ohne zusätzliche Media Queries.

## 4. Glas-Effekt ("Glassmorphism")

Klasse `.glass` bzw. `.card-glass`:
```css
background: rgba(18,17,28,.55);
backdrop-filter: blur(18px) saturate(140%);
border: 1px solid rgba(255,255,255,.09);
```
Wird für Cards, Nav, Settings-Drawer und Toast verwendet. Wichtig: Glas-Flächen
brauchen **immer** einen dezenten Rand (`border`) und Schatten, sonst wirken sie
auf dunklem Grund flach.

## 5. Schatten & Glow

- `--shadow-card` — normale Elevation (dunkler Ambient-Schatten + 1px Inset-Highlight)
- `--glow-purple` / `--glow-blue` / `--glow-mixed` — Neon-Leuchten für aktive/
  gehoverte interaktive Elemente (Buttons, aktive Segmented-Option, aktive Beat-Karte)
- Glow wird **on hover/active** verstärkt, nie dauerhaft grell — vermeidet visuelle Ermüdung.

## 6. Radien & Buttons

- Standard-Radius-Skala: `--r-sm 10px`, `--r-md 16px`, `--r-lg 24px`, `--r-pill 999px`
- **Buttons sind grundsätzlich pill-förmig** (`--r-pill`), das ist die
  wiedererkennbare Signatur der Plattform.
- Hover-Verhalten (`.btn:hover`): `translateY(-2px) scale(1.045)` + verstärkter
  Glow — "Hover-Zoom" it. `ease-spring`-Timing für einen leicht verspielten,
  organischen Bounce statt linearer Bewegung.

## 7. Motion-Prinzipien

- Dauer-Skala: `--dur-fast 150ms` (Mikro-Interaktionen), `--dur-med 280ms`
  (Buttons, Cards), `--dur-slow 600ms` (Drawer-Slide).
- Easing: `--ease-out` für UI-Übergänge, `--ease-spring` für Elemente, die
  "lebendig" wirken sollen (Buttons, Toggle-Thumb).
- **Beat-synchrone Animation:** Die Figuren in `.beat-figures` springen im Takt
  des aktuell gewählten Beats. JS berechnet `--beat-dur = 60000 / BPM * 2` und
  setzt es als CSS-Variable — die Keyframe-Animation `figure-jump` läuft mit
  gestaffeltem `animation-delay` pro Figur, wodurch eine "Line-to-Line"-Wellenbewegung
  entsteht. Das ist bewusst **dezent** (kein Screen-Shake, keine grellen Blitze),
  aber durch die konstante Bewegung **spürbar**.
- `prefers-reduced-motion: reduce` wird respektiert (globale Regel in `base.css`).

## 8. Sound-Richtlinien

- Klicksounds sind **standardmäßig an, aber jederzeit in den Einstellungen
  abschaltbar** (Toggle "Klick-Sounds").
- Erzeugt per Web Audio API (`assets/js/sound.js`), keine Audio-Dateien nötig →
  keine Ladezeit, kein Autoplay-Problem. `AudioContext` wird erst bei der
  ersten Nutzer-Interaktion erstellt (Browser-Autoplay-Policy).
- Sounds sind kurz (60–140ms), leise (`gain` 0.04–0.06) und tonal dezent —
  Ziel ist ein haptisches Feedback-Gefühl, kein Jingle.
- Unterschiedliche Sound-Events: `playClick` (Buttons), `playSelect` (Auswahl
  treffen), `playToggle` (Switch an/aus, Pitch je nach Richtung), `playConfirm`
  (Speichern/Erfolg, zweiklang).

## 9. Komponenten-Übersicht

Alle in [`assets/css/components.css`](../assets/css/components.css):

| Komponente | Klasse | Beschreibung |
|---|---|---|
| Primär-Button | `.btn.btn-primary` | Gradient-Fill, Glow, für Haupt-CTA |
| Glas-Button | `.btn.btn-glass` | Sekundäre Aktionen |
| Icon-Button | `.btn-icon` | Runde 44px Buttons (z.B. Settings-Gear) |
| Segmented Control | `.segmented` | z.B. Schwierigkeitsgrad |
| Toggle-Switch | `.toggle` | An/Aus-Einstellungen |
| Stepper | `.stepper` | Numerische Werte (Strophenanzahl) |
| Beat-Karte | `.beat-card` | Auswahl-Liste mit BPM-Badge |
| Chip | `.chip` | Kompakte Status-/Einstellungsanzeige |
| Settings-Drawer | `.settings-drawer` | Seitliches Panel (Desktop) / Bottom-Sheet (Mobile) |
| Toast | `.toast` | Kurzzeitiges Feedback |

## 10. Responsive-Verhalten

- Breakpoints (Referenz): Mobile `<480px`, Tablet `<768px`, Nav-Umbruch `<780px`,
  Drawer-Umbruch zu Bottom-Sheet `<640px`.
- Strategie: **Fluid-first** (clamp()-basierte Typografie/Spacing) + wenige
  gezielte Breakpoints für Layout-Umbrüche (Nav-Links ausblenden, Grid → 1
  Spalte, Drawer → Bottom-Sheet).
- Der Settings-Drawer wird auf Mobile zu einem Bottom-Sheet, das von unten
  hereingleitet (`translateY`) statt seitlich (`translateX`), da das für
  Daumen-Bedienung auf dem Smartphone natürlicher ist.

## 11. Geplante Migration nach Tailwind/Next.js

Sobald Node.js verfügbar ist, lassen sich die Tokens direkt in
`tailwind.config.js` überführen:

```js
// tailwind.config.js (Vorschlag für spätere Module)
theme: {
  extend: {
    colors: {
      bg: '#06060a',
      surface: 'rgba(255,255,255,.045)',
      'neon-purple': '#b537f5',
      'neon-blue': '#29d3ff',
    },
    fontFamily: {
      display: ['"Space Grotesk"', 'sans-serif'],
      body: ['"Inter"', 'sans-serif'],
    },
    borderRadius: { pill: '999px' },
    boxShadow: {
      'glow-purple': '0 0 20px rgba(181,55,245,.5), 0 0 46px rgba(181,55,245,.18)',
      'glow-blue': '0 0 20px rgba(41,211,255,.45), 0 0 46px rgba(41,211,255,.16)',
    },
  },
}
```

Die Komponentenklassen (`.btn-primary`, `.card-glass`, …) können 1:1 als
Tailwind-`@layer components`-Klassen oder als React-Komponenten mit denselben
Utility-Kombinationen weitergeführt werden — die Design-Entscheidungen in
diesem Dokument bleiben davon unberührt.
