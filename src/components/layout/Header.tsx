import { useEffect, useState } from 'react';
import { LogOut, Sun, Moon, Eye } from 'lucide-react';
import logoRT from '../../assets/logo-rt.jpg';
import { haptic } from '../../lib/utils';
import type { Role } from '../../hooks/useAuth';

interface HeaderProps {
  role: Role | null;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

/** Header menyusut + shadow/blur menguat saat halaman di-scroll (ala app fintech). */
export default function Header({ role, onLogout, isDark, onToggleTheme }: HeaderProps) {
  const isBendahara = role === 'bendahara';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
        className={`flex items-center justify-between max-w-lg mx-auto px-5 transition-all duration-300 ${
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
        <div className="flex items-center gap-1.5">
          <span
            className="text-[0.7rem] font-semibold px-[10px] py-[3px] rounded-[6px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
            style={isBendahara
              ? { background: 'rgba(52,199,89,0.12)', color: '#166534' }
              : { background: 'rgba(0,122,255,0.10)', color: '#0071E3' }}
          >
            {isBendahara ? 'BENDAHARA' : 'WARGA'}
          </span>
          <button
            onClick={() => { haptic(); onToggleTheme(); }}
            className="press p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
            title={isDark ? 'Mode Terang' : 'Mode Gelap'}
            aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
          >
            {isDark
              ? <Sun className="w-5 h-5 text-amber-400" />
              : <Moon className="w-5 h-5 text-gray-500" />}
          </button>
          <button
            onClick={onLogout}
            className="press p-1.5 -mr-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Keluar"
            aria-label="Keluar"
          >
            <LogOut className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
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
