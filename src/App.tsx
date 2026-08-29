import { useState, useRef, useEffect, lazy, Suspense } from 'react';
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
import { labelTab, urutanTab, tabTerlihat, type TabName } from './components/layout/tabs';
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

/** Keadaan yang bertahan selama SESI TAB ini. Satu tempat untuk keduanya —
 *  kalau tersebar, gampang ada transisi yang menulis satu kunci dan lupa yang
 *  lain, lalu sesi memulihkan setengah keadaan. */
const KUNCI_WARGA = 'hadiran-warga-sesi';
const KUNCI_TAB = 'hadiran-tab-sesi';
function simpanWarga(aktif: boolean) {
  try {
    if (aktif) sessionStorage.setItem(KUNCI_WARGA, '1');
    else sessionStorage.removeItem(KUNCI_WARGA);
  } catch { /* mode privat / storage penuh → gate cuma tak bertahan reload */ }
}
function simpanTab(tab: TabName | null) {
  try {
    if (tab) sessionStorage.setItem(KUNCI_TAB, tab);
    else sessionStorage.removeItem(KUNCI_TAB);
  } catch { /* abaikan — reload cuma kembali ke Beranda spt sebelumnya */ }
}
/** Baca tab tersimpan, TERVALIDASI lawan `urutanTab` (sumber tunggal daftar
 *  tab). Tanpa validasi, satu nilai basi/asing dari sesi lama akan lolos jadi
 *  `activeTab` yang tak cocok satu cabang render pun → layar kosong. */
function bacaTab(): TabName {
  try {
    const t = sessionStorage.getItem(KUNCI_TAB);
    return t && (urutanTab as string[]).includes(t) ? (t as TabName) : 'beranda';
  } catch { return 'beranda'; }
}

