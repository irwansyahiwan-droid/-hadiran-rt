-- ============================================================
-- SEED: Absensi + Talangan + Transaksi Kas Tarikan #1–4
--
-- Data rekonstruksi dari history GAS:
--   Tarikan #1 (Irwansyah,    02 Mei): 69 hadir, 0 absen
--   Tarikan #2 (M.Aryanto,    09 Mei): 69 hadir, 0 absen
--   Tarikan #3 (Saman Ma'arif,16 Mei): 68 hadir, 1 absen
--     → Ustad Saiful Hadi (lunas)
--   Tarikan #4 (Dedi Iskandar,21 Mei): 57 hadir, 12 absen
--     → 7 lunas: Wahyudi, Nasuha, Ustad Saiful Hadi,
--                Riky Kurniawan, H.Yatmo Saleh, Nikin Sapari (Boy),
--                H.Naba Hendrawan
--     → 5 belum lunas: Ach.Bayu Octamar, Boin,
--                      H.Mustain Tabrani, Robyansyah, Sahlani
-- ============================================================

-- ── Update total_hadir di tabel tarikan ──────────────────────

UPDATE tarikan SET total_hadir = 69, status = 'selesai' WHERE nomor = 1;
UPDATE tarikan SET total_hadir = 69, status = 'selesai' WHERE nomor = 2;
UPDATE tarikan SET total_hadir = 68, status = 'selesai' WHERE nomor = 3;
UPDATE tarikan SET total_hadir = 57, status = 'selesai' WHERE nomor = 4;

-- ────────────────────────────────────────────────────────────
-- TARIKAN #1 — Irwansyah, 2 Mei 2026 (69 hadir, 0 absen)
-- ────────────────────────────────────────────────────────────

-- Absensi: semua aktif hadir kecuali Sohibul Bait sendiri tetap hadir
INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 1 LIMIT 1), w.id, 'hadir'
FROM warga w WHERE w.status_aktif = true;

-- Kas masuk agregat
INSERT INTO transaksi_kas (tipe, nominal, keterangan, tanggal, tarikan_id, saldo_setelah)
VALUES (
  'kas_masuk', 345000,
  'Kas hadiran tarikan #1 — Irwansyah (69 hadir × Rp5.000)',
  '2026-05-02',
  (SELECT id FROM tarikan WHERE nomor = 1 LIMIT 1),
  345000
);

-- ────────────────────────────────────────────────────────────
-- TARIKAN #2 — M.Aryanto, 9 Mei 2026 (69 hadir, 0 absen)
-- ────────────────────────────────────────────────────────────

INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 2 LIMIT 1), w.id, 'hadir'
FROM warga w WHERE w.status_aktif = true;

INSERT INTO transaksi_kas (tipe, nominal, keterangan, tanggal, tarikan_id, saldo_setelah)
VALUES (
  'kas_masuk', 345000,
  'Kas hadiran tarikan #2 — M.Aryanto (69 hadir × Rp5.000)',
  '2026-05-09',
  (SELECT id FROM tarikan WHERE nomor = 2 LIMIT 1),
  690000
);

-- ────────────────────────────────────────────────────────────
-- TARIKAN #3 — Saman Ma'arif, 16 Mei 2026 (68 hadir, 1 absen)
-- ────────────────────────────────────────────────────────────

-- Hadir (semua aktif KECUALI Ustad Saiful Hadi)
INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 3 LIMIT 1), w.id, 'hadir'
FROM warga w
WHERE w.status_aktif = true
  AND w.nama != 'Ustad Saiful Hadi';

-- Tidak hadir
INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 3 LIMIT 1), w.id, 'tidak_hadir'
FROM warga w WHERE w.nama = 'Ustad Saiful Hadi';

-- Talangan (langsung lunas)
INSERT INTO talangan (warga_id, tarikan_id, nominal, status_lunas, tanggal_lunas)
SELECT w.id, (SELECT id FROM tarikan WHERE nomor = 3 LIMIT 1), 50000, true, '2026-05-31'
FROM warga w WHERE w.nama = 'Ustad Saiful Hadi';

-- Kas masuk tarikan #3
INSERT INTO transaksi_kas (tipe, nominal, keterangan, tanggal, tarikan_id, saldo_setelah)
VALUES (
  'kas_masuk', 340000,
  'Kas hadiran tarikan #3 — Saman Ma''arif (68 hadir × Rp5.000)',
  '2026-05-16',
  (SELECT id FROM tarikan WHERE nomor = 3 LIMIT 1),
  1030000
);

-- Talangan masuk dari Ustad Saiful Hadi (lunas 31 Mei)
INSERT INTO transaksi_kas (tipe, nominal, keterangan, tanggal, warga_id, tarikan_id, saldo_setelah)
SELECT
  'talangan_masuk', 50000,
  'Talangan lunas oleh Ustad Saiful Hadi — Tarikan #3',
  '2026-05-31',
  w.id,
  (SELECT id FROM tarikan WHERE nomor = 3 LIMIT 1),
  1080000
