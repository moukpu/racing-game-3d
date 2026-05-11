# racing-game-3d · design system

UI layer over the 3D scene: HUD card-glass + menus. The 3D track and cars
live below; this layer overlays speed, lap, position, countdown and the
finish modal. Dark race-night palette, neon-green primary, mono numerals.

The canonical tokens live in `src/styles/tokens.css`. Everything below is
the readable version — names map 1:1 to CSS custom properties there.

---

## 1. Palette

Tuned in OKLCH so neon stays vivid on glass without clipping. WCAG AA on
all primary text combinations.

### Surfaces (background ladder)

| Token             | OKLCH                   | Role                          |
| ----------------- | ----------------------- | ----------------------------- |
| `--color-bg-0`    | `oklch(14% .01 260)`    | Page / asphalt                |
| `--color-bg-1`    | `oklch(18% .012 260)`   | Cards, panels                 |
| `--color-bg-2`    | `oklch(22% .014 260)`   | Elevated surface, inputs      |
| `--color-line`    | `oklch(30% .018 260)`   | Hairline borders              |
| `--color-line-strong` | `oklch(42% .020 260)` | Strong borders, ghost buttons |

### Text

| Token                | OKLCH                  | Role                       | Contrast on bg-0 |
| -------------------- | ---------------------- | -------------------------- | ---------------- |
| `--color-text`       | `oklch(97% .005 95)`   | Body / numbers             | ~14.1 : 1        |
| `--color-text-dim`   | `oklch(72% .010 95)`   | Secondary copy             | ~7.2 : 1         |
| `--color-text-muted` | `oklch(54% .012 95)`   | Captions, mono labels      | ~4.6 : 1 (AA)    |

### Neon accents

| Token                | OKLCH                | Role                                |
| -------------------- | -------------------- | ----------------------------------- |
| `--color-accent`     | `oklch(76% .20 145)` | Primary CTA, speed bar peak, player |
| `--color-accent-2`   | `oklch(70% .22 30)`  | Danger / redline / damage           |
| `--color-accent-3`   | `oklch(78% .18 85)`  | Caution / push zone                 |
| `--color-accent-cool`| `oklch(72% .16 240)` | Cool blue / cruise / info           |

### Speed gradient

`--grad-speed` ramps cool blue → neon green → yellow → red. Used by the
speedometer rev-bar and any "intensity" indicator. Avoids the gas-station
red/orange cliché.

```
0%   oklch(72% .16 240)   blue  · idle
45%  oklch(76% .20 145)   green · cruise
75%  oklch(78% .18 85)    yellow· push
100% oklch(70% .22 30)    red   · limit
```

---

## 2. Typography

Three families, hard limit. Mono is non-negotiable for HUD numerals.

| Token            | Stack                                 | Use                              |
| ---------------- | ------------------------------------- | -------------------------------- |
| `--font-sans`    | Geist, Inter, system-ui …             | Body, secondary UI               |
| `--font-mono`    | JetBrains Mono, Geist Mono, ui-mono   | All HUD numbers, mono labels     |
| `--font-display` | PP Neue Machina, Geist (fallback)     | "RACING GAME 3D", "GO!", titles  |

Mono numerals always get `font-variant-numeric: tabular-nums` (set on
`[data-mono]` in `globals.css`) — speedo digits and lap counters must not
jiggle on tick.

Size scale (rem · px):

```
2xs  .6875 · 11   micro labels        ("SPEED", "LAP", "BEST")
xs   .75   · 12   captions
sm   .875  · 14   body small
md   1     · 16   body
lg   1.125 · 18   subhead
xl   1.5   · 24   section title
2xl  2     · 32   lap counter big digits
3xl  3     · 48   finish heading
4xl  4.5   · 72   speedometer digit
5xl  6     · 96   countdown / hero
```

Tracking:

- `--tracking-tight  -0.02em` — display headings.
- `--tracking-wide   0.04em`  — small caps.
- `--tracking-wider  0.12em`  — mono uppercase labels (HUD).

---

## 3. Spacing, radius, depth

```
space  1=4  2=8  3=12  4=16  5=24  6=32  7=48  8=64  9=96  px
radius xs=2 sm=4 md=8  lg=12 xl=20 pill=999
```

- `--shadow-1` flat / inset border for small chips.
- `--shadow-2` HUD card lift (8/24 + line ring).
- `--shadow-3` modal lift (20/60 + strong ring).
- `--glow-accent` / `--glow-danger` / `--glow-warn` — color-matched soft
  glow + 1px tinted ring. Reserve for primary CTA and the current-player
  row in results.

