import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Berlangganan perubahan realtime Supabase pada `tables` dan memanggil
 * `onChange` (di-debounce) saat ada INSERT/UPDATE/DELETE.
 *
 * Aman dipasang walau Realtime belum diaktifkan di tabel — channel tetap
 * SUBSCRIBED tanpa event (lihat migration publication supabase_realtime).
 * JANGAN pakai di layar yang punya state edit lokal belum tersimpan
 * (mis. editor absensi), karena reload bisa menimpa perubahan.
 */
export function useRealtime(tables: string[], onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = tables.join(',');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cb.current(), 350); // coalesce burst (mis. bulk insert)
    };

    const channel = supabase.channel(`rt:${key}`);
    // Turunkan daftar tabel dari `key` (string stabil) → deps effect lengkap & benar.
    const tbls = key ? key.split(',') : [];
    tbls.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, fire);
    });
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [key]);
}
