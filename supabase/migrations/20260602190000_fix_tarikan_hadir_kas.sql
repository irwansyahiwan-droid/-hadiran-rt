-- ============================================================
-- FIX: total_hadir dan total_terkumpul tarikan #1–5
-- Sumber: PDF GAS (data resmi)
-- ============================================================

-- T3: hadir 59 (bukan 57 — 59 + 10 tidak hadir = 69 total)
UPDATE tarikan SET total_hadir = 59 WHERE nomor = 3;

-- Kas hadiran per tarikan (69 anggota × Rp5.000, sohibul bait ikut bayar)
UPDATE tarikan SET total_terkumpul = 345000 WHERE nomor = 1;  -- 69 × 5.000
UPDATE tarikan SET total_terkumpul = 345000 WHERE nomor = 2;  -- 69 × 5.000
-- nomor 3: 340.000 sudah benar (68 × 5.000)
-- nomor 4: 340.000 sudah benar
UPDATE tarikan SET total_terkumpul = 340000 WHERE nomor = 5;  -- 68 × 5.000 (koreksi dari 350.000)

-- Verifikasi: total harus tetap Rp1.710.000
-- SELECT SUM(total_terkumpul) FROM tarikan WHERE status = 'selesai';
