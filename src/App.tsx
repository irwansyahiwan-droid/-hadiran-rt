import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import type { TabName } from './components/layout/BottomNav';
import Beranda from './pages/Beranda';
import JadwalPage from './pages/Jadwal';
import JadwalWargaPage from './pages/JadwalWarga';
import TalanganPage from './pages/Talangan';
import KasHadiranPage from './pages/KasHadiran';
import KasRTPage from './pages/KasRT';

export default function App() {
  const auth = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabName>('beranda');
  const [wargaMode, setWargaMode] = useState(false);

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-gray-950">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!auth.user && !wargaMode) {
    return (
      <Login
        onLogin={auth.signIn}
        onWargaMode={() => { setWargaMode(true); setActiveTab('beranda'); }}
      />
    );
  }

  const isWargaMode = wargaMode && !auth.user;

  const ctxValue = {
    ...auth,
    isBendahara: auth.role === 'bendahara',
    isWargaMode,
    exitWargaMode: () => { setWargaMode(false); setActiveTab('beranda'); },
  };

  return (
    <AuthContext.Provider value={ctxValue}>
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-gray-950">
        <Header
          role={isWargaMode ? 'warga' : auth.role}
          onLogout={isWargaMode ? ctxValue.exitWargaMode : auth.signOut}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
        <main className="max-w-lg mx-auto px-5 pt-4" style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 1rem)' }}>
          {activeTab === 'beranda'  && <Beranda onNavigate={(tab) => setActiveTab(tab as TabName)} />}
          {activeTab === 'jadwal'   && (isWargaMode ? <JadwalWargaPage /> : <JadwalPage />)}
          {activeTab === 'talangan' && <TalanganPage onBack={isWargaMode ? () => setActiveTab('beranda') : undefined} />}
          {activeTab === 'kas'      && <KasHadiranPage />}
          {activeTab === 'kas-rt'   && <KasRTPage />}
        </main>
        <BottomNav active={activeTab} onChange={setActiveTab} isWargaMode={isWargaMode} />
      </div>
    </AuthContext.Provider>
  );
}
