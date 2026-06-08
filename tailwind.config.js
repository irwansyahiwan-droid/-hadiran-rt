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
        },
        /* ── Semantik nominal: SATU hijau, SATU merah, SATU amber ──────
           Hindari campur red/rose & green/emerald di satu layar. */
        pos: '#047857',   // uang masuk / positif  (emerald-700, on-brand)
        neg: '#DC2626',   // uang keluar / negatif (red-600)
        warn: '#B45309',  // tunggakan / perhatian (amber-700)
        /* ── Permukaan & garis: satu hairline, bukan 3 abu berbeda ──── */
        surface: '#FFFFFF',
        sunken: '#E6EDF5', // background app (kanvas terang — kontras kartu dari shadow)
        line: '#ECEFF3',    // garis/divider tipis untuk semua card
        control: '#E2E8F0', // border kontrol (input/tombol) — sedikit lebih kuat dari line
        /* ── Teks (semua lolos kontras AA di atas putih) ────────────── */
        ink: {
          DEFAULT: '#111827', // judul / nominal utama
          sub: '#4B5563',     // teks sekunder
          faint: '#64748B',   // tanggal / caption (naik dari slate-400 agar AA)
        },
      },
      borderRadius: {
        card: '24px', // permukaan besar (card/hero)
        chip: '12px', // ikon / pill kecil
      },
    },
  },
  plugins: [],
};
