/*
  # Kunci RLS: tulis HANYA untuk bendahara, bukan "siapa pun yang login"

  ## Masalah (audit RLS 28 Sep 2026)
  Migrasi 20260609000000 menutup tulis dari `anon`, tapi menggantinya dgn
  `TO authenticated USING (true) WITH CHECK (true)` — mengandaikan
  "authenticated = bendahara". Andaian itu hanya benar selama tak ada yang
  bisa membuat akun, padahal pendaftaran Supabase Auth TERBUKA
  (`/auth/v1/settings` → `disable_signup: false`). Siapa pun bisa mendaftar
  dgn emailnya sendiri, konfirmasi, lalu:
    - INSERT/UPDATE/DELETE di 7 tabel data (termasuk transaksi_kas & kas_rt);
    - memanggil `pulihkan_backup()` → menimpa SELURUH database, karena
      penjaganya cuma `auth.uid() IS NULL`;
    - membaca seluruh audit_log, termasuk `backup_snapshot` (dump semua
      tabel, termasuk no_hp warga).
  Peran di klien juga dibaca dari `user_metadata`, yang bisa diisi sendiri
  oleh pengguna saat mendaftar. Migrasi 20260609 sudah mencatat ini sbg
  "hardening lanjutan (opsional)".

  ## Perbaikan
  1. Peran bendahara ditandai di `raw_app_meta_data` (TIDAK bisa diubah
     pengguna sendiri; hanya service_role/SQL).
  2. `privat.is_bendahara()` membaca auth.users berdasar `auth.uid()`.
     - Skema `privat` sengaja TIDAK diekspos PostgREST → tak bisa dipanggil
       lewat /rest/v1/rpc, dan tak memicu lint 0029.
     - Dibaca dari TABEL, bukan dari JWT: berlaku SEKETIKA (sesi bendahara
       yang sedang login tak perlu logout), dan pencabutan peran juga
       berlaku seketika (bukan menunggu token kedaluwarsa ~1 jam).
  3. Policy INSERT/UPDATE/DELETE di 7 tabel + SELECT audit_log (authenticated)
     diganti `(select privat.is_bendahara())` — di-ALTER per nama, eksplisit.
     `(select …)` membuat Postgres menghitungnya SEKALI per pernyataan,
     bukan per baris.
  4. `batalkan_tarikan()` & `pulihkan_backup()`: penjaga
     `auth.uid() IS NULL` → `NOT privat.is_bendahara()`. Badan fungsi
     selain itu IDENTIK dgn definisi di produksi (diambil dari
     pg_get_functiondef 28 Sep 2026).

  ## Yang SENGAJA TIDAK diubah
  - Semua policy SELECT `TO anon, authenticated USING (true)` — warga (anon)
    memang harus bisa MEMBACA.
  - "Public can read audit_log" (anon, allowlist 4 tabel) — tak disentuh.
  - Tak ada satu pun policy tulis untuk `anon` dan tak ada policy `cmd = ALL`
    (diperiksa di pg_policies). Warga = anon (App.tsx: `wargaMode &&
    !auth.user`), jadi warga tak kehilangan apa pun.
  - storage.objects (bucket `pengumuman`) — tabel milik
    supabase_storage_admin, ALTER POLICY dari SQL Editor tak dijamin
    berhasil. Bucket tak dipakai app; tangani lewat Dashboard terpisah.
  - Tak ada kolom/tabel public yang berubah → tipe TypeScript tak perlu
    diregenerasi.

  ## PRASYARAT (lakukan SEBELUM menjalankan berkas ini)
  a. Dashboard → Authentication → Sign In / Providers →
     "Allow new users to sign up" = OFF.
  b. Pastikan auth.users masih berisi TEPAT 2 akun bendahara. Bagian 1
     akan MEMBATALKAN seluruh migrasi kalau tidak (jaga-jaga ada akun asing
     yang mendaftar sambil menyetel user_metadata.role sendiri).

  ## Dampak ke pengguna
  - Bendahara (2 akun): tak berubah — semua tulis & RPC tetap jalan,
    tanpa perlu logout.
  - Warga / anon: tak berubah (memang hanya membaca).
  - Akun login LAIN: INSERT ditolak (42501), UPDATE/DELETE kena 0 baris,
    RPC melempar 'Hanya bendahara…', audit_log (authenticated) kosong.

  Satu transaksi: gagal di mana pun = tak ada yang berubah, termasuk backup.
*/

