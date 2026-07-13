---
name: Hadiran RT — Layar "Kas RT"
description: Spec desain semantik layar Kas RT (kas besar) untuk polish & regenerasi screen — turunan DESIGN.md induk, di-ground ke kode nyata.
status: Material-flat. Sumber kebenaran = tailwind.config.js + src/index.css + src/pages/KasRT.tsx. Dibuat 13 Jul 2026.
parent: DESIGN.md
scope: src/pages/KasRT.tsx + TargetKasRT.tsx + charts/MonthlyBars.tsx + charts/AreaTrend.tsx
---

# Design System: Layar "Kas RT"

> Scope **DESIGN.md induk** ke satu layar. Bila konflik: **kode > DESIGN.md
> induk > dokumen ini**. Arah Material-flat final — polish = celah nyata,
> bukan churn token. Anatomi bersama sudah dirinci di `DESIGN-kas-hadiran.md`;
> dokumen ini fokus yang khas Kas RT.

## 1. Visual Theme & Atmosphere

**Buku besar RT untuk pertanggungjawaban publik.** Layar terpadat di app:
hero saldo, target tabungan, insight bulanan, dua grafik, rekap kategori,
lalu mutasi lengkap ber-saldo-berjalan. Tetap "Daily App Balanced" (density
6 — paling padat yang diizinkan), variance 3, motion 4. Semua angka bisa
diverifikasi warga: saldo berjalan per baris, kategori pertanggungjawaban,
ekspor PDF/Excel.

## 2. Color Palette & Roles

Mengikuti palet induk penuh. Yang khas layar ini:

- **Hero selalu emerald** (`.hero-emerald`) — Kas RT tidak punya varian setor
  biru / slate; status defisit ditandai **chip "Defisit"**, bukan gradient lain
  dan bukan pewarnaan nominal (The Saldo-Defisit Rule).
