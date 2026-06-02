-- ============================================================
-- FIX: total_terkumpul tarikan #1–5
-- Sumber: PDF GAS — kas hadiran per tarikan
-- Formula: (total_warga - 1 sohibul bait) × Rp5.000
-- ============================================================

UPDATE tarikan SET total_terkumpul = 340000 WHERE nomor = 1;
UPDATE tarikan SET total_terkumpul = 340000 WHERE nomor = 2;
UPDATE tarikan SET total_terkumpul = 340000 WHERE nomor = 3;
UPDATE tarikan SET total_terkumpul = 340000 WHERE nomor = 4;
UPDATE tarikan SET total_terkumpul = 350000 WHERE nomor = 5;

-- Verifikasi: total semua tarikan selesai = Rp1.710.000
-- SELECT SUM(total_terkumpul) FROM tarikan WHERE status = 'selesai';
