-- ============================================================
-- FIX: Absensi & Talangan Tarikan #1–5
-- Sumber data: PDF resmi GAS
-- Hasil target:
--   Total talangan : 58
--   Lunas          : 41
--   Belum lunas    : 17  (Rp850.000)
-- ============================================================

BEGIN;

-- ── STEP 1: Insert tarikan #1–5 jika belum ada ──────────────
-- (guard NOT EXISTS agar aman dijalankan ulang)

INSERT INTO tarikan (nomor, tanggal, jumlah_per_orang, total_hadir, total_warga, total_terkumpul, sohibul_bait_id, status)
SELECT 1, '2026-05-02', 50000, 0, 69, 0,
  (SELECT id FROM warga WHERE nama = 'Irwansyah' LIMIT 1), 'selesai'
WHERE NOT EXISTS (SELECT 1 FROM tarikan WHERE nomor = 1);

INSERT INTO tarikan (nomor, tanggal, jumlah_per_orang, total_hadir, total_warga, total_terkumpul, sohibul_bait_id, status)
SELECT 2, '2026-05-09', 50000, 0, 69, 0,
  (SELECT id FROM warga WHERE nama = 'M.Aryanto' LIMIT 1), 'selesai'
WHERE NOT EXISTS (SELECT 1 FROM tarikan WHERE nomor = 2);

INSERT INTO tarikan (nomor, tanggal, jumlah_per_orang, total_hadir, total_warga, total_terkumpul, sohibul_bait_id, status)
SELECT 3, '2026-05-16', 50000, 0, 69, 0,
  (SELECT id FROM warga WHERE nama = 'Saman Ma''arif' LIMIT 1), 'selesai'
WHERE NOT EXISTS (SELECT 1 FROM tarikan WHERE nomor = 3);

INSERT INTO tarikan (nomor, tanggal, jumlah_per_orang, total_hadir, total_warga, total_terkumpul, sohibul_bait_id, status)
SELECT 4, '2026-05-21', 50000, 0, 69, 0,
  (SELECT id FROM warga WHERE nama = 'Dedi Iskandar' LIMIT 1), 'selesai'
WHERE NOT EXISTS (SELECT 1 FROM tarikan WHERE nomor = 4);

INSERT INTO tarikan (nomor, tanggal, jumlah_per_orang, total_hadir, total_warga, total_terkumpul, sohibul_bait_id, status)
SELECT 5, '2026-05-31', 50000, 0, 69, 0,
  (SELECT id FROM warga WHERE nama = 'Sahroni / Eti' LIMIT 1), 'selesai'
WHERE NOT EXISTS (SELECT 1 FROM tarikan WHERE nomor = 5);

-- ── STEP 2: Hapus data absensi & talangan lama tarikan #1–5 ─

DELETE FROM absensi
WHERE tarikan_id IN (SELECT id FROM tarikan WHERE nomor BETWEEN 1 AND 5);

DELETE FROM talangan
WHERE tarikan_id IN (SELECT id FROM tarikan WHERE nomor BETWEEN 1 AND 5);

-- ── STEP 3: Update total_hadir tarikan #1–5 ─────────────────

UPDATE tarikan SET total_hadir = 57 WHERE nomor = 1;
UPDATE tarikan SET total_hadir = 60 WHERE nomor = 2;
UPDATE tarikan SET total_hadir = 57 WHERE nomor = 3;
UPDATE tarikan SET total_hadir = 54 WHERE nomor = 4;
UPDATE tarikan SET total_hadir = 57 WHERE nomor = 5;


-- ============================================================
-- TARIKAN #1 — Irwansyah, 2 Mei 2026
-- 57 hadir | 12 tidak hadir | talangan: 12 LUNAS
-- ============================================================

INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 1 LIMIT 1), w.id, 'tidak_hadir'
FROM warga w
WHERE w.nama IN (
  'Ach.Bayu Octamar', 'Ahmad Fauzi', 'H.Deny Fredianto', 'H.Kadimun',
  'H.Mustain Tabrani', 'Idham Firmansyah', 'Komarudin', 'Rahmat Deni',
  'Tasman H.Sainan', 'Tuhu Wiyono', 'Ustad Saiful Hadi', 'Yulianto'
);

INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 1 LIMIT 1), w.id, 'hadir'
FROM warga w
WHERE w.status_aktif = true
  AND w.nama NOT IN (
    'Ach.Bayu Octamar', 'Ahmad Fauzi', 'H.Deny Fredianto', 'H.Kadimun',
    'H.Mustain Tabrani', 'Idham Firmansyah', 'Komarudin', 'Rahmat Deni',
    'Tasman H.Sainan', 'Tuhu Wiyono', 'Ustad Saiful Hadi', 'Yulianto'
  );