BEGIN;

-- ════════════════════════════════════════════════════════════════════════
-- 0. BACKUP — keadaan SEBELUM migrasi, di skema `cadangan` (tak diekspos
--    API, tanpa grant ke anon/authenticated). JANGAN taruh di `public`:
--    tabel baru di public tanpa RLS langsung terbaca lewat anon key.
-- ════════════════════════════════════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS cadangan;
REVOKE ALL ON SCHEMA cadangan FROM PUBLIC, anon, authenticated;

CREATE TABLE cadangan.rls_20260928_policies AS
  SELECT schemaname, tablename, policyname, cmd, roles, permissive, qual, with_check,
         now() AS dicadangkan_pada
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('warga','tarikan','absensi','talangan',
                       'transaksi_kas','kas_rt','pengaturan','audit_log');

CREATE TABLE cadangan.rls_20260928_fungsi AS
  SELECT p.proname, pg_get_functiondef(p.oid) AS definisi, now() AS dicadangkan_pada
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('batalkan_tarikan', 'pulihkan_backup');

CREATE TABLE cadangan.rls_20260928_app_meta AS
  SELECT id, raw_app_meta_data, now() AS dicadangkan_pada
    FROM auth.users;

REVOKE ALL ON ALL TABLES IN SCHEMA cadangan FROM PUBLIC, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 1. Tandai 2 bendahara di app_metadata (tanpa email di berkas: repo ini
--    ter-push ke GitHub). Penanda sumber = user_metadata.role, TAPI hanya
--    dipercaya setelah dipastikan tak ada akun lain sama sekali.
-- ════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_total     int;
  v_bendahara int;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE raw_user_meta_data ->> 'role' = 'bendahara'
                            AND email_confirmed_at IS NOT NULL)
    INTO v_total, v_bendahara
    FROM auth.users;

  IF v_total <> 2 OR v_bendahara <> 2 THEN
    RAISE EXCEPTION
      'DIBATALKAN: auth.users berisi % akun, % bendahara terkonfirmasi (harap 2 & 2). Periksa akun asing dulu.',
      v_total, v_bendahara;
  END IF;
END $$;

UPDATE auth.users
   SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                           || jsonb_build_object('role', 'bendahara')
 WHERE raw_user_meta_data ->> 'role' = 'bendahara'
   AND email_confirmed_at IS NOT NULL;

DO $$
BEGIN
  IF (SELECT count(*) FROM auth.users WHERE raw_app_meta_data ->> 'role' = 'bendahara') <> 2 THEN
    RAISE EXCEPTION 'DIBATALKAN: app_metadata.role bendahara tidak terpasang di tepat 2 akun';
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════
-- 2. privat.is_bendahara()
-- ════════════════════════════════════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS privat;
REVOKE ALL ON SCHEMA privat FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA privat TO authenticated;

CREATE OR REPLACE FUNCTION privat.is_bendahara()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER            -- authenticated tak punya akses baca auth.users
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM auth.users u
     WHERE u.id = auth.uid()
       AND u.raw_app_meta_data ->> 'role' = 'bendahara'
  );
$$;

REVOKE ALL ON FUNCTION privat.is_bendahara() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION privat.is_bendahara() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 3. ALTER POLICY — per nama, eksplisit. Nama & cmd dicocokkan dgn
--    pg_policies produksi 28 Sep 2026. Hanya policy `TO authenticated`
--    untuk tulis (+ satu SELECT audit_log). Policy anon tak disentuh.
-- ════════════════════════════════════════════════════════════════════════

