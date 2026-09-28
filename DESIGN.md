---
name: Hadiran RT
description: Manajemen arisan & kas RT yang tenang, jujur, dan terbaca — ketenangan fintech dengan jiwa kampung, dalam mazhab TONAL rona Hutan (kanvas senada, kartu putih, dipisah langkah nada + bayangan bertinta).
status: Tonal rona Hutan (hue 158°; palet 24 Agu, kroma kanvas & bayangan 30 Agu 2026) — penerus Material-flat (2 Jul 2026). Sumber kebenaran = tailwind.config.js + src/index.css. Diselaraskan ke kode 28 Sep 2026.
colors:
  brand: "#0F4C2E"
  brand-600: "#145D39"
  brand-500: "#1B7249"
  brand-link: "#005044"
  brand-link-dark: "#34D399"
  btn-brand-top: "#0C6238"
  btn-brand-mid: "#0A5531"
  btn-brand-bottom: "#094A2B"
  hero-top: "#0A5230"
  hero-mid: "#08492B"
  hero-bottom: "#032A17"
  pos: "#05543E"
  pos-dark: "#41DCA1"
  pos-dark-fill: "#10B981"
  neg: "#941136"
  neg-dark: "#FFAEB8"
  neg-dark-fill: "#F43F5E"
  btn-danger-top: "#E11D48"
  btn-danger-mid: "#C01340"
  warn: "#75320B"
  warn-dark: "#FBBF24"
  setor: "#1E40AF"
  setor-600: "#2563EB"
  setor-500: "#3B82F6"
  gold-songket: "#E8B651"
  surface: "#FFFFFF"
  sunken: "#CFE6D8"
  line: "#D3E0D8"
  control: "#66786D"
  control-dark: "#65776C"
  inset-soft: "#EAEFEC"
  divider-inset: "#D2DCD5"
  ink: "#07160D"
  ink-sub: "#1D2D23"
  ink-faint: "#34453B"
  gray-400-remap: "#3E4F44"
  gray-500-remap: "#34453B"
  gray-400-remap-dark: "#B4C9BB"
  emerald-400-remap-dark: "#41DCA1"
  rose-400-remap-dark: "#FFAEB8"
  blue-400-remap-dark: "#95C8FF"
  gray-50: "#F9FAF9"
  gray-100: "#F2F5F3"
  gray-200: "#E2E9E5"
  gray-300: "#CCD8D1"
  gray-400: "#95A89C"
  gray-500: "#65776C"
  gray-600: "#48594E"
  gray-700: "#34453B"
  gray-800: "#26362D"
  gray-900: "#192920"
  gray-950: "#010A04"
  card-dark: "#192920"
  sheet-dark: "#26362D"
  canvas-dark: "#001709"
typography:
  display:
    fontFamily: "Sora Variable, Sora, Inter Variable, system-ui, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Sora Variable, Sora, Inter Variable, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.022em"
  title:
    fontFamily: "Sora Variable, Sora, Inter Variable, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  subtitle:
    fontFamily: "Sora Variable, Sora, Inter Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.008em"
  amount:
    fontFamily: "Sora Variable, Sora, Inter Variable, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Inter Variable, Inter, -apple-system, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  caption:
    fontFamily: "Inter Variable, Inter, -apple-system, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.005em"
  micro:
    fontFamily: "Inter Variable, Inter, -apple-system, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0.06em"
  overline:
    fontFamily: "Inter Variable, Inter, -apple-system, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  lg: "8px"          # tile kecil, fokus
  xl: "12px"         # input, tombol, tile 28–44px (rounded-xl)
  2xl: "16px"        # panel padat, tile 48–72px (rounded-2xl)
  3xl: "24px"        # kartu konten, hero, tile >=76px (rounded-3xl, --hero-radius)
  full: "9999px"     # FAB, chip, tag, avatar bulat
