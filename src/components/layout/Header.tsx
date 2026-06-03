import { LogOut } from 'lucide-react';
import logoRT from '../../assets/logo-rt.jpg';
import type { Role } from '../../hooks/useAuth';

interface HeaderProps {
  role: Role | null;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function Header({ role, onLogout, isDark, onToggleTheme }: HeaderProps) {
  const isBendahara = role === 'bendahara';

  return (
    <header
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md dark:bg-gray-900/95"
      style={{ paddingTop: 'env(safe-area-inset-top)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center justify-between max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center gap-2.5">
          <img src={logoRT} alt="Logo RT" className="h-8 w-8 object-contain rounded-full shadow-sm" />
          <h1 className="font-semibold text-gray-900 dark:text-gray-100 text-base whitespace-nowrap">Hadiran RT</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[0.7rem] font-semibold px-[10px] py-[3px] rounded-[6px]"
            style={isBendahara
              ? { background: 'rgba(52,199,89,0.12)', color: '#166534' }
              : { background: 'rgba(0,122,255,0.10)', color: '#0071E3' }}
          >
            {isBendahara ? 'BENDAHARA' : 'WARGA'}
          </span>
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-base leading-none"
            title={isDark ? 'Mode Terang' : 'Mode Gelap'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Keluar"
          >
            <LogOut className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>
      {!isBendahara && (
        <div className="border-t border-blue-100 bg-blue-50 py-1.5 px-4 dark:bg-blue-950 dark:border-blue-900">
          <p className="text-xs text-blue-600 dark:text-blue-300 text-center font-medium max-w-lg mx-auto">
            👁 Mode Warga — hanya bisa melihat data
          </p>
        </div>
      )}
    </header>
  );
}
