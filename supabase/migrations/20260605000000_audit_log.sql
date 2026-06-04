/*
  # Riwayat Aktivitas (Audit Log)

  Mencatat SETIAP perubahan data keuangan secara otomatis di level database
  (trigger), bukan di sisi klien — sehingga tidak bisa "lupa dicatat" dan tidak
  bisa diakali lewat tombol mana pun. Untuk app yang memegang uang RT, ini
  pondasi kepercayaan: siapa mengubah apa, kapan, dari berapa jadi berapa.

  Cakupan (anti-noise — hanya peristiwa uang yang bermakna):
    - transaksi_kas : INSERT / UPDATE / DELETE
    - kas_rt        : INSERT / UPDATE / DELETE
    - tarikan       : INSERT / UPDATE / DELETE
    - talangan      : HANYA saat status_lunas berubah (abaikan churn hitung-ulang)
    - absensi       : TIDAK dicatat (terlalu ramai, sudah terlihat di tempat lain)

  Aktor diambil dari JWT bendahara yang login (auth.jwt()). Warga mode memakai
  kunci anon (tanpa sesi) sehingga tercatat sebagai 'sistem' bila sampai memicu.

  Log bersifat IMMUTABLE: RLS aktif, hanya ada policy SELECT (authenticated).
  Tidak ada policy INSERT/UPDATE/DELETE — penulisan hanya lewat trigger
  SECURITY DEFINER, dan tidak ada yang bisa mengubah/menghapus baris lewat API.

  Idempotent — aman dijalankan berulang (supabase db push / SQL Editor).
*/

-- 1) Tabel audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text NOT NULL,
  record_id   uuid,
  action      text NOT NULL,                  -- INSERT | UPDATE | DELETE
  actor_id    uuid,
  actor_email text,
  actor_name  text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table      ON public.audit_log (table_name);

-- 2) Fungsi trigger generic
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_record_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_old := to_jsonb(OLD); v_new := NULL;
  ELSIF (TG_OP = 'INSERT') THEN
    v_old := NULL; v_new := to_jsonb(NEW);
  ELSE
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
  END IF;

  v_record_id := COALESCE(v_new->>'id', v_old->>'id')::uuid;

  INSERT INTO public.audit_log(
    table_name, record_id, action,
    actor_id, actor_email, actor_name,
    old_data, new_data
  )
  VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    auth.uid(),
    COALESCE(NULLIF(auth.jwt() ->> 'email', ''), 'sistem'),
    auth.jwt() -> 'user_metadata' ->> 'nama',
    v_old,
    v_new
  );

  RETURN COALESCE(NEW, OLD);
END $$;

-- 3) Pasang trigger (drop dulu agar idempotent)
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['transaksi_kas', 'kas_rt', 'tarikan'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%1$s
           AFTER INSERT OR UPDATE OR DELETE ON public.%1$I
           FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log()',
        t
      );
    END IF;
  END LOOP;

  -- talangan: hanya saat status_lunas berubah (hindari churn hitung-ulang)
  IF to_regclass('public.talangan') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_audit_talangan ON public.talangan;
    CREATE TRIGGER trg_audit_talangan
      AFTER UPDATE ON public.talangan
      FOR EACH ROW
      WHEN (OLD.status_lunas IS DISTINCT FROM NEW.status_lunas)
      EXECUTE FUNCTION public.fn_audit_log();
  END IF;
END $$;

-- 4) RLS: log hanya bisa DIBACA (authenticated), tidak bisa diubah/dihapus.
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read audit_log" ON public.audit_log;
CREATE POLICY "Authenticated can read audit_log"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (true);

-- 5) Siarkan via Realtime agar riwayat tampil live (opsional tapi konsisten).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'audit_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
  END IF;
END $$;
