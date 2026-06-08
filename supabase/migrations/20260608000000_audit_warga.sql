/*
  # Audit Log untuk tabel `warga`

  Menambah tabel `warga` ke cakupan audit (lihat 20260605000000_audit_log.sql)
  supaya penambahan / perubahan anggota ikut tercatat di Riwayat Aktivitas:
  siapa menambah/menonaktifkan anggota, kapan, dan dari apa jadi apa.

  Memakai ulang fungsi public.fn_audit_log() yang sudah ada.
  Idempotent — aman dijalankan berulang.
*/

DO $$
BEGIN
  IF to_regclass('public.warga') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_audit_warga ON public.warga;
    CREATE TRIGGER trg_audit_warga
      AFTER INSERT OR UPDATE OR DELETE ON public.warga
      FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
  END IF;
END $$;
