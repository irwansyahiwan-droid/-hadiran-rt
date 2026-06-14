import { useEffect, useMemo } from 'react';
import { haptic } from '../lib/utils';

const COLORS = ['#0F6039', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#6EE7B7'];

interface SuccessOverlayProps {
  show: boolean;
  message?: string;
  onDone: () => void;
  duration?: number;
}

/** Overlay sukses cinematic — lingkaran + centang tergores + confetti + haptic. */
export default function SuccessOverlay({ show, message = 'Berhasil!', onDone, duration = 1500 }: SuccessOverlayProps) {
  const pieces = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.5;
      const dist = 90 + Math.random() * 80;
      return {
        cx: Math.cos(angle) * dist,
        cy: Math.sin(angle) * dist - 30,
        cr: Math.random() * 540 - 270,
        color: COLORS[i % COLORS.length],
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
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

          {/* Lingkaran + centang */}
          <div className="success-pop relative w-20 h-20 rounded-full bg-brand-600 flex items-center justify-center shadow-xl">
            <svg viewBox="0 0 32 32" className="w-10 h-10" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path className="check-draw" d="M8 16.5l5 5 11-11" />
            </svg>
          </div>
        </div>
        <p className="success-pop mt-4 text-white font-bold text-sm bg-black/45 px-4 py-1.5 rounded-full backdrop-blur">{message}</p>
      </div>
    </div>
  );
}
