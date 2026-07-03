/*
  # Pengaman Batalkan/Hapus Tarikan — snapshot pemulihan + atomik

  Latar (insiden 20 Jun 2026): "Batalkan Hasil Tarikan" menghapus absensi,
  talangan, & kas masuk secara permanen. Audit log sengaja TIDAK meliput
  absensi (anti-noise) dan talangan hanya saat status_lunas berubah — jadi
  begitu tarikan dibatalkan, satu-satunya sumber pemulihan adalah KERTAS
  daftar hadir. Selain itu klien menjalankan 4 delete TERPISAH: koneksi putus
  di tengah = data setengah terhapus.

  Solusi: satu fungsi RPC `batalkan_tarikan(p_tarikan_id, p_hapus)`:
    1. Mengarsipkan SNAPSHOT lengkap (baris tarikan + seluruh absensi +
       seluruh talangan, dengan nama warga) ke audit_log sebagai satu entri
       `tarikan_snapshot` — immutable, tak bisa dihapus lewat API.
    2. Baru menghapus data turunan + kembalikan/hapus tarikan — SATU transaksi
       (fungsi plpgsql = atomik): gagal di tengah berarti batal semua.

  p_hapus=false → batalkan hasil (tarikan kembali 'dijadwalkan').
  p_hapus=true  → hapus tarikan sepenuhnya.

  SECURITY DEFINER melewati RLS, maka WAJIB dikunci: hanya pemanggil
  terautentikasi (model akses saat ini: authenticated = bendahara, selaras
  migrasi 20260609 harden_rls_write_policies; warga memakai anon key).

  Idempotent — aman dijalankan berulang.
*/

CREATE OR REPLACE FUNCTION public.batalkan_tarikan(
  p_tarikan_id uuid,
  p_hapus boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Snapshot absensi + talangan lengkap dgn nama warga (agar pemulihan tak
  -- bergantung pada id yang mungkin sudah berubah).
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

  -- Arsip pemulihan: satu entri immutable di audit_log. Ditulis SEBELUM
  -- menghapus — kalau insert ini gagal, seluruh transaksi ikut batal dan
  -- tidak ada data yang hilang tanpa arsip.
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
END $$;

-- Hanya pengguna login (bendahara) yang boleh memanggil.
REVOKE ALL ON FUNCTION public.batalkan_tarikan(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.batalkan_tarikan(uuid, boolean) TO authenticated;