-- ── warga ───────────────────────────────────────────────────────────────
ALTER POLICY "Authenticated can insert warga" ON public.warga
  WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated can update warga" ON public.warga
  USING ((SELECT privat.is_bendahara())) WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated can delete warga" ON public.warga
  USING ((SELECT privat.is_bendahara()));

-- ── tarikan ─────────────────────────────────────────────────────────────
ALTER POLICY "Authenticated can insert tarikan" ON public.tarikan
  WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated can update tarikan" ON public.tarikan
  USING ((SELECT privat.is_bendahara())) WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated can delete tarikan" ON public.tarikan
  USING ((SELECT privat.is_bendahara()));

-- ── absensi ─────────────────────────────────────────────────────────────
ALTER POLICY "Authenticated can insert absensi" ON public.absensi
  WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated can update absensi" ON public.absensi
  USING ((SELECT privat.is_bendahara())) WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated can delete absensi" ON public.absensi
  USING ((SELECT privat.is_bendahara()));

-- ── talangan ────────────────────────────────────────────────────────────
ALTER POLICY "Authenticated can insert talangan" ON public.talangan
  WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated can update talangan" ON public.talangan
  USING ((SELECT privat.is_bendahara())) WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated can delete talangan" ON public.talangan
  USING ((SELECT privat.is_bendahara()));

-- ── transaksi_kas ───────────────────────────────────────────────────────
ALTER POLICY "Authenticated can insert transaksi_kas" ON public.transaksi_kas
  WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated can update transaksi_kas" ON public.transaksi_kas
  USING ((SELECT privat.is_bendahara())) WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated can delete transaksi_kas" ON public.transaksi_kas
  USING ((SELECT privat.is_bendahara()));

-- ── kas_rt ──────────────────────────────────────────────────────────────
ALTER POLICY "Authenticated can insert kas_rt" ON public.kas_rt
  WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated can update kas_rt" ON public.kas_rt
  USING ((SELECT privat.is_bendahara())) WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated can delete kas_rt" ON public.kas_rt
  USING ((SELECT privat.is_bendahara()));

-- ── pengaturan (penamaan tanpa "can") ───────────────────────────────────
ALTER POLICY "Authenticated insert pengaturan" ON public.pengaturan
  WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated update pengaturan" ON public.pengaturan
  USING ((SELECT privat.is_bendahara())) WITH CHECK ((SELECT privat.is_bendahara()));
ALTER POLICY "Authenticated delete pengaturan" ON public.pengaturan
  USING ((SELECT privat.is_bendahara()));

-- ── audit_log: baca penuh (termasuk snapshot) hanya bendahara ──────────
ALTER POLICY "Authenticated can read audit_log" ON public.audit_log
  USING ((SELECT privat.is_bendahara()));

