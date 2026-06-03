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
      className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 dark:bg-gray-900/90 dark:border-gray-800"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between max-w-lg mx-auto px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <img src={logoRT} alt="Logo RT" className="h-8 w-8 object-contain rounded-full shadow-sm" />
          <h1 className="font-semibold text-gray-900 dark:text-gray-100 text-base whitespace-nowrap">Hadiran RT</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`px-2 py-0.5 rounded-full border ${
            isBendahara ? 'border-emerald-500 dark:border-emerald-400' : 'border-blue-400'
          }`}>
            <span className={`text-xs font-semibold ${
              isBendahara ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
            }`}>
              {isBendahara ? 'BENDAHARA' : 'WARGA'}
            </span>
          </div>
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
