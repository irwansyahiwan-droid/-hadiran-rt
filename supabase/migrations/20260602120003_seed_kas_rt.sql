-- ============================================================
-- SECTION 5: KAS RT — saldo awal + 18 transaksi
-- Saldo akhir target: Rp14.182.000
-- Jalankan SETELAH Section 1 & 2
-- ============================================================
INSERT INTO kas_rt (tipe, nominal, keterangan, tanggal, tarikan_id, saldo_setelah) VALUES

-- Saldo awal 1 Jan 2026
('masuk', 8134000,
 'Saldo Awal Kas RT',
 '2026-01-01', NULL, 8134000),

-- Januari
('masuk', 936000,
 'Seteroan Bang Dedi Kas Anggota Hadiran Tgl 31/01/2026',
 '2026-01-31', NULL, 9070000),

-- Februari
('keluar', 300000,
 'Setoran Acara Syawalan Di kelurahan Tanah Baru',
 '2026-02-04', NULL, 8770000),

('keluar', 750000,
 'Beli Kain Kapan Almarhumah Ibu Ika Ginarti Binti Mualim',
 '2026-02-08', NULL, 8020000),

('masuk', 2230000,
 'Iuran Warga Di Luar Anggota Hadiran Bulan Pebruari 2026',
 '2026-02-08', NULL, 10250000),

('keluar', 350000,
 'Donasi Rawat Inap Anaknya Bpk Ustad Mustain',
 '2026-02-11', NULL, 9900000),

('keluar', 70000,
 'Beli Lampu Jalan Depan Rumah Bpk H.Rohsaidin',
 '2026-02-17', NULL, 9830000),

('keluar', 350000,
 'Donasi Rawat Inap Bpk Nano',
 '2026-02-20', NULL, 9480000),

-- Maret
('keluar', 270000,
 'Pembuatan Kwitansi Zakat Fitrah',
 '2026-03-04', NULL, 9210000),

('keluar', 90000,
 'Pembelian Lampu Jalan Bacang 1 & Bacang 2',
 '2026-03-19', NULL, 9120000),

-- April
('keluar', 350000,
 'Donasi rawat Inap Bpk Mudi',
 '2026-04-06', NULL, 8770000),

('masuk', 2870000,
 'Iuran bulanan dari Warga di luar anggota hadiran bulan April 2026',
 '2026-04-12', NULL, 11640000),

('keluar', 40000,
 'pembelian lampu Jalan Gg. Bacang Utama Depan Rumah roby',
 '2026-04-18', NULL, 11600000),

('keluar', 78000,
 'Beli ATKI buat pengurus hadiran',
 '2026-04-26', NULL, 11522000),

-- Mei
('masuk', 780000,
 'Kas hadiran di Ruman Bpk Tagor & Bpk H. Mustain Tabrani, (Dedi)',
 '2026-05-02', NULL, 12302000),

('masuk', 2220000,
 'Iuran Bulanan Warga di luar Anggota Hadiran Bulan Mei 2026',
 '2026-05-11', NULL, 14522000),

('keluar', 1300000,
 'Kosumsi bakti Qurban Pasang Tenda persiapan Qurban & Suport Acara Qurban',
 '2026-05-24', NULL, 13222000),

('masuk', 1710000,
 'Setor ke Kas Besar RT — Iuran Hadiran bulan Mei 2026',
 '2026-05-31',
 (SELECT id FROM tarikan WHERE nomor = 5 LIMIT 1),
 14932000),

-- Juni
('keluar', 750000,
 'Beli Kain Kapan Almarhum Bapak Hadi Saputra',
 '2026-06-01', NULL, 14182000);
