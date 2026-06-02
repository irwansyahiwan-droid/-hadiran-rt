-- ============================================================
-- FIX BERANDA — 3 masalah:
-- 1. Tarikan #5 status dijadwalkan → selesai
-- 2. Setoran Kas RT belum ada di transaksi_kas (Rp1.710.000)
-- 3. Tarikan #6–70 belum ada di database
-- ============================================================

BEGIN;

-- ── FIX 1: Update status tarikan #5 ─────────────────────────

UPDATE tarikan SET status = 'selesai' WHERE nomor = 5;

-- ── FIX 2: Insert setoran ke transaksi_kas ───────────────────
-- Dashboard (fetchDashboardSummary) membaca total_setor_kas_rt
-- dari transaksi_kas.tipe = 'setor_kas_rt', bukan dari kas_rt.

INSERT INTO transaksi_kas (tipe, nominal, keterangan, tanggal, tarikan_id, saldo_setelah)
SELECT
  'setor_kas_rt',
  1710000,
  'Setor ke Kas Besar RT — Iuran Hadiran Mei 2026',
  '2026-05-31',
  (SELECT id FROM tarikan WHERE nomor = 5 LIMIT 1),
  0
WHERE NOT EXISTS (
  SELECT 1 FROM transaksi_kas WHERE tipe = 'setor_kas_rt'
);

-- ── FIX 3: Insert tarikan #6–70 jika belum ada ──────────────

INSERT INTO tarikan (nomor, tanggal, jumlah_per_orang, total_hadir, total_warga, total_terkumpul, sohibul_bait_id, status)
SELECT t.nomor, t.tgl::date, 50000, 0, 69, 0,
  (SELECT w.id FROM warga w WHERE w.nama = t.sohibul LIMIT 1),
  'dijadwalkan'
FROM (VALUES
  (6,  '2026-06-06', 'Bedianto'),
  (7,  '2026-06-13', 'Saan Simin'),
  (8,  '2026-06-19', 'Devit'),
  (9,  '2026-06-27', 'Imam Slamet'),
  (10, '2026-07-04', 'Basukianto'),
  (11, '2026-07-11', 'Amirudin Basori'),
  (12, '2026-07-18', 'Nurdin Abet'),
  (13, '2026-07-25', 'Saman Suryadi ( Mono )'),
  (14, '2026-08-01', 'Kunto Mulyono'),
  (15, '2026-08-08', 'H.Naba Hendrawan'),
  (16, '2026-08-15', 'H.Yatmo Saleh'),
  (17, '2026-08-22', 'Sain Suhendi'),
  (18, '2026-08-29', 'Syarifudin'),
  (19, '2026-09-05', 'Ahmad Iqbal'),
  (20, '2026-09-12', 'Carduki'),
  (21, '2026-09-19', 'Karta Saleh'),
  (22, '2026-09-26', 'Nisan Nasrullah ( Icang )'),
  (23, '2026-10-03', 'Arpandi'),
  (24, '2026-10-10', 'Surmansyah'),
  (25, '2026-10-17', 'Jamiat'),
  (26, '2026-10-24', 'Wawan R Irawan'),
  (27, '2026-10-31', 'Nazarudin'),
  (28, '2026-11-07', 'Nasuha'),
  (29, '2026-11-14', 'Lisun ( Cokri )'),
  (30, '2026-11-21', 'Niman Borti'),
  (31, '2026-11-28', 'Arga Julian'),
  (32, '2026-12-05', 'Riduan Tagor'),
  (33, '2026-12-12', 'Riky Kurniawan'),
  (34, '2026-12-19', 'Saan Kinan'),
  (35, '2026-12-26', 'Nurdjaman'),
  (36, '2027-01-02', 'Robyansyah'),
  (37, '2027-01-09', 'Farid Hamdzah'),
  (38, '2027-01-16', 'M.Suryadi'),
  (39, '2027-01-23', 'Sahlani'),
  (40, '2027-01-30', 'Minan Kinan'),
  (41, '2027-03-27', 'Dhiman'),
  (42, '2027-04-03', 'Sain Simin'),
  (43, '2027-04-10', 'H.Rohsaidin'),
  (44, '2027-04-17', 'Tasim Payakun'),
  (45, '2027-04-24', 'Wahyudi'),
  (46, '2027-05-01', 'H.Kadimun'),
  (47, '2027-05-08', 'H.Deny Fredianto'),
  (48, '2027-05-15', 'Nikin Sapari ( Boy )'),
  (49, '2027-05-22', 'Idham Firmansyah'),
  (50, '2027-05-29', 'Muchlis'),
  (51, '2027-06-05', 'Melky'),
  (52, '2027-06-12', 'Hafid Dasuni'),
  (53, '2027-06-19', 'Yulianto'),
  (54, '2027-06-26', 'Suhardi Nur'),
  (55, '2027-07-03', 'Indra Irawan'),
  (56, '2027-07-10', 'Tuhu Wiyono'),
  (57, '2027-07-17', 'Tasman H.Sainan'),
  (58, '2027-07-24', 'Ahmad Fauzi'),
  (59, '2027-07-31', 'Farida'),
  (60, '2027-08-07', 'Boin'),
  (61, '2027-08-14', 'Ach.Bayu Octamar'),
  (62, '2027-08-21', 'Rahmat Deni'),
  (63, '2027-08-28', 'Zulkarnain Bontot'),
  (64, '2027-09-04', 'Rahma'),
  (65, '2027-09-11', 'Romaidi Hasan'),
  (66, '2027-09-18', 'Ustad Saiful Hadi'),
  (67, '2027-09-25', 'Musa'),
  (68, '2027-10-02', 'Bayu Wiyasanyata'),
  (69, '2027-10-09', 'Komarudin'),
  (70, '2027-10-16', 'H.Mustain Tabrani')
) AS t(nomor, tgl, sohibul)
WHERE t.nomor NOT IN (SELECT nomor FROM tarikan);

COMMIT;
