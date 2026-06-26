---
name: hadiran-rt-design
description: Design system skill for hadiran-rt. Activate when building UI components, pages, or any visual elements. Provides exact color tokens, typography scale, spacing grid, component patterns, and craft rules. Source of truth = tailwind.config.js + src/index.css.
---

# hadiran-rt Design System

You are building UI for **hadiran-rt** — a financial PWA for an Indonesian RT (arisan & kas), used by warga on their phones. **Light-primary**, cool-neutral canvas, **emerald** brand, full dark mode, **dual typeface** (Sora display + Inter body), mobile-first, "premium fintech" feel (Revolut / Mercury / Linear-clean).

> ⚠️ **Source of truth is the code, not this file.** Every token below is lifted verbatim from `tailwind.config.js` and `src/index.css`. If they ever disagree, the code wins — re-read it and update this file.
>
> A previous auto-generated version of this skill was **wrong** (claimed amber `#b45309` accent, dark `#02150e` background, Inter-only). Those were misreads: `#b45309` is only the `warn` token, `#02150e` is only the Login *dark* gradient. Do not reintroduce them.

## Design Philosophy

- **Light-primary, cool & calm** — airy near-white canvas (`#E6EAF1`, Pass 6 — nudged down ~3% L from `#EEF1F6` for a touch more card "pop"), white cards "pop" from a crisp layered shadow + hairline edge, **not** from a big tonal gap or glow/aurora. The fewer the tricks, the more expensive it looks.
- **Emerald is the brand** — one green accent for active states, links, primary CTAs, positive money. Never navy/gold, never amber-as-accent.
- **Dual typeface, deliberate** — **Sora** (geometric grotesk) for headings & hero nominal gives the app its own voice; **Inter** carries all body/UI text. Hierarchy from size + weight + color.
- **Floating-glass elevation** — cards and nav use layered shadows (contact + key + ambient, negative spread so blur stays contained) + a top inner-highlight = "glass lit from above." Tokenized as `--shadow-card` / `.lift`.
- **Two-tier color** — semantic tokens (`pos`/`neg`/`warn`/`setor`) for meaning vs. raw viz hex inside charts. Don't consolidate them.
- **Restrained motion** — spring/expo easing, entrance once, **still when idle**. Premium = calm at rest, not infinite loops. Always honor `prefers-reduced-motion` (global catch-all already in `index.css`).
- **Lucide icons** (`lucide-react`) — one family. Active nav icons go outline→solid (fill tint).

## Color System (from `tailwind.config.js`)

### Brand (emerald — the only accent)
| Token | Hex | Use |
|---|---|---|
| `brand` (DEFAULT) | `#0F4C2E` | deep — active chip fill, strong titles |
| `brand-600` | `#145D39` | |
| `brand-500` | `#1B7249` | primary brand, `accent-color` (light) |
| `brand-link` | `#0D6B5E` | teal-green links ("Lihat semua"), active nav (light) |
| `brand-linkDark` | `#1A9B86` | dark-mode pair: active tab + links, `accent-color` (dark) |

### Semantic money / status (one green, one red, one amber)
| Token | Hex | Use |
|---|---|---|
| `pos` | `#047857` | money in / positive (emerald-700) |
| `neg` | `#E11D48` | money out / negative (rose-600) — the single red |
| `warn` | `#B45309` | arrears / attention (amber-700). **Not an accent.** |
| `setor` (DEFAULT/600/500) | `#1E40AF` / `#2563EB` / `#3B82F6` | "sudah disetor" status on the Kas Hadiran hero **only**. Blue = status signal, not a second accent. |

> Don't mix red/rose with green/emerald in one screen for the same meaning; pick the semantic token.

### Surfaces, lines, text
| Token | Hex | Use |
|---|---|---|
| `surface` | `#FFFFFF` | cards, panels, modals |
| `sunken` | `#E6EAF1` | app background — **must** equal `body`, `.app-bg`, and manifest `background_color` |
| `line` | `#CFD5DF` | hairline divider (≈ canvas tone, so it never out-lights the crisp shadow) |
| `control` | `#E2E8F0` | input/button border (a touch stronger than `line`) |
| `ink` (DEFAULT) | `#0B1220` | titles / primary nominal (near-black, max contrast) |
| `ink-sub` | `#374151` | secondary text (gray-700) |
| `ink-faint` | `#475569` | dates / captions (slate-600) |

All `ink-*` pass WCAG AA on white. `index.css` also darkens raw `text-gray-400→#6B7280` and `text-gray-500→#4B5563` in **light mode only** — so prefer the `ink-*` tokens and don't fight that override.

