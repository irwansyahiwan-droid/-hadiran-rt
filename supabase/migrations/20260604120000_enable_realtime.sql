-- Aktifkan Supabase Realtime untuk tabel inti (idempoten).
-- Setelah ini, perubahan INSERT/UPDATE/DELETE disiarkan ke klien yang
-- berlangganan via channel postgres_changes (lihat src/hooks/useRealtime.ts).

do $$
declare
  t text;
  tbls text[] := array['kas_rt', 'transaksi_kas', 'tarikan', 'absensi', 'talangan'];
begin
  -- Pastikan publication ada (di proyek Supabase biasanya sudah ada).
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array tbls loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = t
       )
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;

    -- REPLICA IDENTITY FULL agar payload UPDATE/DELETE membawa data lama
    -- (berguna bila nanti perlu membedakan baris; tidak wajib untuk reload).
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I replica identity full', t);
    end if;
  end loop;
end $$;
