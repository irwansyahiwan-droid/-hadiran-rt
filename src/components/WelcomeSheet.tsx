import { useState } from 'react';
import { Wallet, CalendarDays, ArrowLeftRight, Eye, ArrowRight } from 'lucide-react';
import { haptic } from '../lib/utils';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useDragDismiss } from '../hooks/useDragDismiss';
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

  // Unmount FINAL — dipanggil hook drag setelah panel selesai meluncur keluar.
  function finalize() {
    try { localStorage.setItem(KEY, '1'); } catch { /* abaikan (storage diblokir) */ }
    setShow(false);
  }

  // Drag handle beneran (bukan hiasan) + semua jalur tutup meluncur turun.
  const drag = useDragDismiss(finalize);
  function dismiss() {
    haptic(12);               // getar saat NIAT menutup (tap), bukan saat unmount
    drag.dismiss();
  }

  useBackDismiss(show, dismiss);
  const dlg = useDialog(show, { onClose: dismiss, label: 'Selamat datang di Hadiran RT' });

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-end" onClick={dismiss}>
      <div className={`sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm ${drag.dismissing ? 'sheet-backdrop-out' : ''}`} />
      <div
        ref={dlg.panelRef}
        {...dlg.panelProps}
        /* `max-h-[90dvh] overflow-y-auto` = pola yang sama dgn SEMUA sheet lain.
           Sampai 19 Agu 2026 panel ini satu-satunya yang TAK berbatas tinggi:
           tingginya = tinggi isi. Di layar pendek ia melewati layar tanpa jalan
           gulir — terukur 504px di viewport 390px (landscape 844x390), jadi
           handle, logo, dan judul "Selamat datang" menggantung di ATAS lipatan
           dan tak bisa diraih. Ini layar PERTAMA tiap warga baru. Semua sapuan
           repo memvariasikan LEBAR (320/360/390) & skala teks — TINGGI tak
           pernah sekali pun, jadi tak satu pun pernah melihatnya. */
        className="sheet-panel relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-6 float max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)', ...drag.style }}
      >
        {/* Handle: `drag.handlers` pindah ke SINI dari panel. Di panel ber-scroll
            keduanya berkelahi — gulir ke bawah terbaca sebagai tarik-tutup.
            Semua sheet lain sudah memakai strip handle terpisah; ini menyusul. */}
        <div className="-mt-2 mb-4 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...drag.handlers}>
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <img src={logoRt} alt="" width={56} height={56} className="w-14 h-14 rounded-2xl object-contain mx-auto mb-3 ring-1 ring-black/5 dark:ring-white/10" />
        <h2 className="text-title font-bold text-ink dark:text-gray-100 text-center">Selamat datang</h2>
        <p className="text-pretty text-caption text-ink-sub dark:text-gray-400 text-center mt-1 mb-5">
          Aplikasi Kas &amp; Hadiran RT&nbsp;004/006. Di sini Bapak-Bapak / Warga bisa:
        </p>

        <div className="space-y-3 mb-4">
          {ITEMS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="icon-tile w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-body font-semibold text-ink dark:text-gray-100 leading-tight">{title}</p>
                <p className="text-caption text-ink-sub dark:text-gray-400 leading-relaxed mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-5 rounded-xl inset-soft px-4 py-3">
          <Eye className="w-4 h-4 text-ink-faint dark:text-gray-400 shrink-0" />
          <p className="text-pretty text-caption text-ink-sub dark:text-gray-400 leading-snug">
            Ketuk ikon mata di kartu saldo untuk menyembunyikan nominal.
          </p>
        </div>

        <button
          onClick={dismiss}
          className="btn-brand w-full min-h-[48px] py-3 text-body flex items-center justify-center gap-2"
        >
          Mengerti <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
