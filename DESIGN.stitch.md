# Design System: Hadiran RT — Stitch Prompt Sheet

> Purpose: single source of truth for generating **new screens in Google Stitch**
> that match the live Hadiran RT app (React + Tailwind, mobile-first).
> Source of truth for values = `tailwind.config.js` + `src/index.css`.
> All UI copy must be **Bahasa Indonesia** (this doc is English only so the
> generation agent parses it precisely).

## 1. Visual Theme & Atmosphere

**"Village Fintech Calm" in a strict Material-flat language.**

A mobile-first money app for an Indonesian neighborhood association (RT), used
by ~80 residents on their phones — many of them elderly, often reading outdoors
in sunlight. It borrows the discipline of tier-1 fintech (Google apps, myBCA,
BYOND BSI): a calm, perfectly flat cool-gray canvas, pure-white flat cards
separated by tone + one hairline + rounded geometry, and numbers as the star of
every screen. Then it warms that discipline with one rare cultural ornament: a
gold songket weave motif reserved for the balance hero card.

- **Density:** Daily-App Balanced (5/10) — generous list rows, one idea per card.
- **Variance:** Predictable Symmetric (3/10) — this is a utility app for elderly
  users; layouts are calm, single-column, and repeatable. No artsy asymmetry.
- **Motion:** Fluid CSS (5/10) — springy press feedback, bottom sheets gliding
  on ease-out-expo, staggered list reveals. Never cinematic, never looping
  decoration.