-- Talangan: 12 orang, semua lunas sebelum T2 (9 Mei)
INSERT INTO talangan (warga_id, tarikan_id, nominal, status_lunas, tanggal_lunas)
SELECT w.id, (SELECT id FROM tarikan WHERE nomor = 1 LIMIT 1), 50000, true, '2026-05-09'
FROM warga w
WHERE w.nama IN (
  'Ach.Bayu Octamar', 'Ahmad Fauzi', 'H.Deny Fredianto', 'H.Kadimun',
  'H.Mustain Tabrani', 'Idham Firmansyah', 'Komarudin', 'Rahmat Deni',
  'Tasman H.Sainan', 'Tuhu Wiyono', 'Ustad Saiful Hadi', 'Yulianto'
);


-- ============================================================
-- TARIKAN #2 — M.Aryanto, 9 Mei 2026
-- 60 hadir | 9 tidak hadir | talangan: 9 LUNAS
-- ============================================================

INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 2 LIMIT 1), w.id, 'tidak_hadir'
FROM warga w
WHERE w.nama IN (
  'Farida', 'H.Mustain Tabrani', 'Komarudin', 'Melky',
  'Nurdin Abet', 'Nurdjaman', 'Rahmat Deni', 'Tuhu Wiyono',
  'Ustad Saiful Hadi'
);

INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 2 LIMIT 1), w.id, 'hadir'
FROM warga w
WHERE w.status_aktif = true
  AND w.nama NOT IN (
    'Farida', 'H.Mustain Tabrani', 'Komarudin', 'Melky',
    'Nurdin Abet', 'Nurdjaman', 'Rahmat Deni', 'Tuhu Wiyono',
    'Ustad Saiful Hadi'
  );

-- Talangan: 9 orang, semua lunas sebelum T3 (16 Mei)
INSERT INTO talangan (warga_id, tarikan_id, nominal, status_lunas, tanggal_lunas)
SELECT w.id, (SELECT id FROM tarikan WHERE nomor = 2 LIMIT 1), 50000, true, '2026-05-16'
FROM warga w
WHERE w.nama IN (
  'Farida', 'H.Mustain Tabrani', 'Komarudin', 'Melky',
  'Nurdin Abet', 'Nurdjaman', 'Rahmat Deni', 'Tuhu Wiyono',
  'Ustad Saiful Hadi'
);


-- ============================================================
-- TARIKAN #3 — Saman Ma'arif, 16 Mei 2026
-- 57 hadir | 10 tidak hadir | talangan: 8 LUNAS + 2 BELUM LUNAS
-- ============================================================

INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 3 LIMIT 1), w.id, 'tidak_hadir'
FROM warga w
WHERE w.nama IN (
  'Amirudin Basori', 'Bayu Wiyasanyata', 'Melky', 'Rahmat Deni',
  'Robyansyah', 'Syarifudin', 'Tasman H.Sainan', 'Ustad Saiful Hadi',
  'H.Mustain Tabrani', 'Suhardi Nur'
);

INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 3 LIMIT 1), w.id, 'hadir'
FROM warga w
WHERE w.status_aktif = true
  AND w.nama NOT IN (
    'Amirudin Basori', 'Bayu Wiyasanyata', 'Melky', 'Rahmat Deni',
    'Robyansyah', 'Syarifudin', 'Tasman H.Sainan', 'Ustad Saiful Hadi',
    'H.Mustain Tabrani', 'Suhardi Nur'
  );

-- Talangan lunas (8 orang), lunas sebelum T4 (21 Mei)
INSERT INTO talangan (warga_id, tarikan_id, nominal, status_lunas, tanggal_lunas)
SELECT w.id, (SELECT id FROM tarikan WHERE nomor = 3 LIMIT 1), 50000, true, '2026-05-21'
FROM warga w
WHERE w.nama IN (
  'Amirudin Basori', 'Bayu Wiyasanyata', 'Melky', 'Rahmat Deni',
  'Robyansyah', 'Syarifudin', 'Tasman H.Sainan', 'Ustad Saiful Hadi'
);

-- Talangan belum lunas (2 orang)
INSERT INTO talangan (warga_id, tarikan_id, nominal, status_lunas)
SELECT w.id, (SELECT id FROM tarikan WHERE nomor = 3 LIMIT 1), 50000, false
FROM warga w
WHERE w.nama IN (
  'H.Mustain Tabrani', 'Suhardi Nur'
);


-- ============================================================
-- TARIKAN #4 — Dedi Iskandar, 21 Mei 2026
-- 54 hadir | 15 tidak hadir | talangan: 12 LUNAS + 3 BELUM LUNAS
-- ============================================================

INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 4 LIMIT 1), w.id, 'tidak_hadir'
FROM warga w
WHERE w.nama IN (
  'Ahmad Iqbal', 'Bayu Wiyasanyata', 'H.Naba Hendrawan', 'H.Yatmo Saleh',
  'Idham Firmansyah', 'Melky', 'Nasuha', 'Nikin Sapari ( Boy )',
  'Nurdin Abet', 'Riky Kurniawan', 'Ustad Saiful Hadi', 'Wahyudi',
  'H.Mustain Tabrani', 'Suhardi Nur', 'Tuhu Wiyono'
);

INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 4 LIMIT 1), w.id, 'hadir'
FROM warga w
WHERE w.status_aktif = true
  AND w.nama NOT IN (
    'Ahmad Iqbal', 'Bayu Wiyasanyata', 'H.Naba Hendrawan', 'H.Yatmo Saleh',
    'Idham Firmansyah', 'Melky', 'Nasuha', 'Nikin Sapari ( Boy )',
    'Nurdin Abet', 'Riky Kurniawan', 'Ustad Saiful Hadi', 'Wahyudi',
    'H.Mustain Tabrani', 'Suhardi Nur', 'Tuhu Wiyono'
  );

-- Talangan lunas (12 orang), lunas sebelum T5 (31 Mei)
INSERT INTO talangan (warga_id, tarikan_id, nominal, status_lunas, tanggal_lunas)
SELECT w.id, (SELECT id FROM tarikan WHERE nomor = 4 LIMIT 1), 50000, true, '2026-05-31'
FROM warga w
WHERE w.nama IN (
  'Ahmad Iqbal', 'Bayu Wiyasanyata', 'H.Naba Hendrawan', 'H.Yatmo Saleh',
  'Idham Firmansyah', 'Melky', 'Nasuha', 'Nikin Sapari ( Boy )',
  'Nurdin Abet', 'Riky Kurniawan', 'Ustad Saiful Hadi', 'Wahyudi'
);

-- Talangan belum lunas (3 orang)
INSERT INTO talangan (warga_id, tarikan_id, nominal, status_lunas)
SELECT w.id, (SELECT id FROM tarikan WHERE nomor = 4 LIMIT 1), 50000, false
FROM warga w
WHERE w.nama IN (
  'H.Mustain Tabrani', 'Suhardi Nur', 'Tuhu Wiyono'
);


-- ============================================================
-- TARIKAN #5 — Sahroni / Eti, 31 Mei 2026
-- 57 hadir | 12 tidak hadir | talangan: 12 BELUM LUNAS (semua)
-- ============================================================

INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 5 LIMIT 1), w.id, 'tidak_hadir'
FROM warga w
WHERE w.nama IN (
  'Ach.Bayu Octamar', 'Amirudin Basori', 'Boin',
  'H.Mustain Tabrani', 'H.Naba Hendrawan', 'Melky',
  'Nikin Sapari ( Boy )', 'Rahmat Deni', 'Robyansyah',
  'Sahlani', 'Suhardi Nur', 'Tuhu Wiyono'
);

INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT (SELECT id FROM tarikan WHERE nomor = 5 LIMIT 1), w.id, 'hadir'
FROM warga w
WHERE w.status_aktif = true
  AND w.nama NOT IN (
    'Ach.Bayu Octamar', 'Amirudin Basori', 'Boin',
    'H.Mustain Tabrani', 'H.Naba Hendrawan', 'Melky',
    'Nikin Sapari ( Boy )', 'Rahmat Deni', 'Robyansyah',
    'Sahlani', 'Suhardi Nur', 'Tuhu Wiyono'
  );

-- Talangan belum lunas (12 orang)
INSERT INTO talangan (warga_id, tarikan_id, nominal, status_lunas)
SELECT w.id, (SELECT id FROM tarikan WHERE nomor = 5 LIMIT 1), 50000, false
FROM warga w
WHERE w.nama IN (
  'Ach.Bayu Octamar', 'Amirudin Basori', 'Boin',
  'H.Mustain Tabrani', 'H.Naba Hendrawan', 'Melky',
  'Nikin Sapari ( Boy )', 'Rahmat Deni', 'Robyansyah',
  'Sahlani', 'Suhardi Nur', 'Tuhu Wiyono'
);


-- ============================================================
-- VERIFIKASI — jalankan setelah migration selesai
-- ============================================================

-- Cek total talangan (harus 58)
-- SELECT COUNT(*) AS total_talangan FROM talangan
-- WHERE tarikan_id IN (SELECT id FROM tarikan WHERE nomor BETWEEN 1 AND 5);

-- Cek breakdown lunas vs belum lunas (harus 41 lunas, 17 belum)
-- SELECT status_lunas, COUNT(*) AS jumlah, SUM(nominal) AS total_nilai
-- FROM talangan
-- WHERE tarikan_id IN (SELECT id FROM tarikan WHERE nomor BETWEEN 1 AND 5)
-- GROUP BY status_lunas;

-- Cek tunggakan per warga (belum lunas)
-- SELECT w.nama, COUNT(*) AS jumlah_talangan, SUM(t.nominal) AS total_tunggakan
-- FROM talangan t
-- JOIN warga w ON w.id = t.warga_id
-- WHERE t.status_lunas = false
-- GROUP BY w.nama
-- ORDER BY total_tunggakan DESC;

COMMIT;
