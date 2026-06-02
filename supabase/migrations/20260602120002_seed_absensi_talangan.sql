-- ============================================================
-- SECTION 3: ABSENSI TARIKAN #5 (57 hadir, 12 tidak hadir)
-- Jalankan SETELAH Section 1 & 2
-- ============================================================

-- Hadir (57 orang)
INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT
  (SELECT id FROM tarikan WHERE nomor = 5 LIMIT 1),
  w.id,
  'hadir'
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
);

-- Tidak hadir (12 orang)
INSERT INTO absensi (tarikan_id, warga_id, status)
SELECT
  (SELECT id FROM tarikan WHERE nomor = 5 LIMIT 1),
  w.id,
  'tidak_hadir'
FROM warga w
WHERE w.nama IN (
  'Ach.Bayu Octamar', 'Amirudin Basori', 'Boin',
  'H.Mustain Tabrani', 'H.Naba Hendrawan', 'Melky',
  'Nikin Sapari ( Boy )', 'Rahmat Deni', 'Robyansyah',
  'Sahlani', 'Suhardi Nur', 'Tuhu Wiyono'
);

-- ============================================================
-- SECTION 4: TALANGAN TARIKAN #5 (12 orang belum bayar)
-- ============================================================
INSERT INTO talangan (warga_id, tarikan_id, nominal, status_lunas)
SELECT
  w.id,
  (SELECT id FROM tarikan WHERE nomor = 5 LIMIT 1),
  50000,
  false
FROM warga w
WHERE w.nama IN (
  'Ach.Bayu Octamar', 'Amirudin Basori', 'Boin',
  'H.Mustain Tabrani', 'H.Naba Hendrawan', 'Melky',
  'Nikin Sapari ( Boy )', 'Rahmat Deni', 'Robyansyah',
  'Sahlani', 'Suhardi Nur', 'Tuhu Wiyono'
);