### Backgrounds
- **Light app:** `#E6EAF1` flat + a *whisper* of emerald at the top (`rgba(16,185,129,0.06)`), `background-attachment: fixed`.
- **Dark app:** `#030712` with layered emerald/teal/sky radial aura at the top (`.dark .app-bg`).
- **Login canvas:** light = mint gradient (`#ecfdf5→#d1fae5→#a7f3d0`); dark = deep emerald (`#04231A→#06402E→#02150E`). This is the **only** place the deep-green near-black appears.
- **Hero card:** `--hero-gradient: linear-gradient(135deg, #0D5B36, #15824C, #1C9A5C)`, radius 24px, with `.hero-noise` grain + `.hero-sheen`.

## Typography

- **Display (Sora):** `--font-display: 'Sora Variable', 'Sora', 'Inter Variable', system-ui`. Applied to `h1, h2` (with `letter-spacing: -0.018em`) and via `.font-display` for hero nominal. Loaded from `@fontsource-variable/sora`.
- **Body (Inter):** `'Inter Variable'`, self-hosted via `@fontsource-variable/inter`. Everything that isn't a heading or hero number.
- **Never** add a third font. Hierarchy = size + weight + color, plus the Sora/Inter split.
- **Numbers:** `font-variant-numeric: tabular-nums` is global — rupiah never jitters during count-up. `.font-display` + tabular for big nominal.

### Compact type ramp (mobile, from config `fontSize`)
| Token | Size | Use |
|---|---|---|
| `text-micro` | 11px | badges, tiny uppercase labels |
| `text-caption` | 13px | dates, secondary text |
| `text-body` | 15px | primary list/row body |
| `text-amount` | 17px | standout nominal |

Headings use the normal Tailwind scale (`text-lg`/`xl`/`2xl`…). iOS auto-zoom guard: `input/select/textarea.text-sm` is forced to 16px in `index.css` — don't override.

## Spacing, Radius, Layout

- **4px grid.** Scale: 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32.
- **Radius:** 6, 8, 12 (default), 16, 24px. Hero = 24px (`--hero-radius`). Buttons = `rounded-xl` (0.75rem). Nav capsule = `rounded-[26px]`. Bottom sheets = `rounded-t-3xl`. Pills/FAB = full.
- **Page width:** content `max-w-lg mx-auto px-4`. Mobile-first; breakpoints sm640/md768/lg1024/xl1280/2xl1536.
- **Bottom padding** must clear the floating nav: `calc(4rem + env(safe-area-inset-bottom) + 1.75rem)`.

## Elevation (from `index.css`)

Use the tokens — don't invent box-shadows.
- `.lift` → `--shadow-card`: the floating-glass recipe (inner top highlight + 1px crisp edge + contact + key + ambient with negative spread). Light & dark variants defined. White cards also get a subtle top-light gradient via `.lift`.
- `.float` → `--shadow-float`: dropdowns / popovers / sheet panels.
- `.nav-float`: the capsule bottom-nav shadow (separate light/dark).
- `.hero-card` → `--hero-shadow`: green-ink layered shadow so hero joins the same elevation family.

## Motion (from `index.css`)

- **Easing tokens:** `--ease-spring: cubic-bezier(0.34, 1.4, 0.5, 1)` (lively: nav pill, count-up), `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` (default enters/exits).
- **Tactile press:** `.press` → `scale(0.97)` on `:active` (ease-out, instant — no rubber overshoot). Pair with `haptic()`.
- **Named animations:** `fadeIn`/`.page-enter`, `.rise` (staggered list, set `animation-delay` inline), `.sheet-panel`/`.sheet-backdrop`, `.toast-in`/`.toast-out`, `.pop`/`.pop-menu`/`.pop-menu-out` (origin-aware ≤170ms menus), `.skeleton` (shimmer), `.cf-in`/`.cf-out` (CrossFade), `.page-in-right`/`.page-in-left` (directional tab transitions), `.success-*`, `.odo-col-in`, `.blob` (login aurora).
- **Exits faster than enters** (system responds, not stalls). Idle = no loops.

## Component Patterns (real, reusable — check before building new)

Recipes live in `index.css` `@layer components`:
- **`.btn-brand`** — primary CTA: emerald gradient (`#18A055→#0F6B40→#0C5E37`) + glossy top edge + emerald glow, `rounded-xl`, spring press. Text white (AA-safe).
- **`.btn-secondary`** — neutral bordered (Batal/Tutup); call-site keeps width/radius.
- **`.field`** — form input (`bg-gray-50`, py-3, `rounded-xl`, emerald focus ring).
- **`.field-search`** — list search bar (`bg-white`, py-2.5, icon padding).

