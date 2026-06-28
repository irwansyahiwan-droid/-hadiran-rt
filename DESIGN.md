---
name: Hadiran RT
description: Manajemen arisan & kas RT yang tenang, jujur, dan terbaca — ketenangan fintech dengan jiwa kampung.
colors:
  brand: "#0F4C2E"
  brand-600: "#145D39"
  brand-500: "#1B7249"
  brand-link: "#0D6B5E"
  brand-link-dark: "#1A9B86"
  pos: "#047857"
  neg: "#E11D48"
  warn: "#B45309"
  setor: "#1E40AF"
  setor-600: "#2563EB"
  setor-500: "#3B82F6"
  gold-songket: "#E8B651"
  surface: "#FFFFFF"
  sunken: "#F2F5FA"
  line: "#CFD5DF"
  control: "#E2E8F0"
  ink: "#0B1220"
  ink-sub: "#374151"
  ink-faint: "#475569"
  canvas-dark: "#0A0E1A"
typography:
  display:
    fontFamily: "Sora Variable, Sora, Inter Variable, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 6vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.018em"
  headline:
    fontFamily: "Sora Variable, Sora, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.018em"
  amount:
    fontFamily: "Sora Variable, Sora, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Inter Variable, Inter, -apple-system, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  caption:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  micro:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  control: "12px"
  card: "16px"
  hero: "24px"
  focus: "6px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand-600}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-primary-active:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-sub}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  field:
    backgroundColor: "#F9FAFB"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  chip-active:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  hero-card:
    textColor: "{colors.surface}"
    rounded: "{rounded.hero}"
    padding: "20px"
---

# Design System: Hadiran RT

## 1. Overview

**Creative North Star: "Ketenangan Fintech Kampung"**

