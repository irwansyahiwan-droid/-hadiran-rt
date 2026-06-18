---
name: hadiran-rt-design
description: Design system skill for hadiran-rt. Activate when building UI components, pages, or any visual elements. Provides exact color tokens, typography scale, spacing grid, component patterns, and craft rules. Read references/DESIGN.md before writing any CSS or JSX.
---

# hadiran-rt Design System

You are building UI for **hadiran-rt**. Dark-themed, warm palette, sans-serif typography (Inter Variable), compact density on a 4px grid, expressive motion.

## Design Philosophy

- **Layered depth** — use shadow tokens to create a sense of physical layering. Each elevation level has a specific shadow.
- **Gradient accents** — gradients are used thoughtfully for emphasis, not decoration.
- **Single typeface** — Inter Variable carries all text. Hierarchy comes from size, weight, and color — never font mixing.
- **compact density** — 4px base grid. Every dimension is a multiple of 4.
- **warm palette** — the color temperature runs warm, matching the sans-serif typography.
- **Restrained accent** — `#b45309` is the only pop of color. Used exclusively for CTAs, links, focus rings, and active states.
- **Expressive motion** — animations are an integral part of the experience. Use spring physics and layout animations.
- **Lucide icons** — use Lucide for all iconography. Do not mix icon libraries.

## Color System

### Core Palette

| Role | Token | Hex | Use |
|------|-------|-----|-----|
| Background | `--background` | `#02150e` | Page/app background |
| Surface | `--surface` | `#ffffff` | Cards, panels, modals |
| Text Primary | `--text-primary` | `#e9ecf2` | Headings, body text |
| Text Muted | `--text-muted` | `#475569` | Captions, placeholders |
| Accent | `--accent` | `#b45309` | CTAs, links, focus rings |
| Border | `--border` | `#374151` | Dividers, card borders |

### Status Colors

| Status | Hex | Use |
|--------|-----|-----|
| Success | `#ecfdf5` | Confirmations, positive trends |
| Danger | `#dc2626` | Errors, destructive actions |

### Extended Palette

- `#10b981`
- **brand-500:** `#1b7249` — Core brand color
- **brand-DEFAULT:** `#0f4c2e` — Core brand color
- **brand-link:** `#0d6b5e` — Core brand color
- **brand-linkDark:** `#1a9b86` — Core brand color
- **pos:** `#047857`
- **setor-500:** `#3b82f6`
- **setor-600:** `#2563eb`

## Typography

### Font Stack

- **Inter Variable** — Heading 1, Heading 2, Heading 3, Body, Caption

### Type Scale

| Role | Family | Size | Weight |
|------|--------|------|--------|
| Heading 1 | Inter Variable | 48px / 3rem | 700 |
| Heading 2 | Inter Variable | 32px / 2rem | 600 |
| Heading 3 | Inter Variable | 24px / 1.5rem | 600 |
| Body | Inter Variable | 16px / 1rem | 400 |
| Caption | Inter Variable | 12px / 0.75rem | 400 |

### Typography Rules

- All text uses **Inter Variable** — never add another font family
- Max 3-4 font sizes per screen
- Headings: weight 600-700, body: weight 400
- Use color and opacity for text hierarchy, not additional font sizes
- Line height: 1.5 for body, 1.2 for headings

## Spacing & Layout

### Base Grid: 4px

Every dimension (margin, padding, gap, width, height) must be a multiple of **4px**.

### Spacing Scale

`2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32` px

### Spacing as Meaning

| Spacing | Use |
|---------|-----|
| 4-8px | Tight: related items (icon + label, avatar + name) |
| 12-16px | Medium: between groups within a section |
| 24-32px | Wide: between distinct sections |
| 48px+ | Vast: major page section breaks |

### Border Radius

Scale: `6px, 8px, 12px, 16px, 24px`
Default: `12px`

### Breakpoints

| Name | Value |
|------|-------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

Mobile-first: design for small screens, layer on responsive overrides.

## Component Patterns

### Card

```css
.card {
  background: #ffffff;
  border: 1px solid #374151;
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--hero-shadow);
}
```

