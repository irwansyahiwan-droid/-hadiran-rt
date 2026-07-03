/*
  # Beres-beres advisor Supabase (3 Jul 2026)

  1. Indeks foreign key yang belum ada — hampir semua query app mencari lewat
     kolom-kolom ini (.eq('tarikan_id', …) di absensi/talangan/kas, join warga,
     dan RPC batalkan_tarikan). Data masih kecil tapi warga terus bertambah.
     (absensi.tarikan_id tidak perlu: sudah tercakup unique constraint yang
     berawalan tarikan_id.)

  2. Cabut EXECUTE fn_audit_log() dari role API — fungsi trigger tidak untuk
     dipanggil via REST. Trigger tetap jalan (pengecekan EXECUTE terjadi saat
     CREATE TRIGGER, bukan saat firing).

  Idempotent — aman dijalankan berulang.
*/

CREATE INDEX IF NOT EXISTS idx_talangan_tarikan_id      ON public.talangan (tarikan_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_kas_tarikan_id ON public.transaksi_kas (tarikan_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_kas_warga_id   ON public.transaksi_kas (warga_id);
CREATE INDEX IF NOT EXISTS idx_kas_rt_tarikan_id        ON public.kas_rt (tarikan_id);
CREATE INDEX IF NOT EXISTS idx_tarikan_sohibul_bait_id  ON public.tarikan (sohibul_bait_id);

REVOKE EXECUTE ON FUNCTION public.fn_audit_log() FROM PUBLIC, anon, authenticated;
