/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      /* ── Tangga z-index app (SATU sumber, anti-tabrak) ─────────────
         Tier overlay global dari bawah ke atas. Dua tier terbawah pakai
         default Tailwind agar tak ada nilai kembar:
           z-30  = fab     → FAB, sengaja DI BAWAH nav agar tertutup backdrop saat form terbuka
           z-40  = nav     → Header + BottomNav + scrim dismiss-nya
           z-50  = overlay → bottom-sheet, full-page overlay, dropdown menu
         lalu token bernama untuk tier di atasnya:
           z-menu    = Header SAAT menu ⋯ hidup — naik di atas scrim portal z-40
                       (header ber-transform = stacking context; dropdown z-50 di
                       dalamnya tak bisa menembus keluar), tetap di bawah overlay
           z-banner  = prompt app-level (Install / PWA update)
           z-modal   = modal di ATAS overlay (form bertumpuk) + SuccessOverlay + WelcomeSheet
           z-toast   = Toaster — SELALU paling atas & sendirian (jangan ada yg menyamai)
           z-tooltip = InfoTip portal — HARUS di atas toast agar tak pernah tertutup modal/toast manapun */
      zIndex: {
        fab: '30',
        menu: '45',
        banner: '55',
        modal: '60',
        toast: '70',
        tooltip: '80',
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
        sunken: '#ECF1F7', // background app — WAJIB sama dgn body & .app-bg di index.css + manifest background_color + landing.html (anti strip beda tone saat overscroll). MATERIAL-FLAT (2 Jul): #EAEFF6→#ECF1F7 (nada Gmail/Google apps) + seluruh sistem kartu pindah ke bahasa FLAT ala Google/myBCA/BYOND — kanvas rata tanpa whisper radial, kartu putih murni ber-hairline, bayangan tinggal satu contact whisper. 9 pass naik-turun L kanvas tak pernah selesai karena akar masalahnya dua bahasa visual campur (nav/pill/banner sudah flat, kartu masih floating-glass) — bukan nilai L. Jangan tuning L lagi.
        line: '#D3DAE3',    // garis/divider tipis. MATERIAL-FLAT (2 Jul): #CFD5DF→#DAE0E8 — border kartu kini SATU-SATUNYA tepi (edge ring di --shadow-card dihapus), jadi diringankan ke hairline whisper ala Google (#DADCE0 versi sejuk). Pass kontras-tercetak (8 Jul): #DAE0E8→#D3DAE3 — user minta kontras lebih premium; naikkan SATU step di dalam bahasa flat (hairline = lever sah) agar tepi kartu "tercetak", tetap whisper-class bukan bingkai.
        control: '#CBD5E1', // border kontrol (input/tombol) — slate-300, lebih kuat dari line. Pass kontras-tercetak (8 Jul): #E2E8F0→#CBD5E1 — sebelumnya malah LEBIH TERANG dari line (komentar lama tak lagi benar); kini field/tombol punya tepi jelas ala form fintech, hierarki tepi pulih: control > line > divider baris.
        /* ── Teks (semua lolos kontras AA di atas putih) ────────────── */
        ink: {
          DEFAULT: '#0B1220', // judul / nominal utama (near-black, kontras maksimal)
          sub: '#1F2937',     // teks sekunder (gray-800 — pass kontras-terbaca 8 Jul: naik dari 700; ≈14.7:1)
          faint: '#334155',   // tanggal / caption (slate-700 — pass kontras-terbaca 8 Jul: naik dari 600; ≈10.4:1, tangga tetap: ink > sub > faint > gray-400-remap #475569)
        },
      },
    },
  },
  plugins: [],
};