spacing:
  "0.5": "2px"
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
components:
  button-primary:
    class: ".btn-brand"
    background: "linear-gradient(180deg, #0C6238 0%, #0A5531 58%, #094A2B 100%)"
    textColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  button-danger:
    class: ".btn-danger"
    background: "linear-gradient(180deg, #E11D48 0%, #C01340 58%, #941136 100%)"
    textColor: "{colors.surface}"
    rounded: "{rounded.xl}"
  button-secondary:
    class: ".btn-secondary"
    background: "{colors.surface}"
    border: "{colors.control}"
    textColor: "{colors.ink-sub}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  field:
    class: ".field"
    backgroundColor: "{colors.gray-50}"
    border: "{colors.control}"
    focus: "border + ring 2px #047857 (gelap #34D399)"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    fontSize: "16px"                # anti-zoom iOS
  field-search:
    class: ".field-search"
    backgroundColor: "{colors.surface}"
    border: "{colors.control}"
    rounded: "{rounded.xl}"
  card:
    backgroundColor: "{colors.surface}"
    border: "{colors.line}"
    shadow: ".lift (--shadow-card, bayangan bertinta hijau)"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl} / {rounded.3xl}"
    padding: "16px–20px"
  inset-panel:
    class: ".inset-soft"
    backgroundColor: "{colors.inset-soft}"  # fill datar, TANPA tepi/dimensi
    rounded: "{rounded.2xl}"
  chip-active:
    class: "FilterChips (aktif)"
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
  hero:
    class: ".hero-emerald (lewat HeroSaldo / HeroStats)"
    gradient: "linear-gradient(150deg, #0A5230 0%, #08492B 52%, #032A17 100%)"
    textColor: "{colors.surface}"
    shadow: "{--hero-shadow}"
    rounded: "{rounded.3xl}"
    padding: "24px"
  meta-row:
    component: "MetaPisah"
    rule: "baris meta berpemisah · boleh melipat; titik tak pernah menggantung di ujung/awal baris"
  bottom-nav:
    class: ".nav-dock"
    style: "bar dok penuh nempel tepi bawah (BUKAN kapsul melayang)"
---

# Design System: Hadiran RT

> **Sumber kebenaran = `tailwind.config.js` + `src/index.css`.** Dokumen ini adalah
> ringkasan naratif yang harus DISELARASKAN ketika token berubah. Bila ada
> perbedaan, kode menang — lalu perbarui dokumen ini. Arah aktif: **tonal rona Hutan**
> (24–30 Agu 2026), penerus Material-flat (pivot 2 Jul 2026). Jangan pasang ulang bahasa "floating-glass" era lama yang
> sengaja dibongkar (lihat §4 & §6).

## 1. Overview

**Creative North Star: "Ketenangan Fintech Kampung" — dalam mazhab tonal rona Hutan.**

Hadiran RT meminjam disiplin fintech kelas atas — ketenangan, presisi, kelapangan
ala Google/myBCA/BYOND BSI — lalu menjinakkannya jadi hangat dan lokal. Kanvas
hijau-senada **#CFE6D8** (rona Hutan 158°) yang **rata dan tenang** menjadi panggung;
kartu **putih murni** dipisahkan dari kanvas oleh **langkah nada** (9,6 % L) dan
**bayangan bertinta hijau** (`--shadow-card`), dengan hairline `line` tinggal sebagai
bisikan. Bukan kaca berpendar, bukan kertas melayang — permukaan datar yang tegas.

Angka adalah bintang: nominal rupiah memakai **Sora** yang tegas dan `tabular-nums`
app-wide supaya digit tidak goyang saat count-up atau disusun kolom — seperti running
text bank, tapi milik kampung sendiri.

Sistem ini berdiri di atas satu suara brand: **hijau emerald deep**. Satu hijau, satu
merah, satu amber untuk makna uang; tidak ada percampuran red/rose atau green/emerald
di satu layar. Identitas lokal dibawa oleh **satu** ornamen yang sangat langka — motif
anyaman **songket emas** pada kartu saldo dan sorot giliran Sohibul Bait — yang
berfungsi sebagai stempel kehormatan RT, bukan dekorasi yang ditebar.

**Kenapa flat, dan bukan glass?** Selama berbulan-bulan permukaan kartu naik-turun
antara kaca berpendar, halo putih, top-light, dan inset berpahat (≥9 pass tuning L
kanvas). Akar rasa "kurang bersih" ternyata **bukan** nilai L kanvas, tapi **dua
bahasa visual yang campur**: nav/pill/banner sudah flat sementara kartu masih
floating-glass. Solusinya komit penuh ke satu bahasa: **flat Google-light**. Depth
datang dari tone + hairline + ruang, bukan dari lapisan yang ditumpuk.

**Lalu flat berkembang jadi TONAL (24–30 Agu 2026).** Kanvas abu-biru lama + kartu
putih + hairline sebagai SATU-SATUNYA pemisah ternyata mengejar hasil bermazhab tonal
(Revolut/Mercury, Material 3 tone-based surfaces) dengan alat flat. Sekarang: rona
seluruh skala abu digeser ke Hutan 158° dengan **L dikunci** (nol rasio kontras
bergerak), kanvas diberi **kroma** (C 0,0134 → 0,0308, L & rona dikunci), pemisah
kartu = **langkah nada + bayangan bertinta**, dan hairline **mundur** jadi bisikan.
Kalau suatu saat terasa "kurang nendang": ukur kroma dulu, lalu bayangan — **jangan
menggelapkan hairline**.