export default function App() {
  const auth = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  /* Tab aktif ikut bertahan melewati reload (19 Agu 2026). Sebelumnya ia selalu
     kembali ke Beranda — kecil, tapi digabung dgn reload "Muat ulang" milik
     PwaUpdatePrompt efeknya persis kebalikan yang diharapkan: warga sudah
     berada di Kas RT, menerima toast versi baru, lalu mendarat di layar lain.
     Sesi, bukan localStorage — sama alasannya dgn gate warga di bawah. */
  const [activeTab, setActiveTab] = useState<TabName>(bacaTab);
  /* Gate warga bertahan selama SESI TAB ini — `sessionStorage`, bukan
     `localStorage` dan bukan state murni.
     Sampai 19 Agu 2026 ini `useState(false)` polos: setiap reload melempar
     warga kembali ke Login. Itu bukan skenario langka — `PwaUpdatePrompt`
     memang MEMANGGIL `window.location.reload()` saat warga menekan "Muat
     ulang" pada toast versi baru, jadi tiap deploy = satu lemparan. Komentar
     di berkas itu bahkan sudah mencatat gejalanya ("menendang warga yg baru
     ketik 'warga' balik ke Login, mental ketik 2x beruntun"); yang diperbaiki
     waktu itu baru reload pada KLAIM PERTAMA service worker, sedangkan reload
     pada update sungguhan tetap membuang mode warga.
     `sessionStorage`, jadi gate-nya TIDAK dilemahkan: tab baru / sesi baru
     tetap harus mengetik 'warga'. Yang dipulihkan cuma reload yang dipicu APP
     SENDIRI di tab yang sama. Jangan pindahkan ke `localStorage` — itu
     mengubah soft-gate jadi permanen. */
  const [wargaMode, setWargaMode] = useState(() => {
    try { return sessionStorage.getItem(KUNCI_WARGA) === '1'; } catch { return false; }
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [dir, setDir] = useState(1); // arah transisi tab: 1 = ke kanan, -1 = ke kiri
  const [riwayatOpen, setRiwayatOpen] = useState(false);
  const [laporanOpen, setLaporanOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [anggotaOpen, setAnggotaOpen] = useState(false);
  const [tentangOpen, setTentangOpen] = useState(false);

  // Diturunkan dari daftar tab (tabs.ts), BUKAN disalin — dulu baris ini
  // menuliskan ulang kelima id-nya, jadi menggeser urutan tab di nav diam-diam
  // membuat arah animasi geser di sini terbalik.
  const TAB_ORDER = urutanTab;
  const scrollPos = useRef<Record<string, number>>({});

  const changeTab = (tab: TabName) => {
    if (tab === activeTab) return;
    scrollPos.current[activeTab] = window.scrollY; // ingat posisi scroll tab sekarang
    setDir(TAB_ORDER.indexOf(tab) >= TAB_ORDER.indexOf(activeTab) ? 1 : -1);
    setActiveTab(tab);
    simpanTab(tab);
  };

  // Swipe kiri = tab berikutnya, kanan = tab sebelumnya (pakai urutan tab yang terlihat)
  const swipeTab = (delta: 1 | -1) => {
    const warga = wargaMode && !auth.user;
    // Penyaring yang SAMA dgn bar nav (tabs.ts) — dulu disalin sbg
    // `.filter(t => t !== 'talangan')` di dua tempat.
    const order = tabTerlihat(warga).map((t) => t.id);
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
  /* `lapisan: false` — entri ini cuma membuat Back kembali ke Beranda; ia tak
     menutupi layar. Menghitungnya sebagai lapisan mematikan swipe ganti-tab &
     pull-to-refresh di SEMUA tab selain Beranda (lihat `adaLapisanTerbuka`). */
  useBackDismiss(activeTab !== 'beranda', () => changeTab('beranda'), { lapisan: false });

  /* Judul dokumen ikut tab aktif. App satu-halaman tak pernah mengganti judul
     sendiri: sebelumnya kelima layar sama-sama "Hadiran RT 004/006", padahal
     judul inilah yang diumumkan pembaca layar tiap pindah layar dan yang muncul
     di riwayat/pengalih tab HP. Layar Login sengaja memakai judul dasar. */
  const cangkangTampil = !!auth.user || wargaMode;
  useEffect(() => {
    const dasar = 'Hadiran RT 004/006';
    const nama = cangkangTampil ? labelTab(activeTab) : '';
    document.title = nama ? `${nama} · ${dasar}` : dasar;
  }, [activeTab, cangkangTampil]);

  // Restorasi posisi scroll saat pindah tab (best-effort untuk konten yang dimuat async).
  useEffect(() => {
    const target = scrollPos.current[activeTab] ?? 0;
    if (target <= 0) { window.scrollTo(0, 0); return; }
    const raf = requestAnimationFrame(() => window.scrollTo(0, target));
    const t1 = setTimeout(() => window.scrollTo(0, target), 160);
    const t2 = setTimeout(() => window.scrollTo(0, target), 360);
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, [activeTab]);

  /* Pra-unduh isi app SELAGI warga mengetik sandi.
     Diukur 31 Jul di 400 kbps/latensi 400 ms: sesudah tombol Masuk ditekan,
     cangkang app muncul dalam ±0,5 detik tapi ANGKA baru tampil di ±4,3 detik —
     karena chunk Beranda, klien Supabase, dan belasan chunk ikon baru mulai
     diunduh saat itu juga. Padahal antara layar Login tercat dan tombol ditekan
     ada beberapa detik mengetik: bandwidth yang menganggur.

     Dijalankan saat idle supaya tak berebut dgn render Login, dan dilewati bila
     pengguna menyalakan mode hemat data (`saveData`) — di sana unduhan spekulatif
     justru merugikan. Kegagalan diabaikan: ini murni percepatan, bukan syarat. */
  useEffect(() => {
    if (auth.loading || auth.user || wargaMode) return; // hanya saat MENUNGGU di layar Login
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (nav.connection?.saveData) return;
    const jalan = () => {
      import('./pages/Beranda').catch(() => {});
      import('./lib/supabase').catch(() => {});
    };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) { const id = ric(jalan, { timeout: 2500 }); return () => (window as unknown as { cancelIdleCallback?: (i: number) => void }).cancelIdleCallback?.(id); }
    const t = setTimeout(jalan, 1200);
    return () => clearTimeout(t);
  }, [auth.loading, auth.user, wargaMode]);

  // Fade + hapus splash pra-React (#app-splash di index.html) begitu sesi auth
  // siap. Satu frame ditahan agar shell app ter-commit dulu → serah-terima
  // splash → konten mulus tanpa kedip kanvas. Fallback timer menjamin terhapus
  // walau transitionend tak firing.
  useEffect(() => {
    if (auth.loading) return;
    const el = document.getElementById('app-splash');
    if (!el) return;
    let removed = false;
    let raf = 0;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const remove = () => { if (!removed) { removed = true; el.remove(); } };
    const mulaiFade = () => {
      raf = requestAnimationFrame(() => {
        el.classList.add('as-hide');
        el.addEventListener('transitionend', remove, { once: true });
      });
      fallback = setTimeout(remove, 700);
    };
    /* Stylesheet utama kini non-blocking (lihat plugin css-non-blocking di
       vite.config.ts) supaya splash tercat ~1,8 detik lebih awal. Konsekuensinya
       splash TAK BOLEH dibuang sebelum CSS terpasang — kalau tidak, warga melihat
       kilatan konten tanpa gaya. Di dev CSS masuk lewat JS (tak ada link), jadi
       langsung jalan; jaring 3 detik menjaga splash tak pernah menyandera app
       kalau onload tak firing (mis. CSS dari cache tanpa event). */
    const w = window as unknown as { __cssReady?: boolean };
    if (import.meta.env.DEV || w.__cssReady) {
      mulaiFade();
      return () => { cancelAnimationFrame(raf); clearTimeout(fallback); };
    }
    let done = false;
    const lanjut = () => { if (!done) { done = true; mulaiFade(); } };
    document.addEventListener('css-siap', lanjut, { once: true });
    const jaring = setTimeout(lanjut, 3000);
    return () => {
      done = true;
      document.removeEventListener('css-siap', lanjut);
      clearTimeout(jaring);
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
  }, [auth.loading]);

  if (auth.loading) {
    // Splash ber-brand (logo + nama) > spinner telanjang: first impression
    // terasa "produk", bukan halaman loading generik.
    return (
      <div className="app-bg min-h-dvh flex flex-col items-center justify-center gap-5">
        <img
          src={logoRT}
          alt=""
          width={64}
          height={64}
          className="pop h-16 w-16 rounded-2xl object-contain ring-1 ring-black/[0.06] dark:ring-white/10 rest"
        />
        <div className="flex flex-col items-center gap-4">
          <p className="text-subtitle font-semibold tracking-tight text-ink dark:text-gray-100">Hadiran RT</p>
          {/* Shimmer bar (bahasa .skeleton), bukan spinner — sinkron dgn #app-splash. */}
          <div className="as-bar" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (!auth.user && !wargaMode) {
    return (
      <Login
        onLogin={auth.signIn}
        onWargaMode={() => { simpanWarga(true); simpanTab(null); setWargaMode(true); setActiveTab('beranda'); }}
      />
    );
  }

  const isWargaMode = wargaMode && !auth.user;

  const ctxValue = {
    ...auth,
    isBendahara: auth.role === 'bendahara',
    isWargaMode,
    /* Keluar dari sisi BENDAHARA juga membuang kunci sesi warga. Hari ini jalur
       itu tak bisa dicapai (Login cuma tampil saat `!user && !wargaMode`), tapi
       kunci yang tertinggal di sesi = mode warga diam-diam hidup lagi sesudah
       logout. Murah, dan menutup kelasnya sekarang daripada menunggu ada rute
       baru yang membukanya. */
    signOut: async () => { simpanWarga(false); simpanTab(null); await auth.signOut(); },
    exitWargaMode: () => { simpanWarga(false); simpanTab(null); setWargaMode(false); setActiveTab('beranda'); },
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
