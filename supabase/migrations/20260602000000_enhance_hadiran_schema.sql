/*
  # Enhance Hadiran RT Schema

  Melengkapi skema sebelumnya dengan:
  1. Kolom role & no_hp di tabel warga
  2. Kolom sohibul_bait_id & status di tabel tarikan
  3. Tabel absensi (kehadiran per tarikan)
  4. Tabel kas_rt (kas besar RT, terpisah dari kas hadiran)
  5. Drop tabel jadwal (digantikan oleh tarikan.sohibul_bait_id)
*/

-- =========================================
-- ALTER: warga — tambah role & no_hp
-- =========================================
ALTER TABLE warga
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'warga'
    CHECK (role IN ('bendahara', 'warga')),
  ADD COLUMN IF NOT EXISTS no_hp text NOT NULL DEFAULT '';

-- =========================================
-- ALTER: tarikan — tambah sohibul_bait_id & status
-- =========================================
ALTER TABLE tarikan
  ADD COLUMN IF NOT EXISTS sohibul_bait_id uuid REFERENCES warga(id),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'dijadwalkan'
    CHECK (status IN ('dijadwalkan', 'berlangsung', 'selesai')),
  ADD COLUMN IF NOT EXISTS total_terkumpul integer NOT NULL DEFAULT 0;

-- =========================================
-- TABLE: absensi — kehadiran per tarikan
-- =========================================
CREATE TABLE IF NOT EXISTS absensi (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarikan_id   uuid NOT NULL REFERENCES tarikan(id) ON DELETE CASCADE,
  warga_id     uuid NOT NULL REFERENCES warga(id)   ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'tidak_hadir'
               CHECK (status IN ('hadir', 'tidak_hadir')),
  created_at   timestamptz DEFAULT now(),
  UNIQUE (tarikan_id, warga_id)
);

ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read absensi" ON absensi;
DROP POLICY IF EXISTS "Public can insert absensi" ON absensi;
DROP POLICY IF EXISTS "Public can update absensi" ON absensi;
DROP POLICY IF EXISTS "Public can delete absensi" ON absensi;

CREATE POLICY "Public can read absensi"
  ON absensi FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can insert absensi"
  ON absensi FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public can update absensi"
  ON absensi FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can delete absensi"
  ON absensi FOR DELETE TO anon, authenticated USING (true);

-- =========================================
-- TABLE: kas_rt — kas besar RT
-- Terpisah dari kas_hadiran (transaksi_kas)
-- =========================================
CREATE TABLE IF NOT EXISTS kas_rt (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipe           text NOT NULL
                 CHECK (tipe IN ('masuk', 'keluar')),
  nominal        integer NOT NULL CHECK (nominal > 0),
  keterangan     text NOT NULL DEFAULT '',
  tanggal        date NOT NULL DEFAULT CURRENT_DATE,
  tarikan_id     uuid REFERENCES tarikan(id),  -- nullable: setoran dari tarikan
  saldo_setelah  integer NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE kas_rt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read kas_rt" ON kas_rt;
DROP POLICY IF EXISTS "Public can insert kas_rt" ON kas_rt;
DROP POLICY IF EXISTS "Public can update kas_rt" ON kas_rt;

CREATE POLICY "Public can read kas_rt"
  ON kas_rt FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can insert kas_rt"
  ON kas_rt FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public can update kas_rt"
  ON kas_rt FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================
-- DROP: jadwal — digantikan tarikan + sohibul_bait_id
-- =========================================
DROP TABLE IF EXISTS jadwal;

-- =========================================
-- INDEX — performa query umum
-- =========================================
CREATE INDEX IF NOT EXISTS idx_absensi_tarikan  ON absensi (tarikan_id);
CREATE INDEX IF NOT EXISTS idx_absensi_warga    ON absensi (warga_id);
CREATE INDEX IF NOT EXISTS idx_talangan_warga   ON talangan (warga_id);
CREATE INDEX IF NOT EXISTS idx_talangan_status  ON talangan (status_lunas);
CREATE INDEX IF NOT EXISTS idx_tarikan_status   ON tarikan (status);
CREATE INDEX IF NOT EXISTS idx_kas_rt_tanggal   ON kas_rt (tanggal);
