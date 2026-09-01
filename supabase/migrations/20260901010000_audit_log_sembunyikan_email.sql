/*
  # audit_log — warga melihat NAMA, bukan email pengurus

  Lanjutan 20260901000000_audit_log_anon_read.sql. Migrasi itu membuka 4
  kategori kas untuk `anon` supaya warga bisa melihat siapa yang mengubah data
  kas — transparansi, dan itu memang tujuannya. Yang belum terlihat waktu itu:
  RLS memilih BARIS, tidak memilih KOLOM. Jadi `actor_email` ikut terbawa, dan
  diverifikasi 1 Sep 2026 lewat request anon biasa (kunci anon memang publik —
  ia ada di dalam bundel klien, jadi siapa pun bisa menyusun kuerinya sendiri):

      actor_email   irwansyah.iwan@gmail.com     ← email PENUH
      actor_id      9874fcdf-…                   ← UUID auth
      actor_name    NULL

  Garis ini bukan garis baru. Migrasi sebelumnya sudah mengecualikan tabel
  `warga` dgn alasan "diff-nya mencakup no_hp"; email sekelas dgn no_hp. Ia
  cuma lolos karena duduk di kolom `audit_log` SENDIRI, bukan di dalam diff.
  Diperiksa juga: `new_data` untuk keempat kategori berisi UUID, nominal,
  tanggal, keterangan — tak ada nama/no_hp/email. Jadi kolom aktor inilah
  satu-satunya kebocoran.

  ── URUTAN — WAJIB, jangan dijalankan lebih dulu ────────────────────────────
  Migrasi ini WAJIB dijalankan SESUDAH klien yang menyebut kolom satu-satu
  ter-DEPLOY (`fetchAktivitas` di src/lib/aktivitas.ts). Dgn izin per-kolom
  terpasang, `select=*` melebar ke kolom yang ditolak dan SELURUH Riwayat
  warga gagal muat — bukan sebagian, semuanya.

  Backfill & pencabutan sengaja disatukan dalam SATU transaksi supaya tak
  pernah ada momen di mana email sudah dicabut sementara `actor_name` masih
  kosong: di celah itu `namaAktor()` jatuh ke "Sistem" dan 173 aksi nyata
  kehilangan pemiliknya — justru transparansi yang baru saja dipasang.

  Idempotent — aman dijalankan berulang.
*/

BEGIN;

-- ── 1. Baris LAMA: isi actor_name yang kosong ───────────────────────────────
-- Terhitung 1 Sep 2026: 3 aktor di 618 baris terbaca anon —
--   421  mohammadaryanto14@gmail.com  actor_name 'M. Aryanto'  (sudah terisi)
--   173  irwansyah.iwan@gmail.com     actor_name NULL          (diisi di sini)
--    24  'sistem'                     actor_name NULL          (BENAR — biarkan;
--        `namaAktor` memang memetakannya ke "Sistem")
UPDATE public.audit_log
   SET actor_name = 'Irwansyah'
 WHERE actor_name IS NULL
   AND actor_email = 'irwansyah.iwan@gmail.com';

-- Jaring pengaman: aktor lain yang mungkin hanya muncul di baris yang TIDAK
-- terbaca anon (tabel `warga`, snapshot) — tanpa ini mereka diam-diam jadi
-- "Sistem" di layar bendahara. Bagian depan email, huruf awal dibesarkan.
UPDATE public.audit_log
   SET actor_name = initcap(split_part(actor_email, '@', 1))
 WHERE actor_name IS NULL
   AND actor_email IS NOT NULL
   AND actor_email <> 'sistem';

-- ── 2. Baris BARU: trigger sudah benar, metadatanya yang kosong ─────────────
-- Trigger 20260605000000 mengisi actor_name dari
-- `auth.jwt() -> 'user_metadata' ->> 'nama'`. Akun M. Aryanto punya kunci itu,
-- akun ini belum — itu sebabnya 173 barisnya kosong. Diisi supaya aksi ke
-- depan bernama tanpa perlu backfill lagi.
UPDATE auth.users
   SET raw_user_meta_data =
       COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('nama', 'Irwansyah')
 WHERE email = 'irwansyah.iwan@gmail.com'
   AND COALESCE(raw_user_meta_data ->> 'nama', '') = '';

-- ── 3. Cabut kolom aktor yang sensitif dari `anon` ──────────────────────────
-- Ditegakkan POSTGRES, bukan klien: kunci anon yang publik tak menolong, dan
-- menyempitkan `.select()` di klien saja cuma sopan santun, bukan pagar.
-- Peran `authenticated` (bendahara) TIDAK disentuh — ia punya grant sendiri
-- dan tetap melihat seluruh kolom.
REVOKE SELECT ON public.audit_log FROM anon;
GRANT  SELECT (id, table_name, record_id, action,
               actor_name, old_data, new_data, created_at)
    ON public.audit_log TO anon;

COMMIT;

/*
  ── Verifikasi (jalankan terpisah, bukan bagian migrasi) ────────────────────

  -- a. Tak ada lagi actor_name kosong selain 'sistem'
  SELECT actor_email, count(*) FROM public.audit_log
   WHERE actor_name IS NULL GROUP BY 1;
  -- harapan: hanya baris ber-actor_email 'sistem'

  -- b. Dari SISI ANON — email harus DITOLAK, nama harus TERBACA:
  --    curl "$URL/rest/v1/audit_log?select=actor_email&limit=1" -H "apikey: $ANON"
  --      → 42501 permission denied for column actor_email
  --    curl "$URL/rest/v1/audit_log?select=actor_name&limit=1" -H "apikey: $ANON"
  --      → [{"actor_name":"M. Aryanto"}]

  Membalikkan (kalau perlu): GRANT SELECT ON public.audit_log TO anon;
*/
