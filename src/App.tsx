import { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useBackDismiss } from './hooks/useBackDismiss';
import { useSwipeNavigate } from './hooks/useSwipeNavigate';
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
import RiwayatAktivitas from './pages/RiwayatAktivitas';
import LaporanTriwulan from './pages/LaporanTriwulan';
import BackupRestore from './pages/BackupRestore';
import TentangApp from './pages/TentangApp';

export default function App() {
  const auth = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabName>('beranda');
  const [wargaMode, setWargaMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dir, setDir] = useState(1); // arah transisi tab: 1 = ke kanan, -1 = ke kiri
  const [riwayatOpen, setRiwayatOpen] = useState(false);
  const [laporanOpen, setLaporanOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [tentangOpen, setTentangOpen] = useState(false);

  const TAB_ORDER: TabName[] = ['beranda', 'jadwal', 'talangan', 'kas', 'kas-rt'];
  const scrollPos = useRef<Record<string, number>>({});

  const changeTab = (tab: TabName) => {
    if (tab === activeTab) return;
    scrollPos.current[activeTab] = window.scrollY; // ingat posisi scroll tab sekarang
    setDir(TAB_ORDER.indexOf(tab) >= TAB_ORDER.indexOf(activeTab) ? 1 : -1);
    setActiveTab(tab);
  };

  // Swipe kiri = tab berikutnya, kanan = tab sebelumnya (pakai urutan tab yang terlihat)
  const swipeTab = (delta: 1 | -1) => {
    const warga = wargaMode && !auth.user;
    const order = warga ? TAB_ORDER.filter((t) => t !== 'talangan') : TAB_ORDER;
    const i = order.indexOf(activeTab);
    if (i === -1) return;
    const next = order[i + delta];
    if (next) changeTab(next);
  };
  const swipe = useSwipeNavigate(() => swipeTab(1), () => swipeTab(-1));

  // Pull-to-refresh: remount halaman aktif → useEffect-nya memuat ulang data.
  const handleRefresh = () =>
    new Promise<void>((resolve) => {
      setRefreshKey((k) => k + 1);
      setTimeout(resolve, 650);
    });

  // Tombol Back HP di tab non-Beranda → kembali ke Beranda (bukan keluar app).
  useBackDismiss(activeTab !== 'beranda', () => changeTab('beranda'));

  // Restorasi posisi scroll saat pindah tab (best-effort untuk konten yang dimuat async).
  useEffect(() => {
    const target = scrollPos.current[activeTab] ?? 0;
    if (target <= 0) { window.scrollTo(0, 0); return; }
    const raf = requestAnimationFrame(() => window.scrollTo(0, target));
    const t1 = setTimeout(() => window.scrollTo(0, target), 160);
    const t2 = setTimeout(() => window.scrollTo(0, target), 360);
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, [activeTab]);

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#DBE2EC] dark:bg-gray-950">
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
      <div className="min-h-screen bg-[#DBE2EC] dark:bg-gray-950">
        <Header
          role={isWargaMode ? 'warga' : auth.role}
          onLogout={isWargaMode ? ctxValue.exitWargaMode : auth.signOut}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onOpenRiwayat={ctxValue.isBendahara ? () => setRiwayatOpen(true) : undefined}
          onOpenLaporan={ctxValue.isBendahara ? () => setLaporanOpen(true) : undefined}
          onOpenBackup={ctxValue.isBendahara ? () => setBackupOpen(true) : undefined}
          onOpenTentang={() => setTentangOpen(true)}
        />
        <main className="max-w-lg mx-auto px-4 pt-4" style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 1rem)' }}>
          <PullToRefresh onRefresh={handleRefresh}>
            <div {...swipe}>
              <div key={`${activeTab}-${refreshKey}`} className={dir > 0 ? 'page-in-right' : 'page-in-left'}>
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
        {/* Riwayat Aktivitas (audit log) — bendahara saja */}
        {ctxValue.isBendahara && (
          <RiwayatAktivitas open={riwayatOpen} onClose={() => setRiwayatOpen(false)} />
        )}
        {/* Tutup Buku Triwulan — bendahara saja */}
        {ctxValue.isBendahara && (
          <LaporanTriwulan open={laporanOpen} onClose={() => setLaporanOpen(false)} />
        )}
        {/* Backup & Restore — bendahara saja */}
        {ctxValue.isBendahara && (
          <BackupRestore open={backupOpen} onClose={() => setBackupOpen(false)} />
        )}
        {/* Tentang Aplikasi — semua pengguna */}
        <TentangApp open={tentangOpen} onClose={() => setTentangOpen(false)} />
      </div>
    </AuthContext.Provider>
  );
}