```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</div>
```

### Button

```css
/* Primary */
.btn-primary {
  background: #b45309;
  color: #e9ecf2;
  border-radius: 12px;
  padding: 8px 16px;
  font-weight: 500;
  transition: opacity 150ms ease;
}
.btn-primary:hover { opacity: 0.9; }

/* Ghost */
.btn-ghost {
  background: transparent;
  border: 1px solid #374151;
  color: #e9ecf2;
  border-radius: 12px;
  padding: 8px 16px;
}
```

```html
<button class="btn-primary">Get Started</button>
<button class="btn-ghost">Learn More</button>
```

### Input

```css
.input {
  background: #02150e;
  border: 1px solid #374151;
  border-radius: 12px;
  padding: 8px 12px;
  color: #e9ecf2;
  font-size: 14px;
}
.input:focus { border-color: #b45309; outline: none; }
```

```html
<input class="input" type="text" placeholder="Search..." />
```

### Badge / Chip

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background: #ffffff;
  color: #475569;
}
```

```html
<span class="badge">New</span>
<span class="badge">Beta</span>
```

### Modal / Dialog

```css
.modal-backdrop { background: rgba(0, 0, 0, 0.6); }
.modal {
  background: #ffffff;
  border: 1px solid #374151;
  border-radius: 24px;
  padding: 24px;
  max-width: 480px;
  width: 90vw;
  box-shadow: 0 0 0 2px rgba(167,243,208,0.35),0 0 10px 2px rgba(110,231,183,0.8);
}
```

```html
<div class="modal-backdrop">
  <div class="modal">
    <h2>Dialog Title</h2>
    <p>Dialog content.</p>
    <button class="btn-primary">Confirm</button>
    <button class="btn-ghost">Cancel</button>
  </div>
</div>
```

### Table

```css
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left;
  padding: 8px 12px;
  font-weight: 500;
  font-size: 12px;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #374151;
}
.table td {
  padding: 12px;
  border-bottom: 1px solid #374151;
}
```

```html
<table class="table">
  <thead><tr><th>Name</th><th>Status</th><th>Date</th></tr></thead>
  <tbody>
    <tr><td>Item One</td><td>Active</td><td>Jan 1</td></tr>
    <tr><td>Item Two</td><td>Pending</td><td>Jan 2</td></tr>
  </tbody>
