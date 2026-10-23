import { useEffect } from 'react';
import { tandaiVersiBaru } from '../lib/versiBaru';

/**
 * Mendaftarkan service worker & mengabarkan versi baru ke strip Header
 * (`lib/versiBaru.ts`). Pola standar: SW baru menunggu (waiting) → warga tekan
 * "Muat ulang" di strip → postMessage SKIP_WAITING → controllerchange → reload.
 * Tak merender apa pun sendiri lagi — lihat alasannya di `versiBaru.ts`.
 */
export default function PwaUpdatePrompt() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Apakah halaman ini SUDAH dikontrol SW saat mount? Kalau BELUM (kunjungan
    // perdana / cache terhapus / anggota baru), `controllerchange` pertama =
    // klaim awal SW (self.clients.claim di sw.js) — BUKAN update. Dulu reload di
    // sini menendang warga yg baru ketik 'warga' balik ke Login (mental ketik 2×
    // beruntun). Gate warga per-sesi tetap utuh; ini cuma membuang reload kaget
    // pada klaim pertama.
    const hadController = !!navigator.serviceWorker.controller;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) tandaiVersiBaru(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              tandaiVersiBaru(nw);
            }
          });
        });
      })
      .catch(() => {});

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Hanya reload utk update SUNGGUHAN (SW lama→baru via "Muat ulang"), yaitu
      // saat halaman memang sudah dikontrol sebelumnya. Klaim pertama dilewati.
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  return null;
}
