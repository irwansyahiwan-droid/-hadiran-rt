import { useEffect, useState } from 'react';

/**
 * Status jaringan browser, reaktif.
 *
 * `navigator.onLine` saja tidak cukup: nilainya hanya dibaca sekali saat render.
 * Hook ini mendengarkan event online/offline supaya UI ikut berubah saat sinyal
 * hilang di tengah pemakaian — bukan hanya saat halaman dibuka.
 *
 * Catatan jujur soal maknanya: `false` berarti perangkat PASTI tak terhubung.
 * `true` TIDAK menjamin internet hidup (bisa saja tersambung WiFi tanpa jalan
 * keluar). Jadi ini dipakai untuk memberi tahu keadaan yang pasti saja; kegagalan
 * muat tetap ditangani terpisah lewat ErrorState/toast per halaman.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const naik = () => setOnline(true);
    const turun = () => setOnline(false);
    window.addEventListener('online', naik);
    window.addEventListener('offline', turun);
    return () => {
      window.removeEventListener('online', naik);
      window.removeEventListener('offline', turun);
    };
  }, []);
  return online;
}
