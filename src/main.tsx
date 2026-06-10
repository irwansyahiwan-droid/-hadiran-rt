import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
// Inter self-hosted (variable, satu file woff2): di-bundle Vite → same-origin →
// ke-cache service worker → font tetap ada saat offline, tanpa FOUT CDN.
import '@fontsource-variable/inter';
import './index.css';

// Pulih otomatis dari "chunk basi": setelah versi baru di-deploy, index.html lama
// yang masih terbuka bisa menunjuk ke hash chunk yang sudah 404 → dynamic import()
// gagal (mis. tombol PDF "loading terus"). Muat ulang sekali untuk ambil versi
// terbaru, lalu izinkan pemulihan lagi setelah app sehat beberapa detik.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('chunkReload')) return;
  sessionStorage.setItem('chunkReload', '1');
  window.location.reload();
});
setTimeout(() => sessionStorage.removeItem('chunkReload'), 5000);

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      {/* Observability: traffic (Analytics) + Core Web Vitals (Speed Insights) */}
      <Analytics />
      <SpeedInsights />
    </StrictMode>
  );
}
