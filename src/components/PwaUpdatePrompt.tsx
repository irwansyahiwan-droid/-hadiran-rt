import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

/**
 * Mendaftarkan service worker & menampilkan toast saat ada versi baru.
 * Pola standar: SW baru menunggu (waiting) → user tekan "Muat ulang" →
 * postMessage SKIP_WAITING → controllerchange → reload.
 */
export default function PwaUpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

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
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(nw);
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

  if (!waiting) return null;

  return (
    <div
      className="fixed inset-x-4 mx-auto z-banner w-auto max-w-sm rise"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-brand text-white float">
        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-200" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">Versi baru tersedia</p>
          <p className="text-micro text-white/85">Muat ulang untuk pakai versi terbaru.</p>
        </div>
        <button
          onClick={() => waiting.postMessage('SKIP_WAITING')}
          className="press shrink-0 inline-flex items-center gap-1.5 bg-white text-brand text-xs font-bold px-3 py-2 rounded-xl"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Muat ulang
        </button>
      </div>
    </div>
  );
}