Hadiran RT meminjam disiplin fintech kelas atas — ketenangan, presisi, kelapangan ala Revolut/Mercury/Jago — lalu menjinakkannya jadi hangat dan lokal. Kanvas near-white sejuk (#F2F5FA, L~96%) yang rata dan tenang menjadi panggung; kartu putih "menyala dari atas" lewat cahaya-dari-atas plus bayangan crisp berlapis, bukan glass berpendar. Angka adalah bintang: nominal rupiah memakai Sora yang tegas dan `tabular-nums` app-wide supaya digit tidak goyang saat count-up atau disusun kolom — seperti running text bank, tapi milik kampung sendiri.

Sistem ini berdiri di atas satu suara brand: hijau emerald deep. Satu hijau, satu merah, satu amber untuk makna uang; tidak ada percampuran red/rose atau green/emerald di satu layar. Identitas lokal dibawa oleh **satu** ornamen yang sangat langka — motif anyaman songket emas pada kartu saldo dan sorot giliran Sohibul Bait — yang berfungsi sebagai stempel kehormatan RT, bukan dekorasi yang ditebar.

Yang sistem ini **tolak**: glassmorphism, glow, dan noise sebagai dekorasi (tim secara eksplisit menolaknya demi permukaan flat & tegas); emas/gold sebagai aksen umum (di luar satu pengecualian songket yang disengaja); formalitas birokrasi yang kaku; dan estetika template AI generik (card grid seragam tanpa hierarki, eyebrow uppercase di tiap section, abu pudar "demi elegan").

**Key Characteristics:**
- Kanvas abu sejuk rata + kartu putih ber-glass-lift; depth dari cahaya & bayangan, bukan halo.
- Satu suara brand emerald; semantik uang satu-hijau/satu-merah/satu-amber.
- Angka memimpin: Sora + tabular-nums di mana-mana.
- Kontras tinggi & teks nyaman — untuk warga lansia dan baca di bawah matahari.
- Dark mode first-class (kanvas #0A0E1A deep cool-dark berdimensi), paritas elevasi dijaga ketat.
- Satu sumber per peran (token, helper, komponen) — anti-drift.

## 2. Colors

Palet bertumpu pada satu hijau emerald sebagai suara brand, neutral abu sejuk untuk struktur, dan tiga warna semantik uang yang disiplin. Emas songket berdiri terpisah sebagai warna kehormatan kultural.

### Primary
- **Emerald Deep** (#0F4C2E, dengan #145D39 / #1B7249): Suara brand tunggal. Fill chip aktif, judul kuat, tombol primer, gradient hero saldo (#0D5B36 → #15824C → #1C9A5C). Inilah satu-satunya warna identitas — jangan tambah accent kedua.
- **Teal-Green Tautan** (#0D6B5E, pasangan dark #1A9B86): Tautan "Lihat semua", tab aktif. Hijau yang sedikit kebiruan agar tautan terbaca beda dari fill brand.

### Secondary
- **Setor Blue** (#1E40AF, dengan #2563EB / #3B82F6): SINYAL STATUS, bukan accent kedua. Hidup hanya di kartu hero Kas Hadiran saat sudah disetor. Struktur gradient meniru brand. Jangan perluas biru ke tempat lain.

### Tertiary
- **Emas Songket** (#E8B651): Warna HONOR/dekoratif kultural — identitas RT. Hidup HANYA di dua tempat: motif anyaman `.songket-weave` pada kartu saldo, dan sorot "Giliran berikutnya" Sohibul Bait (mahkota + cincin avatar) di Beranda. TIDAK PERNAH menyentuh uang/status/nav.

### Neutral
- **Ink** (#0B1220): Judul & nominal utama (near-black, kontras maksimal).
- **Ink Sub** (#374151): Teks sekunder yang tegas (gray-700).
- **Ink Faint** (#475569): Tanggal/caption — slate-600, tetap kebaca jelas (BUKAN abu pudar).
- **Surface** (#FFFFFF): Latar kartu.
- **Sunken / Canvas** (#F2F5FA): Background app near-white sejuk (L~96%, Pass 8) — separasi kartu disandar ke floating-glass shadow + edge crisp, bukan gap tonal. WAJIB sama dengan body, token `sunken`, `.app-bg`, dan manifest `background_color` — anti strip beda tone saat overscroll.
- **Line** (#CFD5DF): Garis/divider tipis (hairline).
- **Control** (#E2E8F0): Border input/tombol — sedikit lebih kuat dari line.
- **Canvas Dark** (#0A0E1A): Background app dark mode (gray-950, Pass 9) — deep cool-dark berdimensi (ala Linear/Revolut), bukan true-black; kartu gray-900 (#111827) duduk natural di atasnya, separasi dari ring cahaya.

### Semantik Uang
- **Positif/Masuk** (#047857, emerald-700, on-brand).
- **Negatif/Keluar** (#E11D48, rose-600).
- **Perhatian/Tunggakan** (#B45309, amber-700).

### Named Rules
**The Satu-Suara Rule.** Hanya ada SATU warna brand: emerald deep. Biru `setor` dan emas `gold-songket` adalah pengecualian yang scoped ke satu tempat masing-masing — bukan accent tambahan. Jangan pernah mengangkat keduanya jadi warna umum.

**The Satu-Hijau-Satu-Merah-Satu-Amber Rule.** Untuk makna uang: satu hijau (pos), satu merah (neg), satu amber (warn). Jangan campur red/rose dengan green/emerald di satu layar.

**The No-Abu-Pudar Rule.** Teks tidak boleh memakai abu di bawah AA di atas putih. `text-gray-400/500` digelapkan satu titik dari satu sumber (→ #6B7280 / #4B5563). Light gray "demi elegan" dilarang — banyak pengguna lansia & baca di bawah matahari.

## 3. Typography

**Display Font:** Sora Variable (fallback Inter Variable, system-ui) — grotesk geometrik berkarakter untuk judul & nominal hero.
**Body Font:** Inter Variable (fallback -apple-system, system-ui) — readability maksimal untuk teks panjang.

**Character:** Pasangan kontras-tegas: Sora memberi "suara" pada angka & judul (geometrik, solid, sedikit tracking rapat), Inter menjaga keterbacaan tubuh teks. Bukan dua sans humanis yang nyaris kembar. `tabular-nums` aktif app-wide agar angka rupiah tidak goyang.

### Hierarchy
- **Display** (Sora 700, clamp ~28–48px, line-height 1.05, tracking -0.018em): Nominal hero saldo, judul halaman besar.
- **Headline** (Sora 700, ~20px, tracking -0.018em): Judul section/kartu (h1/h2).
- **Amount** (Sora 600, 17px / `text-amount`): Nominal menonjol di list & baris.
- **Body** (Inter 400, 15px / `text-body`): Teks utama list/baris. Batasi prosa panjang ≤ 65–75ch.
- **Caption** (Inter 400, 13px / `text-caption`): Tanggal, caption, teks sekunder.
- **Micro** (Inter 600, 11px / `text-micro`, tracking 0.02em): Badge kecil, nomor, label uppercase mungil.

### Named Rules
**The Angka-Memimpin Rule.** Nominal rupiah selalu Sora + tabular-nums. Angka adalah konten paling penting di app ini; tipografi melayaninya, bukan sebaliknya.

**The 16px-Input Rule.** Semua input wajib font-size 16px (dipaksa dari satu titik: `input.text-sm { font-size: 16px }`) agar Safari iOS tidak auto-zoom saat fokus.

## 4. Elevation

Sistem ini **flat sebagai bahasa, tapi punya dimensi nyata dari cahaya** — bukan kertas datar, bukan glass berpendar. Pemisahan kartu dari kanvas datang dari kombinasi: (1) step tonal kecil kartu↔kanvas, (2) cahaya-dari-atas (putih murni memudar tipis ke bawah), (3) bayangan crisp berlapis terkontain (spread negatif → melayang, bukan fog). Halo putih dan tint emerald di bayangan sengaja dihapus karena bikin "berkabut/muddy". Dark mode menukar drop shadow (nyaris tak terbaca di gelap) dengan RING cahaya tipis di tepi + drop gelap dalam.

### Shadow Vocabulary
- **`.lift`** (`--shadow-card`): Elevasi kartu putih default. Berlapis: inset highlight tepi-atas + ring crisp 1px + contact + key mid + ambient float. Plus `background-image` gradient putih→#F1F6FC (cahaya-dari-atas). Inilah kartu standar app.
- **`.float`** (`--shadow-float`): Popover, dropdown, bottom-sheet — melayang lebih tinggi dari kartu.
- **`.nav-float`**: Kapsul bottom-nav melayang (glass top edge + key + ambient).
- **`.inset-soft`**: Sub-panel "tertanam" di dalam kartu (inner top-shadow + hairline) — pengganti `bg-gray-50` polos untuk baris detail/stat. BUKAN untuk tombol/input.
- **`.icon-tile`**: Depth tipis di chip ikon ber-tint (sheen + ring) — warna-agnostik, menumpang di atas `bg-*-100` tanpa ubah tint.
- **`--hero-shadow`**: Kartu hero gradient — keluarga sama dengan `.lift` tapi nada green-ink.

### Named Rules
**The Cahaya-Dari-Atas Rule.** Permukaan dapat dimensi dari cahaya yang masuk dari atas (putih murni → memudar), bukan dari halo, glow, atau drop shadow tebal. Kalau kartu terlihat "berkabut", highlight/halo-nya terlalu kuat.

**The Paritas-Dark Rule.** Setiap token elevasi punya pasangan dark yang dijaga setara. Di gelap, separasi datang dari ring cahaya tepi, bukan drop shadow.

## 5. Components

### Buttons
- **Shape:** Sudut lembut 12px (`rounded-xl`, `--rounded-control`). Pill (9999px) hanya untuk FAB, chip, tag.
- **Primary (`.btn-brand`):** Gradient emerald hidup (#18A055 → #0F6B40 → #0C5E37), teks putih, glossy top edge + glow emerald terukur. Padding ~12×16px.
- **Hover / Active:** `:active` → `scale(0.97)` + bayangan mengkerut (spring press). Feedback tekan instan (ease-out), bukan overshoot karet.
- **Secondary (`.btn-secondary`):** Border `control`, teks ink-sub, hover bg-gray-50. Netral radius/lebar (call-site pegang `flex-1`/`w-full`). Pasangan footer dua-tombol dengan primary.
- **Press feedback:** `.press` (scale) untuk tombol umum; `.press-icon` (opacity, transform-safe) untuk tombol ikon yang sudah pakai translate.

### Chips
- **Style (FilterChips):** Pill (9999px). Aktif = fill brand emerald + teks putih; non-aktif = netral berbingkai.
- **State:** Filter (toggle) — aktif jelas via fill brand, bukan sekadar border.

### Cards / Containers
- **Corner Style:** 16px (`--rounded-card`); hero 24px (`--rounded-hero`).
- **Background:** Putih murni (#FFFFFF) + gradient cahaya-dari-atas (`.lift`).
- **Shadow Strategy:** `.lift` (lihat Elevation). Sub-panel internal pakai `.inset-soft`, bukan kotak abu datar.
- **Border:** Hairline `line` (#CFD5DF) bila perlu definisi tepi ekstra; ring crisp 1px sudah ada di shadow.
- **Internal Padding:** ~16px (`--spacing-md`); hero ~20px.

### Inputs / Fields
- **Style (`.field` / `.field-search`):** Radius 12px, `.field` bg-gray-50, `.field-search` bg putih. Border `control`. Teks 16px (anti-zoom iOS).
- **Focus:** Border #10B981 + ring `0 0 0 2px rgba(16,185,129,0.30)` (setara ring-2 emerald). Caret & accent-color on-brand.
- **Placeholder:** gray-500 (bukan gray-400) agar tetap lolos kontras.

### Navigation
- **Bottom nav:** Kapsul floating glass (`.nav-float`), tren 2026. Ikon aktif solid, tab "Hadiran" (id internal tetap 'kas'). FAB di zona jempol; ExportMenu align kiri. Z-index dari tangga bernama (nav 40 → overlay 50 → banner 55 → modal 60 → toast 70).
- **Header:** Sticky kaca; gunakan translate3d + backface-hidden + will-change (fix lompat iOS Safari fixed/backdrop-filter).

### Hero Card (Signature)
Kartu saldo gradient emerald (`--hero-gradient`) dengan motif songket emas `.songket-weave` (soft-light, di-mask ke sudut kanan-atas agar nominal kiri tetap bersih), sheen kiri-atas, dan sparkline. Inilah satu-satunya tempat emas songket + biru/emerald hero berkumpul. Dekoratif murni, pointer-events-none.

### Dialog (Behavior)
Semua sheet/modal WAJIB pakai hook `useDialog`: `role="dialog"` + fokus trap/restore + Escape. Animasi masuk `.sheet-panel` (sheetUp, ease-out-expo). Jangan bikin sheet mentah.

## 6. Do's and Don'ts

### Do:
- **Do** pakai satu suara brand emerald; pertahankan `setor` biru & `gold-songket` emas tetap scoped ke satu tempat masing-masing.
- **Do** pakai Sora + `tabular-nums` untuk semua nominal; angka memimpin.
- **Do** jaga body text ≥4.5:1; gelapkan ke arah ink bila kontras mepet. Prioritas teks besar & kontras tinggi (warga lansia, baca di bawah matahari).
- **Do** pakai `.lift` untuk kartu, `.inset-soft` untuk sub-panel, `.float` untuk popover — depth dari cahaya-dari-atas + bayangan crisp.
- **Do** tampilkan saldo minus apa adanya bila talangan ditutup dari kas — transparansi di atas estetika.
- **Do** hormati `prefers-reduced-motion` (setiap animasi punya alternatif crossfade/instan) dan pakai `useDialog` untuk tiap sheet/modal.
- **Do** jaga `sunken` (#F2F5FA) sinkron di body, `.app-bg`, token, dan manifest.

### Don't:
- **Don't** pakai glassmorphism, glow, atau noise sebagai dekorasi. Permukaan flat & tegas; depth dari cahaya, bukan kaca berpendar. (Tim secara eksplisit menolak ini.)
- **Don't** pakai emas/gold di luar satu pengecualian songket yang disengaja. Jangan perlakukan songket sebagai pelanggaran "no gold" — dan jangan perluas emas ke tempat lain.
- **Don't** angkat biru `setor` jadi accent kedua; ia sinyal status di hero Kas Hadiran saja.
- **Don't** campur red/rose dengan green/emerald di satu layar.
- **Don't** pakai abu pudar (gray-400 di atas putih) untuk teks "demi elegan".
- **Don't** pakai border-left/right > 1px sebagai stripe aksen pada kartu/baris/alert.
- **Don't** gradient text (`background-clip: text`); emphasis lewat weight/size + warna solid.
- **Don't** card grid seragam tanpa hierarki, eyebrow uppercase di tiap section, atau hero-metric kosong tanpa makna.
- **Don't** over-round kartu (32px+) atau bikin sheet mentah tanpa `useDialog`.
- **Don't** bikin nuansa birokrasi/aplikasi pemerintahan yang kaku — tetap hangat & manusiawi.
