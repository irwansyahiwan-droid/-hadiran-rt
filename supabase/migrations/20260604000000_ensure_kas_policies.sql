/*
  # Pastikan policy kas_rt & transaksi_kas lengkap (SELECT/INSERT/UPDATE/DELETE)

  Gejala bila policy hilang:
    - Tombol "Setor Kas RT" & "Tambah" (Kas RT) tampak gagal / tak menyimpan.
    - Edit/Hapus kas_rt no-op (0 baris) tanpa error.

  Idempotent — aman dijalankan berulang. Jalankan di Supabase SQL Editor
  atau via `supabase db push`.
*/

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['kas_rt', 'transaksi_kas'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%1$I ENABLE ROW LEVEL SECURITY', t);

      EXECUTE format('DROP POLICY IF EXISTS "Public can read %1$s" ON public.%1$I', t);
      EXECUTE format('CREATE POLICY "Public can read %1$s" ON public.%1$I FOR SELECT TO anon, authenticated USING (true)', t);

      EXECUTE format('DROP POLICY IF EXISTS "Public can insert %1$s" ON public.%1$I', t);
      EXECUTE format('CREATE POLICY "Public can insert %1$s" ON public.%1$I FOR INSERT TO anon, authenticated WITH CHECK (true)', t);

      EXECUTE format('DROP POLICY IF EXISTS "Public can update %1$s" ON public.%1$I', t);
      EXECUTE format('CREATE POLICY "Public can update %1$s" ON public.%1$I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', t);

      EXECUTE format('DROP POLICY IF EXISTS "Public can delete %1$s" ON public.%1$I', t);
      EXECUTE format('CREATE POLICY "Public can delete %1$s" ON public.%1$I FOR DELETE TO anon, authenticated USING (true)', t);
    END IF;
  END LOOP;
END $$;
