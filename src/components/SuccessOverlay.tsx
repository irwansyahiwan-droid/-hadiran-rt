import { useEffect, useMemo } from 'react';
import { Crown } from 'lucide-react';
import { haptic } from '../lib/utils';

// Confetti default (aksi sukses umum). `honor` = palet kohesif on-brand untuk
// momen komunal "tarikan selesai" (Sohibul Bait terima): emas songket + emerald
// + mint + putih, tanpa rainbow generik → perayaan terasa milik app ini.
const COLORS = ['#0F6039', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#6EE7B7'];
const COLORS_HONOR = ['#E8B651', '#10B981', '#0F6039', '#6EE7B7', '#FFFFFF', '#1B7249'];

interface SuccessOverlayProps {
  show: boolean;
  message?: string;
  /** Baris kedua opsional di bawah pesan utama (mis. "Sohibul Bait terima RpX"). */
  submessage?: string;
  onDone: () => void;
  duration?: number;
  /** `honor` → perayaan komunal (mahkota emas + confetti on-brand). Default = sukses biasa. */
  variant?: 'default' | 'honor';
}

/** Overlay sukses cinematic — lingkaran + centang tergores + confetti + haptic. */
export default function SuccessOverlay({ show, message = 'Berhasil!', submessage, onDone, duration = 1500, variant = 'default' }: SuccessOverlayProps) {
  const honor = variant === 'honor';
  const palette = honor ? COLORS_HONOR : COLORS;
  const pieces = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.5;
      const dist = 90 + Math.random() * 80;
      return {
        cx: Math.cos(angle) * dist,
        cy: Math.sin(angle) * dist - 30,
        cr: Math.random() * 540 - 270,
        color: palette[i % palette.length],
        delay: Math.random() * 0.12,
        size: 6 + Math.random() * 6,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  useEffect(() => {
    if (!show) return;
    haptic([14, 40, 24]);
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [show, onDone, duration]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center pointer-events-none" role="status" aria-live="assertive">
      <div className="sheet-backdrop absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div className="relative flex flex-col items-center">
        <div className="relative w-20 h-20">
          {/* Confetti — terbang dari pusat */}
          {pieces.map((p, i) => {
            const style = {
              left: '50%',
              top: '50%',
              width: p.size,
              height: p.size,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
              background: p.color,
              animationDelay: `${p.delay}s`,
              '--cx': `${p.cx}px`,
              '--cy': `${p.cy}px`,
              '--cr': `${p.cr}deg`,
            } as unknown as React.CSSProperties;
            return <span key={i} className="confetti-piece absolute rounded-[2px]" style={style} />;
          })}

          {/* Ring berdenyut */}
          <div className="success-ring absolute inset-0 rounded-full bg-emerald-400/40" />

          {/* Mahkota emas honor — momen komunal "tarikan selesai" (Sohibul Bait
              terima). Menyambung benang honor: motif songket hero → "Giliran
              berikutnya" → perayaan ini. Hanya variant honor. */}
          {honor && (
            <Crown
              className="success-pop absolute left-1/2 -top-[18px] z-10 h-7 w-7 -translate-x-1/2 -rotate-[10deg]"
              style={{ color: 'var(--gold-songket)', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.4))' }}
              fill="currentColor" strokeWidth={0}
            />
          )}

          {/* Lingkaran + centang. Variant honor → cincin emas tipis di tepi. */}
          <div
            className="success-pop relative w-20 h-20 rounded-full bg-brand-600 flex items-center justify-center shadow-xl"
            style={honor ? { boxShadow: '0 0 0 2px var(--gold-songket), 0 10px 28px -8px rgba(15,96,57,.7)' } : undefined}
          >
            <svg viewBox="0 0 32 32" className="w-10 h-10" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path className="check-draw" d="M8 16.5l5 5 11-11" />
            </svg>
          </div>
        </div>
        <p className="success-pop mt-4 text-white font-bold text-sm bg-black/45 px-4 py-1.5 rounded-full backdrop-blur">{message}</p>
        {submessage && (
          <p className="success-pop mt-1.5 text-white/95 font-medium text-xs bg-black/35 px-3 py-1 rounded-full backdrop-blur tabular-nums">{submessage}</p>
        )}
      </div>
    </div>
  );
}