Reusable components in `src/components`:
- **Layout:** `Header`, `BottomNav` (floating glass capsule, tab id `'kas'` labeled "Hadiran"), `Fab` (thumb-zone, `.btn-brand`).
- **Charts:** `MonthlyBars`, `HeroSparkline`, `AreaTrend` (lightweight inline SVG — **there is no DonutChart**).
- **Data/feedback:** `AvatarPeci`, `Tag` (tones: neutral/success/danger/warning/info), `FilterChips`, `EmptyState`, `ErrorBoundary`, `Toaster`, `SmartInsight`, `Odometer`, `SuccessOverlay`, `TargetKasRT`, `PullToRefresh`, `CrossFade`, `SectionTitle`, `InfoTip`.
- **App-level prompts:** `InstallPrompt`, `PwaUpdatePrompt`, `WelcomeSheet`, `PengumumanBanner`, `ConfirmBatalTarikan`.

### Dialogs — mandatory rule
**Every sheet / modal MUST use the `useDialog` hook** (`src/hooks/useDialog.ts`): `role="dialog"` + focus trap/restore + Escape. Never hand-roll a raw sheet. (Already enforced everywhere; keep it that way.)

### Z-index (from config — never invent values)
`z-40` = nav (Header/BottomNav/scrim) · `z-50` = overlay (bottom-sheet, dropdown) · `z-banner` (55) = app prompts · `z-modal` (60) = stacked modal + SuccessOverlay + WelcomeSheet · `z-toast` (70) = Toaster, always alone on top.

## Dark Mode

- Toggled by `.dark` class on `<html>` (`darkMode: 'class'`), respects `prefers-color-scheme` by default.
- Every surface has a dark pair: app `#030712`, cards `dark:bg-gray-900`, borders `dark:border-gray-800`, active accent → `brand-linkDark` `#1A9B86`. `color-scheme` + `accent-color` swap so native controls follow.
- Design **both** modes from the start; the page never flips theme mid-scroll.

## Anti-Patterns (never do)

- **No navy/gold, no amber-as-accent.** Emerald is the brand. (`tailwind.config.js` literally warns "JANGAN ganti ke navy/gold".)
- **No third font** beyond Sora (display) + Inter (body).
- **No invented hex** — extend tokens first. No invented box-shadow or radius — use the scale/tokens.
- **No arbitrary spacing** — multiples of 4px.
- **No raw sheets** — use `useDialog`.
- **No idle animation loops** — calm at rest.
- **No mixing the canvas value** — `#E6EAF1` must stay in sync across body / `.app-bg` / `sunken` / manifest.
- **No glow/aurora to separate cards** — use the tonal step + `.lift` shadow.

## Quick Reference

```
Theme:        light-primary + full dark mode (.dark on <html>)
Canvas:       #E6EAF1 (light) / #030712 (dark)   ← keep in sync everywhere
Surface:      #FFFFFF / gray-900
Brand accent: emerald  brand-500 #1B7249 · brand #0F4C2E · link #0D6B5E / linkDark #1A9B86
Money:        pos #047857 · neg #E11D48 · warn #B45309 · setor #1E40AF/#2563EB/#3B82F6
Ink:          #0B1220 / #374151 / #475569 (all AA on white)
Fonts:        Sora (display: h1/h2 + hero nominal) + Inter (body)  ← self-hosted
Numbers:      tabular-nums global
Spacing:      4px grid   Radius: 6/8/12/16/24 (default 12; btn rounded-xl)
Elevation:    .lift (--shadow-card) · .float · .nav-float · .hero-card
Easing:       --ease-spring · --ease-out-expo    Press: .press → scale(0.97) + haptic()
Icons:        lucide-react (one family)
Dialogs:      ALWAYS useDialog
Stack:        React 18 + Vite + Tailwind 3.4 + Supabase
Source truth: tailwind.config.js + src/index.css
```

## Workflow

1. **Re-read** `tailwind.config.js` + `src/index.css` if unsure — they are the source of truth.
2. Pick colors from the token tables — emerald brand, semantic money tokens.
3. Set type: Sora for headings/hero nominal, Inter for body; use the compact ramp on mobile.
4. Build on the 4px grid; radius from the scale.
5. Reuse a component before making a new one; wrap any sheet in `useDialog`.
6. Apply elevation via `.lift`/`.float`; motion via the easing tokens, still when idle.
7. Verify both light & dark, and that every value traces to a token.
