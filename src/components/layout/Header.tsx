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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 dark:bg-gray-900/80 dark:border-gray-800">
      <div className="flex items-center justify-between max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={logoRT} alt="Logo RT 004/006" className="h-9 w-9 object-contain rounded-full shadow-sm" />
          <div>
            <h1 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">Hadiran RT</h1>
            <p className="text-xs text-gray-400">Manajemen Kas & Iuran</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-full border ${
            isBendahara
              ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-900'
              : 'border-blue-400 bg-blue-50 dark:border-blue-400 dark:bg-blue-900'
          }`}>
            <span className={`text-xs font-semibold tracking-wide ${
              isBendahara ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-700 dark:text-blue-300'
            }`}>
              {isBendahara ? 'BENDAHARA' : 'WARGA'}
            </span>
          </div>
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg"
            title={isDark ? 'Mode Terang' : 'Mode Gelap'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Keluar"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
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