**Key Characteristics:**
- Kanvas hijau-senada **rata** (#CFE6D8) + kartu putih murni; separasi dari langkah
  nada + bayangan bertinta, hairline cuma bisikan. **Bukan** glow, bukan kaca.
- Satu suara brand emerald; semantik uang satu-hijau/satu-merah/satu-amber.
- Angka memimpin: Sora + tabular-nums di mana-mana.
- Kontras tinggi & teks nyaman — untuk warga lansia dan baca di bawah matahari.
- Dark mode first-class (kanvas #001709, kartu #192920, sheet #26362D; separasi dari
  ring cahaya tepi, aura emerald lembut di `.app-bg`).
- Satu sumber per peran (token, helper, komponen) — anti-drift.

## 2. Colors

Palet bertumpu pada satu hijau emerald sebagai suara brand, neutral abu sejuk untuk
struktur, dan tiga warna semantik uang yang disiplin. Emas songket berdiri terpisah
sebagai warna kehormatan kultural.

### Primary
- **Emerald Deep** (`brand` #0F4C2E, dengan #145D39 / #1B7249): Suara brand tunggal.
  Fill chip aktif, judul kuat, tombol primer, gradient hero saldo. Satu-satunya warna
  identitas — jangan tambah accent kedua.
- **Teal-Green Tautan** (`brand-link` #005044, pasangan dark `brand-linkDark` #34D399):
  Tautan "Lihat semua", tab aktif. Hijau sedikit kebiruan agar beda dari fill brand.

### Secondary (scoped, BUKAN accent)
- **Setor Blue** (`setor` #1E40AF, dengan #2563EB / #3B82F6): SINYAL STATUS. Hidup hanya
  di kartu hero **Kas Hadiran saat sudah disetor**. Jangan perluas biru ke tempat lain.
- **Emas Songket** (`--gold-songket` #E8B651): Warna HONOR/dekoratif kultural. Hidup
  HANYA di dua tempat: motif `.songket-weave` pada kartu saldo, dan sorot "Giliran
  berikutnya" Sohibul Bait (mahkota + cincin avatar) di Beranda. TIDAK PERNAH menyentuh
  uang/status/nav.

### Neutral (struktur — rona Hutan 158°, L dikunci ke tangga Tailwind asli)
Seluruh skala `gray-*` ikut rona Hutan (`gray-50 #F9FAF9` … `gray-950 #010A04`), jadi
~1.255 pemakaian kelas abu bawaan berubah wajah tanpa satu pun rasio bergerak.
- **Ink** (#07160D): Judul & nominal utama (near-black; 18,6:1 di putih, 14,1:1 di kanvas).
- **Ink Sub** (#1D2D23): Teks sekunder tegas (14,5:1 di putih, 11,0:1 di kanvas).
- **Ink Faint** (#34453B, gray-700): Tanggal/caption (10,2:1 di putih, 7,75:1 di kanvas) — tetap kebaca jelas,
  **BUKAN** abu pudar.
- **Surface** (#FFFFFF): Latar kartu (putih murni, flat).
- **Sunken / Canvas** (#CFE6D8, L\*90,4 C 0,0308): Background app, **rata tanpa radial**.
  Punya **sepuluh titik sinkron** — `body` · `.app-bg` · token `sunken` · `warnaCetak.ts`
  (dikunci uji) · manifest `background_color` · `landing.html --canvas` & `--alt-bg` ·
  `index.html` theme-color · splash inline · `gen-splash.mjs` · `useTheme` — anti strip
  beda tone saat overscroll. Splash PNG di-bake: regen lalu **periksa pikselnya**.
- **Line** (#D3E0D8): Hairline tepi kartu — **bisikan**, bukan pemisah utama (1,36:1 di
  putih). Pemisah kartu dipikul langkah nada + bayangan. **JANGAN digelapkan** — jalan itu
  sudah buntu sembilan kali.
- **Control** (#66786D, gelap #65776C): Border input/tombol — 4,7:1 di putih (lolos
  §1.4.11 3:1), jauh lebih kuat dari `line`.
  Hierarki tepi: **control > line > divider-baris**.
- **Inset-soft** (#EAEFEC; gelap `rgba(255,255,255,.06)`): Fill sub-panel datar di dalam kartu putih (lihat §4).
- **Divider-inset** (#D2DCD5; gelap `rgba(255,255,255,.08)`): Hairline antar-baris di dalam kartu list (lebih terang
  dari `line` → boundary kartu memimpin).
- **Canvas Dark** (#001709) · **Kartu gelap** (#192920, gray-900) · **Sheet gelap** (#26362D, gray-800).

### Semantik Uang
- **Positif/Masuk** (`pos` #05543E; gelap #41DCA1; tanda grafik gelap #10B981).
- **Negatif/Keluar** (`neg` #941136; gelap #FFAEB8; tanda grafik gelap #F43F5E).
- **Perhatian/Tunggakan** (`warn` #75320B; gelap #FBBF24).

Ketiganya diturunkan sampai **≥7:1 (AAA, ambang app)** di permukaan terburuknya, bukan
di putih. Di mode gelap token `pos.dark`/`neg.dark` SAMA dengan remap
`dark:text-emerald-400` → #41DCA1 dan `dark:text-rose-400` → #FFAEB8 (dinaikkan 26 Agu
2026 untuk sheet #26362D; token menyusul 28 Sep) — satu hijau & satu merah gelap. Cerminnya untuk kertas & berkas (PDF, PNG, Excel) hidup di `warnaCetak.ts`
dan dikunci `warnaCetak.test.ts`.

**The Warna-Adalah-Arah Rule.** Warna uang menyatakan **ARAH**, bukan jenis transaksi:
hijau = masuk, merah = keluar. Amber **hanya** untuk talangan & peringatan. Setoran ke
Kas RT, Saldo Awal, iuran tarikan di Kas Hadiran, dan nominal di Riwayat Aktivitas
memakai **tinta netral** — bukan hijau/merah. Nol tidak berhak atas warna. Aturan yang
sama berlaku di layar, PNG, PDF, dan Excel.

### Named Rules
**The Satu-Suara Rule.** Hanya ada SATU warna brand: emerald deep. Biru `setor` dan emas
`gold-songket` adalah pengecualian yang scoped ke satu tempat masing-masing — bukan
accent tambahan.

**The Satu-Hijau-Satu-Merah-Satu-Amber Rule.** Untuk makna uang: satu hijau (`pos`),
satu merah (`neg`), satu amber (`warn`). Jangan campur red/rose dengan green/emerald di
satu layar.

**The No-Abu-Pudar Rule.** Teks tidak boleh memakai abu di bawah AA di atas putih. Dari
SATU titik di `index.css`, `text-gray-400` → **#3E4F44** (8,7:1 di putih) dan `text-gray-500`
/ `text-gray-600` → **#34453B** (10,2:1 di putih, 7,75:1 di kanvas), scoped `html:not(.dark)`
agar dark mode tak ikut. Light gray
"demi elegan" dilarang — banyak pengguna lansia & baca di bawah matahari.

**The Saldo-Defisit Rule.** Saldo minus disengaja (talangan ditutup penuh dari kas).
Nominal **tetap putih premium** di semua hero (Beranda & Kas Hadiran); negatif ditandai
**chip kata "Defisit"** di samping angka — BUKAN mewarnai nominal jadi salmon
(`text-rose-200` = sinyal lemah & sumbang, apalagi di atas gradient setor biru).

## 3. Typography

**Display Font:** Sora Variable (fallback Inter Variable, system-ui) — grotesk geometrik
berkarakter untuk judul & nominal hero.
**Body Font:** Inter Variable (fallback -apple-system, system-ui) — readability maksimal.

**Character:** Pasangan kontras-tegas: Sora memberi "suara" pada angka & judul,
Inter menjaga keterbacaan tubuh teks. Bukan dua sans humanis yang nyaris kembar.
`tabular-nums` aktif app-wide (`font-variant-numeric: tabular-nums` di `body`).

### Type Ramp — 9 peran, `theme.fontSize` DITIMPA (di luar `extend`)
Ukuran + leading + tracking dimiliki tokennya. Tracking NEGATIF saat huruf membesar,
POSITIF saat mengecil. **Sengaja tak ada 16px** (`text-base` tak ada): isi turun ke
`body`, judul naik ke `subtitle`.
- **display** — 38px, lh 1.05, -0.03em: nominal hero, wordmark (hero memakai `FitAmount`).
- **headline** — 28px, lh 1.15, -0.022em: judul besar / angka menonjol.
- **title** — 22px, lh 1.25, -0.015em: JUDUL HALAMAN.
- **subtitle** — 18px, lh 1.35, -0.008em: judul kartu / seksi / sheet.
- **amount** — 17px, lh 1.3, -0.005em: nominal menonjol di list & baris.
- **body** — 15px, lh 1.55: isi list/baris. Batasi prosa panjang ≤ 65–75ch.
- **caption** — 13px, lh 1.45, +0.005em: tanggal, teks sekunder.
- **micro** — 11px, lh 1.35, +0.06em: badge, nomor.
- **overline** — 11px kapital, lh 1.2, +0.14em: label eyebrow.

**Lantai huruf 11px** (`audit:huruf`): tak ada teks tercat di bawah anak tangga terkecil.
Pengecualian satu-satunya: mesin susut-agar-muat (`ukuranMuat`, kaki hero) lewat
`data-susut`, dengan lantai keras 9,6px.

### Tebal huruf — sumbu KERJA, dimiliki komponen
`fontWeight` DITIMPA ke lima anak tangga: `normal` 400 redup · `medium` 500 prosa ·
`semibold` 600 nilai & kontrol · `bold` 700 judul · `extrabold` 800 angka besar (HANYA
`font-display`). Badge/tombol `text-micro` wajib `bold` (kompensasi optis di 11px).
`.btn-*`, `<Tag>`, `<SectionTitle>` memiliki tebalnya — call-site tidak memilih.

### Hierarchy
- **Display** (Sora 800, `text-display`): nominal hero, wordmark.
- **Title/Subtitle** (Sora 700): judul halaman / kartu (`h1/h2` mewarisi `--font-display`).
- **Amount** (Sora 600, `text-amount`): nominal di list/baris.
- **Body** (Inter 400–500, `text-body`): teks utama.
- **Caption** (Inter 400, `text-caption`): tanggal, teks sekunder.
- **Micro** (Inter 600, `text-micro`): badge kecil, label uppercase.

### Named Rules
**The Angka-Memimpin Rule.** Nominal rupiah selalu Sora + `tabular-nums`. Angka adalah
konten paling penting; tipografi melayaninya. Nominal besar hero pakai `FitAmount`
(fit-to-width) demi keterbacaan warga lansia — sebesar mungkin, tak terpotong.

**The 16px-Input Rule.** Semua input wajib font-size 16px (dipaksa dari satu titik:
`input.text-sm, select.text-sm, textarea.text-sm { font-size: 16px }`) agar Safari iOS
tidak auto-zoom saat fokus.

## 4. Elevation — TONAL (bukan glass, bukan kertas melayang)

Mazhab **tonal**: separasi kartu dari kanvas datang dari **(1) langkah nada** (putih
#FFF vs kanvas #CFE6D8 = 9,6 % L; gelap 8,3 % L), **(2) bayangan bertinta hijau**
`rgba(8,30,19,…)` — bukan hitam netral — dan **(3) geometri rounded**. Hairline `line`
tetap ada sebagai bisikan tepi.
Semua yang menumpuk lapisan sudah **dihapus**: halo putih, top-light gradient,
inset-shadow berpahat, ambient float lebar, edge-ring ganda, sheen di icon-tile.

Di **dark mode**, drop shadow nyaris tak terbaca → separasi dipikul **ring cahaya tipis**
di tepi + satu contact gelap.

### Shadow Vocabulary — tangga elevasi `.rest · .lift · .float · .float-high`
Keempatnya menyertakan `var(--tw-ring-offset-shadow)` & `var(--tw-ring-shadow)` — kelas
`box-shadow` polos MENGHAPUS `ring-*` Tailwind.
- **`.rest`** (`--shadow-rest`): kontrol kecil yang naik dari KARTU (logo, pil, chip) —
  `0 1px 2px rgba(8,30,19,.06)`; gelap = ring cahaya `.12`.
- **`.lift`** (`--shadow-card`): elevasi kartu putih default.
  - Light: `0 2px 5px -2px rgba(8,30,19,.18), 0 12px 28px -10px rgba(8,30,19,.26)` —
    contact + ambient bertinta hijau. Kanvas antar-kartu BOLEH ternoda bayangan; itu
    yang membuat kartu terbaca terangkat. Kartu = `bg-white` polos + `border-line`,
    **tanpa** `background-image` (top-light dibongkar) dan tanpa inset highlight.
  - Dark: `0 0 0 1px rgba(255,255,255,.16)` (ring cahaya) + `0 2px 4px -1px rgba(0,0,0,.5)`.
- **`.float`** (`--shadow-float`): popover, dropdown, bottom-sheet — ring `.06` +
  `0 4px 12px -2px .21` + `0 16px 32px -8px .25` (tinta hijau); gelap ring `.19` +
  `0 16px 40px -10px rgba(0,0,0,.7)`.
- **`.float-high`** (`--shadow-high`): benda melayang di atas scrim (SuccessOverlay).
- **`.nav-dock`**: bar bottom-nav — **hairline atas** `#D3E0D8` (= token `line`) +
  **bayangan NAIK tipis**. Bar dok datar, bukan drop berlapis ke bawah.
- **`.inset-soft`**: sub-panel di dalam kartu putih — **fill tonal DATAR** (#EAEFEC light /
  `rgba(255,255,255,0.06)` dark), **tanpa tepi/inner-shadow**. Pengganti `bg-gray-50` untuk
  baris detail/stat. BUKAN untuk tombol/input.
- **`.icon-tile`**: penanda semantik chip ikon — **no-op visual** (flat). Warna datang dari
  tint semantik di call-site (masuk/keluar/lunas). Jangan tambah sheen/ring/contact.
- **`--hero-shadow`**: kartu hero gradient — `0 6px 16px -12px rgba(0,0,0,.28)`,
  `0 18px 40px -22px rgba(6,34,21,.42)`.

### Named Rules
**The Satu-Bahasa Rule.** Seluruh permukaan bicara satu mazhab (tonal). Kalau sebuah
kartu mulai "melayang/berkabut", pasti ada lapisan lama yang kembali (top-light, halo,
edge-ring, inset-shadow) — cabut, jangan seimbangkan dengan menggelapkan kanvas atau
hairline. Kalau kartu terasa "redup", yang hilang hampir selalu KEDALAMAN (bayangan)
atau BERAT huruf kecil — bukan warna.

**The Paritas-Dark Rule.** Setiap token elevasi punya pasangan dark yang setara. Di gelap,
separasi datang dari **ring cahaya tepi**, bukan drop shadow.

**The A11y-Fallback Rule.** Separasi tonal ~1.1:1 dipikul shadow → di `forced-colors: active`
kartu (`.lift/.float/.nav-dock`) mendapat `border: 1px solid CanvasText`; di
`prefers-contrast: more` shadow dipertegas. Jangan hapus fallback ini.

## 5. Components

### Buttons
- **Shape:** 12px (`rounded-xl`). Pill (9999px) hanya untuk FAB, chip, tag.
- **Primary (`.btn-brand`):** gradient emerald `#0C6238 → #0A5531 → #094A2B`, teks putih,
  **glossy top edge + contact tipis** (glow emerald besar dibongkar — CTA cukup menonjol dari
  warna brand). `:active` → `scale(0.97)` ease-out-expo 0,16s.
  Ramp itu sudah diturunkan DUA kali (13 Jul, lalu pass kontras maksimal 4 Agu): tepi ATAS
  gradient lama cuma 3,39:1 dan glossy edge menerangkan baris teratas label. Jangan
  diterangkan lagi.
- **Danger (`.btn-danger`):** pasangan destruktif — gradient `neg` rose
  `#E11D48 → #C01340 → #941136` (putih 4,7 / 6,2 / 8,8:1), anatomi persis `.btn-brand`
  (glossy top + contact, flat).
  Untuk Pulihkan/Batalkan tarikan. Jangan salin manual glow rose lama.
- **Secondary (`.btn-secondary`):** border `control`, teks ink-sub, hover `bg-gray-50`.
  Netral radius/lebar (call-site pegang `flex-1`/`w-full`). Pasangan footer dua-tombol.
- **Press feedback:** `.press` (scale) untuk tombol umum; `.press-icon` (opacity,
  transform-safe) untuk tombol ikon yang sudah pakai `translate`.

### Chips (FilterChips)
- Pill (9999px). Aktif = fill brand emerald + teks putih; non-aktif = netral berbingkai.
  Aktif jelas via fill, bukan sekadar border.
- Baris chip **MEMBUNGKUS** (`flex-wrap`), tidak menggeser mendatar. Varian geser + fade
  tepi dihapus 30 Jul 2026: di 360–390px fade menelan chip ketiga sampai separuh dan
  terbaca seperti kontrol rusak — filter yang tak terlihat sama saja tidak ada. Chip dan
  tombol urutan wajib **bersaudara langsung** dalam satu wadah; kalau grup chip dibungkus
  div sendiri, ia membungkus di dalam kotaknya sementara sort menggantung di kanan baris
  pertama → lubang berbentuk L.

### Cards / Containers
- **Corner:** 16px (`rounded-2xl`) untuk panel padat, 24px (`rounded-3xl`) untuk kartu konten
  & list Beranda; hero 24px. Keduanya dipakai — pilih per berat kartu, jangan over-round (>24px).
- **Background:** putih murni (#FFFFFF), **flat** (tanpa gradient top-light).
- **Border:** hairline `line` (#D3E0D8) — bisikan tepi; pemisah utamanya langkah nada + `.lift`.
- **Shadow:** `.lift` (satu contact whisper). Sub-panel internal pakai `.inset-soft`
  (fill datar), bukan kotak abu bergaris.
- **List rows:** divider antar-baris pakai `.divide-inset`/`.list-inset` (hairline
  #D2DCD5, di-inset melewati kolom ikon lewat `--di-l`/`--di-r` agar sejajar teks).

### Inputs / Fields
- **`.field`** (bg-gray-50) untuk form; **`.field-search`** (bg-white) untuk bilah cari.
  Radius 12px, border `control`, teks 16px (anti-zoom iOS).
- **Focus:** border + ring padat `0 0 0 2px #047857` (gelap #34D399) — ring beralpha dulu
  gagal §1.4.11. Caret #1B7249 / #1A9B86 (gelap); `accent-color` #1B7249 / #34D399.
- **Nominal:** kolom uang memakai `useKolomNominal` (`src/lib/kolomNominal.ts`) — pemisah
  ribuan saat mengetik, kursor tetap di tempatnya.
- **Placeholder:** gray-500 (bukan gray-400) agar tetap lolos kontras.

### Navigation
- **Bottom nav (`.nav-dock`):** **bar DOK penuh** nempel tepi bawah layar ala
  Google/myBCA/BYOND — **BUKAN** kapsul melayang. Indikator tab aktif = **pill tonal datar**
  (Material 3), ikon 24px diam. Tab "Hadiran" (id internal tetap `'kas'`). FAB di zona jempol;
  `ExportMenu` align kiri. Di Mode Warga tab "Talangan" disembunyikan dari nav.
- **Header:** sticky kaca; pakai `translate3d + backface-hidden + will-change` (fix lompat iOS
  Safari fixed/backdrop-filter — berlaku app-wide untuk Header/Toaster/popover/nav).
- **Z-index (tangga bernama, anti-tabrak):** fab 30 → nav 40 → overlay 50 → banner 55 →
  modal 60 → toast 70 → tooltip 80.
- *Catatan:* class `.nav-float` (kapsul melayang) masih ada di `index.css` tapi **tidak
  dipakai** BottomNav; nav aktif = `.nav-dock`.

### Hero Card (Signature)
Kartu saldo gradient dengan `--hero-shadow`. **SATU varian: `.hero-emerald`** — warna hero
adalah IDENTITAS, bukan status. Varian `.hero-setor` (biru, saat sudah disetor) dan
`.hero-slate` (abu, saat saldo minus) dihapus 30 Jul 2026: saldo yang sama tampil hijau di
Beranda tapi biru di halamannya sendiri, dan biru "sudah setor" beradu dengan pil merah
"Defisit" di kartu yang sama. Status dibawa **kata**: chip "Sudah disetor ke Kas RT" dan pil
"Defisit". Jangan pasang ulang ramp per-status.

**Anatomi = `src/components/HeroSaldo.tsx`** (Kas Hadiran, Kas RT, Talangan), urutan baca
dijamin: label (+InfoTip, +aksi) → nominal `FitAmount` (+pil status) → keterangan → kaki
statistik. Label `min-w-0` + aksi `shrink-0` supaya tak bisa saling timpa di 360px; ukuran
label = `text-micro` kapital (anak tangga terkecil; dulu `clamp()` ber-`vw` yang turun
ke 9,2px di 320px), dan label kaki statistik melewati `ikatFrasa` supaya frasa tak patah.
- Kaki hero = **`HeroStats`** — kolom bergaris (`border-t` + `border-r` antar kolom), 2–3
  kolom, opsional `onClick` jadi tombol navigasi. Panel `bg-black/10` bertumpuk **dilarang**:
  kotak-di-dalam-kotak itu dialek kedua sekaligus permukaan di atas permukaan.
- Hero Beranda tidak memakai `HeroSaldo` (bingkainya milik `BannerCarousel`) tapi WAJIB
  memakai `HeroStats` yang sama — kartu itu acuan bentuknya.
- Kas Hadiran sengaja **tanpa** kaki: kartu "Alur Kas Hadiran" di bawahnya sudah memuat
  angka yang sama.

Dekorasi hero: motif songket emas `.songket-weave` (soft-light, di-mask ke sudut kanan-atas
agar nominal kiri bersih), `.hero-sheen`, dan `.hero-sheen-sweep` sekali-muat.
Saldo negatif → nominal **putih** + chip **"Defisit"** (The Saldo-Defisit Rule). Beranda
membungkus semua hero dalam `BannerCarousel` (carousel 3D bertumpuk; permukaan flat & tegas
ala BYOND — user TOLAK glass/glow/noise).

### Baris Meta & Frasa yang Tak Boleh Patah
- **`MetaPisah`** (`src/components/MetaPisah.tsx`) — SATU pemilik baris meta berpemisah
  "·" ("28 Agu · Kas Hadiran", "Talangan · Tarikan #18"). Tiap bagian membawa titiknya di
  depan (`::before`), barisnya digeser ke kiri selebar satu pemisah di dalam wadah
  `overflow: hidden`, jadi titik pembuka tiap baris lipatan terpotong: **titik hanya tampil
  DI ANTARA dua bagian yang sebaris**, tak pernah menggantung di ujung atau awal baris.
  Pembaca layar tetap mendengar " · " lewat `.sr-only`. Jangan tulis `join(' · ')` lagi.
- **`ikatFrasa()`** (`src/lib/utils.ts`) — mengikat frasa yang tak boleh patah dengan NBSP:
  tanggal utuh, "Tarikan #N", "Kas RT"/"Kas Hadiran", dan " — " ke kata sebelumnya. Dipakai
  di label hero, baris daftar, dan kaki statistik.

### Kepala Halaman (PageHeader)
`src/components/layout/PageHeader.tsx` — satu anatomi untuk halaman DI DALAM cangkang app:
`[kembali] judul (+InfoTip) / subjudul` di kiri, aksi menempel kanan, SATU baris di HP.
Dipakai Kas Hadiran, Kas RT, Jadwal (bendahara & warga), Talangan. Beranda dikecualikan
(sapaan + pil status = kepala khas layar rumah). Halaman overlay layar-penuh memakai
`OverlayHeader` yang sticky & ber-safe-area, bukan ini.

### Login (pengecualian branded)
Login adalah **satu-satunya** layar yang sengaja memakai bahasa kaca: kanvas gradient mint
(`.login-bg`), aurora blob mengambang, grain halus, dan kartu `backdrop-blur`. Ini momen
brand, bukan pelanggaran arah flat — **jangan** "flatkan" jadi abu/putih polos.

### Dialog (Behavior)
Semua sheet/modal WAJIB pakai hook **`useDialog`**: `role="dialog"` + fokus trap/restore +
Escape. Animasi masuk `.sheet-panel` (sheetUp, ease-out-expo) + `overscroll-behavior: contain`.
Jangan bikin sheet mentah.

## 6. Do's and Don'ts

### Do:
- **Do** pakai satu suara brand emerald; pertahankan `setor` biru & `gold-songket` emas tetap
  scoped ke satu tempat masing-masing.
- **Do** pakai Sora + `tabular-nums` untuk semua nominal; angka memimpin. Nominal hero pakai
  `FitAmount`.
- **Do** jaga body text ≥4.5:1; gelapkan ke arah ink bila kontras mepet (warga lansia, baca di
  bawah matahari).
- **Do** pakai `.lift` untuk kartu, `.inset-soft` untuk sub-panel (fill datar), `.float` untuk
  popover. Separasi dari **langkah nada + bayangan bertinta + ruang**.
- **Do** tandai saldo defisit dengan **nominal putih + chip "Defisit"** di setiap hero.
- **Do** tampilkan saldo minus apa adanya bila talangan ditutup dari kas — transparansi di atas
  estetika.
- **Do** hormati `prefers-reduced-motion`, `prefers-reduced-transparency`, `forced-colors`,
  `prefers-contrast` (semua sudah ditangani di `index.css`) dan pakai `useDialog` untuk tiap
  sheet/modal.
- **Do** jaga `sunken` (#CFE6D8) sinkron di SEPULUH titiknya (lihat §2 Neutral), termasuk
  splash PNG yang di-bake.

### Don't:
- **Don't** pasang ulang bahasa era lama: **floating-glass**, halo putih, **top-light gradient**
  pada kartu, **inset-shadow berpahat**, **edge-ring** ganda, atau **sheen** di icon-tile. Semua
  itu sengaja dibongkar di pivot Material-flat (2 Jul 2026).
- **Don't** pakai glassmorphism/glow/noise sebagai dekorasi di body app. (Login = satu-satunya
  pengecualian branded.)
- **Don't** tuning nilai L kanvas untuk mengejar "feel" — akar masalah dulu adalah dua bahasa
  campur, bukan L. Lever kanvas sengaja ditutup.
- **Don't** mewarnai nominal saldo jadi salmon (`text-rose-200`) untuk menandai negatif — pakai
  chip "Defisit".
- **Don't** pakai emas/gold di luar satu pengecualian songket. Jangan angkat biru `setor` jadi
  accent kedua.
- **Don't** campur red/rose dengan green/emerald di satu layar; jangan pakai abu pudar
  (gray-400 di atas putih) "demi elegan".
- **Don't** border-left/right > 1px sebagai stripe aksen; jangan gradient text
  (`background-clip: text`) — emphasis lewat weight/size + warna solid.
- **Don't** ganti bottom-nav dok jadi kapsul melayang; jangan over-round kartu (>24px); jangan
  bikin sheet mentah tanpa `useDialog`.
- **Don't** bikin nuansa birokrasi/aplikasi pemerintahan yang kaku — tetap hangat & manusiawi.
