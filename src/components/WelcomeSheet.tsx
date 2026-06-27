import { useState } from 'react';
import { Wallet, CalendarDays, ArrowLeftRight, Eye, ArrowRight } from 'lucide-react';
import { haptic } from '../lib/utils';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import logoRt from '../assets/logo-rt.svg';

// Sekali tampil per perangkat. Naikkan versi (v2…) bila isi sambutan berubah
// signifikan & ingin ditampilkan ulang ke semua warga.
const KEY = 'hadiran-welcome-v2';

const ITEMS = [
  { icon: Wallet,         title: 'Saldo kas',        desc: 'Lihat saldo Kas Hadiran & total yang terkumpul.' },
  { icon: CalendarDays,   title: 'Jadwal tarikan',   desc: 'Siapa Sohibul Bait (penerima) & kapan tarikannya.' },
  { icon: ArrowLeftRight, title: 'Status talangan',  desc: 'Talangan = dana talang untuk yang tidak hadir. Cek siapa yang belum lunas.' },
];

/**
 * Sambutan orientasi sekali-lihat untuk warga baru. Disimpan di localStorage
 * agar tak muncul lagi. Di-mount di shell (App), jadi hanya tampil setelah
 * masuk (warga/bendahara), bukan di layar login.
 */
export default function WelcomeSheet() {
  const [show, setShow] = useState(() => {
    try { return localStorage.getItem(KEY) !== '1'; } catch { return false; }
  });

  function dismiss() {
    haptic(12);
    try { localStorage.setItem(KEY, '1'); } catch { /* abaikan (storage diblokir) */ }
    setShow(false);
  }

  useBackDismiss(show, dismiss);
  const dlg = useDialog(show, { onClose: dismiss, label: 'Selamat datang di Hadiran RT' });

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-end" onClick={dismiss}>
      <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={dlg.panelRef}
        {...dlg.panelProps}
        className="sheet-panel relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-6 float"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
        <img src={logoRt} alt="" className="w-14 h-14 rounded-2xl object-contain mx-auto mb-3 ring-1 ring-black/5 dark:ring-white/10" />
        <h2 className="text-xl font-bold text-ink dark:text-gray-100 text-center">Selamat datang</h2>
        <p className="text-caption text-ink-sub dark:text-gray-400 text-center mt-1 mb-5">
          Aplikasi Kas &amp; Hadiran RT 004/006. Di sini Bapak-Bapak / Warga bisa:
        </p>

        <div className="space-y-3 mb-4">
          {ITEMS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-body font-semibold text-ink dark:text-gray-100 leading-tight">{title}</p>
                <p className="text-caption text-ink-sub dark:text-gray-400 leading-relaxed mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2.5 mb-5 rounded-xl bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5">
          <Eye className="w-4 h-4 text-ink-faint dark:text-gray-400 shrink-0" />
          <p className="text-caption text-ink-sub dark:text-gray-400 leading-snug">
            Ketuk ikon mata di kartu saldo untuk menyembunyikan nominal.
          </p>
        </div>

        <button
          onClick={dismiss}
          className="btn-brand w-full min-h-[48px] py-3 font-bold text-sm flex items-center justify-center gap-2"
        >
          Mengerti <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
