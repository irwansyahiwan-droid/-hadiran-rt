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
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  if (!waiting) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-banner w-[calc(100%-2rem)] max-w-sm rise"
      style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-brand text-white float">
        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-200" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">Versi baru tersedia</p>
          <p className="text-micro text-white/70">Muat ulang untuk pakai versi terbaru.</p>
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
