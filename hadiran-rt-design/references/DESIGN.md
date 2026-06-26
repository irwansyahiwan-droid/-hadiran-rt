# hadiran-rt DESIGN.md

> **Sumber kebenaran = `tailwind.config.js` + `src/index.css`.** Dokumen ini
> menarasikannya; jika ada konflik, **kode menang**. (Versi lama dokumen ini
> auto-generated & keliru pada font, warna aksen, dan tema default — sudah
> ditulis ulang manual agar cocok dengan kode.)
>
> Stack: Tailwind CSS 3.4.1 + React 18.3.1 · Ikon: Lucide
> **Dua font** (Inter body + Sora display) · **Aksen: emerald/hijau brand**
> Light & dark **setara** (mobile-first, dibuka warga via browser HP)

---

## 1. Visual Theme & Atmosphere

Antarmuka **mobile-first** untuk warga RT, dengan **light dan dark mode setara**
(bukan dark-first). Kanvas light `#E6EAF1` (token `sunken`) — abu netral sejuk
ala Apple/Linear; kartu putih "pop" lewat **step tonal + bayangan crisp
berlapis** (`.lift`), bukan glow/aurora. Dark canvas `#030712`.

Aksen tunggal adalah **emerald/hijau brand** (`#0F4C2E`→`#1B7249`) — dipakai di
chip aktif, tautan, focus ring, dan CTA. Biru (`setor`) hanya **sinyal status**
(hero Kas Hadiran sudah disetor), bukan aksen kedua. Amber (`warn`) khusus
tunggakan/perhatian. Merah (`neg`) khusus uang keluar/negatif.

Spacing mengikuti **grid 4px** (kompak). Motion **ekspresif** tapi taat
`prefers-reduced-motion` dan `prefers-reduced-transparency` — spring physics,
staggered reveal, shimmer skeleton, sheet slide-up.

---

## 2. Color Palette & Roles

Token semantik di `tailwind.config.js` → `theme.extend.colors`. **Selalu pakai
token ini; jangan hardcode hex** kecuali untuk konteks yang Tailwind tak bisa
jangkau (kanvas PDF/share, stroke SVG chart, `theme-color` meta, gradient
banner per-kategori — lihat §8).

### Brand (aksen — HIJAU, bukan amber)

| Token | Hex | Peran |
|---|---|---|
| `brand` (DEFAULT) | `#0F4C2E` | fill chip aktif, judul kuat (deep) |
| `brand-600` | `#145D39` | step gradient |
| `brand-500` | `#1B7249` | step gradient · `accent-color` native · focus outline · caret |
| `brand-link` | `#0D6B5E` | tautan "Lihat semua" (teal-green) |
| `brand-linkDark` | `#1A9B86` | pasangan dark: tab aktif + tautan + accent-color |

### Semantik nominal (SATU hijau, SATU merah, SATU amber)

| Token | Hex | Peran |
|---|---|---|
| `pos` | `#047857` | uang masuk / positif (emerald-700) |
| `neg` | `#E11D48` | uang keluar / negatif (rose-600) |
| `warn` | `#B45309` | tunggakan / perhatian (amber-700) |

### Status setor (BUKAN aksen kedua — hanya hero Kas Hadiran)

| Token | Hex | Peran |
|---|---|---|
| `setor` (DEFAULT) | `#1E40AF` | from — deep (blue-800) |
| `setor-600` | `#2563EB` | via (blue-600) |
| `setor-500` | `#3B82F6` | to (blue-500) |

### Permukaan & garis

| Token | Hex | Peran |
|---|---|---|
| `surface` | `#FFFFFF` | background kartu/panel |
| `sunken` | `#E6EAF1` | **kanvas app** (= `body`, `.app-bg`, manifest `background_color`) |
| `line` | `#CFD5DF` | garis/divider tipis (≈ tone kanvas, tak mewashout hairline) |
| `control` | `#E2E8F0` | border kontrol (input/tombol), sedikit lebih kuat dari `line` |

### Teks (semua lolos AA di atas putih)

