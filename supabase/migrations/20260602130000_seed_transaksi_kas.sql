-- ============================================================
-- SECTION 6: TRANSAKSI_KAS dari tarikan #5
--
-- Logika:
--   • 57 warga hadir       → kas_masuk @Rp5.000/orang  = Rp285.000
--   • 12 warga talangan     → talangan_masuk @Rp50.000/orang = Rp600.000
--     (bendahara catat sebagai masuk; talangan ditandai lunas)
--
-- Total saldo setelah seed  = Rp885.000
-- Jalankan SETELAH Section 1, 2, 3, 4
-- ============================================================

-- ── BAGIAN A: kas_masuk Rp5.000 per warga hadir ──────────────

WITH hadir AS (
  SELECT
    w.id   AS warga_id,
    w.nama,
    ROW_NUMBER() OVER (ORDER BY w.nama) AS rn
  FROM warga w
  WHERE w.nama IN (
    'Ahmad Iqbal', 'Ahmad Fauzi', 'Arga Julian', 'Arpandi',
    'Basukianto', 'Bayu Wiyasanyata', 'Bedianto', 'Carduki',
    'Dedi Iskandar', 'Devit', 'Dhiman', 'Farida', 'Hafid Dasuni',
    'H.Deny Fredianto', 'H.Kadimun', 'H.Rohsaidin', 'H.Yatmo Saleh',
    'Idham Firmansyah', 'Imam Slamet', 'Indra Irawan', 'Irwansyah',
    'Jamiat', 'Karta Saleh', 'Komarudin', 'Kunto Mulyono',
    'Lisun ( Cokri )', 'Minan Kinan', 'Muchlis', 'M.Aryanto', 'M.Suryadi',
    'Nasuha', 'Nazarudin', 'Niman Borti', 'Nisan Nasrullah ( Icang )',
    'Nurdjaman', 'Nurdin Abet', 'Farid Hamdzah', 'Rahma',
    'Riduan Tagor', 'Riky Kurniawan', 'Romaidi Hasan',
    'Saan Kinan', 'Saan Simin', 'Sahroni / Eti',
    'Sain Simin', 'Sain Suhendi', 'Ustad Saiful Hadi',
    'Saman Ma''arif', 'Saman Suryadi ( Mono )', 'Surmansyah',
    'Syarifudin', 'Tasim Payakun', 'Tasman H.Sainan',
    'Wahyudi', 'Wawan R Irawan', 'Yulianto', 'Zulkarnain Bontot'
  )
)
INSERT INTO transaksi_kas (tipe, nominal, keterangan, tanggal, warga_id, tarikan_id, saldo_setelah)
SELECT
  'kas_masuk',
  5000,
  'Iuran kas hadiran tarikan #5 — ' || nama,
  '2026-05-31',
  warga_id,
  (SELECT id FROM tarikan WHERE nomor = 5 LIMIT 1),
  rn * 5000
FROM hadir;

-- ── BAGIAN B: talangan_masuk Rp50.000 per warga tidak hadir ──

WITH talangan_warga AS (
  SELECT
    w.id   AS warga_id,
    w.nama,
    t.id   AS talangan_id,
    ROW_NUMBER() OVER (ORDER BY w.nama) AS rn
  FROM warga w
  JOIN talangan t ON t.warga_id = w.id
  WHERE t.tarikan_id = (SELECT id FROM tarikan WHERE nomor = 5 LIMIT 1)
    AND t.status_lunas = false
)
INSERT INTO transaksi_kas (tipe, nominal, keterangan, tanggal, warga_id, tarikan_id, saldo_setelah)
SELECT
  'talangan_masuk',
  50000,
  'Talangan lunas — ' || nama || ' (Tarikan #5)',
  '2026-05-31',
  warga_id,
  (SELECT id FROM tarikan WHERE nomor = 5 LIMIT 1),
  285000 + (rn * 50000)
FROM talangan_warga;

-- ── BAGIAN C: tandai talangan tarikan #5 sebagai lunas ───────

UPDATE talangan
SET
  status_lunas  = true,
  tanggal_lunas = '2026-05-31'
WHERE tarikan_id = (SELECT id FROM tarikan WHERE nomor = 5 LIMIT 1)
  AND status_lunas = false;
