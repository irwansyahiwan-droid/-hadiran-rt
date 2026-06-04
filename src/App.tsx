import { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import PullToRefresh from './components/PullToRefresh';
import PwaUpdatePrompt from './components/PwaUpdatePrompt';
import InstallPrompt from './components/InstallPrompt';
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
    if (tab === activeTab) return;
    // Slide page-in (transform/opacity GPU, satu elemen) — halus di HP.
    setDir(TAB_ORDER.indexOf(tab) >= TAB_ORDER.indexOf(activeTab) ? 1 : -1);
    setActiveTab(tab);
  };

  // Geser kiri/kanan untuk pindah tab (di antara tab yang terlihat).
  const touch = useRef<{ x: number; y: number; skip: boolean } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    // Lewati bila mulai di area yang boleh di-scroll horizontal (mis. grafik).
    let el = e.target as HTMLElement | null;
    let skip = false;
    while (el && el !== e.currentTarget) {
      if (el.dataset?.noswipe !== undefined) { skip = true; break; }
      const ox = getComputedStyle(el).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth) { skip = true; break; }
      el = el.parentElement;
    }
    touch.current = { x: t.clientX, y: t.clientY, skip };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s || s.skip) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    const order = TAB_ORDER.filter((id) => !(isWargaMode && id === 'talangan'));
    const i = order.indexOf(activeTab);
    const next = dx < 0 ? order[i + 1] : order[i - 1];
    if (next) changeTab(next);
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
            <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <div
                key={`${activeTab}-${refreshKey}`}
                className={dir > 0 ? 'page-in-right' : 'page-in-left'}
              >
                {activeTab === 'beranda'  && <Beranda onNavigate={(tab) => changeTab(tab as TabName)} />}
                {activeTab === 'jadwal'   && (isWargaMode ? <JadwalWargaPage /> : <JadwalPage />)}
                {activeTab === 'talangan' && <TalanganPage onBack={isWargaMode ? () => changeTab('beranda') : undefined} />}
                {activeTab === 'kas'      && <KasHadiranPage />}
                {activeTab === 'kas-rt'   && <KasRTPage />}
              </div>
            </div>
          </PullToRefresh>
        </main>
        <BottomNav active={activeTab} onChange={changeTab} isWargaMode={isWargaMode} />
        {/* Toast "versi baru tersedia" + registrasi service worker */}
        <PwaUpdatePrompt />
        {/* Banner pasang app (Android prompt / panduan iOS) */}
        <InstallPrompt />
        <Toaster />
      </div>
    </AuthContext.Provider>
  );
}