| Token | Hex | Peran |
|---|---|---|
| `ink` (DEFAULT) | `#0B1220` | judul / nominal utama (near-black) |
| `ink-sub` | `#374151` | teks sekunder (gray-700) |
| `ink-faint` | `#475569` | tanggal / caption (slate-600) |

> **Kontras light-mode legacy:** banyak halaman pakai `text-gray-400/500`.
> `index.css` menggelapkannya via scope `html:not(.dark)` (`gray-400→#6B7280`,
> `gray-500→#4B5563`) agar lolos AA. **Jangan hapus override itu** — ia mengganti
> peran token `ink-sub`/`ink-faint` untuk call-site lama.

### Aksen emerald di luar skala brand (catatan)

`#10B981` (emerald-500) & `#34D399` (emerald-400) muncul di focus glow `.field`,
focus ring, dan stripe `borderLeft` (KasHadiran/Jadwal). Ini lineage hijau ke-3
yang belum ditokenkan — biarkan apa adanya, jangan dianggap drift.

### Dark Mode

Dark **bukan sekadar flip warna** — punya resep elevasi terpisah. Lihat §6.
Kanvas dark `#030712`; native control & `accent-color` ikut tema
(`color-scheme: dark`, accent `#1A9B86`).

---

## 3. Typography Rules — DUA font, bukan satu

**Body = Inter Variable** (self-hosted, readability maksimal).
**Display = Sora** (grotesk geometrik) untuk **judul section/halaman & nominal
hero** → app punya "suara" visual sendiri. **Jangan satukan jadi Inter polos.**

- Token: `--font-display` (index.css) + util `.font-display` + class Tailwind `font-display`.
- `h1, h2` otomatis Sora + `letter-spacing: -0.018em` (di `@layer base`).
- Body & teks kecil tetap Inter (di-set di `body`).

### Type ramp (mobile, font-size SAJA — leading util tetap menang)

| Token | Size | Untuk |
|---|---|---|
| `text-micro` | 11px (0.6875rem) | badge kecil, nomor, label uppercase mungil |
| `text-caption` | 13px (0.8125rem) | tanggal, caption, teks sekunder |
| `text-body` | 15px (0.9375rem) | body utama list/baris |
| `text-amount` | 17px (1.0625rem) | nominal menonjol |

Heading besar tetap pakai skala Tailwind (`text-lg`/`xl`/`2xl`/`5xl`) dengan
font Sora. **0 arbitrary value** (`text-[..]`) tersisa di codebase — pertahankan.

**Aturan:**
- Angka rupiah: `font-variant-numeric: tabular-nums` aktif app-wide (digit tak goyang). `<Odometer>` untuk count-up.
- Input WAJIB efektif ≥16px (guard `input.text-sm → 16px` di index.css) agar Safari iOS tak auto-zoom.
- Maks 3–4 ukuran per layar; hierarki sekunder lewat warna (`ink-sub`/`ink-faint`), bukan ukuran baru.

---

## 4. Component Recipes (sumber tunggal)

Definisi di `@layer components` (index.css) + util elevasi. **Pakai ini sebelum
bikin baru.**

### Tombol
- **`.btn-brand`** — CTA primer: gradient emerald hidup + glow + glossy top edge, `rounded-xl`, spring-press. Teks putih lolos AA.
- **`.btn-secondary`** — aksi netral (Batal/Tutup): border `control`, hover bg, spring-press. Radius & lebar ditahan call-site (`flex-1`/`rounded-xl`).

### Field
- **`.field`** — input form: `bg-gray-50` (dark `gray-800`), `py-3`, border `control`, fokus = ring emerald `#10B981`.
- **`.field-search`** — bilah cari list: `bg-white` (dark `gray-900`), `py-3`, ikon kiri/kanan.

### Feedback / tactile
- **`.press`** — spring scale 0.97 saat ditekan (opt-in). **`.press-icon`** — varian transform-safe (pakai opacity, untuk ikon yang sudah ber-`translate`).
- **`.skeleton`** — shimmer (bukan flat pulse). **`.cf-in`/`.cf-out`** — cross-fade skeleton→konten.

