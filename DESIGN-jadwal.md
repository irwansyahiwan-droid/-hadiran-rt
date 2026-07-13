---
name: Hadiran RT — Layar "Jadwal" (+ Absensi)
description: Spec desain semantik layar Jadwal Tarikan & editor Absensi untuk polish & regenerasi screen — turunan DESIGN.md induk, di-ground ke kode nyata.
status: Material-flat. Sumber kebenaran = tailwind.config.js + src/index.css + src/pages/Jadwal.tsx. Dibuat 13 Jul 2026.
parent: DESIGN.md
scope: src/pages/Jadwal.tsx (JadwalPage + AbsensiView + ResultCard + modal Tambah/Edit)
---

# Design System: Layar "Jadwal" (+ editor Absensi)

> Scope **DESIGN.md induk** ke satu layar. Bila konflik: **kode > DESIGN.md
> induk > dokumen ini**. Jadwal memuat alur PALING kritis se-app: "Simpan &
> Hitung Iuran" menulis uang ke 4 tabel — kejujuran state di sini lebih
> penting dari kosmetik.

## 0. Keputusan Terkunci

- **Nomor tarikan ikut tanggal** utk yang belum ditarik; 'selesai' terkunci
  & tak bisa direvisi jadwalnya. Self-heal nomor jalan di `load()` khusus
  bendahara (warga ditolak RLS).
- **Batalkan/hapus hasil tarikan HANYA via RPC atomik `batalkan_tarikan`**
  (snapshot pemulihan diarsipkan dulu ke audit_log). Jangan kembalikan delete
  terpisah dari klien.
- **Absensi 3 status** (hadir/titip/tidak_hadir), rumus dari SATU sumber
  teruji `ringkasAbsensi()`; Sohibul Bait terkunci 'hadir' & di luar hitungan.
- **Bulk absensi wajib `showUndo`** (menimpa ~79 tandaan sekali tap).
- **Aksi sekunder per baris (WA + Revisi) dilipat ke sheet** — baris memuat
  SATU aksi utama (Proses / Hitung Ulang).

## 1. Visual Theme & Atmosphere

Papan kerja bendahara: daftar putaran arisan + editor absensi cepat-tap.
Density 6 (baris padat, ~80 nama), variance 3, motion 3 (paling kalem —
fokus kerja; SuccessOverlay "honor" satu-satunya momen seremoni).

## 2. Color Palette & Roles (yang khas layar ini)

- **Status absensi (bahasa tiga warna):** hadir = emerald (tile emerald-100,
  indikator lingkaran `bg-pos` + centang putih) · titip = biru setor (tile
  blue-100, koin `bg-setor-500`) · tidak hadir = rose lembut (tile rose-50,
  lingkaran kosong border abu). Ketuk baris memutar status.
- **Sohibul Bait = amber honor:** baris terkunci `bg-amber-50/60` + badge
  "Penerima" amber + ikon gembok — bukan warna talangan, ini kehormatan.
- **Sorot giliran berikutnya:** edge kiri 3px `brand-500` di baris + tombol
  Proses `.btn-brand`; tarikan terjadwal lain = Proses tonal emerald-50.
- **Tarikan selesai:** nama turun ke `ink-sub` (de-emphasis teks, bukan abu
  pudar), aksi tinggal "Hitung Ulang" ikon.
- **"Sohibul nonaktif"** = rose-500 inline di caption — peringatan data.

## 3. Typography (yang khas layar ini)

Nomor urut baris `00.` tabular ink-faint; nama Sohibul `text-base` semibold;
StatRow absensi 4 kolom (Hadir/Titip/Tdk Hadir/Talangan) — nominal talangan
pakai format kompak Intl id-ID ("Rp50 rb"). Label status di bawah nama
memakai warna statusnya (emerald/blue/rose) — satu-satunya teks berwarna
di list, sengaja.

## 4. Component Stylings (anatomi ringkas)

- **Header:** judul + caption "N selesai · N terjadwal"; muat ulang 44px;
  PDF (outline); "+ Jadwal" `.btn-brand` (bendahara). FAB "Proses" = tarikan
  giliran berikutnya, langsung ke editor absensi.
- **List tarikan:** satu kartu `rounded-3xl` + `divide-inset`; baris = nomor,
  nama + tanggal, aksi kanan (Proses pill / Hitung Ulang ikon / titik-tiga →
  sheet WA + Revisi). Warga view-only = Tag status.
- **Editor Absensi (AbsensiView):** back header → StatRow 4 kolom live →
  bulk 3 tombol tonal (Semua Hadir / Semua Titip / Reset, semua ber-undo) →
  FilterChips + search → kartu list warga (baris Sohibul terkunci di atas,
  baris pembayar `content-visibility:auto`) → tombol fixed "Simpan & Hitung
  Iuran" (`.btn-brand`, offset = garis dasar FAB/nav) + "Batalkan Hasil"
  (outline rose, hanya status selesai, dialog wajib-ketik-nomor).
- **ResultCard:** kartu rincian pasca-hitung — dua nominal bersisian,
  ringkasan kehadiran ber-dot, daftar nama tidak-hadir (kontrol cek uang
  fisik), banner talangan amber, tombol "Bagikan PNG". Bertahan sampai
  ditutup manual.
- **Modal Tambah/Edit jadwal:** field tanggal + select Sohibul; `useDialog`
  + drag-dismiss; footer Batal (`.btn-secondary`) + Simpan (`.btn-brand`).
- **State:** skeleton berbentuk (list & editor absensi punya skeleton
  lengkap per-blok); EmptyState "Belum ada jadwal"; ErrorState retry.

## 5–7. Layout, Motion, Anti-Patterns

Identik induk. Khas layar ini: tombol fixed bawah WAJIB satu garis dasar
dgn FAB (`4.5rem + safe-area + 1.75rem`) dan konten diberi `pb` cukup agar
baris terakhir tetap bisa di-tap; jangan tambah aksi ketiga ke baris list
(sheet sudah jadi rumahnya); jangan ganti seremoni SuccessOverlay jadi
konfeti/loop abadi.

## 8. Direktif Polish (celah nyata, urut prioritas)

1. **[SELESAI 13 Jul] Rantai "Simpan & Hitung" tanpa cek error (KRITIS).**
   Kini TIAP langkah (baca lunas, delete/insert absensi, delete/insert
   talangan, delete/insert transaksi kas, update tarikan) memeriksa `error`
   dan `throw` ke catch — koneksi putus = toast gagal + bendahara ditahan di
   editor utk tekan ulang, bukan layar sukses palsu. **Fix penuh masih
   terbuka:** pindahkan seluruh rantai ke RPC atomik spt `batalkan_tarikan`
   (satu transaksi server, tak bisa setengah jalan).
2. **[SELESAI 13 Jul] False success di modal Tambah/Edit jadwal.** Keduanya
   kini cek `error`: Edit → toast gagal + tetap di modal; Tambah → throw ke
   catch/toast yang sudah ada.
3. **[SELESAI 13 Jul] `load()` cek error** `tarRes`/`wargaRes` → throw;
   tak ada lagi "Belum ada jadwal" palsu / cache tertimpa kosong.
4. **[SELESAI 13 Jul] Tombol "Proses"** kini `min-h-[44px]` (dialek tombol
   "Bayar" Talangan).
5. **[SELESAI 13 Jul] Angka nol palsu saat cold load.** Caption header →
   "Memuat…", nilai StatRow → "—" selama `loading`.
6. **[SELESAI 13 Jul] Batal `rounded-full`** di 2 modal → `rounded-xl`.
