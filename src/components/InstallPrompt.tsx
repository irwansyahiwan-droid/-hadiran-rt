import { useEffect, useState } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import logoRt from '../assets/logo-rt.jpg';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'hadiran-install-dismissed';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [hidden, setHidden] = useState(true);

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);
  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    if (isStandalone || localStorage.getItem(DISMISS_KEY) === '1') return;

    if (isIos) {
      setHidden(false); // iPhone tak punya beforeinstallprompt → tampilkan panduan
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [isStandalone, isIos]);

  const dismiss = () => {
    setHidden(true);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setHidden(true);
  };

  if (hidden || isStandalone) return null;

  const steps = [
    { icon: Share, text: 'Ketuk ikon Bagikan di bar Safari' },
    { icon: Plus, text: 'Pilih "Tambahkan ke Layar Utama"' },
    { icon: Download, text: 'Ketuk "Tambah" di kanan atas' },
  ];

  return (
    <>
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[55] w-[calc(100%-2rem)] max-w-sm rise"
        style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
      >
        <div
          className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md ring-1 ring-gray-100 dark:ring-gray-800"
          style={{ boxShadow: 'var(--shadow-float)' }}
        >
          <img src={logoRt} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">Pasang Hadiran RT</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Akses cepat dari layar utama HP</p>
          </div>
          <button
            onClick={isIos ? () => setShowGuide(true) : install}
            className="press shrink-0 inline-flex items-center gap-1.5 bg-brand text-white text-xs font-bold px-3 py-2 rounded-xl"
          >
            <Download className="w-3.5 h-3.5" />
            Pasang
          </button>
          <button onClick={dismiss} aria-label="Tutup" className="p-1 -mr-1 text-gray-400 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showGuide && (
        <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setShowGuide(false)}>
          <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-4">
              <img src={logoRt} alt="" className="w-11 h-11 rounded-2xl object-cover" />
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Pasang di iPhone</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Wajib pakai browser <b>Safari</b></p>
              </div>
            </div>
            <ol className="space-y-3">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{s.text}</span>
                    <Icon className="w-4 h-4 text-brand dark:text-emerald-400 shrink-0" />
                  </li>
                );
              })}
            </ol>
            <button
              onClick={() => setShowGuide(false)}
              className="press w-full mt-5 py-3 rounded-xl bg-brand text-white font-bold text-sm"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
