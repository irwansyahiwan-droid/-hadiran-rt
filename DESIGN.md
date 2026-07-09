---
name: Hadiran RT
description: Manajemen arisan & kas RT yang tenang, jujur, dan terbaca — ketenangan fintech dengan jiwa kampung, dalam bahasa Material-flat (Google/myBCA/BYOND).
status: Material-flat (pivot 2 Jul 2026). Sumber kebenaran = tailwind.config.js + src/index.css. Regenerasi terakhir 10 Jul 2026.
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
  sunken: "#ECF1F7"
  line: "#D3DAE3"
  control: "#CBD5E1"
  inset-soft: "#E9EEF5"
  divider-inset: "#DCE2EA"
  ink: "#0B1220"
  ink-sub: "#1F2937"
  ink-faint: "#334155"
  gray-400-remap: "#475569"
  gray-500-remap: "#334155"
  canvas-dark: "#030712"
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
  control: "12px"    # input, tombol (rounded-xl)
  card: "16px"       # panel/kartu padat (rounded-2xl)
  card-lg: "24px"    # kartu konten & list Beranda (rounded-3xl)
  hero: "24px"       # kartu saldo gradient (--hero-radius)
  focus: "6px"
  pill: "9999px"     # FAB, chip, tag
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    class: ".btn-brand"
    background: "linear-gradient(180deg, #18A055, #0F6B40, #0C5E37)"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-danger:
    class: ".btn-danger"
    background: "linear-gradient(180deg, #F43F5E, #E11D48, #BE123C)"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
  button-secondary:
    class: ".btn-secondary"
    background: "{colors.surface}"
    border: "{colors.control}"
    textColor: "{colors.ink-sub}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  field:
    class: ".field"
    backgroundColor: "#F9FAFB"      # bg-gray-50
    border: "{colors.control}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    fontSize: "16px"                # anti-zoom iOS
  field-search:
    class: ".field-search"
    backgroundColor: "{colors.surface}"
    border: "{colors.control}"
    rounded: "{rounded.control}"
  card:
    backgroundColor: "{colors.surface}"
    border: "{colors.line}"
    shadow: ".lift (contact whisper)"
    textColor: "{colors.ink}"
    rounded: "{rounded.card} / {rounded.card-lg}"
    padding: "16px–20px"
  inset-panel:
    class: ".inset-soft"
    backgroundColor: "{colors.inset-soft}"  # fill datar, TANPA tepi/dimensi
    rounded: "16px"
  chip-active:
    class: "FilterChips (aktif)"
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  hero-card:
    gradient: "{--hero-emerald} / setor-biru / slate-negatif"
    textColor: "{colors.surface}"
    shadow: "{--hero-shadow}"
    rounded: "{rounded.hero}"
    padding: "20px–24px"
  bottom-nav:
    class: ".nav-dock"
    style: "bar dok penuh nempel tepi bawah (BUKAN kapsul melayang)"
---

# Design System: Hadiran RT

> **Sumber kebenaran = `tailwind.config.js` + `src/index.css`.** Dokumen ini adalah
> ringkasan naratif yang harus DISELARASKAN ketika token berubah. Bila ada
> perbedaan, kode menang — lalu perbarui dokumen ini. Arah aktif: **Material-flat**
> (pivot 2 Jul 2026). Jangan pasang ulang bahasa "floating-glass" era lama yang
> sengaja dibongkar (lihat §4 & §6).

## 1. Overview

**Creative North Star: "Ketenangan Fintech Kampung" — dalam bahasa Material-flat.**

Hadiran RT meminjam disiplin fintech kelas atas — ketenangan, presisi, kelapangan
ala Google/myBCA/BYOND BSI — lalu menjinakkannya jadi hangat dan lokal. Kanvas abu
sejuk **#ECF1F7** (nada Gmail/Google apps) yang **rata dan tenang** menjadi panggung;
kartu **putih murni yang FLAT** dipisahkan dari kanvas oleh **step tonal + satu
hairline + geometri rounded**, dibantu **satu contact whisper** tipis agar kartu
"menapak". Bukan kaca berpendar, bukan kertas melayang — permukaan datar yang tegas.

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

