import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Jaring pengaman global: kalau ada error render di mana pun, tampilkan layar
 * pemulihan yang sopan (bukan layar putih) + tombol "Muat ulang". Wajib untuk
 * app premium — 69 warga tak boleh lihat blank screen.
 *
 * Catatan: "chunk basi" PWA ditangani terpisah di main.tsx (vite:preloadError);
 * boundary ini menangkap error logika/render biasa.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log ke konsol; saat observability aktif, error otomatis ikut terpantau.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    // Bersihkan flag chunk agar reload benar-benar ambil versi terbaru.
    try { sessionStorage.removeItem('chunkReload'); } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="app-bg min-h-dvh flex items-center justify-center px-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-7 max-w-sm w-full text-center">
          <span className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-warn dark:text-amber-400" />
          </span>
          <h1 className="text-lg font-bold text-ink dark:text-gray-100 mb-1.5">
            Ups, ada gangguan
          </h1>
          <p className="text-sm text-ink-sub dark:text-gray-400 mb-5 leading-relaxed">
            Terjadi kesalahan tak terduga. Coba muat ulang halaman — datamu aman,
            tidak ada yang hilang.
          </p>
          <button
            onClick={this.handleReload}
            className="btn-brand press w-full py-3 font-semibold inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Muat ulang
          </button>
        </div>
      </div>
    );
  }
}