### Komponen React kunci
`Tag` (tone: neutral/success/danger/warning/info), `EmptyState`, `ErrorBoundary`,
`Toaster`, `BannerCarousel`, `Odometer`, `SmartInsight`, `AvatarPeci`,
`FilterChips`, `PullToRefresh`, chart `DonutChart`/`MonthlyBars`/`AreaTrend`/`HeroSparkline`.
Semua sheet/modal WAJIB pakai hook `useDialog` (role=dialog + fokus trap +
Escape) — jangan bikin sheet mentah.

---

## 5. Layout Principles

- **Base unit 4px.** Skala: 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32.
- **Radius:** 6 / 8 / 12 / 16 / 24px (+ `--hero-radius` 24px). Pill = `rounded-full`.
- **Mobile-first**, lebar konten dibatasi (`max-w-lg` untuk sheet). Grid `grid-cols-2/3/4`.
- **safe-area** dihormati; PullToRefresh kustom (native dimatikan via `overscroll-behavior-y: contain`).

| Spacing | Makna |
|---|---|
| 4–8px | item terkait dalam satu grup |
| 12–16px | antar grup |
| 24–32px | antar section |

---

## 6. Depth & Elevation

Separasi kartu dari **step tonal + bayangan crisp berlapis (spread negatif)**,
bukan halo/glow. Token utama:

- **`--shadow-card`** (class `.lift`) — kartu putih: inset top-highlight + ring tepi crisp 1px + contact + key + ambient float. Punya pasangan dark (ring cahaya, bukan halo putih). `.lift` light juga dapat `linear-gradient(180deg,#FFF→#F4F7FC)` (top-light glass).
- **`--shadow-float`** (class `.float`) — dropdown/popover/modal.
- **`.nav-float`** — kapsul bottom-nav melayang (light & dark terpisah).
- **`--hero-shadow`** — kartu hero gradient (sekeluarga elevasi dengan `.lift`).

**Z-index (sumber tunggal di `tailwind.config.js`):**

| Tier | Nilai | Untuk |
|---|---|---|
| `z-40` | 40 | Header + BottomNav + scrim |
| `z-50` | 50 | bottom-sheet, overlay, dropdown |
| `z-banner` | 55 | prompt app-level (Install/PWA update) |
| `z-modal` | 60 | modal di atas overlay + SuccessOverlay + WelcomeSheet |
| `z-toast` | 70 | Toaster — selalu paling atas & sendirian |

---

## 7. Animation & Motion

Easing tunggal: **`--ease-spring`** `cubic-bezier(0.34,1.4,0.5,1)` (elemen hidup:
pill nav, count-up) & **`--ease-out-expo`** `cubic-bezier(0.16,1,0.3,1)` (default).

Keyframe (index.css): `fadeIn`/`.page-enter`, `riseIn`/`.rise` (stagger list),
`sheetUp`+`backdropIn` (bottom sheet), `toastIn`/`toastOut`, `shimmer`,
`successPop`/`successRing`/`checkDraw`/`confettiFall`, `odoColIn` (Odometer),
`popIn`/`.pop`, `popMenuIn`/`popMenuOut` (dropdown ≤170ms), `slideInRight/Left`
(transisi antar-tab), `floatBlob` (login aurora), banner: `bannerArtFloat`/
`bannerDraw`/`bannerShimmer`/`heroSheen`.

**Aturan:** exit lebih cepat dari enter (sistem merespons, bukan menunda).
Micro 150–300ms, transisi halaman 300–500ms. **Wajib** taat
`prefers-reduced-motion` (catch-all di akhir index.css) **dan**
`prefers-reduced-transparency` (matikan backdrop-filter, padatkan kaca).

---

## 8. Do's and Don'ts

