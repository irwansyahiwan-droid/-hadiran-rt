/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  /* ── `hover:` DIGERBANG `@media (hover: hover)` ────────────────────────
     App ini touch-first: warga membukanya di HP, dan di HP `:hover` tak
     pernah berarti "kursor di atas" — ia NYANGKUT setelah diketuk sampai
     ada ketukan di tempat lain. Baris yang baru ditinggalkan tetap terlihat
     ter-highlight, jadi terbaca "masih terpilih" padahal tidak.

     Ini BUKAN masalah baru: `.btn-brand`/`.btn-danger` di index.css sudah
     digerbang tangan persis karena ini ("tombol menebal permanen di HP").
     Yang tak pernah ikut = 106 utility `hover:` Tailwind di seluruh app,
     karena Tailwind 3 memancarkan `:hover` telanjang secara default. Satu
     flag menutup semuanya sekaligus; di desktop nol perubahan.

     PRASYARAT yang sudah dipenuhi lebih dulu: 6 kontrol yang dulu cuma
     punya `hover:` (item ExportMenu & FilterChips, 3 tombol borongan
     absensi Jadwal, tombol hapus Talangan) diberi `active:`/`.press`.
     Tanpa itu, menggerbang hover justru membuat keenamnya bisu total di
     HP — satu-satunya perangkat yang dipakai warga. */
  future: { hoverOnlyWhenSupported: true },
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
        /* nav & scrim ditambahkan 4 Agu 2026. Sebelumnya keduanya sama-sama
           `z-40` mentah, jadi yang menang cuma karena scrim di-portal ke
           <body> = lebih akhir di DOM. Kalau urutan itu terbalik, ketukan
           di nav saat menu terbuka akan PINDAH TAB tanpa menutup menu.
           Urutan chrome sekarang eksplisit: nav 40 < scrim 42 < menu 45. */
        nav: '40',
        scrim: '42',
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
        /* Pass KONTRAS MAKSIMAL (4 Agu 2026, permintaan user "kontras dibuat
           maksimal"). Ambang app naik dari AA (4,5:1) ke AAA (7:1) untuk TEKS
           di permukaan aslinya — bukan cuma di atas putih, tapi juga di atas
           kanvas #ECF1F7 yang selalu sedikit lebih gelap. Tiap nilai di bawah
           dihitung terhadap KEDUANYA; yang dilaporkan = yang terburuk. */
        brand: {
          DEFAULT: '#0F4C2E', // deep — fill chip aktif, judul kuat, ink tab aktif (8,1:1 di atas pil nav)
          600: '#145D39',
          500: '#1B7249',
          /* #0D6B5E → #0A5B4E: teal lama 6,39:1 di putih & 5,63:1 di kanvas —
             lolos AA, gagal AAA. Turun satu step: 8,02:1 / 7,07:1. */
          link: '#0A5B4E',    // teal-green untuk tautan "Lihat semua"
          /* #1A9B86 → #34D399 (emerald-400): teal lama cuma 5,13:1 di atas kartu
             gray-900. #34D399 = 9,25:1, DAN menyatukan aksen gelap app — warna
             ini sudah dipakai cincin fokus `.field` gelap, jadi bukan hex baru:
             satu mint untuk tautan, tab aktif, fokus, accent-color, ::selection. */
          linkDark: '#34D399', // pasangan link utk dark mode (tab aktif + tautan) — SATU sumber
        },
        /* ── Semantik nominal: SATU hijau, SATU merah, SATU amber ──────
           Hindari campur red/rose & green/emerald di satu layar. */
        /* Ketiganya turun satu step di pass KONTRAS MAKSIMAL (4 Agu). Riwayatnya
           selalu ke arah yang sama — tiap pass menemukan warna sebelumnya cuma
           "lolos" di permukaan termudah — jadi kali ini ambangnya dinaikkan
           sekalian ke AAA, diukur di putih DAN di kanvas #ECF1F7. */
        /* Pasangan `dark` ditambahkan 4 Agu 2026 (pass polish grafik). Sampai
           sekarang ketiga token ini cuma punya sisi TERANG, jadi tiap call-site
           gelap menuliskan warnanya sendiri (`dark:text-emerald-400`,
           `dark:text-rose-400`, `dark:text-amber-400`) — sah untuk teks, tapi
           begitu warna yang sama dibutuhkan sebagai FILL (bar grafik, dot
           legenda, garis tren) tak ada yang bisa dirujuk, dan grafik pun
           memilih hex sendiri (emerald-600/rose-500/#0F6039). Nilai di bawah
           BUKAN warna baru: persis tiga warna uang mode gelap yang sudah
           dipakai app, kini punya nama. Ketiganya ≥9:1 di atas kartu
           `dark:bg-gray-900` → aman untuk teks (1.4.3) maupun grafik (1.4.11). */
        pos: {            // uang masuk / positif  (emerald-800/900) — #047857 cuma 5,48:1 putih / 4,83:1 kanvas; #065F46 masih 6,59 di atas panel .inset-soft; kini 8,96 putih / 7,69 inset-soft
          DEFAULT: '#05543E',
          dark: '#34D399',  // = emerald-400 yg sudah dipakai `dark:text-emerald-400`; 9,04:1 di kartu gelap
        },
        neg: {            // uang keluar / negatif (rose-800) — SATU merah: rose-600 gagal AA di rose-50/kanvas, rose-700 #BE123C lolos AA tapi 6,29/5,54; diukur 6,75 di kanvas → turun lagi ke #941136: 8,78 / 7,29
          DEFAULT: '#941136',
          dark: '#FDA4AF',  // = hasil remap `dark:text-rose-400` di index.css (rose-300); 9,42:1 di kartu gelap
        },
        warn: {           // tunggakan / perhatian (amber-900) — amber-700 gagal AA di kanvas/banner, amber-800 #92400E 7,10/6,26; kini 9,07 / 8,00
          DEFAULT: '#78350F',
          dark: '#FBBF24',  // = amber-400 yg sudah dipakai `dark:text-amber-400`; 10,63:1 di kartu gelap
        },
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
        line: '#B8C4D3',    // garis/divider tipis. MATERIAL-FLAT (2 Jul): #CFD5DF→#DAE0E8 — border kartu kini SATU-SATUNYA tepi (edge ring di --shadow-card dihapus), jadi diringankan ke hairline whisper ala Google (#DADCE0 versi sejuk). Pass kontras-tercetak (8 Jul): #DAE0E8→#D3DAE3 — user minta kontras lebih premium; naikkan SATU step di dalam bahasa flat (hairline = lever sah) agar tepi kartu "tercetak", tetap whisper-class bukan bingkai. Pass "Etched Premium" (26 Jul): #D3DAE3→#C5CFDB — user minta warna/kontras lebih mahal (trend 2026); tepi kartu dinaikkan SATU step lagi (lever hairline yg sama, BUKAN glass/shadow) agar "tercetak" ala Linear/Stripe/Mercury light. Edge-family digelapkan serempak menjaga hierarki control > line > divider. Pass KONTRAS MAKSIMAL (4 Agu): #C5CFDB→#B8C4D3 — satu step lagi di lever yang SAMA (hairline), bukan glass/shadow/kanvas. Nilainya persis `control` sebelum pass non-teks, jadi hierarki control #64748B > line #B8C4D3 > divider baris #D1DAE5 tetap utuh. Hairline ini juga jadi garis atas bar nav dok (.nav-dock) supaya tepi bar & tepi kartu satu bahasa.
        /* border kontrol (input/tombol) — lebih kuat dari line. Riwayat: #E2E8F0→#CBD5E1
           (8 Jul, dulu malah LEBIH TERANG dari line) → #B8C4D3 (26 Jul "Etched Premium",
           naik serempak dgn line menjaga hierarki control > line > divider).
           Pass NON-TEKS (2 Agu): #B8C4D3→#64748B. Bukan tuning rasa — #B8C4D3 cuma
           1,56:1 lawan kanvas & 1,77:1 lawan kartu putih, sedangkan fill field
           (bg-gray-50) cuma 1,03:1, jadi kolom isian tak punya penanda apa pun yang
           lolos §1.4.11: 34 dari 34 gagal. #64748B = 4,19 / 4,76 (margin lega supaya
           tak jatuh lagi kalau kanvas disetel ulang). Tetap hairline 1px — lever yang
           sama, bukan bingkai. `.dark` ikut naik: gray-700 #374151 hanya 1,72:1 lawan
           sheet gelap. Diukur: scripts/audit-kontras-nonteks.mjs. */
        control: { DEFAULT: '#64748B', dark: '#6B7280' },
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
