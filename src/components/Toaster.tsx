import { useEffect, useState } from 'react';
import { Check, AlertCircle, Info } from 'lucide-react';
import { subscribeToast, type ToastItem } from '../lib/toast';
import { haptic } from '../lib/utils';

const STYLES = {
  success: { icon: Check, ring: 'ring-emerald-200 dark:ring-emerald-800/50', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: AlertCircle, ring: 'ring-rose-200 dark:ring-rose-800/50', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  info: { icon: Info, ring: 'ring-slate-200 dark:ring-slate-700', dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-300' },
} as const;

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToast((t) => {
      haptic(8);
      setItems((prev) => [...prev, t]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
        t.onExpire?.(); // commit ditunda (guard mencegah jalan bila sudah di-undo)
      }, t.duration ?? 2600);
    });
  }, []);

  const handleAction = (t: ToastItem) => {
    haptic(12);
    setItems((prev) => prev.filter((x) => x.id !== t.id));
    t.onAction?.();
  };

  if (items.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      {items.map((t) => {
        const s = STYLES[t.type];
        const Icon = s.icon;
        return (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md ring-1 ${s.ring}`}
            style={{ boxShadow: 'var(--shadow-float)' }}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${s.dot}`}>
              <Icon className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </span>
            <p className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{t.message}</p>
            {t.actionLabel && (
              <button
                onClick={() => handleAction(t)}
                className="press shrink-0 -mr-1 px-3 py-1.5 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
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
