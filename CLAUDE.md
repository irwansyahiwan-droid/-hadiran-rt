# Hadiran RT — Project Context

## Tentang Aplikasi
Aplikasi manajemen arisan & kas RT (RT 004/006).
69 anggota aktif, diakses warga via browser HP.

## Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Supabase (PostgreSQL)
- Deploy: Vercel

## Fitur Utama
1. Beranda — dashboard saldo, statistik
2. Jadwal — jadwal tarikan per Sohibul Bait
3. Absensi — daftar hadir per tarikan
4. Talangan — tracking tunggakan warga
5. Kas Hadiran — kas per arisan
6. Kas RT — kas besar RT
7. Cetak PDF — laporan

## Role
- Bendahara (admin penuh)
- Warga (view only)

## Aturan Coding
- Gunakan bahasa Indonesia untuk UI
- Komponen kecil, satu file satu fitur
- Jangan ubah semua file sekaligus


## Logika Bisnis

### Arisan (Tarikan)
- Setiap tarikan ada 1 Sohibul Bait (penerima)
- Semua anggota wajib hadir, yang tidak hadir kena talangan
- Iuran per anggota = total kas / jumlah anggota hadir
- Sohibul Bait menerima semua iuran yang terkumpul

### Talangan
- Anggota tidak hadir = otomatis talangan Rp50.000
- Talangan harus lunas sebelum tarikan berikutnya
- Bendahara yang tandai lunas

### Kas RT
- Sebagian setoran masuk ke Kas Besar RT
- Kas RT terpisah dari Kas Hadiran 1