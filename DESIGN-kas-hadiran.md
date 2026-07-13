---
name: Hadiran RT — Layar "Hadiran" (Kas Hadiran)
description: Spec desain semantik layar Kas Hadiran (tab "Hadiran") untuk polish & regenerasi screen — turunan DESIGN.md induk, di-ground ke kode nyata.
status: Material-flat. Sumber kebenaran = tailwind.config.js + src/index.css + src/pages/KasHadiran.tsx. Dibuat 13 Jul 2026.
parent: DESIGN.md
scope: src/pages/KasHadiran.tsx (tab nav "Hadiran", id internal 'kas')
---

# Design System: Layar "Hadiran" (Kas Hadiran)

> Dokumen ini men-scope **DESIGN.md induk** ke satu layar untuk keperluan polish.
> Bila ada konflik, urutannya: **kode > DESIGN.md induk > dokumen ini**. Jangan
> regenerasi layar ini dengan bahasa visual lain — arah Material-flat sudah final
> (pivot 2 Jul 2026) dan token sudah tuntas; polish = merapikan celah nyata,
> **bukan** churn token.

## 1. Visual Theme & Atmosphere

**"Ketenangan Fintech Kampung" — buku kas RT yang jujur dan terbaca.**

Layar ini adalah buku besar arisan: satu hero saldo yang bicara status lewat
warna, satu kartu alur kas yang menjumlah, dan deretan rekap per tarikan yang
bisa dibedah sampai nama per warga. Suasananya tenang seperti aplikasi bank
kelas atas (Google/myBCA/BYOND) tapi hangat dan lokal — dibaca warga lansia,
di layar HP 390px, kadang di bawah matahari.

Kalibrasi rasa (skala 1–10):
- **Density 5 — "Daily App Balanced":** kartu bernapas (padding 20–24px), tapi
  informasi finansial tidak disembunyikan di balik klik.
- **Variance 3 — tenang & dapat diprediksi:** satu kolom mobile; hierarki datang
  dari ukuran/bobot tipografi dan warna status, bukan dari layout akrobatik.
- **Motion 4 — "Fluid CSS":** count-up odometer, stagger masuk kartu, press
  spring. Tidak ada koreografi sinematik.

Kepribadian angka: **nominal rupiah adalah bintang** — Sora, tabular-nums,
sebesar mungkin tanpa terpotong (FitAmount).

## 2. Color Palette & Roles

Satu suara brand emerald; biru `setor` dan slate negatif adalah **sinyal status
hero**, bukan accent kedua.