</table>
```

### Navigation

```css
.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #374151;
}
.nav-link {
  color: #475569;
  padding: 8px 12px;
  border-radius: 12px;
  transition: color 150ms;
}
.nav-link:hover { color: #e9ecf2; }
.nav-link.active { color: #b45309; }
```

```html
<nav class="nav">
  <a href="/" class="nav-link active">Home</a>
  <a href="/about" class="nav-link">About</a>
  <a href="/pricing" class="nav-link">Pricing</a>
  <button class="btn-primary" style="margin-left: auto">Get Started</button>
</nav>
```

### Extracted Components

These components were found in the codebase:

**AvatarPeci** (`src/components/AvatarPeci.tsx`)
- Variants: `A`
- Props: `nama`, `className`
- Styles: `rounded-xl`, `text-base`

**CrossFade** (`src/components/CrossFade.tsx`)
- Props: `loading`, `skeleton`, `children`, `className`

**EmptyState** (`src/components/EmptyState.tsx`)
- Props: `icon`, `title`, `subtitle`, `className`
- Styles: `bg-gradient-to-br`, `rounded-[28px]`, `mb-4`, `text-emerald-500`, `shadow-lg`

**ErrorBoundary** (`src/components/ErrorBoundary.tsx`)
- Props: `children`
- Styles: `bg-white`, `rounded-3xl`, `px-6`, `text-center`

**FilterChips** (`src/components/FilterChips.tsx`)
- Styles: `bg-white`, `rounded-full`, `ml-auto`, `text-xs`

**InstallPrompt** (`src/components/InstallPrompt.tsx`)
- Variants: `accepted`, `dismissed`
- Styles: `bg-white/95`, `rounded-2xl`, `gap-3`, `text-sm`, `backdrop-blur-md`

**Odometer** (`src/components/Odometer.tsx`)
- Variants: `0`
- Props: `value`, `prefix`, `className`, `duration`

**PengumumanBanner** (`src/components/PengumumanBanner.tsx`)
- Variants: `foto`, `video`
- Props: `canManage`
- Styles: `bg-black`, `rounded-3xl`, `px-5`, `text-white`, `backdrop-blur-sm`

**PullToRefresh** (`src/components/PullToRefresh.tsx`)
- Props: `onRefresh`, `children`
- Styles: `bg-white`, `rounded-full`, `text-emerald-600`, `shadow-lg`

**PwaUpdatePrompt** (`src/components/PwaUpdatePrompt.tsx`)
- Styles: `bg-brand`, `rounded-2xl`, `gap-3`, `text-white`

## Animation & Motion

This project uses **expressive motion**. Animations are part of the design language.

### Framer Motion

```tsx
// Standard enter animation
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
/>

// List stagger
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }
```

### CSS Animations

- `fadeIn`
- `hsAreaIn`
- `hsPulse`
- `shimmer`
- `riseIn`

### Motion Tokens

- **Duration scale:** `400ms`, `900ms`
- **Easing functions:** `ease`
- **Animated properties:** `opacity`

### Motion Guidelines

- **Duration:** Use values from the duration scale above. Short (400ms) for micro-interactions, long (900ms) for page transitions
- **Easing:** Use `ease` as the default easing curve
- **Direction:** Elements enter from bottom/right, exit to top/left
- **Reduced motion:** Always respect `prefers-reduced-motion` — disable animations when set

## Dark Mode

This project supports **light and dark mode** via CSS variables.

### Token Mapping

| Variable | Light | Dark |
|----------|-------|------|
| `--shadow-card` | `inset 0 1px 0 0 rgba(255, 255, 255, 1),                   /* highlight tepi atas → "kaca disinari" */` | `inset 0 1px 0 0 rgba(255, 255, 255, 0.05),               /* tepi atas "tersinari" halus */` |
| `--shadow-float` | `0 16px 43px -12px rgba(16, 24, 40, 0.33)` | `0 18px 48px -12px rgba(0, 0, 0, 0.72)` |

### Implementation

- Toggle via `.dark` class on `<html>` or `[data-theme="dark"]`
- Always use CSS variables for colors — never hardcode hex values
- Test both modes for contrast and readability

## Depth & Elevation

### Shadow Tokens

- Raised (cards, buttons): `var(--hero-shadow)`
- Raised (cards, buttons): `0 0 0 2px rgba(167,243,208,0.35),0 0 8px 1px rgba(110,231,183,0.7)`
- Raised (cards, buttons): `var(--shadow-card)`
- Raised (cards, buttons): `var(--shadow-float)`
- Floating (dropdowns, popovers): `0 0 0 2px rgba(167,243,208,0.35),0 0 10px 2px rgba(110,231,183,0.8)`
- Floating (dropdowns, popovers): `0 0 0 3px rgba(167,243,208,0.18),0 0 14px 4px rgba(110,231,183,0.95)`

### Z-Index Scale

`1`

Use these exact values — never invent z-index values.

## Anti-Patterns (Never Do)

- **No zebra striping** — tables and lists use borders for separation
- **No invented colors** — every hex value must come from the palette above
- **No arbitrary spacing** — every dimension is a multiple of 4px
- **No extra fonts** — only Inter Variable are allowed
- **No arbitrary border-radius** — use the scale: 6px, 8px, 12px, 16px, 24px
- **No opacity for disabled states** — use muted colors instead

## Workflow

1. **Read** `references/DESIGN.md` before writing any UI code
2. **Pick colors** from the Color System section — never invent new ones
3. **Set typography** — Inter Variable only, using the type scale
4. **Build layout** on the 4px grid — check every margin, padding, gap
5. **Match components** to patterns above before creating new ones
6. **Apply elevation** — use shadow tokens
7. **Validate** — every value traces back to a design token. No magic numbers.

## Brand Spec

- **Brand color:** `#b45309`
- **Brand typeface:** Inter Variable

## Quick Reference

```
Background:     #02150e
Surface:        #ffffff
Text:           #e9ecf2 / #475569
Accent:         #b45309
Border:         #374151
Font:           Inter Variable
Spacing:        4px grid
Radius:         12px
Frameworks:     Tailwind CSS, React
Icons:          Lucide
Components:     33 detected
```

## When to Trigger

Activate this skill when:
- Creating new components, pages, or visual elements for hadiran-rt
- Writing CSS, Tailwind classes, styled-components, or inline styles
- Building page layouts, templates, or responsive designs
- Reviewing UI code for design consistency
- The user mentions "hadiran-rt" design, style, UI, or theme
- Generating mockups, wireframes, or visual prototypes

---

# Full Reference Files

> Every output file is embedded below. Claude has full design system context from /skills alone.

## Design System Tokens (DESIGN.md)

# hadiran-rt DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: Tailwind CSS 3.4.1 + React 18.3.1
> Colors: 20 · Fonts: 1 · Components: 33
> Icon library: Lucide · State: not detected
> Primary theme: dark · Dark mode toggle: yes · Motion: expressive

---

## 1. Visual Theme & Atmosphere

This is a **dark-themed** interface with a warm tone. Depth is expressed through layered shadows and subtle surface color variation. Typography uses **Inter Variable** throughout — a clean, modern choice that maintains consistency. Spacing follows a **4px base grid** (compact density), with scale: 2, 4, 6, 8, 10, 12, 14, 16px. The accent color **#b45309** anchors interactive elements (buttons, links, focus rings). Motion is expressive — spring physics, layout animations, and staggered reveals are part of the visual language.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| background | `#02150e` | background | Page background, darkest surface |
| surface | `#ffffff` | surface | Card and panel backgrounds |
| brand-600 | `#145d39` | surface | Card and panel backgrounds |
| sunken | `#e9ecf2` | text-primary | Headings and body text |
| ink-faint | `#475569` | text-muted | Captions, placeholders, secondary info |
| ink-sub | `#374151` | border | Dividers, card borders, outlines |
| warn | `#b45309` | accent | CTAs, links, focus rings, active states |
| neg | `#dc2626` | danger | Error states, destructive actions |
| success | `#ecfdf5` | success | Success states, positive indicators |
| setor-500 | `#3b82f6` | info | Informational highlights |
| unknown | `#10b981` | unknown | Palette color |
| brand-500 | `#1b7249` | unknown | Palette color |
| brand-DEFAULT | `#0f4c2e` | unknown | Palette color |
| brand-link | `#0d6b5e` | unknown | Palette color |
| brand-linkDark | `#1a9b86` | unknown | Palette color |
| pos | `#047857` | unknown | Palette color |
| setor-600 | `#2563eb` | unknown | Palette color |
| setor-DEFAULT | `#1e40af` | unknown | Palette color |
| ink-DEFAULT | `#0b1220` | unknown | Palette color |
| unknown | `#d1fae5` | unknown | Palette color |

### Dark Mode Token Mapping

| Variable | Light | Dark |
|---|---|---|
| `--shadow-card` | `inset 0 1px 0 0 rgba(255, 255, 255, 1),                   /* highlight tepi atas → "kaca disinari" */` | `inset 0 1px 0 0 rgba(255, 255, 255, 0.05),               /* tepi atas "tersinari" halus */` |
| `--shadow-float` | `0 16px 43px -12px rgba(16, 24, 40, 0.33)` | `0 18px 48px -12px rgba(0, 0, 0, 0.72)` |


---

## 3. Typography Rules

**Font Stack:**
- **Inter Variable** — Heading 1, Heading 2, Heading 3, Body, Caption

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | Inter Variable | 48px / 3rem | 700 |
| Heading 2 | Inter Variable | 32px / 2rem | 600 |
| Heading 3 | Inter Variable | 24px / 1.5rem | 600 |
| Body | Inter Variable | 16px / 1rem | 400 |
| Caption | Inter Variable | 12px / 0.75rem | 400 |

**Typographic Rules:**
- Use **Inter Variable** for all text — do not mix font families
- Maintain consistent hierarchy: no more than 3-4 font sizes per screen
- Headings use bold (600-700), body uses regular (400)
- Line height: 1.5 for body text, 1.2 for headings
- Use color and opacity for secondary hierarchy, not additional font sizes


---

## 4. Component Stylings

### Layout (18)

**InstallPrompt** — `src/components/InstallPrompt.tsx`
- Variants: `accepted`, `dismissed`
- Key Styles: `rounded-2xl`, `bg-white/95`, `gap-3`, `text-sm`, `font-bold`, `backdrop-blur-md`
- State: useState

**PengumumanBanner** — `src/components/PengumumanBanner.tsx`
- Variants: `foto`, `video`
- Props: `canManage`
- Key Styles: `rounded-3xl`, `border-dashed`, `bg-black`, `px-5`, `text-sm`, `font-bold`, `backdrop-blur-sm`, `hover:bg-white/25`
- Animation: tw-animate-spin, tw-transitions: transition-colors, transition-all, transition-transform
- State: useState, useRef

```tsx
<>
      {/* Banner untuk semua warga (saat aktif
```

**PullToRefresh** — `src/components/PullToRefresh.tsx`
- Props: `onRefresh`, `children`
- Key Styles: `rounded-full`, `bg-white`, `shadow-lg`, `pointer-events-none`
- Animation: tw-animate-spin, tw-transitions: ease-out-expo
- State: useState, useRef

**PwaUpdatePrompt** — `src/components/PwaUpdatePrompt.tsx`
- Key Styles: `rounded-2xl`, `bg-brand`, `gap-3`, `text-sm`, `font-bold`
- State: useState

```tsx
<div
      className="fixed left-1/2 -translate-x-1/2 z-[55] w-[calc(100%-2rem
```

**SmartInsight** — `src/components/SmartInsight.tsx`
- Props: `label`, `current`, `previous`, `className`
- Key Styles: `rounded-2xl`, `border-line`, `bg-white`, `mt-0.5`, `text-xs`, `font-bold`

```tsx
<div className={`flex items-center gap-3 rounded-2xl border border-line dark:border-gray-800/60 bg-white dark:bg-gray-900 lift px-4 py-3 ${className}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone.bg}`}>
        <Sparkles className={`w-[18px] h-[18px] ${tone.c}`} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-gray-800 dark:text-gray-100 leading-tight">
          {label} <span className="tabular-nums">{formatRupiahPlain(current
```

