/*
  # Restore backup jadi ATOMIK + arsip pemulihan sebelum ditimpa

  ## Masalah
  `restoreBackup()` di klien menjalankan 7 DELETE lalu 7 INSERT sebagai request
  TERPISAH (src/lib/backup.ts). Tidak ada transaksi yang membungkusnya, jadi
  koneksi putus di tengah — hal biasa buat warga/bendahara dgn sinyal seadanya —
  meninggalkan database dalam keadaan: **data lama sudah terhapus, data backup
  baru masuk separuh.** Yang paling buruk: restore justru satu-satunya jalan
  pulih saat ada insiden, jadi ia gagal tepat di saat paling dibutuhkan.

  Ini pengulangan persis insiden 20 Jun 2026 pada "Batalkan Tarikan" (lihat
  20260703000000_batal_tarikan_snapshot.sql) — dan obatnya pun sama.

  ## Solusi
  Satu fungsi RPC `pulihkan_backup(p_backup jsonb)`:
    1. Mengarsipkan SNAPSHOT keadaan SEBELUM restore (seluruh 7 tabel) ke
       audit_log sebagai satu entri `backup_snapshot` — immutable, tak bisa
       dihapus lewat API. Atomik saja tidak cukup: kalau bendahara memulihkan
       file yang SALAH, transaksi tetap sukses dan data lama tetap hilang.
       Entri ini yang menyelamatkannya.
    2. Baru mengosongkan (anak → induk) dan mengisi ulang (induk → anak).
  Badan plpgsql = SATU transaksi: gagal di baris mana pun berarti batal semua,
  dan data lama utuh seperti tak pernah disentuh.

  ## Catatan yang sengaja TIDAK diubah di sini
  Trigger audit per-baris (warga/tarikan/transaksi_kas/kas_rt) tetap menyala
  selama restore, jadi Riwayat Aktivitas akan ramai setelah pemulihan. Itu
  perilaku yang SUDAH ada hari ini (jalur klien memicu trigger yang sama
  persis) — mematikannya butuh manipulasi trigger di dalam SECURITY DEFINER,
  yaitu memperluas blast radius perbaikan keamanan data. Dipisah sengaja.

  SECURITY DEFINER melewati RLS, maka WAJIB dikunci: hanya pemanggil
  terautentikasi (model akses saat ini: authenticated = bendahara, selaras
  migrasi 20260609 harden_rls_write_policies; warga memakai anon key).

  Idempotent — aman dijalankan berulang.
*/

CREATE OR REPLACE FUNCTION public.pulihkan_backup(p_backup jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
END $$;

-- Hanya pengguna login (bendahara) yang boleh memanggil.
REVOKE ALL ON FUNCTION public.pulihkan_backup(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pulihkan_backup(jsonb) TO authenticated;