Motion easings:

- `--ease-out-quart` — most UI movement.
- `--ease-out-expo`  — entrances (cards, overlays).
- `--ease-in-out`    — toggles, switches.

Durations: `--dur-fast 120ms`, `--dur-base 220ms`, `--dur-slow 420ms`,
`--dur-stage 900ms` (countdown digits).

---

## 4. HUD layout

Two glass cards in opposite corners, never overlapping the racing line.

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐                       ┌──────────────┐ │
│  │ SPEED   GEAR 3  │                       │ LAP   POS    │ │
│  │  248            │                       │ 02/05  3rd   │ │
│  │  km/h           │                       │ ▰▰▰▰▱▱▱▱     │ │
│  │ ▰▰▰▰▰▱▱▱▱▱▱     │                       └──────────────┘ │
│  └─────────────────┘                                        │
│                                                             │
│                    < 3D scene · canvas >                    │
│                                                             │
│  pad: --hud-pad (24px)                                      │
└─────────────────────────────────────────────────────────────┘
```

- HUD cards use the `.hud-card` utility from `globals.css`
  (semi-transparent bg + 1px line + 10px blur).
- Mono digits sit on a tabular grid — the speedometer must not jitter
  between widths as it ticks 199 → 200 → 201.

---

## 5. Component contracts

Anya owns visual + skeleton. Kostya plugs data + Framer Motion.

| Component          | Props (skeleton)                                                   |
| ------------------ | ------------------------------------------------------------------ |
| `<SpeedoMeter />`  | `speed: number`, `maxSpeed: number`, `unit?`, `gear?`              |
| `<LapCounter />`   | `currentLap: number`, `totalLaps: number`, `position: number`, `totalRacers?` |
| `<StartMenu />`    | `cars: CarConfig[]`, `selectedCarId?`, `onSelectCar?`, `onStart?`, `disabled?` |
| `<CountdownOverlay />` | `value?: number \| "GO" \| null`                                |
| `<FinishOverlay />`| `results: FinishResultRow[]`, `title?`, `onRestart?`, `onExit?`    |

`CarConfig` is the canonical type from `@/types/game` (Misha) — fields
used in the UI: `id`, `name`, `mass`, `maxSpeed` (m/s, displayed as km/h
via `× 3.6`), `accel`, `color`. `<StartMenu />` imports it directly,
no local duplicate.

### Three motion moments per interactive element

This is the senior-level rule. Each interactive component must read alive:

- **SpeedoMeter**: (1) appear on race-start (slide in + glow pulse),
  (2) digit count-up on every tick (`--dur-fast`), (3) redline shake +
  red glow at `speed / maxSpeed > 0.95`.
- **LapCounter**: (1) appear on start, (2) lap-flip on increment
  (number-roll on the `02 → 03`), (3) position-change ping (`<flash> +
  scale 1.04 → 1`).
- **Car card** (`StartMenu`): (1) `whileInView` stagger entrance,
  (2) hover-tilt + lift + accent border, (3) click → selected state
  with `--glow-accent`.
- **Start button**: (1) magnetic-cursor pull on hover,
  (2) press → scale `0.97`, (3) loading → shimmer.
- **CountdownOverlay**: (1) digit scale-in from 0.6 → 1 with
  `--ease-out-expo`, (2) digit hold (300ms), (3) digit scale-out + blur.
  Final `GO!` gets the green glow and a bigger overshoot (1.2 → 1).
- **FinishOverlay**: (1) backdrop fade + card scale-in,
  (2) row-by-row stagger (60ms), (3) player row glow pulse on first
  reveal.

### Anti-patterns

- No pure `#000` — use `--color-bg-0` (oklch 14%).
- Don't stack >2 neons in one frame. Green is primary; red/yellow are
  signals.
- Don't put the HUD over the apex of the track — corners only.
- Don't switch the speedometer digit font to sans for "matching" — mono
  is the language of HUD.

---

## 6. File map

```
src/styles/
  tokens.css         ← all CSS variables (palette, fs, space, radius, motion)
  globals.css        ← @import tokens, base reset, body bg, .hud-card

src/components/ui/
  SpeedoMeter.tsx
  LapCounter.tsx
  StartMenu.tsx
  CountdownOverlay.tsx
  FinishOverlay.tsx

docs/
  design.md          ← this document
```
