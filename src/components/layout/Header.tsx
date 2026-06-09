import { useEffect, useState } from 'react';
import { LogOut, Sun, Moon, Eye, History, FileText, MoreVertical, DatabaseBackup, Info, Users, type LucideIcon } from 'lucide-react';
import logoRT from '../../assets/logo-rt.jpg';
import { haptic } from '../../lib/utils';
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
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Item menu overflow (kebab) — semua aksi dirapikan ke sini agar top bar lega.
  const MenuItem = ({ icon: Icon, label, onClick, danger }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) => (
    <button
      onClick={() => { haptic(); setMenuOpen(false); onClick(); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
        danger
          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className={`w-[18px] h-[18px] ${danger ? 'text-rose-500' : 'text-gray-400'}`} />
      {label}
    </button>
  );

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-md transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 dark:bg-gray-900/90'
          : 'bg-white/95 dark:bg-gray-900/95'
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
            className={`object-contain rounded-full shadow-sm transition-all duration-300 ${
              scrolled ? 'h-7 w-7' : 'h-8 w-8'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          />
          <h1
            className={`font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap transition-all duration-300 ${
              scrolled ? 'text-[15px]' : 'text-base'
            }`}
          >
            Hadiran RT
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[0.7rem] font-semibold px-[10px] py-[3px] rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
            style={isBendahara
              ? { background: 'rgba(52,199,89,0.12)', color: '#166534' }
              : { background: 'rgba(0,122,255,0.10)', color: '#0071E3' }}
          >
            {isBendahara ? 'BENDAHARA' : 'WARGA'}
          </span>

          {/* Menu overflow — rapikan semua aksi ke sini agar judul tidak terdesak */}
          <div className="relative">
            <button
              onClick={() => { haptic(); setMenuOpen((o) => !o); }}
              className="press w-11 h-11 -mr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
              aria-label="Menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div
                  role="menu"
                  className="pop absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden py-1.5 origin-top-right"
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