**Key Characteristics:**
- Kanvas abu sejuk **rata** (#ECF1F7) + kartu putih **flat ber-hairline**; separasi
  dari step tonal + hairline + geometri, dibantu satu contact whisper. **Bukan** glow.
- Satu suara brand emerald; semantik uang satu-hijau/satu-merah/satu-amber.
- Angka memimpin: Sora + tabular-nums di mana-mana.
- Kontras tinggi & teks nyaman — untuk warga lansia dan baca di bawah matahari.
- Dark mode first-class (kanvas #030712, dengan aura emerald lembut di `.app-bg`).
- Satu sumber per peran (token, helper, komponen) — anti-drift.

## 2. Colors

Palet bertumpu pada satu hijau emerald sebagai suara brand, neutral abu sejuk untuk
struktur, dan tiga warna semantik uang yang disiplin. Emas songket berdiri terpisah
sebagai warna kehormatan kultural.

### Primary
- **Emerald Deep** (`brand` #0F4C2E, dengan #145D39 / #1B7249): Suara brand tunggal.
  Fill chip aktif, judul kuat, tombol primer, gradient hero saldo. Satu-satunya warna
  identitas — jangan tambah accent kedua.
- **Teal-Green Tautan** (`brand-link` #0D6B5E, pasangan dark `brand-linkDark` #1A9B86):
  Tautan "Lihat semua", tab aktif. Hijau sedikit kebiruan agar beda dari fill brand.

### Secondary (scoped, BUKAN accent)
- **Setor Blue** (`setor` #1E40AF, dengan #2563EB / #3B82F6): SINYAL STATUS. Hidup hanya
  di kartu hero **Kas Hadiran saat sudah disetor**. Jangan perluas biru ke tempat lain.
- **Emas Songket** (`--gold-songket` #E8B651): Warna HONOR/dekoratif kultural. Hidup
  HANYA di dua tempat: motif `.songket-weave` pada kartu saldo, dan sorot "Giliran
  berikutnya" Sohibul Bait (mahkota + cincin avatar) di Beranda. TIDAK PERNAH menyentuh
  uang/status/nav.

### Neutral (struktur — nilai TERBARU Material-flat)
- **Ink** (#0B1220): Judul & nominal utama (near-black, kontras maksimal).
- **Ink Sub** (#1F2937, gray-800): Teks sekunder tegas (≈14.7:1 di atas putih).
- **Ink Faint** (#334155, slate-700): Tanggal/caption (≈10.4:1) — tetap kebaca jelas,
  **BUKAN** abu pudar.
- **Surface** (#FFFFFF): Latar kartu (putih murni, flat).
- **Sunken / Canvas** (#ECF1F7): Background app, **rata tanpa radial**. WAJIB sama
  dengan `body`, token `sunken`, `.app-bg`, `landing.html`, dan manifest
  `background_color` — anti strip beda tone saat overscroll.
- **Line** (#D3DAE3): Hairline/divider tipis — kini **satu-satunya tepi kartu** (edge
  ring di shadow dihapus).
- **Control** (#CBD5E1, slate-300): Border input/tombol — lebih kuat dari `line`.
  Hierarki tepi: **control > line > divider-baris**.
- **Inset-soft** (#E9EEF5): Fill sub-panel datar di dalam kartu putih (lihat §4).
- **Divider-inset** (#DCE2EA): Hairline antar-baris di dalam kartu list (lebih terang
  dari `line` → boundary kartu memimpin).
- **Canvas Dark** (#030712, gray-950).

### Semantik Uang
- **Positif/Masuk** (`pos` #047857, emerald-700, on-brand).
- **Negatif/Keluar** (`neg` #E11D48, rose-600).
- **Perhatian/Tunggakan** (`warn` #B45309, amber-700).

### Named Rules
**The Satu-Suara Rule.** Hanya ada SATU warna brand: emerald deep. Biru `setor` dan emas
`gold-songket` adalah pengecualian yang scoped ke satu tempat masing-masing — bukan
accent tambahan.

**The Satu-Hijau-Satu-Merah-Satu-Amber Rule.** Untuk makna uang: satu hijau (`pos`),
satu merah (`neg`), satu amber (`warn`). Jangan campur red/rose dengan green/emerald di
satu layar.

**The No-Abu-Pudar Rule.** Teks tidak boleh memakai abu di bawah AA di atas putih. Dari
SATU titik di `index.css`, `text-gray-400` → **#475569** (≈7.4:1) dan `text-gray-500` →
**#334155** (≈10.4:1), scoped `html:not(.dark)` agar dark mode tak ikut. Light gray
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

### Type Ramp (token `text-*` — font-size SAJA, leading tetap dari utility)
- **micro** — 11px (0.6875rem), weight 600, tracking 0.02em: badge, nomor, label uppercase mungil.
- **caption** — 13px (0.8125rem): tanggal, caption, teks sekunder.
- **body** — 15px (0.9375rem): teks utama list/baris.
- **amount** — 17px (1.0625rem): nominal menonjol di list & baris.

### Hierarchy
- **Display** (Sora 700, clamp ~28–48px, lh 1.05, tracking -0.018em): nominal hero, judul besar.
- **Headline** (Sora 700, ~20px, tracking -0.018em): judul section/kartu (`h1/h2` mewarisi `--font-display`).
- **Amount** (Sora 600, `text-amount`): nominal di list/baris.
- **Body** (Inter 400, `text-body`): teks utama. Batasi prosa panjang ≤ 65–75ch.
- **Caption** (Inter 400, `text-caption`): tanggal, teks sekunder.
- **Micro** (Inter 600, `text-micro`): badge kecil, label uppercase.

### Named Rules
**The Angka-Memimpin Rule.** Nominal rupiah selalu Sora + `tabular-nums`. Angka adalah
konten paling penting; tipografi melayaninya. Nominal besar hero pakai `FitAmount`
(fit-to-width) demi keterbacaan warga lansia — sebesar mungkin, tak terpotong.

**The 16px-Input Rule.** Semua input wajib font-size 16px (dipaksa dari satu titik:
`input.text-sm, select.text-sm, textarea.text-sm { font-size: 16px }`) agar Safari iOS
tidak auto-zoom saat fokus.

## 4. Elevation — FLAT (bukan glass, bukan kertas melayang)

Bahasa **Material-flat**: separasi kartu dari kanvas datang dari **(1) step tonal**
(putih #FFF vs kanvas #ECF1F7), **(2) satu hairline** `line` sebagai tepi, **(3)
geometri rounded**, dibantu **(4) satu contact whisper** tipis agar kartu "menapak".
Semua yang menumpuk lapisan sudah **dihapus**: halo putih, top-light gradient,
inset-shadow berpahat, ambient float lebar, edge-ring ganda, sheen di icon-tile.

Di **dark mode**, drop shadow nyaris tak terbaca → separasi dipikul **ring cahaya tipis**
di tepi + satu contact gelap.

### Shadow Vocabulary
- **`.lift`** (`--shadow-card`): elevasi kartu putih default.
  - Light: `0 2px 4px -1px rgba(15,23,42,0.09)` — **satu contact whisper**, itu saja.
    Kartu = `bg-white` polos dari markup + `border-line`. **Tanpa** `background-image`
    (top-light dibongkar), tanpa inset highlight, tanpa key/ambient.
  - Dark: `0 0 0 1px rgba(255,255,255,0.10)` (ring cahaya) + `0 2px 4px -1px rgba(0,0,0,0.5)` (contact).
- **`.float`** (`--shadow-float`): popover, dropdown, bottom-sheet — melayang lebih tinggi
  (light = ring .04 + 4/12 .08 + 16/32 .14; dark = `0 16px 40px -10px rgba(0,0,0,0.7)`).
- **`.nav-dock`**: bar bottom-nav — **hairline atas** + **bayangan NAIK tipis**
  (`0 -1px 0 rgba(16,24,40,0.07)`, `0 -8px 24px -12px rgba(16,24,40,0.12)`). Bar dok datar,
  bukan drop berlapis ke bawah.
- **`.inset-soft`**: sub-panel di dalam kartu putih — **fill tonal DATAR** (#E9EEF5 light /
  `rgba(255,255,255,0.06)` dark), **tanpa tepi/inner-shadow**. Pengganti `bg-gray-50` untuk
  baris detail/stat. BUKAN untuk tombol/input.
- **`.icon-tile`**: penanda semantik chip ikon — **no-op visual** (flat). Warna datang dari
  tint `bg-*-100` di call-site (masuk/keluar/lunas). Jangan tambah sheen/ring/contact.
- **`--hero-shadow`**: kartu hero gradient — dua drop terkontain nada netral+green-ink
  (`0 6px 16px -12px rgba(0,0,0,0.28)`, `0 18px 40px -22px rgba(15,40,30,0.40)`).

### Named Rules
**The Satu-Bahasa Rule.** Seluruh permukaan bicara flat. Kalau sebuah kartu mulai
"melayang/berkabut", pasti ada lapisan lama yang kembali (top-light, halo, edge-ring,
inset-shadow) — cabut, jangan seimbangkan dengan menggelapkan kanvas.

**The Paritas-Dark Rule.** Setiap token elevasi punya pasangan dark yang setara. Di gelap,
separasi datang dari **ring cahaya tepi**, bukan drop shadow.

**The A11y-Fallback Rule.** Separasi tonal ~1.1:1 dipikul shadow → di `forced-colors: active`
kartu (`.lift/.float/.nav-dock`) mendapat `border: 1px solid CanvasText`; di
`prefers-contrast: more` shadow dipertegas. Jangan hapus fallback ini.

## 5. Components

### Buttons
- **Shape:** 12px (`rounded-xl`). Pill (9999px) hanya untuk FAB, chip, tag.
- **Primary (`.btn-brand`):** gradient emerald `#18A055 → #0F6B40 → #0C5E37`, teks putih,
  **glossy top edge + contact tipis** (glow emerald besar dibongkar — CTA cukup menonjol dari
  warna brand). `:active` → `scale(0.97)` spring.
- **Danger (`.btn-danger`):** pasangan destruktif — gradient `neg` rose
  `#F43F5E → #E11D48 → #BE123C`, anatomi persis `.btn-brand` (glossy top + contact, flat).
  Untuk Pulihkan/Batalkan tarikan. Jangan salin manual glow rose lama.
- **Secondary (`.btn-secondary`):** border `control`, teks ink-sub, hover `bg-gray-50`.
  Netral radius/lebar (call-site pegang `flex-1`/`w-full`). Pasangan footer dua-tombol.
- **Press feedback:** `.press` (scale) untuk tombol umum; `.press-icon` (opacity,
  transform-safe) untuk tombol ikon yang sudah pakai `translate`.

### Chips (FilterChips)
- Pill (9999px). Aktif = fill brand emerald + teks putih; non-aktif = netral berbingkai.
  Aktif jelas via fill, bukan sekadar border.

### Cards / Containers
- **Corner:** 16px (`rounded-2xl`) untuk panel padat, 24px (`rounded-3xl`) untuk kartu konten
  & list Beranda; hero 24px. Keduanya dipakai — pilih per berat kartu, jangan over-round (>24px).
- **Background:** putih murni (#FFFFFF), **flat** (tanpa gradient top-light).
- **Border:** hairline `line` (#D3DAE3) — tepi tunggal kartu.
- **Shadow:** `.lift` (satu contact whisper). Sub-panel internal pakai `.inset-soft`
  (fill datar), bukan kotak abu bergaris.
- **List rows:** divider antar-baris pakai `.divide-inset`/`.list-inset` (hairline
  #DCE2EA, di-inset melewati kolom ikon agar sejajar teks).

### Inputs / Fields
- **`.field`** (bg-gray-50) untuk form; **`.field-search`** (bg-white) untuk bilah cari.
  Radius 12px, border `control`, teks 16px (anti-zoom iOS).
- **Focus:** border #10B981 + ring `0 0 0 2px rgba(16,185,129,0.30)`. Caret & `accent-color`
  on-brand (#1B7249 light / #1A9B86 dark).
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
Kartu saldo gradient dengan `--hero-shadow`. Tiga varian gradient:
- **Emerald** (`.hero-emerald`, default) — Refined Emerald, satu sumber se-app.
- **Setor Biru** (`from-setor via-setor-600 to-setor-500`) — saat Kas Hadiran sudah disetor.
- **Slate Negatif** — saat saldo < 0 dan belum disetor.

Dekorasi hero: motif songket emas `.songket-weave` (soft-light, di-mask ke sudut kanan-atas
agar nominal kiri bersih), `.hero-sheen`, sparkline, dan `.hero-sheen-sweep` sekali-muat.
Saldo negatif → nominal **putih** + chip **"Defisit"** (The Saldo-Defisit Rule). Beranda
membungkus semua hero dalam `BannerCarousel` (carousel 3D bertumpuk; permukaan flat & tegas
ala BYOND — user TOLAK glass/glow/noise).

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
- **Do** pakai `.lift` untuk kartu (satu contact whisper), `.inset-soft` untuk sub-panel (fill
  datar), `.float` untuk popover. Separasi dari **tone + hairline + ruang**.
- **Do** tandai saldo defisit dengan **nominal putih + chip "Defisit"** di setiap hero.
- **Do** tampilkan saldo minus apa adanya bila talangan ditutup dari kas — transparansi di atas
  estetika.
- **Do** hormati `prefers-reduced-motion`, `prefers-reduced-transparency`, `forced-colors`,
  `prefers-contrast` (semua sudah ditangani di `index.css`) dan pakai `useDialog` untuk tiap
  sheet/modal.
- **Do** jaga `sunken` (#ECF1F7) sinkron di `body`, `.app-bg`, token, `landing.html`, & manifest.

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