-- ════════════════════════════════════════════════════════════════════════
-- 4. RPC: penjaga `auth.uid() IS NULL` → `NOT privat.is_bendahara()`.
--    Selain dua baris penjaga itu, badan fungsi IDENTIK dgn produksi.
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.batalkan_tarikan(p_tarikan_id uuid, p_hapus boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tarikan   jsonb;
  v_absensi   jsonb;
  v_talangan  jsonb;
BEGIN
  -- Kunci akses: hanya bendahara (app_metadata), bukan sekadar "login".
  IF NOT privat.is_bendahara() THEN
    RAISE EXCEPTION 'Hanya bendahara yang boleh membatalkan tarikan';
  END IF;

  SELECT to_jsonb(t) INTO v_tarikan FROM tarikan t WHERE t.id = p_tarikan_id;
  IF v_tarikan IS NULL THEN
    RAISE EXCEPTION 'Tarikan tidak ditemukan';
  END IF;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'warga_id', a.warga_id,
             'nama',     w.nama,
             'status',   a.status
           ) ORDER BY w.nama), '[]'::jsonb)
    INTO v_absensi
    FROM absensi a
    JOIN warga w ON w.id = a.warga_id
   WHERE a.tarikan_id = p_tarikan_id;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'warga_id',      t.warga_id,
             'nama',          w.nama,
             'nominal',       t.nominal,
             'status_lunas',  t.status_lunas,
             'tanggal_lunas', t.tanggal_lunas
           ) ORDER BY w.nama), '[]'::jsonb)
    INTO v_talangan
    FROM talangan t
    JOIN warga w ON w.id = t.warga_id
   WHERE t.tarikan_id = p_tarikan_id;

  -- Arsip pemulihan ditulis SEBELUM menghapus — insert gagal = semua batal.
  INSERT INTO audit_log(
    table_name, record_id, action,
    actor_id, actor_email, actor_name,
    old_data, new_data
  )
  VALUES (
    'tarikan_snapshot',
    p_tarikan_id,
    'DELETE',
    auth.uid(),
    COALESCE(NULLIF(auth.jwt() ->> 'email', ''), 'sistem'),
    auth.jwt() -> 'user_metadata' ->> 'nama',
    jsonb_build_object(
      'tarikan',  v_tarikan,
      'absensi',  v_absensi,
      'talangan', v_talangan,
      'mode',     CASE WHEN p_hapus THEN 'hapus' ELSE 'batalkan' END
    ),
    NULL
  );

  DELETE FROM absensi       WHERE tarikan_id = p_tarikan_id;
  DELETE FROM talangan      WHERE tarikan_id = p_tarikan_id;
  DELETE FROM transaksi_kas WHERE tarikan_id = p_tarikan_id;

  IF p_hapus THEN
    DELETE FROM tarikan WHERE id = p_tarikan_id;
  ELSE
    UPDATE tarikan SET
      status = 'dijadwalkan',
      total_hadir = 0,
      total_terkumpul = 0
    WHERE id = p_tarikan_id;
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.pulihkan_backup(p_backup jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Urutan AMAN untuk INSERT (induk dulu). Hapus = kebalikannya (anak dulu).
  -- WAJIB sama dgn TABEL_BACKUP di src/lib/backup.ts (ada uji yang menguncinya).
  v_tables  text[] := ARRAY['warga','tarikan','absensi','talangan','transaksi_kas','kas_rt','pengaturan'];
  t         text;
  i         int;
  v_rows    jsonb;
  v_sebelum jsonb := '{}'::jsonb;
  v_hasil   jsonb := '[]'::jsonb;
  v_jumlah  int;
BEGIN
  -- Kunci akses: hanya bendahara (app_metadata) yang boleh menimpa database.
  IF NOT privat.is_bendahara() THEN
    RAISE EXCEPTION 'Hanya bendahara yang boleh memulihkan backup';
  END IF;

  IF p_backup IS NULL
     OR p_backup ->> 'app' IS DISTINCT FROM 'hadiran-rt'
     OR jsonb_typeof(p_backup -> 'tables') <> 'object' THEN
    RAISE EXCEPTION 'File bukan backup Hadiran RT yang valid';
  END IF;

  -- 1) Arsip keadaan SEBELUM ditimpa. Ditulis lebih dulu — kalau insert ini
  --    gagal, seluruh transaksi ikut batal dan tak ada data yang hilang
  --    tanpa arsip (pola sama dgn batalkan_tarikan).
  FOREACH t IN ARRAY v_tables LOOP
    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) FROM public.%I x', t
    ) INTO v_rows;
    v_sebelum := v_sebelum || jsonb_build_object(t, v_rows);
  END LOOP;

  INSERT INTO audit_log(
    table_name, record_id, action,
    actor_id, actor_email, actor_name,
    old_data, new_data
  )
  VALUES (
    'backup_snapshot',
    NULL,
    'DELETE',
    auth.uid(),
    COALESCE(NULLIF(auth.jwt() ->> 'email', ''), 'sistem'),
    auth.jwt() -> 'user_metadata' ->> 'nama',
    jsonb_build_object(
      'tables',     v_sebelum,
      'exportedAt', p_backup ->> 'exportedAt'
    ),
    NULL
  );

  -- 2) Kosongkan anak → induk (kebalikan urutan insert) agar tidak melanggar FK.
  FOR i IN REVERSE array_length(v_tables, 1)..1 LOOP
    EXECUTE format('DELETE FROM public.%I', v_tables[i]);
  END LOOP;

  -- 3) Isi ulang induk → anak. jsonb_populate_recordset mengabaikan kunci JSON
  --    yang tak punya kolom padanan, jadi backup dari skema lama tetap masuk
  --    selama kolom WAJIB-nya ada; kalau tidak, INSERT gagal → seluruh restore
  --    batal dan data lama kembali utuh. Itu memang perilaku yang diinginkan.
  FOREACH t IN ARRAY v_tables LOOP
    v_rows := COALESCE(p_backup -> 'tables' -> t, '[]'::jsonb);
    IF jsonb_typeof(v_rows) <> 'array' THEN
      RAISE EXCEPTION 'Isi tabel % pada file backup bukan daftar baris', t;
    END IF;
    v_jumlah := jsonb_array_length(v_rows);
    IF v_jumlah > 0 THEN
      EXECUTE format(
        'INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I, $1)', t, t
      ) USING v_rows;
    END IF;
    v_hasil := v_hasil || jsonb_build_object('table', t, 'count', v_jumlah);
  END LOOP;

  RETURN v_hasil;
