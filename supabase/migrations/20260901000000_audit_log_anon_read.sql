/*
  # Riwayat Aktivitas — dibuka utk warga (aktivitas KAS saja)

  Bendahara ada 2 orang; audit_log sudah mencatat SIAPA (actor_name/
  actor_email) mengubah apa, sejak 20260605000000_audit_log.sql. Yang belum
  ada: warga sama sekali tak bisa membacanya — RLS lama hanya `TO
  authenticated`, jadi anon (mode warga) selalu dapat nol baris.

  Dibuka utk `anon` TAPI DIBATASI ke 4 kategori yang sudah jadi filter chip
  di UI Riwayat Aktivitas (transaksi_kas, kas_rt, tarikan, talangan) —
  ALLOWLIST, bukan denylist, supaya kategori baru yang belum dipikirkan
  nanti defaultnya TERTUTUP dari warga, bukan kebobolan diam-diam.

  Yang SENGAJA tetap tertutup dari warga (tetap kelihatan penuh utk bendahara
  lewat policy `authenticated` lama, tidak disentuh migrasi ini):
    - table_name = 'warga'            → diff-nya mencakup no_hp; bukan yang
      diminta ("siapa mengubah KAS"), dan cuma bikin berisik di feed aktivitas
      kas kalau ikut campur.
    - table_name IN ('tarikan_snapshot','backup_snapshot') → arsip pemulihan
      internal bendahara (ditulis batalkan_tarikan()/pulihkan_backup()),
      isinya DUMP MENTAH — backup_snapshot bahkan bisa memuat SELURUH tabel
      warga sekaligus. Bukan "aktivitas" dlm arti yg diminta, tetap
      bendahara-only.

  Idempotent — aman dijalankan berulang.
*/

DROP POLICY IF EXISTS "Public can read audit_log" ON public.audit_log;
CREATE POLICY "Public can read audit_log"
  ON public.audit_log
  FOR SELECT
  TO anon
  USING (table_name IN ('transaksi_kas', 'kas_rt', 'tarikan', 'talangan'));
