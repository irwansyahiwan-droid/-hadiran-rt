---
name: Hadiran RT — Layar "Beranda"
description: Spec desain semantik layar Beranda (dashboard) untuk polish & regenerasi screen — turunan DESIGN.md induk, di-ground ke kode nyata.
status: Material-flat. Layout 14 Jun TERKUNCI. Sumber kebenaran = tailwind.config.js + src/index.css + src/pages/Beranda.tsx + BannerCarousel.tsx. Dibuat 13 Jul 2026.
parent: DESIGN.md
scope: src/pages/Beranda.tsx + src/components/BannerCarousel.tsx + StatRow.tsx
---

# Design System: Layar "Beranda"

> Scope **DESIGN.md induk** ke satu layar. Bila konflik: **kode > DESIGN.md
> induk > dokumen ini**. Beranda adalah layar paling sering dipoles dan paling
> banyak keputusan TERKUNCI — dokumen ini terutama menjaga agar polish
> berikutnya TIDAK membatalkan keputusan itu.

## 0. Keputusan Terkunci (JANGAN dibongkar tanpa diminta eksplisit)

- **Layout 14 Jun:** sapaan + badge status → carousel hero → StatRow 3 kolom →
  banner talangan → Jadwal Berikutnya → Transaksi Terakhir (penuh + filter).
  Jangan restruktur.
- **BannerCarousel:** carousel 3D bertumpuk (perspective), slide saldo = slide
  "rumah" (ditahan lebih lama), indikator story tersegmen, autoplay ping-pong,
  drag pointer. Permukaan **flat & tegas ala BYOND** — user MENOLAK
  glass/glow/noise di kartu banner.
- **Sparkline di hero DITOLAK** (data tiap tarikan nominalnya sama → garis
  datar; grafik tanpa cerita = hiasan rusak). Rongga tengah kartu saldo diisi
  RUANG (blok nominal dipusatkan flex-1), bukan konten.
- **View Transitions DITOLAK.** Entrance hero (count-up, sheen sweep) hanya
  kunjungan pertama sesi (`useFirstPlay`).
- **Emas songket** hanya dua tempat: motif kartu saldo + sorot "Giliran
  berikutnya" (mahkota + cincin avatar). Jangan menyebar.
- **Chip status kas dedup:** saat ada tunggakan, chip TIDAK mengulang pesan
  banner ("Kas Aktif" netral); saldo minus → "Perlu Perhatian".
- **Sub-teks hero satu maksud:** hanya delta tarikan terakhir — fakta lain
  sudah tampil di footer hero / StatRow, jangan ditumpuk lagi.

## 1. Visual Theme & Atmosphere

Ruang tamu aplikasi: kabar keuangan RT dalam satu gulir tenang. Density 5,
variance 3, motion 5 (paling hidup se-app: carousel 3D, count-up, sheen sweep
sekali-muat, rise stagger — semua transform/opacity, sekali jalan, bukan loop).

## 2. Color Palette & Roles (yang khas layar ini)

- **Slide saldo** = jewel-green hero (satu sumber `index.css`); nominal putih
  FitAmount/clamp; minus → chip solid `bg-rose-600` "Defisit" (The
  Saldo-Defisit Rule — sudah benar di sini, jadikan acuan layar lain).
- **Badge status kas:** Sehat = emerald-50/700 · Aktif = abu netral ·
  Perlu Perhatian = rose-50/700 + dot rose-500.
- **Banner talangan:** amber-50 + border amber-200/60, teks amber-800, aksi
  "Lihat" tonal amber-100 — satu-satunya banner peringatan, jangan gandakan.
- **Baris transaksi:** tile setor `bg-blue-100` + panah `blue-600` (sinyal
  setor scoped); tile talangan-lunas `bg-emerald-100` + panah emerald;
  nominal `text-pos`/`text-neg`.
- **Sorot giliran:** baris pertama jadwal `bg-emerald-50/50` + cincin & mahkota
  `--gold-songket` (#E8B651) + chip "Giliran berikutnya".

## 3. Typography (yang khas layar ini)

Nominal slide saldo: `clamp(1.9rem, 9vw, 2.6rem)` Sora extrabold (bukan
FitAmount — tinggi kartu carousel tetap). Kepala kelompok tanggal transaksi:
micro uppercase + NET hari itu (pola buku besar bank; hanya saat sort
kronologis — sort nominal balik ke tanggal per-baris). Judul baris = NAMA
warga (kalimat penuh disimpan utk pencarian & sheet detail).

## 4. Component Stylings (anatomi ringkas)

- **Sapaan:** greeting per jam + role; kanan chip status kas.
- **Carousel:** 7 kartu ~344px; slide saldo memuat eyebrow (dot emerald
  bercahaya + label micro), aksi mata/muat-ulang 38px (hit-area diperluas
  `before:-inset-[3px]` ≈ 44px), nominal + chip Defisit, delta tarikan
  terakhir, footer 3 stat tappable (Terkumpul/Talangan/Setor Kas RT,
  `stopPropagation` agar tak menggeser slide).
- **StatRow** (komponen bersama): Anggota/Tarikan/Terjadwal, count-up
  serentak dgn hero.
- **Jadwal Berikutnya:** kartu list, 5 teratas, baris pertama = sorot honor;
  "Lihat semua" → tab Jadwal.
- **Transaksi Terakhir:** search + FilterChips + sort; dikelompokkan per
  tanggal; render 20 teratas + tombol "Lihat N transaksi lainnya" → tab
  Hadiran; baris tappable → sheet detail (`useDialog`) berisi jumlah, saldo
  setelah (null di luar jendela kelengkapan = disembunyikan, JANGAN dikarang),
  tipe.
- **State:** skeleton berbentuk setinggi carousel real (`bannerViewportHeight`
  — sudah dinamis, acuan pola); ErrorState full hanya cold load; revalidate
  gagal = toast.

## 5–7. Layout, Motion, Anti-Patterns

Identik induk. Tambahan khas: jangan menambah kartu/section baru di antara
blok layout 14 Jun; jangan beri glass/glow/noise pada kartu carousel; jangan
render saldo berjalan di baris daftar (sudah diputuskan pindah ke sheet).

## 8. Direktif Polish (celah nyata, urut prioritas)

1. **[SELESAI 13 Jul] Kegagalan parsial fetch jadi empty state bohong.**
   `load()` kini memeriksa `error` keempat hasil query dan `throw` sebelum
   dipakai — jatuh ke jalur catch yang sudah benar (ErrorState/toast), cache
   tak tersentuh. Kelas yang sama dituntaskan se-app (Jadwal, Talangan,
   KasRT, KasHadiran).
2. **[SELESAI 13 Jul] Panah talangan-lunas** `emerald-500` → `emerald-600`
   (baris transaksi + sheet detail), seragam dialek mutasi Kas RT.

Selain itu Beranda sudah jadi acuan: Defisit chip, skeleton dinamis, empty/
error kontekstual, hit-area diperluas. **Jangan** cari celah tambahan dengan
mengutak-atik keputusan §0.
