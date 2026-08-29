import { useEffect, useState } from 'react';
import { Check, AlertCircle, Info } from 'lucide-react';
import { subscribeToast, type ToastItem } from '../lib/toast';
import { haptic } from '../lib/utils';

const STYLES = {
  success: { icon: Check, ring: 'ring-emerald-200 dark:ring-emerald-800/50', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: AlertCircle, ring: 'ring-rose-200 dark:ring-rose-800/50', dot: 'bg-rose-500', text: 'text-neg dark:text-rose-400' },
  info: { icon: Info, ring: 'ring-gray-200 dark:ring-gray-700', dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-300' },
} as const;

const EXIT_MS = 200; // selaras durasi .toast-out

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  /* Pengumuman untuk pembaca layar SENGAJA dipisah dari toast yang terlihat.
     Sebelumnya `role="status"` menempel di wadah toast yang baru DIRENDER saat
     toast pertama muncul — pembaca layar butuh region-nya sudah ada di DOM
     SEBELUM isinya berubah, jadi VoiceOver/TalkBack sering diam sama sekali:
     bendahara menekan simpan lalu hening, tak ada cara tahu berhasil.
     Dipisah juga melindungi dari dua hal lain: animasi keluar mencabut teks di
     tengah pembacaan, dan galat yang butuh `assertive` tak bisa dibedakan
     kalau semua toast berbagi satu region `polite`. */
  const [umumSopan, setUmumSopan] = useState('');
  const [umumPenting, setUmumPenting] = useState('');
  // id toast yg sedang memainkan exit (slide naik + fade) sebelum dilepas.
  // id = number (counter di lib/toast) — Set<number> selaras dgn ToastItem.id.
  const [leaving, setLeaving] = useState<Set<number>>(new Set());

  // Tandai keluar → mainkan .toast-out → lepas dari DOM setelah animasi selesai.
  const dismiss = (id: number, after?: () => void) => {
    setLeaving((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
      setLeaving((prev) => { const n = new Set(prev); n.delete(id); return n; });
      after?.();
    }, EXIT_MS);
  };

  /* Kosongkan dulu baru isi: teks yang SAMA persis dua kali tidak mengubah DOM,
     dan region live yang tak berubah tidak diumumkan ulang. */
  const umumkan = (pesan: string, penting: boolean) => {
    const set = penting ? setUmumPenting : setUmumSopan;
    set('');
    setTimeout(() => set(pesan), 60);
  };

  useEffect(() => {
    return subscribeToast((t) => {
      haptic(8);
      setItems((prev) => [...prev, t]);
      /* Toast beraksi (mis. "Urungkan") menutup diri dalam ~2,6 detik. Pemakai
         pembaca layar tak melihatnya, jadi keberadaan tombol itu harus ikut
         diucapkan — kalau tidak, jalan untuk membatalkan absensi massal lewat
         begitu saja tanpa pernah diketahui. */
      umumkan(t.actionLabel ? `${t.message}. Tombol ${t.actionLabel} tersedia.` : t.message, t.type === 'error');
      // commit ditunda (guard mencegah jalan bila sudah di-undo)
      setTimeout(() => dismiss(t.id, () => t.onExpire?.()), t.duration ?? 2600);
    });
  }, []);

  const handleAction = (t: ToastItem) => {
    haptic(12);
    dismiss(t.id, () => t.onAction?.());
  };

  return (
    <>
      {/* Region live PERMANEN — harus tetap terpasang meski tak ada toast.
          Jangan gabungkan lagi ke wadah toast di bawah. */}
      <p className="sr-only" role="status" aria-live="polite">{umumSopan}</p>
      <p className="sr-only" role="alert" aria-live="assertive">{umumPenting}</p>
      {items.length > 0 && <ToastStack items={items} leaving={leaving} onAction={handleAction} />}
    </>
  );
}

function ToastStack({
  items, leaving, onAction,
}: {
  items: ToastItem[];
  leaving: Set<number>;
  onAction: (t: ToastItem) => void;
}) {
  return (
    <div
      /* Sengaja TANPA role/aria-live: pengumuman sudah ditangani region live
         permanen di atas. Wadah ini konten biasa, jadi tak diumumkan otomatis
         (tak ada pembacaan dobel) tapi tombol aksinya tetap bisa dijelajahi. */
      className="fixed left-1/2 z-toast flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
      style={{
        top: 'calc(env(safe-area-inset-top) + 12px)',
        // translate3d + backface-hidden + will-change: paksa layer GPU stabil —
        // tanpa ini elemen fixed ber-backdrop-filter bisa "melompat" di iOS
        // Safari saat address bar muncul/sembunyi (fix yg sama dgn BottomNav).
        transform: 'translate3d(-50%, 0, 0)',
        willChange: 'transform',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
      }}
    >
      {items.map((t) => {
        const s = STYLES[t.type];
        const Icon = s.icon;
        return (
          <div
            key={t.id}
            className={`${leaving.has(t.id) ? 'toast-out' : 'toast-in'} pointer-events-auto flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md ring-1 ${s.ring}`}
            style={{ boxShadow: 'var(--shadow-float)' }}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${s.dot}`}>
              <Icon className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </span>
            <p className="flex-1 text-body font-semibold text-gray-800 dark:text-gray-100">{t.message}</p>
            {t.actionLabel && (
              <button
                onClick={() => onAction(t)}
                className="press shrink-0 -mr-1 px-3 py-2 rounded-xl text-body font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
