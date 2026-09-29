-- ============================================================
-- Koreksi DATA (29 Sep 2026, keputusan user): Saldo Awal Kas RT tercatat
-- per 31 Januari 2026 — tanggal penutupan kegiatan Hadiran sebelumnya,
-- sesudahnya baru app ini dipakai — bukan 1 Januari 2026 (seed
-- 20260602120003 menanamnya 2026-01-01).
--
-- Hanya TANGGAL yang berubah. Nominal & `saldo_setelah` tetap: app kini
-- mengurutkan Saldo Awal DULUAN pada tanggalnya (`urutKasRT`), jadi ia
-- tetap membuka buku walau bertanggal sama dgn setoran "Kas Anggota
-- Hadiran Tgl 31/01/2026" (created_at kedua baris identik). Kode itu WAJIB
-- sudah live sebelum ini dijalankan.
--
-- Idempoten (klausa tanggal lama). Ikut tercatat trigger audit kas_rt.
-- ============================================================
UPDATE public.kas_rt
SET tanggal = '2026-01-31'
WHERE keterangan = 'Saldo Awal Kas RT'
  AND tanggal = '2026-01-01';
