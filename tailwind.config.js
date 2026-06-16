/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── Brand hijau (sumber: hero gradient di index.css) ──────────
           JANGAN ganti ke navy/gold. Lihat memory design-system. */
        brand: {
          DEFAULT: '#0F4C2E', // deep — fill chip aktif, judul kuat
          600: '#145D39',
          500: '#1B7249',
          link: '#0D6B5E',    // teal-green untuk tautan "Lihat semua"
          linkDark: '#1A9B86', // pasangan link utk dark mode (tab aktif + tautan) — SATU sumber
        },
        /* ── Semantik nominal: SATU hijau, SATU merah, SATU amber ──────
           Hindari campur red/rose & green/emerald di satu layar. */
        pos: '#047857',   // uang masuk / positif  (emerald-700, on-brand)
        neg: '#DC2626',   // uang keluar / negatif (red-600)
        warn: '#B45309',  // tunggakan / perhatian (amber-700)
        /* ── Status SETOR (kartu hero Kas Hadiran saat sudah disetor) ──
           Biru = sinyal status, BUKAN accent kedua. Hanya dipakai di hero
           Kas Hadiran. Struktur DEFAULT/600/500 mirror brand utk pola gradient. */
        setor: {
          DEFAULT: '#1E40AF', // from — deep (blue-800)
          600: '#2563EB',     // via  (blue-600)
          500: '#3B82F6',     // to   (blue-500)
        },
        /* ── Permukaan & garis: satu hairline, bukan 3 abu berbeda ──── */
        surface: '#FFFFFF',
        sunken: '#DCE1EA', // background app — WAJIB sama dgn body & .app-bg di index.css + manifest background_color (anti strip beda tone saat overscroll)
        line: '#E6EAF1',    // garis/divider tipis untuk semua card — sedikit lebih tegas agar tepi card "tercetak" di canvas baru
        control: '#E2E8F0', // border kontrol (input/tombol) — sedikit lebih kuat dari line
        /* ── Teks (semua lolos kontras AA di atas putih) ────────────── */
        ink: {
          DEFAULT: '#0B1220', // judul / nominal utama (near-black, kontras maksimal)
          sub: '#374151',     // teks sekunder (gray-700 — naik dari 600 agar lebih tegas)
          faint: '#475569',   // tanggal / caption (slate-600 — naik dari 500, tetap kebaca jelas)
        },
      },
    },
  },
  plugins: [],
};