END $function$;

-- Grant fungsi tak berubah oleh CREATE OR REPLACE; ditegaskan ulang saja.
REVOKE ALL ON FUNCTION public.batalkan_tarikan(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pulihkan_backup(jsonb)          FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.batalkan_tarikan(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pulihkan_backup(jsonb)          TO authenticated;

COMMIT;

/* ════════════════════════════════════════════════════════════════════════
   VERIFIKASI (read-only, jalankan SESUDAH commit)
   ════════════════════════════════════════════════════════════════════════

   -- a) 22 policy tulis/baca-bendahara kini memakai is_bendahara; 8 policy
   --    SELECT publik + 1 anon audit_log tetap `true`/allowlist.
   select tablename, policyname, cmd, roles, qual, with_check
     from pg_policies where schemaname = 'public' order by tablename, cmd;

   -- b) 2 akun bertanda di app_metadata.
   select count(*) from auth.users where raw_app_meta_data ->> 'role' = 'bendahara';

   -- c) Dari app sbg bendahara: tambah transaksi Kas RT uji di data lokal
   --    ATAU cukup buka Kelola Anggota → ubah lalu kembalikan satu no_rumah.
   --    Dari anon: `curl -X POST …/rest/v1/kas_rt` harus 401/42501 (tak berubah).

   ════════════════════════════════════════════════════════════════════════
   ROLLBACK (jalankan manual kalau perlu; satu transaksi)
   Mengembalikan PERSIS keadaan 28 Sep 2026 sebelum migrasi. Urutan penting:
   policy & fungsi dilepas dari privat.is_bendahara() DULU, baru fungsinya
   di-DROP.
   ════════════════════════════════════════════════════════════════════════

BEGIN;

-- R1. Policy kembali ke `true`
ALTER POLICY "Authenticated can insert warga" ON public.warga WITH CHECK (true);
ALTER POLICY "Authenticated can update warga" ON public.warga USING (true) WITH CHECK (true);
ALTER POLICY "Authenticated can delete warga" ON public.warga USING (true);

ALTER POLICY "Authenticated can insert tarikan" ON public.tarikan WITH CHECK (true);
ALTER POLICY "Authenticated can update tarikan" ON public.tarikan USING (true) WITH CHECK (true);
ALTER POLICY "Authenticated can delete tarikan" ON public.tarikan USING (true);

ALTER POLICY "Authenticated can insert absensi" ON public.absensi WITH CHECK (true);
ALTER POLICY "Authenticated can update absensi" ON public.absensi USING (true) WITH CHECK (true);
ALTER POLICY "Authenticated can delete absensi" ON public.absensi USING (true);

ALTER POLICY "Authenticated can insert talangan" ON public.talangan WITH CHECK (true);
ALTER POLICY "Authenticated can update talangan" ON public.talangan USING (true) WITH CHECK (true);
ALTER POLICY "Authenticated can delete talangan" ON public.talangan USING (true);

ALTER POLICY "Authenticated can insert transaksi_kas" ON public.transaksi_kas WITH CHECK (true);
ALTER POLICY "Authenticated can update transaksi_kas" ON public.transaksi_kas USING (true) WITH CHECK (true);
ALTER POLICY "Authenticated can delete transaksi_kas" ON public.transaksi_kas USING (true);

ALTER POLICY "Authenticated can insert kas_rt" ON public.kas_rt WITH CHECK (true);
ALTER POLICY "Authenticated can update kas_rt" ON public.kas_rt USING (true) WITH CHECK (true);
ALTER POLICY "Authenticated can delete kas_rt" ON public.kas_rt USING (true);

ALTER POLICY "Authenticated insert pengaturan" ON public.pengaturan WITH CHECK (true);
ALTER POLICY "Authenticated update pengaturan" ON public.pengaturan USING (true) WITH CHECK (true);
ALTER POLICY "Authenticated delete pengaturan" ON public.pengaturan USING (true);

ALTER POLICY "Authenticated can read audit_log" ON public.audit_log USING (true);

-- R2. Fungsi kembali ke definisi ASLI produksi 28 Sep 2026 (penjaga
--     `auth.uid() IS NULL`). Wajib sebelum R4 — DROP FUNCTION gagal selama
--     fungsi ini masih memanggil privat.is_bendahara().
CREATE OR REPLACE FUNCTION public.batalkan_tarikan(p_tarikan_id uuid, p_hapus boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tarikan   jsonb;
  v_absensi   jsonb;
  v_talangan  jsonb;
BEGIN
  -- Kunci akses: anon (warga) tidak boleh memicu penghapusan.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Hanya bendahara yang boleh membatalkan tarikan';
  END IF;

  SELECT to_jsonb(t) INTO v_tarikan FROM tarikan t WHERE t.id = p_tarikan_id;
  IF v_tarikan IS NULL THEN
    RAISE EXCEPTION 'Tarikan tidak ditemukan';
  END IF;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'warga_id', a.warga_id,
             'nama',     w.nama,
             'status',   a.status
           ) ORDER BY w.nama), '[]'::jsonb)
    INTO v_absensi
    FROM absensi a
    JOIN warga w ON w.id = a.warga_id
   WHERE a.tarikan_id = p_tarikan_id;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'warga_id',      t.warga_id,
             'nama',          w.nama,
             'nominal',       t.nominal,
             'status_lunas',  t.status_lunas,
             'tanggal_lunas', t.tanggal_lunas
           ) ORDER BY w.nama), '[]'::jsonb)
    INTO v_talangan
    FROM talangan t
    JOIN warga w ON w.id = t.warga_id
   WHERE t.tarikan_id = p_tarikan_id;

  -- Arsip pemulihan ditulis SEBELUM menghapus — insert gagal = semua batal.
  INSERT INTO audit_log(
    table_name, record_id, action,
    actor_id, actor_email, actor_name,
    old_data, new_data
  )
  VALUES (
    'tarikan_snapshot',
    p_tarikan_id,
    'DELETE',
    auth.uid(),
    COALESCE(NULLIF(auth.jwt() ->> 'email', ''), 'sistem'),
    auth.jwt() -> 'user_metadata' ->> 'nama',
    jsonb_build_object(
      'tarikan',  v_tarikan,
      'absensi',  v_absensi,
      'talangan', v_talangan,
      'mode',     CASE WHEN p_hapus THEN 'hapus' ELSE 'batalkan' END
    ),
    NULL
  );

  DELETE FROM absensi       WHERE tarikan_id = p_tarikan_id;
  DELETE FROM talangan      WHERE tarikan_id = p_tarikan_id;
  DELETE FROM transaksi_kas WHERE tarikan_id = p_tarikan_id;

  IF p_hapus THEN
    DELETE FROM tarikan WHERE id = p_tarikan_id;
  ELSE
    UPDATE tarikan SET
      status = 'dijadwalkan',
      total_hadir = 0,
      total_terkumpul = 0
    WHERE id = p_tarikan_id;
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.pulihkan_backup(p_backup jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Urutan AMAN untuk INSERT (induk dulu). Hapus = kebalikannya (anak dulu).
  -- WAJIB sama dgn TABEL_BACKUP di src/lib/backup.ts (ada uji yang menguncinya).
  v_tables  text[] := ARRAY['warga','tarikan','absensi','talangan','transaksi_kas','kas_rt','pengaturan'];
  t         text;
  i         int;
  v_rows    jsonb;
  v_sebelum jsonb := '{}'::jsonb;
  v_hasil   jsonb := '[]'::jsonb;
  v_jumlah  int;
BEGIN
  -- Kunci akses: anon (warga) tidak boleh menimpa seluruh database.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Hanya bendahara yang boleh memulihkan backup';
  END IF;

  IF p_backup IS NULL
     OR p_backup ->> 'app' IS DISTINCT FROM 'hadiran-rt'
     OR jsonb_typeof(p_backup -> 'tables') <> 'object' THEN
    RAISE EXCEPTION 'File bukan backup Hadiran RT yang valid';
  END IF;

  -- 1) Arsip keadaan SEBELUM ditimpa. Ditulis lebih dulu — kalau insert ini
  --    gagal, seluruh transaksi ikut batal dan tak ada data yang hilang
  --    tanpa arsip (pola sama dgn batalkan_tarikan).
  FOREACH t IN ARRAY v_tables LOOP
    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) FROM public.%I x', t
    ) INTO v_rows;
    v_sebelum := v_sebelum || jsonb_build_object(t, v_rows);
  END LOOP;

  INSERT INTO audit_log(
    table_name, record_id, action,
    actor_id, actor_email, actor_name,
    old_data, new_data
  )
  VALUES (
    'backup_snapshot',
    NULL,
    'DELETE',
    auth.uid(),
    COALESCE(NULLIF(auth.jwt() ->> 'email', ''), 'sistem'),
    auth.jwt() -> 'user_metadata' ->> 'nama',
    jsonb_build_object(
      'tables',     v_sebelum,
      'exportedAt', p_backup ->> 'exportedAt'
    ),
    NULL
  );

  -- 2) Kosongkan anak → induk (kebalikan urutan insert) agar tidak melanggar FK.
  FOR i IN REVERSE array_length(v_tables, 1)..1 LOOP
    EXECUTE format('DELETE FROM public.%I', v_tables[i]);
  END LOOP;

  -- 3) Isi ulang induk → anak. jsonb_populate_recordset mengabaikan kunci JSON
  --    yang tak punya kolom padanan, jadi backup dari skema lama tetap masuk
  --    selama kolom WAJIB-nya ada; kalau tidak, INSERT gagal → seluruh restore
  --    batal dan data lama kembali utuh. Itu memang perilaku yang diinginkan.
  FOREACH t IN ARRAY v_tables LOOP
    v_rows := COALESCE(p_backup -> 'tables' -> t, '[]'::jsonb);
    IF jsonb_typeof(v_rows) <> 'array' THEN
      RAISE EXCEPTION 'Isi tabel % pada file backup bukan daftar baris', t;
    END IF;
    v_jumlah := jsonb_array_length(v_rows);
    IF v_jumlah > 0 THEN
      EXECUTE format(
        'INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I, $1)', t, t
      ) USING v_rows;
    END IF;
    v_hasil := v_hasil || jsonb_build_object('table', t, 'count', v_jumlah);
  END LOOP;

  RETURN v_hasil;
END $function$;

-- R3. app_metadata kembali persis seperti sebelum migrasi
UPDATE auth.users u
   SET raw_app_meta_data = c.raw_app_meta_data
  FROM cadangan.rls_20260928_app_meta c
 WHERE c.id = u.id;

-- R4. Lepas fungsi & skema privat
DROP FUNCTION privat.is_bendahara();
DROP SCHEMA privat;

COMMIT;

-- R5. (opsional, sesudah yakin) buang cadangan
-- DROP SCHEMA cadangan CASCADE;
*/
