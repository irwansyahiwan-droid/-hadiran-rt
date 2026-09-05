import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
// Inter & Sora self-hosted: @font-face-nya kini hidup di index.css dan menunjuk
// berkas hasil `scripts/gen-font.mjs` (sumbu bobot dijepit ke tangga app 400..800).
// Sampai 5 Sep 2026 dua baris import fontsource di sini yang memuatnya, dan
// komentarnya mengklaim "ke-cache service worker" — klaim yang TIDAK BENAR:
// SHELL diturunkan dari graf IMPOR, sedangkan font dirujuk `url()` dari dalam
// CSS, jadi pemetanya tak pernah melihatnya. Terukur 40 entri SHELL, nol font.
// Sekarang `swManifest` memungutnya dari bundel, dan `audit:unduh` menjaganya.
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
