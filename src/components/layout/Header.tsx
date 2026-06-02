import { LogOut } from 'lucide-react';
import type { Role } from '../../hooks/useAuth';

interface HeaderProps {
  role: Role | null;
  onLogout: () => void;
}

export default function Header({ role, onLogout }: HeaderProps) {
  const isBendahara = role === 'bendahara';

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center font-bold text-white text-sm shadow-md">
            46
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-base leading-tight">Hadiran RT</h1>
            <p className="text-xs text-gray-400">Manajemen Kas & Iuran</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-full border ${
            isBendahara
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-blue-400 bg-blue-50'
          }`}>
            <span className={`text-xs font-semibold tracking-wide ${
              isBendahara ? 'text-emerald-700' : 'text-blue-700'
            }`}>
              {isBendahara ? 'BENDAHARA' : 'WARGA'}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Keluar"
          >
            <LogOut className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