- **Mutasi dua kutub:** masuk = tile `bg-emerald-100` + panah ArrowDownLeft
  `emerald-600`, nominal `text-pos` (#047857); keluar = tile `bg-rose-100` +
  ArrowUpRight `rose-600`, nominal `text-neg` (#E11D48). Saldo berjalan di
  bawah nominal: `ink-sub`, merah hanya bila saldo berjalan < 0.
- **Warna viz (tier terpisah dari token semantik):** garis tren #0F6039;
  bar Masuk vs Keluar emerald/rose — wajib ≥3:1 di atas kartu putih (lihat §8).
- **Badge kategori:** outline hairline `border-line` + `text-ink-sub`, micro —
  metadata, bukan sinyal warna.

## 3. Typography Rules

Ikuti induk (Sora + Inter final, tabular-nums). Khas layar ini:
- Saldo hero: FitAmount 30–48px **putih** (minus → tetap putih + chip Defisit).
- Baris "Saldo Awal · tanggal · nominal" micro putih/90 di hero (kondisional).
- Nominal mutasi: `text-amount` Sora 600; saldo berjalan `text-xs` tabular.
- Rekap kategori: label `text-caption` ink-sub, nominal semibold ink.

## 4. Component Stylings (anatomi per blok)

### Header halaman
Judul "Kas RT" + InfoTip (penjelasan Rp5.000/anggota per tarikan) + caption
tanggal; toolbar muat ulang 44px + ExportMenu align kiri (PDF/Excel). FAB
"Tambah" di zona jempol (bendahara).

### Hero saldo
`.hero-emerald` + `--hero-shadow` + `.hero-sheen`, padding 24px. Eyebrow
Landmark + "SALDO BERSIH KAS RT"; mata & share 44px; FitAmount + Odometer;
baris Saldo Awal (bila ada); dua chip stat `bg-black/10` (Total Masuk `+` /
Total Keluar `-`). Dalam `CrossFade` — jangan berkedip "Rp0".

### Target Kas RT (`TargetKasRT`)
Belum ada target = tombol garis putus-putus (satu-satunya dashed di app —
affordance "isi di sini"). Ada target = kartu putih + progress bar 12px
(track `bg-gray-100`, fill gradient emerald, `role="progressbar"`) + baris
tercapai/deadline. Sheet atur target pakai `useDialog`.

### Insight & grafik
`SmartInsight` (masuk bulan ini vs lalu) hanya bila ada datanya. Dua kartu
grafik (grid 1 kolom HP / 2 kolom ≥sm): **Tren Saldo** (AreaTrend, garis
#0F6039 + fill gradient) dan **Masuk vs Keluar** (MonthlyBars + picker
periode 3B/6B/12B pill kecil aktif `bg-brand`, legend dot sinkron warna bar).
Muncul hanya bila `list.length > 1` — tidak ada grafik kosong.

### Rekap per Kategori
Kartu putih berisi dua panel `.inset-soft` (Penerimaan / Pengeluaran):
header micro uppercase + total `pos`/`neg`, baris kategori dari taksonomi
tetap `lib/kategoriKasRt.ts` — hanya kategori bernilai > 0 yang tampil,
fallback caption "Belum ada …".

### List Mutasi
Search `.field-search` + FilterChips (Semua/Masuk/Keluar, sort Terbaru/
Terlama/Nominal). Kartu list `rounded-3xl` + `divide-inset`; baris = tile
ikon 36px tint semantik, keterangan bold + tanggal + badge kategori, kanan
nominal ±warna + saldo berjalan. Baris bendahara = `<button>` asli (fokus/
Enter bawaan) buka sheet aksi; baris warga `<div>` non-interaktif.
Optimasi: `content-visibility: auto` per baris.

### Sheet aksi baris & TambahModal
Sheet aksi: judul + tanggal + panel `.inset-soft` (tipe, nominal) + Edit
(`.btn-brand`) / Hapus (outline rose → `.btn-danger` dua-ketuk, undo 5 dtk).
TambahModal: toggle tipe (aktif = fill `pos`/`neg` + teks putih; ikon lucide
serima tile mutasi), select kategori ikut tipe, field nominal/tanggal,
**preview "Saldo setelah transaksi"** panel tint emerald/rose. Semua sheet
`useDialog` + drag-dismiss.

### State
Skeleton berbentuk baris mutasi; EmptyState "Belum ada transaksi" & "Tidak
ada hasil" (+ Reset filter); ErrorState retry; `handleSave`/`deleteRow`
SUDAH memeriksa error Supabase + pesan RLS spesifik — pertahankan pola ini.

## 5–7. Layout, Motion, Anti-Patterns

Identik induk + `DESIGN-kas-hadiran.md`. Khas layar ini: grafik & rekap
jangan pindah ke atas hero (saldo selalu first-fold); tidak ada angka
karangan — semua agregat dihitung dari `list`; jangan tambah accent biru/
ungu ke chart (emerald = masuk, rose = keluar, titik).

## 8. Direktif Polish (celah nyata, urut prioritas)

1. **[SELESAI 13 Jul] Pelanggaran The Saldo-Defisit Rule.** `text-rose-200`
   saat saldo < 0 dibongkar: nominal **tetap putih** + chip solid
   `bg-rose-600` "Defisit" (anatomi disalin dari KasHadiran); mask nominal
   kini sign-aware (`-Rp…` saat minus).
2. **[SELESAI 13 Jul] Kontras non-teks viz (WCAG 1.4.11).** Bar MonthlyBars
   `emerald-500/90`/`rose-400/90` (≈2,2:1) → `bg-emerald-600`/`bg-rose-500`
   solid + legend dot sinkron; fill TargetKasRT `from-emerald-400` (≈1,8:1) →
   `from-emerald-600 to-emerald-700` (tercapai: `from-emerald-600 to-brand`).
3. **[SELESAI 13 Jul] Skeleton hero polos & hardcoded.** `h-[218px]` blok abu
   → skeleton berbentuk + konstanta `HERO_MIN_H` (218): skeleton `height`,
   hero `min-height`. Baris Saldo Awal kondisional tetap data-driven.
4. **[SELESAI 13 Jul] Hero "Rp0" saat error load pertama tanpa cache** —
   di-guard `!(error && list.length === 0)`, ErrorState yang bicara.
5. **[SELESAI 13 Jul] Radius & tombol lepas dialek.** Hero `rounded-2xl` →
   `rounded-3xl` (ikut `--hero-radius` 24px); `rounded-full` di submit
   TambahModal dihapus — radius kini dari `.btn-brand`/`.btn-danger` (12px),
   seragam SetorModal.
6. **[SELESAI 13 Jul] `load()` cek error Supabase** (susulan sapu se-app):
   fetch gagal kini `throw` → ErrorState/toast, bukan mutasi kosong palsu +
   cache tertimpa.
