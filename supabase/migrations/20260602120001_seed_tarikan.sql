-- ============================================================
-- SECTION 2: TARIKAN — 70 jadwal (5 selesai + 65 dijadwalkan)
-- Jalankan SETELAH Section 1 (warga sudah ada)
-- ============================================================

-- Pastikan constraint status tarikan menggunakan nilai yang benar
ALTER TABLE tarikan DROP CONSTRAINT IF EXISTS tarikan_status_check;
ALTER TABLE tarikan ADD CONSTRAINT tarikan_status_check
  CHECK (status IN ('dijadwalkan', 'berlangsung', 'selesai'));

INSERT INTO tarikan (nomor, tanggal, jumlah_per_orang, total_hadir, total_warga, total_terkumpul, sohibul_bait_id, status)
SELECT t.nomor, t.tgl::date, 50000, t.hadir, 69, t.terkumpul,
  (SELECT w.id FROM warga w WHERE w.nama = t.sohibul LIMIT 1),
  t.status
FROM (VALUES
  -- === SELESAI ===
  (1,  '2026-05-02', 'Irwansyah',              'selesai',     0, 0),
  (2,  '2026-05-09', 'M.Aryanto',              'selesai',     0, 0),
  (3,  '2026-05-16', 'Saman Ma''arif',         'selesai',     0, 0),
  (4,  '2026-05-21', 'Dedi Iskandar',          'selesai',     0, 0),
  (5,  '2026-05-31', 'Sahroni / Eti',          'selesai',    57, 340000),
  -- === DIJADWALKAN ===
  (6,  '2026-06-06', 'Bedianto',               'dijadwalkan', 0, 0),
  (7,  '2026-06-13', 'Saan Simin',             'dijadwalkan', 0, 0),
  (8,  '2026-06-19', 'Devit',                  'dijadwalkan', 0, 0),
  (9,  '2026-06-27', 'Imam Slamet',            'dijadwalkan', 0, 0),
  (10, '2026-07-04', 'Basukianto',             'dijadwalkan', 0, 0),
  (11, '2026-07-11', 'Amirudin Basori',        'dijadwalkan', 0, 0),
  (12, '2026-07-18', 'Nurdin Abet',            'dijadwalkan', 0, 0),
  (13, '2026-07-25', 'Saman Suryadi ( Mono )', 'dijadwalkan', 0, 0),
  (14, '2026-08-01', 'Kunto Mulyono',          'dijadwalkan', 0, 0),
  (15, '2026-08-08', 'H.Naba Hendrawan',       'dijadwalkan', 0, 0),
  (16, '2026-08-15', 'H.Yatmo Saleh',          'dijadwalkan', 0, 0),
  (17, '2026-08-22', 'Sain Suhendi',           'dijadwalkan', 0, 0),
  (18, '2026-08-29', 'Syarifudin',             'dijadwalkan', 0, 0),
  (19, '2026-09-05', 'Ahmad Iqbal',            'dijadwalkan', 0, 0),
  (20, '2026-09-12', 'Carduki',                'dijadwalkan', 0, 0),
  (21, '2026-09-19', 'Karta Saleh',            'dijadwalkan', 0, 0),
  (22, '2026-09-26', 'Nisan Nasrullah ( Icang )', 'dijadwalkan', 0, 0),
  (23, '2026-10-03', 'Arpandi',                'dijadwalkan', 0, 0),
  (24, '2026-10-10', 'Surmansyah',             'dijadwalkan', 0, 0),
  (25, '2026-10-17', 'Jamiat',                 'dijadwalkan', 0, 0),
  (26, '2026-10-24', 'Wawan R Irawan',         'dijadwalkan', 0, 0),
  (27, '2026-10-31', 'Nazarudin',              'dijadwalkan', 0, 0),
  (28, '2026-11-07', 'Nasuha',                 'dijadwalkan', 0, 0),
  (29, '2026-11-14', 'Lisun ( Cokri )',        'dijadwalkan', 0, 0),
  (30, '2026-11-21', 'Niman Borti',            'dijadwalkan', 0, 0),
  (31, '2026-11-28', 'Arga Julian',            'dijadwalkan', 0, 0),
  (32, '2026-12-05', 'Riduan Tagor',           'dijadwalkan', 0, 0),
  (33, '2026-12-12', 'Riky Kurniawan',         'dijadwalkan', 0, 0),
  (34, '2026-12-19', 'Saan Kinan',             'dijadwalkan', 0, 0),
  (35, '2026-12-26', 'Nurdjaman',              'dijadwalkan', 0, 0),
  (36, '2027-01-02', 'Robyansyah',             'dijadwalkan', 0, 0),
  (37, '2027-01-09', 'Farid Hamdzah',          'dijadwalkan', 0, 0),
  (38, '2027-01-16', 'M.Suryadi',              'dijadwalkan', 0, 0),
  (39, '2027-01-23', 'Sahlani',                'dijadwalkan', 0, 0),
  (40, '2027-01-30', 'Minan Kinan',            'dijadwalkan', 0, 0),
  (41, '2027-03-27', 'Dhiman',                 'dijadwalkan', 0, 0),
  (42, '2027-04-03', 'Sain Simin',             'dijadwalkan', 0, 0),
  (43, '2027-04-10', 'H.Rohsaidin',            'dijadwalkan', 0, 0),
  (44, '2027-04-17', 'Tasim Payakun',          'dijadwalkan', 0, 0),
  (45, '2027-04-24', 'Wahyudi',                'dijadwalkan', 0, 0),
  (46, '2027-05-01', 'H.Kadimun',              'dijadwalkan', 0, 0),
  (47, '2027-05-08', 'H.Deny Fredianto',       'dijadwalkan', 0, 0),
  (48, '2027-05-15', 'Nikin Sapari ( Boy )',   'dijadwalkan', 0, 0),
  (49, '2027-05-22', 'Idham Firmansyah',       'dijadwalkan', 0, 0),
  (50, '2027-05-29', 'Muchlis',                'dijadwalkan', 0, 0),
  (51, '2027-06-05', 'Melky',                  'dijadwalkan', 0, 0),
  (52, '2027-06-12', 'Hafid Dasuni',           'dijadwalkan', 0, 0),
  (53, '2027-06-19', 'Yulianto',               'dijadwalkan', 0, 0),
  (54, '2027-06-26', 'Suhardi Nur',            'dijadwalkan', 0, 0),
  (55, '2027-07-03', 'Indra Irawan',           'dijadwalkan', 0, 0),
  (56, '2027-07-10', 'Tuhu Wiyono',            'dijadwalkan', 0, 0),
  (57, '2027-07-17', 'Tasman H.Sainan',        'dijadwalkan', 0, 0),
  (58, '2027-07-24', 'Ahmad Fauzi',            'dijadwalkan', 0, 0),
  (59, '2027-07-31', 'Farida',                 'dijadwalkan', 0, 0),
  (60, '2027-08-07', 'Boin',                   'dijadwalkan', 0, 0),
  (61, '2027-08-14', 'Ach.Bayu Octamar',       'dijadwalkan', 0, 0),
  (62, '2027-08-21', 'Rahmat Deni',            'dijadwalkan', 0, 0),
  (63, '2027-08-28', 'Zulkarnain Bontot',      'dijadwalkan', 0, 0),
  (64, '2027-09-04', 'Rahma',                  'dijadwalkan', 0, 0),
  (65, '2027-09-11', 'Romaidi Hasan',          'dijadwalkan', 0, 0),
  (66, '2027-09-18', 'Ustad Saiful Hadi',      'dijadwalkan', 0, 0),
  (67, '2027-09-25', 'Musa',                   'dijadwalkan', 0, 0),
  (68, '2027-10-02', 'Bayu Wiyasanyata',       'dijadwalkan', 0, 0),
  (69, '2027-10-09', 'Komarudin',              'dijadwalkan', 0, 0),
  (70, '2027-10-16', 'H.Mustain Tabrani',      'dijadwalkan', 0, 0)
) AS t(nomor, tgl, sohibul, status, hadir, terkumpul);