### Struktur (neutral)
- **Canvas Sejuk** (#ECF1F7) — background halaman, rata tanpa radial.
- **Kartu Putih** (#FFFFFF) — permukaan semua kartu, flat murni.
- **Hairline** (`line` #D3DAE3) — satu-satunya tepi kartu.
- **Divider Baris** (`divider-inset` #DCE2EA) — hairline antar-baris di dalam
  kartu (via `.divide-inset`/`.list-inset`, di-inset melewati kolom ikon).
- **Panel Dalam** (`.inset-soft` #E9EEF5) — fill datar sub-panel (rincian
  pendapatan di sheet detail), tanpa tepi/inner-shadow.
- **Ink** (#0B1220) / **Ink-Sub** (#1F2937) / **Ink-Faint** (#334155) — tangga
  teks; tidak ada abu di bawah AA di atas putih (gray-400 → #475569,
  gray-500 → #334155 di light, dipaksa dari `index.css`).
- **Canvas Dark** (#030712) — bukan pure black.

### Status hero (tiga varian, nilai TERKINI pasca pass kontras 13 Jul)
- **`.hero-emerald`** (default, saldo ≥ 0 belum disetor): ramp light
  `#157A45 → #0F7A47 → #064A2C` (150deg) + radial green-ink
  `rgba(4,38,24,0.48)` di kiri-atas. Dark: `#1B7A49 → #0C5734 → #05301D`.
- **`.hero-setor`** (sudah ada setoran ke Kas RT): ramp light
  `#1E3A8A → #1D4ED8 → #2563EB` (stop terang sengaja diredupkan — putih di
  zona terburuk 5.2:1). Dark: `#16306E → #1B3F8F → #2A56B8`.
- **`.hero-slate`** (saldo < 0 dan belum disetor): `#1E293B → #334155 → #64748B`.
  Dark: `#16202F → #232E42 → #3A4759`.
- Semua hero: `--hero-shadow` (dua drop terkontain), radius 24px, `.hero-sheen`
  di atasnya. **Panel/chip di atas hero wajib `bg-black/xx`** (mis. chip "Sudah
  disetor" `bg-black/25` + `border-white/20`) — bukan `bg-white/xx`.

### Semantik uang (disiplin satu-satu)
- **Masuk/positif** (`pos` #047857, tampil `text-emerald-700`).
- **Keluar/negatif** (`neg` #E11D48; chip Defisit solid `bg-rose-600`).
- **Talangan/perhatian** (`warn` #B45309).
- **Setoran ke Kas RT** (biru #2563EB pada nominal baris Alur Kas) — sinyal
  `setor` yang scoped ke layar ini saja; **jangan perluas** biru ke elemen lain.
- **Netral disengaja:** nominal "Dapat Arisan" per tarikan memakai **ink**,
  bukan hijau `pos` — uang itu keluar ke Sohibul Bait, bukan kas masuk.

### Tint semantik icon-tile / badge nomor tarikan
- Lunas semua: `bg-emerald-100` + teks `emerald-700` (dark: `emerald-900/30` + `emerald-300`).
- Ada talangan: `bg-amber-100` + teks `amber-700` (dark: `amber-900/30` + `amber-300`).
- Abu HANYA untuk kontrol inaktif/badge netral — bukan default tile.

## 3. Typography Rules

- **Display/Nominal hero:** Sora Variable 800, fit-to-width via `FitAmount`
  30–48px, `tracking-tighter`, `tabular-nums`, putih di atas hero. Saldo minus:
  nominal **tetap putih** + chip kata **"Defisit"** (jangan pernah salmon).
- **Amount list:** Sora 600, 17px (`text-amount`), tabular-nums.
- **Body:** Inter Variable 400, 15px (`text-body`) — baris alur kas, nama warga.
- **Caption:** Inter 400, 13px — tanggal, "Per {tanggal}".
- **Micro:** Inter 600, 11px, tracking 0.02em, uppercase — eyebrow hero
  ("SALDO KAS HADIRAN", `text-white/90`), label section sheet, badge.
- **Input:** wajib 16px (anti-zoom Safari iOS), sudah dipaksa dari `index.css`.
- **Catatan eksplisit:** pasangan **Sora + Inter adalah keputusan final** sistem
  ini. Aturan generik "ganti Inter dengan font berkarakter" TIDAK berlaku —
  karakter dipikul Sora, keterbacaan dipikul Inter. Mengganti font = drift.

## 4. Component Stylings (anatomi per blok layar)

### Header halaman
Judul "Kas Hadiran" (Sora bold 18px, ink) + caption "Per {tanggal}". Toolbar:
tombol muat ulang ikon 44×44px (`.press`, hover `bg-gray-100`) + `ExportMenu`
align kiri (Cetak PDF / Ekspor Excel). Di HP judul di atas, toolbar di bawah.

### Hero saldo (signature)
Radius 24px, `--hero-shadow`, varian gradient per status (lihat §2). Isi:
eyebrow micro + ikon Wallet `text-white/80`; aksi mata (sembunyikan nominal)
dan share 44×44px `hover:bg-white/10`; nominal FitAmount putih + Odometer
count-up; sub "N tarikan terlaksana" putih 12px; chip status setor
`bg-black/25`. Skeleton loading **berbentuk hero** (kartu putih + hairline +
`.lift`, tinggi 164px sinkron dengan hero asli) di dalam `CrossFade` — jangan
tampilkan "Rp0" sesaat.

### Kartu "Alur Kas Hadiran"
Kartu putih `rounded-3xl` + `border-line` + `.lift`, padding 20px. Baris:
ikon 14px + label `text-ink-sub` + nominal kanan bold tabular
(masuk `emerald-700` / talangan `warn` / setor biru), dipisah `.divide-inset`.
Baris penutup "Total Bersih" = panel `rounded-2xl` fill `bg-emerald-50`
(atau `bg-rose-50` saat minus) — sinyal tonal, bukan kotak abu. Judul kartu
diberi `InfoTip` penjelasan iuran (Rp50.000 = 45rb Sohibul + 5rb kas). Badge
jumlah tarikan solid `bg-emerald-700` + teks putih.

### Kartu Rekap Per Tarikan (list utama)
`rounded-3xl` putih + hairline + `.lift`, masuk dengan `.rise` stagger 50ms
(cap 10). Empat lapis:
1. **Mini-header timeline:** badge nomor 28px tint semantik (lunas=emerald /
   ada talangan=amber), titik pemisah, tanggal micro, `Tag` status kanan
   ("Lunas semua" / "N belum bayar").
2. **Focal row (tappable → sheet detail):** `AvatarPeci` 48px `rounded-2xl`,
   nama Sohibul bold ink, affordance "Lihat detail ›" micro; kanan nominal
   `text-amount` **ink netral** + label "Dapat Arisan".
3. **Progress kehadiran:** teks "Kas Hadiran {Rp}" + "{hadir}/{total} hadir";
   bar 6px track `bg-gray-100`, fill emerald animasi `scaleX` 700ms,
   `role="progressbar"` + aria lengkap.
4. **Baris aksi** (border-t hairline): tombol teks ikon 44px min-height —
   "PDF Pendapatan" (semua role), "Batalkan" & "Hapus" (bendahara; hapus =
   konfirmasi dua-ketuk "Yakin hapus?" 3,5 dtk lalu pola undo 5 dtk).

### FilterChips
Pill 9999px; aktif = fill emerald brand + teks putih; non-aktif berbingkai
netral. Filter status talangan (Semua/Ada Talangan/Lunas) + sort
(Terbaru/Terlama/Kas). Disembunyikan saat skeleton.

### Sheet detail tarikan & SetorModal (bottom sheet)
`sheet-panel float` `rounded-t-3xl`, drag-handle, **wajib `useDialog`**
(fokus trap + Escape) + `useBackDismiss` + `useDragDismiss` — semua jalur
tutup lewat `dismiss()` agar meluncur. Isi detail: panel `.inset-soft`
"Pendapatan Sohibul Bait" (rumus sinkron PDF: pembayar × Rp45.000, potongan
admin Rp60.000), lalu daftar `list-inset` per status — Titip (Tag info),
Tidak Hadir/Talangan (belum bayar di atas, Tag danger/success), Hadir (check
emerald). Skeleton sheet berbentuk baris nama, bukan spinner.

### FAB & tombol
FAB "Setor" pill di zona jempol (bendahara saja). Primer `.btn-brand`
(gradient emerald `#18A055 → #0F6B40 → #0C5E37`, active scale 0.97);
sekunder `.btn-secondary` (border `control` #CBD5E1). Form pakai `.field`
(bg #F9FAFB, radius 12px, fokus ring emerald `rgba(16,185,129,0.30)`).

### State kosong / error / loading
- **Loading:** skeleton shimmer **sesuai dimensi layout** (hero, kartu list,
  baris sheet) — tidak ada spinner sirkular generik.
- **Filter kosong:** `EmptyState` terkomposisi + aksi "Reset filter".
- **Error:** `ErrorState` dengan tombol coba lagi; revalidate diam-diam yang
  gagal = toast, bukan layar error.

## 5. Layout Principles

- Satu kolom mobile-first (target 390px), `space-y-7` antar blok, konten
  `overflow-x-hidden` — horizontal scroll = kegagalan kritis.
- Semua target sentuh ≥ 44×44px (tombol ikon, baris aksi, chip).
- Ruang bawah aman untuk FAB + nav dok (bar penuh nempel tepi bawah, `.nav-dock`).
- Kartu 24px (`rounded-3xl`) untuk konten utama, 16px untuk panel padat,
  12px untuk kontrol — jangan over-round (>24px).
- Tidak ada elemen bertumpuk/overlap; separasi dari tone + hairline + ruang.

## 6. Motion & Interaction

- **Press:** `.press`/`active:scale-[0.97]` — feedback taktil, tanpa glow.
- **Masuk list:** `.rise` stagger 50ms per kartu, cap indeks 10.
- **Angka:** `useCountUp` + `Odometer` pada saldo hero.
- **Progress bar:** `transform: scaleX()` 700ms ease-out (origin-left).
- **Sheet:** masuk `sheetUp` ease-out-expo; keluar meluncur via `dismiss()`
  (`.sheet-backdrop-out`) — bukan unmount pop. **Dilarang** `fill-mode:
  both/forwards` pada elemen ber-transform inline.
- **Sekali-muat:** `.hero-sheen-sweep` hanya kunjungan pertama sesi.
- Hanya `transform` + `opacity`; hormati `prefers-reduced-motion`,
  `forced-colors`, `prefers-contrast` (sudah ditangani `index.css`).
- Haptic ringan (`haptic()`) pada aksi bermakna: buka detail, share, setor.

## 7. Anti-Patterns (DILARANG di layar ini)

- Glass/glow/noise/top-light/halo/edge-ring di kartu — bahasa lama yang
  sengaja dibongkar; kalau kartu mulai "melayang", cabut lapisannya.
- Mewarnai nominal saldo minus jadi salmon/rose muda — pakai chip "Defisit".
- Menghijaukan nominal "Dapat Arisan" — itu uang keluar, tetap ink netral.
- Panel `bg-white/xx` di atas hero gradient — wajib `bg-black/xx`.
- Biru di luar sinyal setor; emas songket di layar ini (songket hanya milik
  kartu saldo Beranda & sorot Sohibul).
- Abu pudar di atas putih (di bawah AA); pure black #000000.
- Ganti font (Sora+Inter final); gradient text; border-stripe > 1px.
- Spinner sirkular generik sebagai loading utama; sheet mentah tanpa `useDialog`.
- Emoji di UI; copywriting AI ("Tingkatkan", "Seamless") — bahasa Indonesia
  hangat, istilah kampung yang dipakai warga (tarikan, talangan, Sohibul Bait).
- Data/angka karangan — semua nominal dari Supabase; rumus rincian WAJIB
  sinkron dengan `generatePendapatanPDF.ts`.

## 8. Direktif Polish (celah nyata, urut prioritas)

1. **[SELESAI 13 Jul] Kontras bar kehadiran (WCAG 1.4.11 non-teks).** Fill
   `bg-emerald-400` (#34D399) di atas track `bg-gray-100` (#F3F4F6) ≈ **1,8:1**
   — di bawah 3:1, dan elemen ini informatif (`role="progressbar"`). Fill light
   dinaikkan ke **emerald-600 #059669** (≈3,4:1 terhadap track); dark tetap
   `emerald-500`.
2. **[SELESAI 13 Jul] Empty state total.** Bila belum ada tarikan selesai sama
   sekali, seluruh section Rekap lenyap tanpa penjelasan. Kini ada `EmptyState`
   terkomposisi ("Belum ada tarikan selesai…"); error load pertama tanpa cache
   juga tertangkap `ErrorState` di cabang yang sama.
3. **[SELESAI 13 Jul] Sinkron tinggi skeleton hero.** `h-[164px]` hardcoded
   diganti konstanta tunggal `HERO_MIN_H` (164): skeleton pakai `height`, hero
   asli pakai `min-height` — drift mati, dan jump saat FitAmount menyusut
   (angka panjang → hero natural ~146px < skeleton) ikut hilang.

Selain tiga poin ini, layar sudah memenuhi baseline (AA teks 0 temuan, 44px
tap target, skeleton berbentuk, useDialog, reduced-motion). **Jangan** mencari
"celah premium" tambahan dengan mengutak-atik token.
