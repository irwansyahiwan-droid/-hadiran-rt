import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import type { TabName } from './components/layout/BottomNav';
import Beranda from './pages/Beranda';
import JadwalPage from './pages/Jadwal';
import AbsensiPage from './pages/Absensi';
import TalanganPage from './pages/Talangan';
import KasHadiranPage from './pages/KasHadiran';
import KasRTPage from './pages/KasRT';
import WargaPage from './pages/Warga';

export default function App() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('beranda');

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!auth.user) {
    return <Login onLogin={auth.signIn} />;
  }

  const ctxValue = { ...auth, isBendahara: auth.role === 'bendahara' };

  return (
    <AuthContext.Provider value={ctxValue}>
      <div className="min-h-screen bg-gray-50">
        <Header role={auth.role} onLogout={auth.signOut} />
        <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
          {activeTab === 'beranda' && (
            <Beranda onNavigate={(tab) => setActiveTab(tab as TabName)} />
          )}
          {activeTab === 'jadwal' && <JadwalPage />}
          {activeTab === 'absensi' && <AbsensiPage />}
          {activeTab === 'talangan' && <TalanganPage />}
          {activeTab === 'kas' && <KasHadiranPage />}
          {activeTab === 'kas-rt' && <KasRTPage />}
          {activeTab === 'warga' && <WargaPage />}
        </main>
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>
    </AuthContext.Provider>
  );
}
