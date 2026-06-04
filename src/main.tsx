import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
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
      <App />
    </StrictMode>
  );
}
