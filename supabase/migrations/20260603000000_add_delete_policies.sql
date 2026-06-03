/*
  # Tambah policy DELETE yang hilang

  RLS aktif di semua tabel, tapi hanya `absensi` yang punya policy DELETE.
  Akibatnya DELETE pada talangan/transaksi_kas/tarikan/dll diblokir DIAM-DIAM
  (0 baris terhapus, tanpa error). Gejala:
    - Talangan DOBEL saat "Hitung Ulang" (delete lama gagal, insert baru menumpuk).
    - Data talangan & transaksi kas NYANGKUT saat "Batalkan" / "Hapus".

  Policy permisif (mengikuti pola policy lain di aplikasi ini yang memang terbuka —
  kontrol akses dilakukan di sisi klien). Hanya untuk tabel yang benar-benar ada.
*/

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['tarikan', 'talangan', 'transaksi_kas', 'warga', 'kas_rt', 'jadwal'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Public can delete %1$s" ON public.%1$I', t);
      EXECUTE format(
        'CREATE POLICY "Public can delete %1$s" ON public.%1$I FOR DELETE TO anon, authenticated USING (true)',
        t
      );
    END IF;
  END LOOP;
END $$;
