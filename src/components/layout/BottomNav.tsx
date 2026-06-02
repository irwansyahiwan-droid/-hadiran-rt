import { Home, Calendar, ArrowLeftRight, Wallet, Landmark } from 'lucide-react';

export type TabName = 'beranda' | 'jadwal' | 'talangan' | 'kas' | 'kas-rt';

interface BottomNavProps {
  active: TabName;
  onChange: (tab: TabName) => void;
  isWargaMode?: boolean;
}

const tabs: { id: TabName; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'beranda',  label: 'Beranda',  icon: Home },
  { id: 'jadwal',   label: 'Jadwal',   icon: Calendar },
  { id: 'talangan', label: 'Talangan', icon: ArrowLeftRight },
  { id: 'kas',      label: 'Kas',      icon: Wallet },
  { id: 'kas-rt',   label: 'Kas RT',   icon: Landmark },
];

export default function BottomNav({ active, onChange, isWargaMode }: BottomNavProps) {
  const visibleTabs = isWargaMode ? tabs.filter(t => t.id !== 'talangan') : tabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-gray-100 safe-area-pb">
      <div className="max-w-lg mx-auto flex items-center justify-around px-1 py-2">
        {visibleTabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
                isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-emerald-100' : ''}`}>
                <Icon className={`w-[18px] h-[18px] transition-all ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                )}
              </div>
              <span className={`text-[9px] font-medium leading-none ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
