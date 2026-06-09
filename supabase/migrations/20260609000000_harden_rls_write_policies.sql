/*
  # Kunci RLS: tulis hanya untuk pengguna terautentikasi (bendahara)

  ## Masalah
  Policy lama memberi INSERT/UPDATE/DELETE ke `anon` dengan WITH CHECK (true)
  di SEMUA tabel data + bucket storage. Anon key bersifat publik (terbaca di
  bundle JS), jadi siapa pun — termasuk "warga" mode view-only — bisa menulis
  ke kas/talangan/tarikan/dll. "Warga view-only" hanya dijaga di UI, BUKAN DB.

  ## Perbaikan
  - SELECT tetap terbuka (anon + authenticated): warga harus bisa MEMBACA.
  - INSERT/UPDATE/DELETE dibatasi `TO authenticated`.
    Model auth app: hanya BENDAHARA yang login (Supabase Auth); warga = anon.
    Maka `authenticated` = bendahara → tulisan bendahara tetap jalan, warga
    diblokir di level database.
  - Berlaku untuk tabel data, `pengaturan`, dan bucket storage `pengumuman`.
  - `audit_log` tidak disentuh (sudah benar: read authenticated, insert via
    trigger SECURITY DEFINER).

  Idempotent — aman dijalankan berulang. Hardening lanjutan (opsional): pindah
  role ke app_metadata + cek klaim di policy agar tak bisa di-set sendiri user.
*/

-- ── Tabel data: ganti policy tulis anon → authenticated ────────────────
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'warga', 'tarikan', 'talangan', 'transaksi_kas',
    'jadwal', 'absensi', 'kas_rt'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- INSERT
      EXECUTE format('DROP POLICY IF EXISTS "Public can insert %1$s" ON public.%1$I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated can insert %1$s" ON public.%1$I', t);
      EXECUTE format('CREATE POLICY "Authenticated can insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (true)', t);

      -- UPDATE
      EXECUTE format('DROP POLICY IF EXISTS "Public can update %1$s" ON public.%1$I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated can update %1$s" ON public.%1$I', t);
      EXECUTE format('CREATE POLICY "Authenticated can update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);

      -- DELETE
      EXECUTE format('DROP POLICY IF EXISTS "Public can delete %1$s" ON public.%1$I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated can delete %1$s" ON public.%1$I', t);
      EXECUTE format('CREATE POLICY "Authenticated can delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (true)', t);
    END IF;
  END LOOP;
END $$;

-- ── pengaturan (penamaan policy berbeda: tanpa "can") ──────────────────
DROP POLICY IF EXISTS "Public insert pengaturan" ON public.pengaturan;
DROP POLICY IF EXISTS "Authenticated insert pengaturan" ON public.pengaturan;
CREATE POLICY "Authenticated insert pengaturan" ON public.pengaturan
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public update pengaturan" ON public.pengaturan;
DROP POLICY IF EXISTS "Authenticated update pengaturan" ON public.pengaturan;
CREATE POLICY "Authenticated update pengaturan" ON public.pengaturan
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete pengaturan" ON public.pengaturan;
DROP POLICY IF EXISTS "Authenticated delete pengaturan" ON public.pengaturan;
CREATE POLICY "Authenticated delete pengaturan" ON public.pengaturan
  FOR DELETE TO authenticated USING (true);

-- ── Storage: bucket pengumuman (read publik, tulis authenticated) ──────
DROP POLICY IF EXISTS "pengumuman insert" ON storage.objects;
CREATE POLICY "pengumuman insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pengumuman');

DROP POLICY IF EXISTS "pengumuman update" ON storage.objects;
CREATE POLICY "pengumuman update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pengumuman')
  WITH CHECK (bucket_id = 'pengumuman');

DROP POLICY IF EXISTS "pengumuman delete" ON storage.objects;
CREATE POLICY "pengumuman delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pengumuman');
