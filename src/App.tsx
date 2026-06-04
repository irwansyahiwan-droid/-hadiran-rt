import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import PullToRefresh from './components/PullToRefresh';
import PwaUpdatePrompt from './components/PwaUpdatePrompt';
import Toaster from './components/Toaster';
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [dir, setDir] = useState(1); // arah transisi tab: 1 = ke kanan, -1 = ke kiri

  const TAB_ORDER: TabName[] = ['beranda', 'jadwal', 'talangan', 'kas', 'kas-rt'];
  const changeTab = (tab: TabName) => {
    setDir(TAB_ORDER.indexOf(tab) >= TAB_ORDER.indexOf(activeTab) ? 1 : -1);
    setActiveTab(tab);
  };

  // Pull-to-refresh: remount halaman aktif → useEffect-nya memuat ulang data.
  const handleRefresh = () =>
    new Promise<void>((resolve) => {
      setRefreshKey((k) => k + 1);
      setTimeout(resolve, 650);
    });

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E8ECF2] dark:bg-gray-950">
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
      <div className="min-h-screen bg-[#E8ECF2] dark:bg-gray-950">
        <Header
          role={isWargaMode ? 'warga' : auth.role}
          onLogout={isWargaMode ? ctxValue.exitWargaMode : auth.signOut}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
        <main className="max-w-lg mx-auto px-5 pt-4" style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 1rem)' }}>
          <PullToRefresh onRefresh={handleRefresh}>
            <div key={`${activeTab}-${refreshKey}`} className={dir > 0 ? 'page-in-right' : 'page-in-left'}>
              {activeTab === 'beranda'  && <Beranda onNavigate={(tab) => changeTab(tab as TabName)} />}
              {activeTab === 'jadwal'   && (isWargaMode ? <JadwalWargaPage /> : <JadwalPage />)}
              {activeTab === 'talangan' && <TalanganPage onBack={isWargaMode ? () => changeTab('beranda') : undefined} />}
              {activeTab === 'kas'      && <KasHadiranPage />}
              {activeTab === 'kas-rt'   && <KasRTPage />}
            </div>
          </PullToRefresh>
        </main>
        <BottomNav active={activeTab} onChange={changeTab} isWargaMode={isWargaMode} />
        {/* Toast "versi baru tersedia" + registrasi service worker */}
        <PwaUpdatePrompt />
        <Toaster />
      </div>
    </AuthContext.Provider>
  );
}
