import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
