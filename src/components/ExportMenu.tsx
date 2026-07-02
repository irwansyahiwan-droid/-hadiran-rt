import { useEffect, useRef, useState } from 'react';
import { Download, ChevronDown, type LucideIcon } from 'lucide-react';
import { haptic } from '../lib/utils';
import { useExitAnim } from '../lib/hooks';

export interface ExportItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** Warna teks/ikon opsional (mis. emerald untuk Excel) — default netral. */
  tone?: string;
}

interface ExportMenuProps {
  items: ExportItem[];
  /** Arah buka dropdown relatif tombol. 'right' (default) = tepi kanan dropdown
   *  sejajar tombol → cocok saat tombol di kanan layar (Kas RT). 'left' = buka
   *  ke kanan → cocok saat tombol di kiri (Kas Hadiran), agar tak terpotong. */
  align?: 'left' | 'right';
}

/** Tombol "Ekspor" + dropdown — menyatukan aksi ekspor yang JARANG dipakai
 *  (PDF / Excel) ke satu menu, agar aksi utama (FAB) tak tersaingi di toolbar.
 *  Satu aksi primer per layar. Popover ringan (bukan sheet) selaras menu Header:
 *  tutup via Escape / klik luar. */
export default function ExportMenu({ items, align = 'right' }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const mounted = useExitAnim(open);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Saat menu buka: fokus item pertama → keyboard mulai di dalam (pola WAI-ARIA).
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  // Navigasi keyboard: panah naik/turun siklik, Home/End.
  function onMenuKeyDown(e: React.KeyboardEvent) {
    const els = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (els.length === 0) return;
    const idx = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(idx + 1) % els.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(idx - 1 + els.length) % els.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); els[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); els[els.length - 1].focus(); }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { haptic(); setOpen((o) => !o); }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="press flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-control dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold px-3 py-2 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <Download className="w-4 h-4" />
        Ekspor
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2.25} />
      </button>

      {open && <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />}
      {mounted && (
        <>
          <div
            ref={menuRef}
            role="menu"
            aria-label="Ekspor"
            onKeyDown={onMenuKeyDown}
            className={`${open ? 'pop-menu' : 'pop-menu-out'} absolute top-[calc(100%+8px)] z-50 w-48 rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden py-1.5 ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`}
            style={{ boxShadow: 'var(--shadow-float)' }}
          >
            {items.map(({ label, icon: Icon, onClick, tone }) => (
              <button
                key={label}
                role="menuitem"
                tabIndex={-1}
                onClick={() => { haptic(); setOpen(false); onClick(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Icon className={`w-[18px] h-[18px] ${tone ?? 'text-gray-400'}`} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
