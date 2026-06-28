/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      /* ── Tangga z-index app (SATU sumber, anti-tabrak) ─────────────
         Tier overlay global dari bawah ke atas. Dua tier terbawah pakai
         default Tailwind agar tak ada nilai kembar:
           z-40  = nav     → Header + BottomNav + scrim dismiss-nya
           z-50  = overlay → bottom-sheet, full-page overlay, dropdown menu
         lalu token bernama untuk tier di atasnya:
           z-banner = prompt app-level (Install / PWA update)
           z-modal  = modal di ATAS overlay (form bertumpuk) + SuccessOverlay + WelcomeSheet
           z-toast  = Toaster — SELALU paling atas & sendirian (jangan ada yg menyamai) */
      zIndex: {
        banner: '55',
        modal: '60',
        toast: '70',
      },
      fontFamily: {
        // Display = Sora (judul & nominal hero). Body default tetap Inter (di body CSS).
        display: ['Sora Variable', 'Sora', 'Inter Variable', 'system-ui', 'sans-serif'],
      },
      /* ── Type ramp ringkas (mobile) ────────────────────────────────
         Ganti 8 micro-step arbitrary (text-[9px]..text-[17px]) jadi 4 langkah
         bermakna. Nilai = font-size SAJA (tanpa line-height) → utility leading-*
         yang sudah ada tetap menang, tidak ada drift baris. Heading tetap pakai
         skala Tailwind (lg/xl/2xl/5xl). Migrasi bertahap per layar. */
      fontSize: {
        micro:   '0.6875rem', // 11px — badge kecil, nomor, label uppercase mungil (serap 9/10/11)
        caption: '0.8125rem', // 13px — tanggal, caption, teks sekunder (serap 12/13)
        body:    '0.9375rem', // 15px — body utama list/baris (serap 14/15)
        amount:  '1.0625rem', // 17px — nominal menonjol
      },
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
        neg: '#E11D48',   // uang keluar / negatif (rose-600) — SATU merah: selaras rose light & dark-rose-400
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
        sunken: '#F2F5FA', // background app — WAJIB sama dgn body & .app-bg di index.css + manifest background_color (anti strip beda tone saat overscroll). Pass 6: #EEF1F6→#E6EAF1 ("kartu lebih nendang"). Pass 8 (28 Jun): #E6EAF1→#F2F5FA near-white sejuk (user: "putih, bersih, premium, segar, trend 2026") — separasi kartu FULL sandar shadow + edge crisp
        line: '#CFD5DF',    // garis/divider tipis. Pass 3: #E6EAF1 dulu LEBIH TERANG dari canvas → border kartu jadi garis terang yg mewashout tepi crisp. Diturunkan ≈ tone canvas agar tak melawan hairline gelap (.lift); divider tetap bersih di atas putih.
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