- **Elevation philosophy:** FLAT. Depth comes from tonal step (white card on
  #ECF1F7 canvas) + a single 1px hairline + one whisper contact shadow. Never
  glass, never glow, never stacked light layers.
- **Viewport target:** 390px phone, single column, full-width dock bottom nav.

## 2. Color Palette & Roles

Exactly **one brand accent** (deep emerald, saturation well under 80%). Two
scoped exceptions exist and must never grow into second accents.

### Neutrals (structure)
- **Canvas Mist** (#ECF1F7) — the app background. Perfectly flat, no radial
  washes, no gradients. Same value everywhere (body, splash, overscroll).
- **Pure Surface** (#FFFFFF) — card and sheet fill. Flat white, no top-light
  gradient, no tint.
- **Hairline** (#D3DAE3) — the single card edge. 1px only.
- **Control Border** (#CBD5E1) — input and secondary-button borders; visibly
  stronger than Hairline. Edge hierarchy: control > hairline > row divider.
- **Inset Panel** (#E9EEF5) — flat tonal fill for sub-panels inside white cards
  (detail rows, stat strips). No border, no inner shadow — fill only.
- **Row Divider** (#DCE2EA) — hairline between list rows, inset past the icon
  column so it aligns with text.
- **Ink** (#0B1220) — headings and primary amounts (near-black, never #000000).
- **Ink Sub** (#1F2937) — secondary text (≈14.7:1 on white).
- **Ink Faint** (#334155) — dates, captions (≈10.4:1). This is the LIGHTEST
  text allowed on white; faded gray "for elegance" is banned.
- **Canvas Dark** (#030712) — dark-mode background (dark mode exists but light
  is the default; design light-first).

### Brand (the only accent)
- **Emerald Deep** (#0F4C2E, ramp #145D39 / #1B7249) — active filter chips,
  strong titles, primary buttons, the balance hero gradient. The single voice
  of the product.
- **Hero Emerald Gradient** — `linear-gradient(135deg, #0D5B36 0%, #137A46 50%,
  #157A45 100%)` plus a soft mint radial glow (rgba(45,212,150,0.20) fading
  from the top-right corner). Used only on hero balance cards.
- **Link Teal-Green** (#0D6B5E) — "Lihat semua" links and active text tabs.

### Money semantics (one green, one red, one amber — never mixed families)
- **Positive / Money In** (#047857) — emerald-700, on-brand.
- **Negative / Money Out** (#BE123C) — rose-700, the ONLY red.
- **Warning / Arrears** (#92400E) — amber-800, for talangan (unpaid dues).
- Icon tiles in lists get matching 100-level tints (soft emerald / rose / amber
  backgrounds), never flat gray.

### Scoped exceptions (never expand these)
- **Setor Blue** (#1E40AF → #2563EB → #3B82F6 gradient) — a STATUS signal only:
  the Kas Hadiran hero card after funds are deposited. Blue appears nowhere else.
- **Gold Songket** (#E8B651) — cultural HONOR color. Lives in exactly two
  places: the woven songket motif on the balance hero (soft-light blend, masked
  to the top-right corner) and the "next Sohibul Bait" highlight (crown + avatar
  ring). Gold never touches money values, statuses, or navigation.

## 3. Typography Rules

- **Display: Sora** (700, letter-spacing -0.018em, line-height 1.05) — all
  headings and hero amounts. Sora carries the product's voice; hierarchy comes
  from weight and ink color, not from screaming size.
- **Body: Inter Variable** (400) — body-only, quiet partner to Sora. Inter must
  NEVER be used as the display face.
- **Numbers always use `tabular-nums`** app-wide — rupiah amounts are the most
  important content and digits must not wobble in columns or count-ups.
- **Hero amounts are fit-to-width**: the balance number scales as large as the
  card allows without truncation (elderly readability). Never a fixed 3rem that
  clips.
- **Type ramp (mobile):** micro 11px/600/uppercase-tracking 0.02em (badges,
  tiny labels) · caption 13px (dates, secondary) · body 15px (list rows) ·
  amount 17px/Sora 600 (row amounts) · headline ~20px/Sora 700 · display
  clamp(1.75rem–3rem)/Sora 700.
- **Inputs are 16px minimum** — prevents iOS Safari auto-zoom on focus.
- **Currency format:** Indonesian — `Rp50.000`, `Rp1.250.000` (dot thousands,
  no space after Rp is acceptable app style).
- Body prose max 65–75ch. No serif fonts anywhere.

## 4. Component Stylings

- **Cards:** pure white, radius 16px (dense panels) or 24px (content/list
  cards — the maximum, never rounder). Edge = 1px Hairline (#D3DAE3). Shadow =
  ONE contact whisper: `0 2px 4px -1px rgba(15,23,42,0.09)`. Nothing else — no
  ambient float, no edge ring, no inner highlight.
- **Hero balance card (signature):** 24px radius, emerald gradient (above) with
  the gold songket weave masked to the top-right, white Sora amount fit-to-width,
  thin white/16 dividers for its 3-column stat row, contained shadow
  (`0 6px 16px -12px rgba(0,0,0,0.28)` + `0 18px 40px -22px rgba(15,40,30,0.40)`).
  Negative balance = amount stays WHITE with a small "Defisit" word-chip beside
  it — never tint the numeral salmon/red on gradient.
- **Primary button:** radius 12px, emerald gradient `#18A055 → #0F6B40 →
  #0C5E37`, white text, subtle glossy top edge, tactile press `scale(0.97)` on
  spring easing. No outer glow.
- **Danger button:** identical anatomy, rose gradient `#F43F5E → #E11D48 →
  #BE123C`.
- **Secondary button:** white fill, Control Border, Ink Sub text, radius 12px.
- **Filter chips:** full pill. Active = solid emerald fill + white text (fill
  signals state, not just a border); inactive = neutral outline.
- **Inputs:** label above, error text below, radius 12px, #F9FAFB fill with
  Control Border; focus = emerald border #10B981 + 2px soft ring
  rgba(16,185,129,0.30). No floating labels.
- **Icon tiles in lists:** flat semantic tint (emerald-100 in / rose-100 out /
  amber-100 arrears) with matching deep icon color. Never gray, never sheen.
- **Bottom navigation:** a full-width DOCK bar glued to the screen's bottom
  edge (Google/myBCA style) — NOT a floating capsule. Active tab = flat tonal
  pill (Material 3), static 24px icons, top hairline + faint upward shadow.
  FAB sits in the thumb zone above the dock.
- **Bottom sheets / dialogs:** slide up 0.4s on ease-out-expo, dimmed backdrop
  fading in 0.28s, drag-handle, 24px top radius. Centered modals fade+scale.
- **Loading states:** skeleton blocks matching the exact layout, with a 1.5s
  shimmer sweep. Never circular spinners.
- **Empty states:** composed and warm — a small illustration or tinted icon
  tile, one friendly Indonesian sentence, one action. Never bare "No data".
- **Login screen (the one branded exception):** mint gradient canvas, floating
  aurora blobs, soft grain, glass blur card. This glass language exists ONLY
  here.

## 5. Layout Principles

- Mobile-first single column at 390px. Every screen must work one-handed.
- Sticky header (light glass) + full-width bottom dock; content scrolls between
  them with safe-area insets respected (`env(safe-area-inset-*)`).
- Full-height sections use `min-h-[100dvh]`, never `h-screen`.
- Spacing grid: 8 / 12 / 16 / 24px. Card padding 16–20px; hero padding 20–24px.
- Lists live inside one white card with inset row dividers — not one card per
  row. Transactions group by date with the person's NAME as the row title.
- One idea per card; sub-details go in a flat Inset Panel, not a nested
  bordered box.
- Touch targets ≥44px. No horizontal page scroll ever; wide content scrolls
  inside its own container.
- No overlapping elements, no absolute-position stacking of content.

## 6. Motion & Interaction

- **Two easings only:** spring `cubic-bezier(0.34, 1.4, 0.5, 1)` for tactile
  feedback; ease-out-expo `cubic-bezier(0.16, 1, 0.3, 1)` for entrances and
  exits. No linear easing.
- **Press feedback:** buttons and tappable cards scale to 0.97 in ~150ms on
  the spring curve.
- **Entrances:** list/card content rises in (~0.5s ease-out-expo, translateY +
  fade) with short stagger delays — never mounts instantly, never > 3 items of
  stagger depth.
- **Sheets:** up 0.4s ease-out-expo; backdrop 0.28s in / 0.24s out; toast pops
  0.32s on spring.
- Animate `transform` and `opacity` exclusively. Never top/left/width/height.
- Honor `prefers-reduced-motion` (all entrances collapse to visible-static).
- No perpetual decorative loops. The only infinite animations allowed: skeleton
  shimmer while loading, and the Login aurora blobs.

## 7. Anti-Patterns (BANNED)

- No glassmorphism, blur, glow, grain, or noise anywhere in the app body —
  Login is the single branded exception.
- No top-light gradients, white halos, carved inset shadows, double edge
  rings, or icon sheen on cards. Flat means flat.
- No second accent: never promote Setor Blue or Gold Songket beyond their
  single scoped homes. No purple, no neon, no "AI gradient" aesthetic.
- No pure black (#000000) — Ink is #0B1220.
- No gray text lighter than #334155 on white. Elderly users, sunlight.
- No mixing red/rose with green/emerald families on one screen beyond the
  three semantic tokens.
- No coloring a negative hero amount salmon/red — use the white numeral +
  "Defisit" chip.
- No floating-capsule bottom nav; the dock bar is deliberate.
- No card radius beyond 24px; no >1px left/right accent stripes; no gradient
  text (`background-clip: text`).
- No emojis in UI. No serif fonts. No Inter as a display face.
- No circular spinners; skeletons only.
- No fake data: no invented balances, percentages, or member counts. Use
  realistic Indonesian resident names ("Pak Slamet", "Bu Aminah", "H. Mahmud")
  and plausible rupiah amounts (e.g. Rp50.000 talangan, Rp3.450.000 kas) — never
  "John Doe", never $ currency, never 99.99%.
- No English UI copy, and no AI copy clichés ("Elevate", "Seamless",
  "Kelola dengan mudah!"). Copy is plain, warm, neighborly Indonesian.
- No stiff government-bureaucracy styling — calm fintech with a human voice.
