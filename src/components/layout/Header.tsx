import { useEffect, useRef, useState } from 'react';
import { LogOut, Sun, Moon, Eye, History, FileText, MoreVertical, DatabaseBackup, Info, Users, type LucideIcon } from 'lucide-react';
import logoRT from '../../assets/logo-rt.svg';
import { haptic } from '../../lib/utils';
import { useExitAnim } from '../../lib/hooks';
import { useScrolledPast } from '../../hooks/useScrollDirection';
import Tag from '../Tag';
import type { Role } from '../../hooks/useAuth';

interface HeaderProps {
  role: Role | null;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenRiwayat?: () => void;
  onOpenLaporan?: () => void;
  onOpenBackup?: () => void;
  onOpenAnggota?: () => void;
  onOpenTentang?: () => void;
}

/** Header menyusut + shadow/blur menguat saat halaman di-scroll (ala app fintech). */
export default function Header({ role, onLogout, isDark, onToggleTheme, onOpenRiwayat, onOpenLaporan, onOpenBackup, onOpenAnggota, onOpenTentang }: HeaderProps) {
  const isBendahara = role === 'bendahara';
  // Header menyusut + shadow/blur menguat saat halaman tergeser >6px dari puncak.
  // Listener scroll dibagi pakai (lihat hook).
  const scrolled = useScrolledPast(6);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuMounted = useExitAnim(menuOpen);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Saat menu buka: fokus item pertama → pola menu WAI-ARIA (keyboard mulai di dalam).
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
    triggerRef.current?.focus(); // kembalikan fokus ke tombol pemicu
  }

  // Navigasi keyboard menu: panah naik/turun siklik, Home/End, Escape menutup.
  function onMenuKeyDown(e: React.KeyboardEvent) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
  }

  // Item menu overflow (kebab) — semua aksi dirapikan ke sini agar top bar lega.
  const MenuItem = ({ icon: Icon, label, onClick, danger }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) => (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={() => { haptic(); setMenuOpen(false); onClick(); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
        danger
          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 active:bg-rose-100 dark:hover:bg-rose-900/20 dark:active:bg-rose-900/35'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700'
      }`}
    >
      <Icon className={`w-[18px] h-[18px] ${danger ? 'text-rose-500' : 'text-gray-400'}`} />
      {label}
    </button>
  );

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 dark:bg-gray-900/80 border-b border-line/70 dark:border-gray-800/70'
          : 'bg-white/90 dark:bg-gray-900/85 border-b border-transparent'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        boxShadow: scrolled
          ? '0 4px 20px -6px rgba(16,24,40,0.18)'
          : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.3s var(--ease-out-expo), background-color 0.3s',
      }}
    >
      <div
        className={`flex items-center justify-between max-w-lg mx-auto px-4 transition-all duration-300 ${
          scrolled ? 'py-2' : 'py-3'
        }`}
        style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src={logoRT}
            alt="Logo RT"
            className={`object-contain rounded-full shadow-sm ring-1 ring-black/[0.08] dark:ring-white/10 transition-all duration-300 ${
              scrolled ? 'h-8 w-8' : 'h-9 w-9'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          />
          <h1
            className={`font-semibold tracking-tight text-gray-900 dark:text-gray-100 whitespace-nowrap transition-all duration-300 ${
              scrolled ? 'text-body' : 'text-base'
            }`}
          >
            Hadiran RT
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tag tone={isBendahara ? 'success' : 'info'} className="tracking-wide">
            {isBendahara ? 'BENDAHARA' : 'WARGA'}
          </Tag>

          {/* Menu overflow — rapikan semua aksi ke sini agar judul tidak terdesak */}
          <div className="relative">
            <button
              ref={triggerRef}
              onClick={() => { haptic(); setMenuOpen((o) => !o); }}
              className="press w-11 h-11 -mr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
              aria-label="Menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
            {menuMounted && (
              <>
                <div
                  ref={menuRef}
                  role="menu"
                  aria-label="Menu aplikasi"
                  onKeyDown={onMenuKeyDown}
                  className={`${menuOpen ? 'pop-menu' : 'pop-menu-out'} absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden py-1.5 origin-top-right`}
                  style={{ boxShadow: 'var(--shadow-float)' }}
                >
                  {isBendahara && onOpenLaporan && (
                    <MenuItem icon={FileText} label="Tutup Buku Triwulan" onClick={onOpenLaporan} />
                  )}
                  {isBendahara && onOpenRiwayat && (
                    <MenuItem icon={History} label="Riwayat Aktivitas" onClick={onOpenRiwayat} />
                  )}
                  {isBendahara && onOpenAnggota && (
                    <MenuItem icon={Users} label="Kelola Anggota" onClick={onOpenAnggota} />
                  )}
                  {isBendahara && onOpenBackup && (
                    <MenuItem icon={DatabaseBackup} label="Backup & Restore" onClick={onOpenBackup} />
                  )}
                  {isBendahara && <div className="my-1.5 border-t border-line dark:border-gray-800" />}
                  {onOpenTentang && (
                    <MenuItem icon={Info} label="Tentang Aplikasi" onClick={onOpenTentang} />
                  )}
                  <MenuItem
                    icon={isDark ? Sun : Moon}
                    label={isDark ? 'Mode Terang' : 'Mode Gelap'}
                    onClick={onToggleTheme}
                  />
                  <MenuItem icon={LogOut} label="Keluar" onClick={onLogout} danger />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {!isBendahara && (
        <div
          className="border-t border-blue-100 bg-blue-50 overflow-hidden px-5 dark:bg-blue-950 dark:border-blue-900 transition-all duration-300"
          style={{
            maxHeight: scrolled ? '0px' : '40px',
            opacity: scrolled ? 0 : 1,
            paddingTop: scrolled ? 0 : '0.375rem',
            paddingBottom: scrolled ? 0 : '0.375rem',
            transitionTimingFunction: 'var(--ease-out-expo)',
          }}
        >
          <p className="text-xs text-blue-600 dark:text-blue-300 text-center font-medium max-w-lg mx-auto flex items-center justify-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Mode Warga — hanya bisa melihat data
          </p>
        </div>
      )}
    </header>
  );
}
