/*
  # Tabel pengaturan (key-value)

  Menyimpan setelan ringan yang dilihat semua orang, mis. target Kas RT
  (key = 'target_kas_rt'). value berupa JSONB agar fleksibel.

  RLS permisif mengikuti pola tabel lain di app ini (kontrol akses di klien;
  editor target hanya tampil untuk bendahara). Idempotent.
*/

CREATE TABLE IF NOT EXISTS public.pengaturan (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pengaturan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read pengaturan" ON public.pengaturan;
CREATE POLICY "Public read pengaturan" ON public.pengaturan
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public insert pengaturan" ON public.pengaturan;
CREATE POLICY "Public insert pengaturan" ON public.pengaturan
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public update pengaturan" ON public.pengaturan;
CREATE POLICY "Public update pengaturan" ON public.pengaturan
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete pengaturan" ON public.pengaturan;
CREATE POLICY "Public delete pengaturan" ON public.pengaturan
  FOR DELETE TO anon, authenticated USING (true);
