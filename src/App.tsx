import { useState, useRef, useEffect, lazy, Suspense } from 'react';
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
import WelcomeSheet from './components/WelcomeSheet';
import type { TabName } from './components/layout/BottomNav';
import logoRT from './assets/logo-rt.svg';

// Code-splitting per halaman → first load ringan di HP warga; tiap tab/overlay
// memuat chunk-nya sendiri saat dibutuhkan (vite:preloadError di main.tsx
// menjaga dari "chunk basi" setelah redeploy).
const Beranda = lazy(() => import('./pages/Beranda'));
const JadwalPage = lazy(() => import('./pages/Jadwal'));
const JadwalWargaPage = lazy(() => import('./pages/JadwalWarga'));
const TalanganPage = lazy(() => import('./pages/Talangan'));
const KasHadiranPage = lazy(() => import('./pages/KasHadiran'));
const KasRTPage = lazy(() => import('./pages/KasRT'));
const RiwayatAktivitas = lazy(() => import('./pages/RiwayatAktivitas'));
const LaporanTriwulan = lazy(() => import('./pages/LaporanTriwulan'));
const BackupRestore = lazy(() => import('./pages/BackupRestore'));
const KelolaAnggota = lazy(() => import('./pages/KelolaAnggota'));
const TentangApp = lazy(() => import('./pages/TentangApp'));

// Fallback ringan saat chunk halaman dimuat (spinner brand, sinkron dgn loader auth).
function PageFallback() {
  // Skeleton berbentuk konten (hero + list) > spinner di void: tidak ada
  // layout shift saat chunk halaman selesai dimuat, terasa lebih cepat.
  // Shimmer & varian dark ikut sistem .skeleton; reduced-motion sudah
  // dimatikan oleh catch-all global di index.css.
  return (
    <div role="status" aria-label="Memuat halaman" className="space-y-4">
      <div className="skeleton rounded-3xl h-36" />
      <div className="space-y-3">
        <div className="skeleton rounded-2xl h-16" />
        <div className="skeleton rounded-2xl h-16" />
        <div className="skeleton rounded-2xl h-16" />
      </div>
    </div>
  );
}

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
  const [anggotaOpen, setAnggotaOpen] = useState(false);
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
    // Splash ber-brand (logo + nama) > spinner telanjang: first impression
    // terasa "produk", bukan halaman loading generik.
    return (
      <div className="app-bg min-h-dvh flex flex-col items-center justify-center gap-5">
        <img
          src={logoRT}
          alt=""
          className="pop h-16 w-16 rounded-2xl object-contain ring-1 ring-black/[0.06] dark:ring-white/10 shadow-sm"
        />
        <div className="flex flex-col items-center gap-3">
          <p className="text-base font-semibold tracking-tight text-ink dark:text-gray-100">Hadiran RT</p>
          <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
        </div>
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
      <div className="app-bg min-h-dvh">
        <Header
          role={isWargaMode ? 'warga' : auth.role}
          onLogout={isWargaMode ? ctxValue.exitWargaMode : auth.signOut}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onOpenRiwayat={ctxValue.isBendahara ? () => setRiwayatOpen(true) : undefined}
          onOpenLaporan={ctxValue.isBendahara ? () => setLaporanOpen(true) : undefined}
          onOpenBackup={ctxValue.isBendahara ? () => setBackupOpen(true) : undefined}
          onOpenAnggota={ctxValue.isBendahara ? () => setAnggotaOpen(true) : undefined}
          onOpenTentang={() => setTentangOpen(true)}
        />
        {/* Nav = bar DOK bawah (h-[70px] + safe-area di dalam bar) → beri ruang
            agar konten tak ngumpet di belakangnya: 4.5rem bar + 1.75rem napas.
            Nilai sinkron dgn offset FAB & tombol sticky absensi (satu sistem). */}
        <main className="max-w-lg mx-auto px-4 pt-4" style={{ paddingBottom: 'calc(4.5rem + env(safe-area-inset-bottom) + 1.75rem)' }}>
          <PullToRefresh onRefresh={handleRefresh}>
            <div {...swipe}>
              <div key={`${activeTab}-${refreshKey}`} className={dir > 0 ? 'page-in-right' : 'page-in-left'}>
                <Suspense fallback={<PageFallback />}>
                  {activeTab === 'beranda'  && <Beranda onNavigate={(tab) => changeTab(tab as TabName)} />}
                  {activeTab === 'jadwal'   && (isWargaMode ? <JadwalWargaPage /> : <JadwalPage />)}
                  {activeTab === 'talangan' && <TalanganPage onBack={isWargaMode ? () => changeTab('beranda') : undefined} />}
                  {activeTab === 'kas'      && <KasHadiranPage />}
                  {activeTab === 'kas-rt'   && <KasRTPage />}
                </Suspense>
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
        {/* Sambutan orientasi sekali-lihat (warga baru) — self-gate via localStorage */}
        <WelcomeSheet />
        {/* Overlay bendahara/umum — chunk dimuat saat pertama dibuka (gate by state).
            Tiap overlay return null saat !open, jadi mount-on-open setara perilaku. */}
        <Suspense fallback={null}>
          {ctxValue.isBendahara && riwayatOpen && (
            <RiwayatAktivitas open onClose={() => setRiwayatOpen(false)} />
          )}
          {ctxValue.isBendahara && laporanOpen && (
            <LaporanTriwulan open onClose={() => setLaporanOpen(false)} />
          )}
          {ctxValue.isBendahara && backupOpen && (
            <BackupRestore open onClose={() => setBackupOpen(false)} />
          )}
          {ctxValue.isBendahara && anggotaOpen && (
            <KelolaAnggota open onClose={() => setAnggotaOpen(false)} />
          )}
          {tentangOpen && (
            <TentangApp open onClose={() => setTentangOpen(false)} />
          )}
        </Suspense>
      </div>
    </AuthContext.Provider>
  );
}
