-- ============================================================
-- FIX DUPLICATES — hapus semua data duplikat
-- Jalankan ini PERTAMA, lalu re-run semua seed (Section 1–6)
-- ============================================================

TRUNCATE TABLE transaksi_kas;
TRUNCATE TABLE kas_rt;
TRUNCATE TABLE absensi;
TRUNCATE TABLE talangan;
TRUNCATE TABLE tarikan;
TRUNCATE TABLE warga;

-- Setelah ini, jalankan ulang:
-- 1. 20260602120000_seed_data_from_gas.sql      (warga)
-- 2. 20260602120001_seed_tarikan.sql            (tarikan)
-- 3. 20260602120002_seed_absensi_talangan.sql   (absensi #5)
-- 4. 20260602120003_seed_kas_rt.sql             (kas RT)
-- 5. 20260602130000_seed_transaksi_kas.sql      (transaksi #5)
-- 6. 20260602140000_seed_tarikan_1_4.sql        (absensi #1-4)
