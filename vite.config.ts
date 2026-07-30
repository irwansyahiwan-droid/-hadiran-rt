import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Stylesheet utama dilepas dari jalur render-blocking.
 *
 * Splash pra-React (#app-splash di index.html) sengaja ber-style INLINE supaya
 * tercat di paint pertama — tapi `<link rel=stylesheet>` yang disuntik Vite
 * menyandera paint itu. Diukur di CPU 4× lambat + 400 kbps/400 ms: FCP 2328 ms,
 * dan 524 ms ketika CSS-nya diblokir. Jadi splash yang seharusnya instan datang
 * ~1,8 detik terlambat.
 *
 * Pola `media="print"` + onload→`all` membuat unduhannya tetap jalan tapi tak
 * memblokir paint; `<noscript>` menjaga pengguna tanpa JS. Agar TAK ADA kilatan
 * konten tanpa gaya, onload juga menyalakan penanda `__cssReady` + event
 * `css-siap`, dan App.tsx menahan pembuangan splash sampai penanda itu menyala
 * (lihat efek "Fade + hapus splash"). CSS (±14 KB brotli) selalu mendarat jauh
 * sebelum bundel JS (±100 KB) selesai, jadi waktu siap-pakai tak melar.
 */
function cssNonBlocking(): Plugin {
  return {
    name: 'css-non-blocking',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet"([^>]*?)href="([^"]+)"([^>]*)>/g,
        (_m, pre: string, href: string, post: string) =>
          `<link rel="stylesheet"${pre}href="${href}"${post} media="print" ` +
          `onload="this.media='all';window.__cssReady=true;document.dispatchEvent(new Event('css-siap'))">` +
          `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cssNonBlocking()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // exceljs & html2canvas adalah chunk lazy (hanya dimuat saat ekspor) —
    // wajar besar; naikkan ambang agar warning tidak menutupi masalah nyata.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Pisah vendor stabil (React, Supabase) dari kode app → hash-nya jarang
        // berubah, jadi saat deploy ulang warga yang sudah pernah buka memakai
        // ulang cache vendor (repeat-load PWA lebih ringan). Lib berat lain
        // (jspdf/exceljs/html2canvas) tetap lazy lewat dynamic import.
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
});