**SuccessOverlay** — `src/components/SuccessOverlay.tsx`
- Props: `show`, `message`, `onDone`, `duration`
- Key Styles: `rounded-[2px]`, `bg-black/30`, `mt-4`, `text-sm`, `font-bold`, `backdrop-blur-[2px]`, `pointer-events-none`

**DonutChart** — `src/components/charts/DonutChart.tsx`
- Props: `data`, `size`, `stroke`, `centerTop`, `format`, `v`
- Key Styles: `rounded-full`, `gap-5`, `text-xs`, `font-semibold`, `cursor-pointer`
- Animation: tw-transitions: ease-out-expo, transition-colors
- State: useState

**MonthlyBars** — `src/components/charts/MonthlyBars.tsx`
- Key Styles: `rounded-t-md`, `bg-emerald-500/90`, `gap-2`, `font-medium`
- Animation: tw-transitions: ease-out-expo
- State: useState

*...and 10 more layout components.*

### Navigation (1)

**Beranda** — `src/pages/Beranda.tsx`
- Variants: `setor`, `semua`, `terbaru`, `terlama`, `talangan_lunas`, `nominal`
- Props: `onNavigate`, `tab`
- Key Styles: `rounded-3xl`, `border-line`, `bg-white`, `space-y-6`, `text-lg`, `font-black`, `shadow-[0_6px_16px_-5px_rgba(16,185,129,0.6)]`, `pointer-events-none`
- Animation: tw-animate-spin, tw-transitions: transition-colors, transition-transform, transition-all
- State: useState

