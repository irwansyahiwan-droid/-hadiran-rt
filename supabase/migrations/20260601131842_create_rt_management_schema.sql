/*
  # RT Cash & Dues Management Schema

  ## Overview
  Schema untuk aplikasi manajemen kas dan iuran RT (Rukun Tetangga).

  ## Tables

  ### 1. warga
  Daftar warga/anggota RT
  - id: UUID primary key
  - nama: Nama lengkap warga
  - no_rumah: Nomor rumah
  - status_aktif: Apakah warga masih aktif

  ### 2. tarikan
  Ronde pengumpulan iuran (tarikan)
  - id: UUID primary key
  - nomor: Nomor urut tarikan
  - tanggal: Tanggal tarikan
  - jumlah_per_orang: Iuran per orang (Rp50.000)
  - total_hadir: Jumlah warga hadir
  - total_warga: Total warga terdaftar

  ### 3. talangan
  Catatan talangan/hutang warga yang belum membayar
  - id: UUID primary key
  - warga_id: Referensi ke warga
  - tarikan_id: Referensi ke tarikan
  - nominal: Jumlah talangan
  - status_lunas: Apakah sudah lunas
  - tanggal_lunas: Tanggal pelunasan (nullable)

  ### 4. transaksi_kas
  Riwayat transaksi kas Hadiran
  - id: UUID primary key
  - tipe: Jenis transaksi (kas_masuk, kas_keluar, setor_kas_rt)
  - nominal: Jumlah transaksi
  - keterangan: Deskripsi transaksi
  - tanggal: Tanggal transaksi
  - warga_id: Referensi ke warga (nullable)
  - tarikan_id: Referensi ke tarikan (nullable)
  - saldo_setelah: Saldo setelah transaksi

  ## Security
  - RLS enabled on all tables
  - Public read access (prototype mode — no auth required)
  - Public write access for demo purposes
*/

-- =========================================
-- TABLE: warga
-- =========================================
CREATE TABLE IF NOT EXISTS warga (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  no_rumah text NOT NULL DEFAULT '',
  status_aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE warga ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read warga" ON warga;
DROP POLICY IF EXISTS "Public can insert warga" ON warga;
DROP POLICY IF EXISTS "Public can update warga" ON warga;

CREATE POLICY "Public can read warga"
  ON warga FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert warga"
  ON warga FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update warga"
  ON warga FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =========================================
-- TABLE: tarikan
-- =========================================
CREATE TABLE IF NOT EXISTS tarikan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor integer NOT NULL,
  tanggal date NOT NULL,
  jumlah_per_orang integer NOT NULL DEFAULT 50000,
  total_hadir integer NOT NULL DEFAULT 0,
  total_warga integer NOT NULL DEFAULT 69,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tarikan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read tarikan" ON tarikan;
DROP POLICY IF EXISTS "Public can insert tarikan" ON tarikan;
DROP POLICY IF EXISTS "Public can update tarikan" ON tarikan;

CREATE POLICY "Public can read tarikan"
  ON tarikan FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert tarikan"
  ON tarikan FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update tarikan"
  ON tarikan FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =========================================
-- TABLE: talangan
-- =========================================
CREATE TABLE IF NOT EXISTS talangan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warga_id uuid NOT NULL REFERENCES warga(id),
  tarikan_id uuid NOT NULL REFERENCES tarikan(id),
  nominal integer NOT NULL DEFAULT 50000,
  status_lunas boolean NOT NULL DEFAULT false,
  tanggal_lunas date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE talangan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read talangan" ON talangan;
DROP POLICY IF EXISTS "Public can insert talangan" ON talangan;
DROP POLICY IF EXISTS "Public can update talangan" ON talangan;

CREATE POLICY "Public can read talangan"
  ON talangan FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert talangan"
  ON talangan FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update talangan"
  ON talangan FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =========================================
-- TABLE: transaksi_kas
-- =========================================
CREATE TABLE IF NOT EXISTS transaksi_kas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipe text NOT NULL CHECK (tipe IN ('kas_masuk', 'kas_keluar', 'setor_kas_rt', 'talangan_masuk', 'talangan_keluar')),
  nominal integer NOT NULL,
  keterangan text NOT NULL DEFAULT '',
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  warga_id uuid REFERENCES warga(id),
  tarikan_id uuid REFERENCES tarikan(id),
  saldo_setelah integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transaksi_kas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read transaksi_kas" ON transaksi_kas;
DROP POLICY IF EXISTS "Public can insert transaksi_kas" ON transaksi_kas;
DROP POLICY IF EXISTS "Public can update transaksi_kas" ON transaksi_kas;

CREATE POLICY "Public can read transaksi_kas"
  ON transaksi_kas FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert transaksi_kas"
  ON transaksi_kas FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update transaksi_kas"
  ON transaksi_kas FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =========================================
-- TABLE: jadwal_berikutnya
-- Jadwal tarikan mendatang
-- =========================================
CREATE TABLE IF NOT EXISTS jadwal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warga_id uuid NOT NULL REFERENCES warga(id),
  tanggal date NOT NULL,
  keterangan text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'terjadwal' CHECK (status IN ('terjadwal', 'selesai', 'dibatalkan')),
  nominal integer NOT NULL DEFAULT 50000,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE jadwal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read jadwal" ON jadwal;
DROP POLICY IF EXISTS "Public can insert jadwal" ON jadwal;
DROP POLICY IF EXISTS "Public can update jadwal" ON jadwal;

CREATE POLICY "Public can read jadwal"
  ON jadwal FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert jadwal"
  ON jadwal FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update jadwal"
  ON jadwal FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