FROM warga w WHERE w.nama = 'Ustad Saiful Hadi';

-- ────────────────────────────────────────────────────────────
-- TARIKAN #4 — Dedi Iskandar, 21 Mei 2026 (57 hadir, 12 absen)
-- ────────────────────────────────────────────────────────────

-- Hadir (57 orang)
INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 4 LIMIT 1), w.id, 'hadir'
FROM warga w
WHERE w.status_aktif = true
  AND w.nama NOT IN (
    'Wahyudi', 'Nasuha', 'Ustad Saiful Hadi',
    'Riky Kurniawan', 'H.Yatmo Saleh', 'Nikin Sapari ( Boy )',
    'H.Naba Hendrawan',
    'Ach.Bayu Octamar', 'Boin', 'H.Mustain Tabrani',
    'Robyansyah', 'Sahlani'
  );

-- Tidak hadir (12 orang)
INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 4 LIMIT 1), w.id, 'tidak_hadir'
FROM warga w
WHERE w.nama IN (
  'Wahyudi', 'Nasuha', 'Ustad Saiful Hadi',
  'Riky Kurniawan', 'H.Yatmo Saleh', 'Nikin Sapari ( Boy )',
  'H.Naba Hendrawan',
  'Ach.Bayu Octamar', 'Boin', 'H.Mustain Tabrani',
  'Robyansyah', 'Sahlani'
);

-- Talangan 7 orang → lunas semua (dibayar 31 Mei)
INSERT INTO talangan (warga_id, tarikan_id, nominal, status_lunas, tanggal_lunas)
SELECT w.id, (SELECT id FROM tarikan WHERE nomor = 4 LIMIT 1), 50000, true, '2026-05-31'
FROM warga w
WHERE w.nama IN (
  'Wahyudi', 'Nasuha', 'Ustad Saiful Hadi',
  'Riky Kurniawan', 'H.Yatmo Saleh', 'Nikin Sapari ( Boy )',
  'H.Naba Hendrawan'
);

-- Talangan 5 orang → belum lunas
INSERT INTO talangan (warga_id, tarikan_id, nominal, status_lunas)
SELECT w.id, (SELECT id FROM tarikan WHERE nomor = 4 LIMIT 1), 50000, false
FROM warga w
WHERE w.nama IN (
  'Ach.Bayu Octamar', 'Boin', 'H.Mustain Tabrani',
  'Robyansyah', 'Sahlani'
);

-- Kas masuk tarikan #4
INSERT INTO transaksi_kas (tipe, nominal, keterangan, tanggal, tarikan_id, saldo_setelah)
VALUES (
  'kas_masuk', 285000,
  'Kas hadiran tarikan #4 — Dedi Iskandar (57 hadir × Rp5.000)',
  '2026-05-21',
  (SELECT id FROM tarikan WHERE nomor = 4 LIMIT 1),
  1365000
);

-- Talangan masuk: 7 orang lunas (bayar 31 Mei)
WITH lunas AS (
  SELECT w.id AS warga_id, w.nama,
    ROW_NUMBER() OVER (ORDER BY w.nama) AS rn
  FROM warga w
  WHERE w.nama IN (
    'Wahyudi', 'Nasuha', 'Ustad Saiful Hadi',
    'Riky Kurniawan', 'H.Yatmo Saleh', 'Nikin Sapari ( Boy )',
    'H.Naba Hendrawan'
  )
)
INSERT INTO transaksi_kas (tipe, nominal, keterangan, tanggal, warga_id, tarikan_id, saldo_setelah)
SELECT
  'talangan_masuk',
  50000,
  'Talangan lunas oleh ' || nama || ' — Tarikan #4',
  '2026-05-31',
  warga_id,
  (SELECT id FROM tarikan WHERE nomor = 4 LIMIT 1),
  1365000 + (rn * 50000)
FROM lunas;

-- ────────────────────────────────────────────────────────────
-- RINGKASAN SALDO KAS HADIRAN SETELAH SEED #1–4:
--
--   Kas masuk T1–T4 : +Rp1.315.000
--   Talangan masuk  : +Rp400.000  (8 payments)
--   ─────────────────────────────
--   Total           :  Rp1.715.000
--
-- Ditambah seed tarikan #5 (file 20260602130000):
--   Kas masuk T5    : +Rp285.000
--   Talangan masuk  : +Rp600.000
--   ─────────────────────────────
--   SALDO AKHIR KAS HADIRAN: Rp2.600.000
--   Talangan belum lunas (T4): Rp250.000 (5 orang)
-- ────────────────────────────────────────────────────────────