```tsx
<>
    <CrossFade loading={loading} skeleton={skeleton}>
    <div className="space-y-6 pb-2">
      {/* Sapaan + avatar + badge status kas */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-[0_6px_16px_-5px_rgba(16,185,129,0.6
```

### Data Display (2)

**AvatarPeci** — `src/components/AvatarPeci.tsx`
- Variants: `A`
- Props: `nama`, `className`
- Key Styles: `rounded-xl`, `text-base`, `font-bold`

```tsx
<div className={`${bg} ${className} flex items-center justify-center shrink-0`}>
      <span className={`text-base font-bold tracking-wide ${text}`}>{initial}</span>
    </div>
```

**Tag** — `src/components/Tag.tsx`
- Variants: `neutral`, `success`, `danger`, `warning`, `info`
- Props: `tone`, `children`, `className`
- Key Styles: `rounded-md`, `gap-1`, `font-semibold`

```tsx
<span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold leading-tight whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
```

### Data Input (5)

**FilterChips** — `src/components/FilterChips.tsx`
- Key Styles: `rounded-full`, `border-control`, `bg-white`, `ml-auto`, `text-xs`, `font-semibold`
- Animation: tw-transitions: transition-colors

```tsx
<div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1.5 ${wrap ? 'flex-wrap' : ''}`}>
        {options.map((f
```

**TargetKasRT** — `src/components/TargetKasRT.tsx`
- Props: `nominal`, `keterangan`, `tanggal`
- Key Styles: `rounded-2xl`, `border-2`, `bg-emerald-100`, `gap-3`, `text-sm`, `font-bold`, `backdrop-blur-sm`, `hover:border-emerald-400`
- Animation: tw-transitions: transition-colors, duration-700, ease-out
- State: useState

```tsx
<>
        <button
          onClick={(
```

**KasHadiran** — `src/pages/KasHadiran.tsx`
- Variants: `semua`, `talangan`, `terbaru`, `terlama`, `hadir`, `lunas`, `kas`, `tidak_hadir`
- Props: `saldoHadiran`, `onSave`, `data`, `nominal`, `keterangan`, `tanggal`, `onClose`
- Key Styles: `rounded-t-3xl`, `border-control`, `bg-black/40`, `mx-auto`, `text-base`, `font-bold`, `backdrop-blur-sm`, `cursor-grab`
- Animation: tw-animate-spin, tw-animate-pulse, tw-transitions: transition-all, transition-colors
- State: useState

```tsx
<div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10 space-y-4" onClick={e => e.stopPropagation(
```

**KasRT** — `src/pages/KasRT.tsx`
- Variants: `masuk`, `semua`, `terbaru`, `terlama`, `keluar`, `nominal`
- Props: `saldoSekarang`, `initial`, `onSave`, `data`, `tipe`, `nominal`, `keterangan`, `tanggal` (+1 more)
- Key Styles: `rounded-t-3xl`, `border-control`, `bg-black/40`, `mx-auto`, `text-base`, `font-bold`, `backdrop-blur-sm`, `cursor-grab`
- Animation: tw-animate-spin, tw-transitions: transition-all, transition-colors, duration-150, duration-200
- State: useState

```tsx
<div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10 space-y-4"
        onClick={(e
```

**Login** — `src/pages/Login.tsx`
- Props: `onLogin`, `email`, `password`, `onWargaMode`
- Key Styles: `rounded-full`, `border-white/80`, `bg-white/80`, `px-6`, `text-2xl`, `font-bold`, `opacity-50`, `pointer-events-none`
- Animation: tw-transitions: transition-colors, transition-transform, duration-300, transition-all, ease-out
- State: useState

```tsx
<div className="login-bg relative min-h-dvh flex flex-col items-center justify-center px-6 overflow-hidden">

      {/* Aurora background — blob mengambang lembut (diredam di dark agar tidak menyilaukan
```

### Feedback (3)

**EmptyState** — `src/components/EmptyState.tsx`
- Props: `icon`, `title`, `subtitle`, `className`
- Key Styles: `rounded-[28px]`, `bg-gradient-to-br`, `mb-4`, `text-sm`, `font-bold`, `shadow-lg`

```tsx
<div className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
      <div className="relative w-28 h-24 mb-4">
        {/* Backdrop lembut */}
        <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-emerald-100/70 to-emerald-50/40 dark:from-gray-800 dark:to-gray-800/50" />

        {/* Elemen dekoratif mengambang */}
        <span className="blob absolute -top-1 right-3 w-2.5 h-2.5 rounded-full bg-amber-300/80" />
        <span className="blob absolute bottom-2 -left-1 w-3.5 h-3.5 rounded-md bg-emerald-300/70" style={{ animationDelay: '-4s' }} />
        <span className="blob absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-blue-300/70" style={{ animationDelay: '-8s' }} />

        {/* Tile ikon di tengah */}
        <div className="pop absolute inset-0 m-auto w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 shadow-lg flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10">
```

**ErrorBoundary** — `src/components/ErrorBoundary.tsx`
- Props: `children`
- Key Styles: `rounded-3xl`, `border-line`, `bg-white`, `px-6`, `text-lg`, `font-bold`

```tsx
<div className="app-bg min-h-dvh flex items-center justify-center px-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-7 max-w-sm w-full text-center">
          <span className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-warn dark:text-amber-400" />
          </span>
          <h1 className="text-lg font-bold text-ink dark:text-gray-100 mb-1.5">
            Ups, ada gangguan
          </h1>
          <p className="text-sm text-ink-sub dark:text-gray-400 mb-5 leading-relaxed">
            Terjadi kesalahan tak terduga. Coba muat ulang halaman — datamu aman,
            tidak ada yang hilang.
          </p>
```

**Toaster** — `src/components/Toaster.tsx`
- Key Styles: `rounded-xl`, `bg-white/95`, `gap-2`, `text-sm`, `font-semibold`, `backdrop-blur-md`, `pointer-events-none`
- Animation: tw-transitions: transition-colors
- State: useState

```tsx
<div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 w-[calc(100%-2rem
```

### Other (4)

**CrossFade** — `src/components/CrossFade.tsx`
- Props: `loading`, `skeleton`, `children`, `className`
- State: useState

**Odometer** — `src/components/Odometer.tsx`
- Variants: `0`
- Props: `value`, `prefix`, `className`, `duration`
- Animation: framer-motion, tw-transitions: ease-out-expo
- State: memo

```tsx
<span
      className={`inline-block tabular-nums ${className}`}
      style={{ whiteSpace: 'nowrap' }}
    >
      {negative && <span style={cell}>-</span>}
      {prefix && <span style={cell}>{prefix}</span>}
      {grouped.split(''
```

**AreaTrend** — `src/components/charts/AreaTrend.tsx`
- Props: `points`, `height`

```tsx
<svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="areaTrendG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaTrendG
```

**HeroSparkline** — `src/components/charts/HeroSparkline.tsx`
- Props: `points`, `height`
- Animation: tw-transitions: ease-out-expo
- State: useState, useRef



---

## 5. Layout Principles

- **Base spacing unit:** 4px
- **Spacing scale:** 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32
- **Border radius:** 6px, 8px, 12px, 16px, 24px
- **Grid usage:** `grid-cols-4`, `grid-cols-3`, `grid-cols-2`
- **Container:** Tailwind `container` class with responsive padding

**Spacing as Meaning:**
| Spacing | Use |
|---|---|
| 4-8px | Tight: related items within a group |
| 12-16px | Medium: between groups |
| 24-32px | Wide: between sections |
| 48px+ | Vast: major section breaks |


---

## 6. Depth & Elevation

### Raised — cards, buttons, interactive elements

- `var(--hero-shadow)`
- `0 0 0 2px rgba(167,243,208,0.35),0 0 8px 1px rgba(110,231,183,0.7)`
- `var(--shadow-card)`

### Floating — dropdowns, popovers, modals

- `0 0 0 2px rgba(167,243,208,0.35),0 0 10px 2px rgba(110,231,183,0.8)`
- `0 0 0 3px rgba(167,243,208,0.18),0 0 14px 4px rgba(110,231,183,0.95)`
- `inset 0 1px 0 0 rgba(255,255,255,0.18),0 6px 16px -8px rgba(16,150,80,0.5)`

### Overlay — full-screen overlays, top-level dialogs

- `inset 0 1px 0 0 rgba(255,255,255,0.22),0 2px 6px -1px rgba(13,80,50,0.35),0 12px 28px -8px rgba(16,150,80,0.55)`
- `0 8px 22px -12px rgba(0,0,0,0.25)`
- `0 14px 34px -10px var(--ann-glow,rgba(16,185,129,0.5))`

### Z-Index Scale

`1`



---

## 7. Animation & Motion

This project uses **expressive motion**. Animations are an integral part of the experience.

### Framer Motion Patterns

```tsx
// Standard enter animation
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
/>

// List stagger
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } }
}
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 }
}
```

### CSS Animations

- `@keyframes fadeIn`
- `@keyframes hsAreaIn`
- `@keyframes hsPulse`
- `@keyframes shimmer`
- `@keyframes riseIn`
- `@keyframes sheetUp`
- `@keyframes backdropIn`
- `@keyframes toastIn`

### Animated Components

- **FilterChips**: tw-transitions: transition-colors
- **Odometer**: framer-motion, tw-transitions: ease-out-expo
- **PengumumanBanner**: tw-animate-spin, tw-transitions: transition-colors, transition-all, transition-transform
- **PullToRefresh**: tw-animate-spin, tw-transitions: ease-out-expo
- **TargetKasRT**: tw-transitions: transition-colors, duration-700, ease-out

### Motion Guidelines

- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for enters, `ease-in` for exits
- Always respect `prefers-reduced-motion`


---

## 8. Do's and Don'ts

### Do's

- Use `#b45309` for interactive elements (buttons, links, focus rings)
- Use `#02150e` as the primary page background
- Use **Inter Variable** for all UI text
- Follow the **4px** spacing grid for all margins, padding, and gaps
- Use the defined shadow tokens for elevation — see Section 6
- Use border-radius from the scale: 6px, 8px, 12px, 16px, 24px
- Reuse existing components from Section 4 before creating new ones
- Use **Lucide** for all icons
- Always use CSS variables for colors — never hardcode hex
- Test both light and dark modes for contrast

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't mix font families — use Inter Variable consistently
- Don't use arbitrary spacing values — stick to multiples of 4px
- Don't create custom box-shadow values outside the system tokens
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't duplicate component patterns — check Section 4 first
- Don't mix icon libraries — consistency matters


---

## 9. Responsive Behavior

| Name | Value | Source |
|---|---|---|
| sm | 640px | tailwind |
| md | 768px | tailwind |
| lg | 1024px | tailwind |
| xl | 1280px | tailwind |
| 2xl | 1536px | tailwind |

**Approach:** Mobile-first using Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`).
Always design for mobile first, then layer on responsive overrides.


---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #ffffff
Border: 1px solid #374151
Radius: 12px
Padding: 16px
Font: Inter Variable
Use shadow tokens from Section 6.
```

### Build a Button

```
Primary: bg #b45309, text white
Ghost: bg transparent, border #374151
Padding: 8px 16px
Radius: 12px
Hover: opacity 0.9 or lighter shade
Focus: ring with #b45309
```

### Build a Page Layout

```
Background: #02150e
Max-width: 1280px, centered
Grid: 4px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #ffffff
Label: #475569 (muted, 12px, uppercase)
Value: #e9ecf2 (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #02150e
Input border: 1px solid #374151
Focus: border-color #b45309
Label: #475569 12px
Spacing: 16px between fields
Radius: 12px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: Inter Variable, type scale from Section 3
4. Spacing: 4px grid
5. Components: match patterns from Section 4
6. Elevation: shadow tokens
```

