/*
  # Storage bucket: pengumuman (foto/video banner)

  Media banner pengumuman disimpan di Supabase Storage (bukan di tabel DB);
  hanya URL-nya yang ditaruh di pengaturan.value (key 'pengumuman').

  Bucket publik (read), izin tulis permisif mengikuti pola app ini
  (kontrol akses di klien: editor hanya untuk bendahara). Idempotent.
*/

-- Bucket publik
INSERT INTO storage.buckets (id, name, public)
VALUES ('pengumuman', 'pengumuman', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies pada storage.objects khusus bucket ini
DROP POLICY IF EXISTS "pengumuman read"   ON storage.objects;
CREATE POLICY "pengumuman read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'pengumuman');

DROP POLICY IF EXISTS "pengumuman insert" ON storage.objects;
CREATE POLICY "pengumuman insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'pengumuman');

DROP POLICY IF EXISTS "pengumuman update" ON storage.objects;
CREATE POLICY "pengumuman update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'pengumuman')
  WITH CHECK (bucket_id = 'pengumuman');

DROP POLICY IF EXISTS "pengumuman delete" ON storage.objects;
CREATE POLICY "pengumuman delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'pengumuman');
