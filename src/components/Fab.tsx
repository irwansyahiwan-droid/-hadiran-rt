import { useEffect, useState } from 'react';
import { Plus, type LucideIcon } from 'lucide-react';
import { haptic } from '../lib/utils';

interface FabProps {
  onClick: () => void;
  label: string;
  icon?: LucideIcon;
  ariaLabel?: string;
}

/** Floating Action Button — aksi-buat utama di ZONA JEMPOL (kanan-bawah),
 *  melayang di atas bottom-nav & menghormati safe-area. Pola fintech 2026
 *  (Revolut/Cash App/Jago): aksi paling sering dipakai dalam jangkauan satu
 *  tangan, bukan di pojok atas. Memakai resep .btn-brand (gradient + glow) +
 *  .press (spring) → konsisten dgn CTA utama lain. z-30 → di bawah sheet/modal
 *  (z-50) sehingga tertutup backdrop saat form terbuka.
 *
 *  PINTAR (Material 3 2026): mengkerut jadi bulat ikon-saja saat scroll turun
 *  (beri ruang baca list), memanjang lagi dengan label saat scroll naik/berhenti. */
export default function Fab({ onClick, label, icon: Icon = Plus, ariaLabel }: FabProps) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let idle: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY + 4 && y > 80) setCompact(true);       // scroll turun → mengkerut
      else if (y < lastY - 4) setCompact(false);           // scroll naik → memanjang
      lastY = y;
      clearTimeout(idle);
      idle = setTimeout(() => setCompact(false), 900);     // diam sejenak → memanjang lagi
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(idle); };
  }, []);

  return (
    <button
      onClick={() => { haptic(); onClick(); }}
      aria-label={ariaLabel ?? label}
      className="btn-brand press fixed right-4 z-30 inline-flex items-center justify-center h-14 px-4 rounded-full text-sm font-bold overflow-hidden"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 1.75rem)', transition: 'box-shadow 0.2s ease, transform 0.15s var(--ease-spring)' }}
    >
      <Icon className="w-5 h-5 shrink-0" strokeWidth={2.4} />
      <span
        className="whitespace-nowrap overflow-hidden"
        style={{
          maxWidth: compact ? 0 : '140px',
          opacity: compact ? 0 : 1,
          marginLeft: compact ? 0 : '0.5rem',
          transition: 'max-width 0.3s var(--ease-out-expo), opacity 0.25s ease, margin-left 0.3s var(--ease-out-expo)',
        }}
      >
        {label}
      </span>
    </button>
  );
}