### Do's
- Aksen interaktif (tombol/tautan/focus) = **emerald `brand`** (`#1B7249`/`#0F4C2E`).
- Kanvas light = `sunken` `#E6EAF1`; dark = `#030712`. Kartu = `surface` putih + `.lift`.
- **Dua font:** Inter untuk body, **Sora** (`font-display`/`h1`/`h2`) untuk judul & nominal hero.
- Pakai token warna semantik (§2), type ramp (§3), shadow token (§6).
- Reuse recipe `.btn-brand`/`.btn-secondary`/`.field` & komponen §4 sebelum bikin baru.
- Sheet/modal lewat `useDialog`. Ikon: **Lucide**. Grid 4px, radius dari skala.
- Uji light **dan** dark untuk kontras (AA).

### Don'ts
- **Jangan** jadikan amber (`warn`/`#B45309`) atau biru (`setor`) sebagai aksen utama — itu masing-masing tunggakan & status.
- **Jangan** satukan font jadi Inter polos — Sora disengaja.
- **Jangan** anggap app dark-first — light setara.
- **Jangan** hardcode hex untuk UI biasa (kecuali konteks §"Pengecualian hex" di bawah).
- **Jangan** hapus override `html:not(.dark) .text-gray-400/500` (kontras AA).
- **Jangan** drift nilai kanvas/`sunken`/manifest — harus satu nilai (`#E6EAF1`).
- **Jangan** restruktur token "demi premium" tanpa celah nyata.

### Pengecualian hex yang sah (bukan drift — sistem dua-tingkat token vs viz)
- `shareReceipt.ts` / `shareLaporanKas.ts` — kanvas PDF/share raster.
- `BannerCarousel.tsx` — palet gradient per-kategori (disengaja).
- chart (`AreaTrend`/`HeroSparkline`) & `SuccessOverlay` confetti — stroke SVG / array JS.
- `useTheme.ts` — `theme-color` meta (`#030712` dark / `#FAFBFC` light).

---

## 9. Responsive Behavior

Mobile-first via prefix Tailwind. Breakpoint default: `sm 640` · `md 768` ·
`lg 1024` · `xl 1280` · `2xl 1536`. Target utama = layar HP; desain untuk mobil
dulu, baru layer override. `min-h-dvh` (bukan `vh`) untuk tinggi penuh aman di iOS.

---

## 10. Agent Prompt Guide

Saat membangun UI baru, mulai dari sini (selalu cek `tailwind.config.js` +
`index.css` untuk nilai final):

**Card**
```
Surface: bg-white (token surface) + class .lift
Border: border border-line (dark: border-gray-800/60)
Radius: rounded-2xl / rounded-3xl (16–24px)
Padding: 16px (grid 4px)
Teks: judul font-display + text-ink; sekunder text-ink-sub
```

**Button**
```
Primer:   .btn-brand (gradient emerald + glow, teks putih)
Sekunder: .btn-secondary (border control, hover bg)
Radius bawaan rounded-xl; press = .press (spring)
Focus ring emerald otomatis (focus-visible)
```

**Form field**
```
Input: class .field (bg-gray-50, py-3, border control)
Fokus: ring emerald #10B981 (sudah di .field:focus)
Cari:  class .field-search (bg-white + ikon)
Label: text-caption text-ink-sub; jarak antar field 16px
Input efektif ≥16px (anti auto-zoom iOS)
```

**Stats / nominal**
```
Label:  text-caption uppercase, text-ink-faint
Nilai:  font-display tabular-nums, text-ink (atau pos/neg/warn sesuai arti)
Status: pos (masuk) / neg (keluar) / warn (tunggakan) / setor (sudah disetor)
```

**Page layout**
```
Wrapper: class app-bg (kanvas sunken + aura emerald lembut)
Mobile-first, konten dibatasi; sheet max-w-lg
Motion: ease-out-expo default, taat reduced-motion
```

**Checklist umum**
```
1. Baca tailwind.config.js + index.css untuk token final
2. Warna: hanya dari §2 (aksen = brand/emerald)
3. Font: Inter body + Sora judul/nominal; type ramp §3
4. Spacing 4px; radius dari skala
5. Reuse recipe & komponen §4; sheet via useDialog
6. Elevasi: .lift/.float/.nav-float (§6)
7. Uji light & dark
```
