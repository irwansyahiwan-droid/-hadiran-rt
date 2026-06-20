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
 *  (z-50) sehingga tertutup backdrop saat form terbuka. */
export default function Fab({ onClick, label, icon: Icon = Plus, ariaLabel }: FabProps) {
  return (
    <button
      onClick={() => { haptic(); onClick(); }}
      aria-label={ariaLabel ?? label}
      className="btn-brand press fixed right-4 z-30 inline-flex items-center gap-2 h-14 pl-5 pr-6 rounded-full text-sm font-bold"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 1rem)' }}
    >
      <Icon className="w-5 h-5" strokeWidth={2.4} />
      {label}
    </button>
  );
}
