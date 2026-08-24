import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Sun, Moon, History, FileText, MoreVertical, DatabaseBackup, Info, Users, WifiOff, type LucideIcon } from 'lucide-react';
import logoRT from '../../assets/logo-rt.svg';
import { haptic } from '../../lib/utils';
import { useExitAnim } from '../../lib/hooks';
import { useBackDismiss } from '../../hooks/useBackDismiss';
import { useScrolledPast } from '../../hooks/useScrollDirection';
import { useOnline } from '../../hooks/useOnline';
import Tag from '../Tag';
import InfoTip from '../InfoTip';
import type { Role } from '../../hooks/useAuth';

interface HeaderProps {
  role: Role | null;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenRiwayat?: () => void;
  onOpenLaporan?: () => void;
  onOpenBackup?: () => void;
  onOpenAnggota?: () => void;
  onOpenTentang?: () => void;
}

/** Header menyusut + shadow/blur menguat saat halaman di-scroll (ala app fintech). */
export default function Header({ role, onLogout, isDark, onToggleTheme, onOpenRiwayat, onOpenLaporan, onOpenBackup, onOpenAnggota, onOpenTentang }: HeaderProps) {
  const isBendahara = role === 'bendahara';
  // Header menyusut + shadow/blur menguat saat halaman tergeser >6px dari puncak.
  // Listener scroll dibagi pakai (lihat hook).
  const scrolled = useScrolledPast(6);
  const online = useOnline();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuMounted = useExitAnim(menuOpen);
  /* Tombol Back HP menutup menu ini — bukan meninggalkan app. Warga app ini
     tak punya tombol Escape; `audit:papan-ketik` menguji Escape dan melaporkan
     menu ini sehat, dan justru itu titik butanya. Lihat `npm run audit:mundur`. */
  useBackDismiss(menuOpen, () => setMenuOpen(false));
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* Saat menu buka: fokus item pertama → pola menu WAI-ARIA (keyboard mulai di dalam).
     Dependensi WAJIB ikut `menuMounted`, bukan `menuOpen` saja. `useExitAnim`
     menunda mount satu commit (mounted dinaikkan dari dalam useEffect-nya), jadi
     di commit tempat menuOpen baru jadi true panelnya BELUM ada di DOM:
     `menuRef.current` masih null dan `?.focus()` diam-diam tak berbuat apa-apa.
     Fokus lalu tertinggal di tombol pemicu selamanya — dan karena `onMenuKeyDown`
     menempel di WADAH menu, Escape/panah/Home/End tak pernah kebagian event sama
     sekali (19 Agu 2026: activeElement terukur tetap BUTTON "Menu" di 390x844
     maupun 844x390). Sapuan lama lolos karena `tutup()` punya jaring klik-luar. */
  useEffect(() => {
    if (!menuOpen || !menuMounted) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [menuOpen, menuMounted]);

  function closeMenu() {
    setMenuOpen(false);
    triggerRef.current?.focus(); // kembalikan fokus ke tombol pemicu
  }

  // Navigasi keyboard menu: panah naik/turun siklik, Home/End, Escape menutup.
  function onMenuKeyDown(e: React.KeyboardEvent) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
    /* Tab MENUTUP menu (pola WAI-ARIA menu button) — TANPA `preventDefault` dan
       TANPA mengembalikan fokus ke pemicu, supaya fokus melanjutkan ke elemen
       berikutnya seperti yang diharapkan pengguna papan ketik. Karena itu
       `setMenuOpen(false)` langsung, bukan `closeMenu()` yang memanggil
       `triggerRef.focus()` — memanggilnya di sini akan melempar fokus mundur.
       Tanpa aturan ini Tab berjalan KELUAR diam-diam sementara menunya tetap
       terbuka: pengguna menyusuri halaman di BELAKANG scrim, dan Escape ikut
       mati karena handler ini menempel di wadah menu yang sudah ditinggalkan.
       Terukur 19 Agu: Tab ke-6 mendarat di "Ke slide 1" carousel Beranda. */
    else if (e.key === 'Tab') { setMenuOpen(false); }
  }

  // Item menu overflow (kebab) — semua aksi dirapikan ke sini agar top bar lega.
  const MenuItem = ({ icon: Icon, label, onClick, danger }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) => (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={() => { haptic(); setMenuOpen(false); onClick(); }}
      className={`w-full flex items-center gap-3 min-h-[44px] px-4 py-2.5 text-body font-medium transition-colors ${
        danger
          ? 'text-neg dark:text-rose-400 hover:bg-rose-50 active:bg-rose-100 dark:hover:bg-rose-900/20 dark:active:bg-rose-900/35'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700'
      }`}
    >
      <Icon className={`w-[18px] h-[18px] ${danger ? 'text-rose-500' : 'text-gray-400'}`} />
      {label}
    </button>
  );

  return (
    <header
      // Saat menu hidup: naik ke tier z-menu (45) di atas scrim portal z-scrim (42),
      // tetap di bawah overlay z-overlay — header ber-transform = stacking context
      // sendiri, jadi z-overlay milik dropdown tak bisa menembus keluar; tanpa bump
      // ini scrim (lebih akhir di DOM) menutup menu & item tak bisa diklik.
      // `transition` utility sengaja TIDAK dipasang di sini: properti + durasi
      // sudah ditulis eksplisit di `style.transition` di bawah, dan inline style
      // menang atas class → utility-nya cuma jadi kode mati yang menyesatkan.
      /* `backdrop-saturate-150` DIBUANG 6 Agu. Diukur, bukan ditaksir: screenshot
         header saat konten tergulir di bawahnya, sekali dgn `blur+saturate` dan
         sekali dgn `blur` saja, lalu piksel keduanya didekode dan dibandingkan →
         NOL piksel berbeda, di terang maupun gelap. Masuk akal: fill 80–90% sudah
         memucatkan yang tembus, dan blur meratakan warnanya ke netral dulu —
         menaikkan saturasi warna netral tetap netral. Yang tersisa cuma satu
         operasi filter lagi di layer GPU yang dicat ulang tiap frame gulir, di
         HP kelas bawah yang justru dipakai warga.
         BLUR-nya TETAP dan memang berbayar: tanpa itu, 20% latar yang tembus jadi
         bayangan teks TAJAM yang meluncur di balik header — terbaca seperti bug,
         bukan kedalaman (diukur: 32–38% piksel header berubah, selisih maks 45). */
      className={`sticky top-0 ${menuMounted ? 'z-menu' : 'z-nav'} backdrop-blur-xl ${
        scrolled
          ? 'bg-white/80 dark:bg-gray-900/80 border-b border-line/70 dark:border-gray-800/70'
          : 'bg-white/90 dark:bg-gray-900/85 border-b border-transparent'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        /* MATERIAL-FLAT (2 Jul): glow lebar 20px saat scroll diganti elevasi
           on-scroll ala Material — hairline (sudah dari border-b) + drop kecil
           terkontain. Saat di puncak: tanpa bayangan (flat, nyatu kanvas). */
        boxShadow: scrolled
          ? '0 1px 2px rgba(16,24,40,0.05), 0 4px 12px -8px rgba(16,24,40,0.12)'
          : 'none',
        /* KEDUA properti memakai kurva yang sama. `background-color 0.3s` tanpa
           timing function jatuh ke `ease` bawaan browser, jadi satu deklarasi
           ini dulu menjalankan DUA kurva sekaligus — persis "satu gestur, dua
           kurva" yang kanon §6 sebut sebagai tanda UI yang tak dirancang, dan
           ia berjalan di elemen yang paling sering bergerak di app. */
        transition: 'box-shadow 0.3s var(--ease-out-expo), background-color 0.3s var(--ease-out-expo)',
        /* Paksa layer GPU stabil — sticky ber-backdrop-filter bisa "melompat"
           di iOS Safari saat address bar muncul/sembunyi (fix sama dgn BottomNav).
           Transform ini membuat containing block utk descendant fixed → scrim
           menu HARUS di-portal ke body (lihat createPortal di bawah). */
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Gestur "header menyusut" HANYA lewat padding di baris ini. Padding memang
          properti layout, tapi `scrolled` itu boolean ambang (useScrolledPast(6)),
          bukan nilai per-frame → satu layout pass tiap kali ambang dilewati, bukan
          tiap frame scroll. Yang dulu ikut dianimasikan (tinggi logo & font-size
          wordmark) sudah dilepas: keduanya me-reflow teks brandmark di titik ambang
          → wordmark tampak "gemetar" sekejap. Sekarang logo menyusut lewat transform
          (dikomposit GPU, nol reflow) & wordmark tetap satu ukuran. */}
      <div
        className={`flex items-center justify-between max-w-lg mx-auto px-4 transition-[padding] duration-300 ${
          scrolled ? 'py-2' : 'py-3'
        }`}
        style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={logoRT}
            /* Brandmark dekoratif: wordmark "Hadiran RT" di sebelahnya sudah
               menyuarakan nama yang sama → alt teks bikin SR membacanya dobel. */
            alt=""
            width={36}
            height={36}
            /* Kotak layout tetap 36px (h-9); penyusutan ke 32px dilakukan transform
               scale 8/9. origin-left → tepi kiri logo diam, jarak ke wordmark tak
               bergeser. */
            className={`h-9 w-9 shrink-0 object-contain rounded-full shadow-sm ring-1 ring-black/[0.08] dark:ring-white/10 origin-left transition-transform duration-300 ${
              scrolled ? 'scale-[0.889]' : 'scale-100'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          />
          {/* Brandmark, bukan judul halaman — h1 milik konten tiap page (hindari h1 dobel). */}
          {/* `font-display` (Sora) ditambahkan: Sora sudah jadi SUARA app — semua
              h1/h2 dan setiap nominal memakainya — dan satu-satunya tempat yang
              masih Inter justru namanya sendiri, elemen yang paling sering
              dilihat & paling identitas. Wordmark ber-font body = logo yang
              "diketik", bukan diset. Sora ~9% lebih lebar di 16px; baris ini
              `truncate` di dalam `min-w-0` dan sisa ruangnya masih lega di
              360px (diukur, lihat sapuan sesudah pass ini). */}
          <p className="font-display text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100 truncate">
            Hadiran RT
          </p>
        </div>
        {/* gap-2 → gap-3 (4 Agu 2026). InfoTip "Apa itu Mode Warga?" melebarkan
            area sentuhnya `before:-inset-3` (12px tiap sisi) dari kotak 20px =
            44. Terukur cuma 40×44: gap 8px lebih SEMPIT dari pelebaran itu,
            jadi 4px sisi kanannya jatuh di bawah tombol Menu (⋮) yang juga
            melebar — `elementFromPoint` mengembalikan Menu, bukan InfoTip.
            Dua target yang sama-sama dilebarkan WAJIB dijarakkan minimal
            sejauh pelebarannya, kalau tidak yang satu memakan yang lain. */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Pil peran + penjelasannya. Banner "Mode Warga" di bawah bisa ditutup
              PERMANEN (localStorage) — sebelum ini, sekali ditutup keterangan
              "hanya bisa melihat" hilang selamanya dan tak ada tempat lain yang
              menjelaskan kenapa tak ada tombol ubah. Pil peran selalu tampak,
              jadi di sinilah keterangan itu seharusnya tinggal. */}
          <span className="inline-flex items-center gap-1">
            {/* WARGA: tone `info` (BIRU) → `neutral`. Biru di app ini punya satu
                pekerjaan yang sudah ditetapkan kanon warna: token `setor`, sinyal
                status "sudah disetor" yang sengaja dikurung di hero Kas Hadiran —
                BUKAN aksen kedua. Pil peran memakainya membuat biru muncul di
                pojok kanan atas SETIAP layar, jadi satu-satunya warna di header
                dan lawan langsung emerald brand di logo sebelahnya.
                `neutral` juga lebih benar secara makna: "warga" itu keadaan
                bawaan semua orang, bukan peringatan atau capaian — ia tak perlu
                warna, cukup nama. BENDAHARA tetap `success`: ia jarang, dan
                hijaunya memang menandai "sesi ini bisa menulis". */}
            <Tag tone={isBendahara ? 'success' : 'neutral'} className="tracking-wide">
              {isBendahara ? 'BENDAHARA' : 'WARGA'}
            </Tag>
            {!isBendahara && (
              <InfoTip label="Mode Warga" align="right">
                Anda masuk sebagai warga: semua data bisa dilihat, tapi tidak bisa diubah.
                Untuk mencatat atau memperbaiki data, hubungi bendahara RT.
              </InfoTip>
            )}
          </span>

          {/* Menu overflow — rapikan semua aksi ke sini agar judul tidak terdesak */}
          <div className="relative">
            <button
              ref={triggerRef}
              onClick={() => { haptic(); setMenuOpen((o) => !o); }}
              className="press w-11 h-11 -mr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
              aria-label="Menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            {/* Scrim dismiss di-portal ke body: header kini ber-transform (fix iOS)
                → fixed di dalamnya jadi relatif header, bukan viewport. */}
            {menuOpen && createPortal(
              <div aria-hidden="true" className="fixed inset-0 z-scrim" onClick={() => setMenuOpen(false)} />,
              document.body,
            )}
            {menuMounted && (
              <>
                <div
                  ref={menuRef}
                  role="menu"
                  aria-label="Menu aplikasi"
                  onKeyDown={onMenuKeyDown}
                  className={`${menuOpen ? 'pop-menu' : 'pop-menu-out'} absolute right-0 top-[calc(100%+8px)] z-overlay w-56 rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden py-1.5 origin-top-right`}
                  style={{ boxShadow: 'var(--shadow-float)' }}
                >
                  {isBendahara && onOpenLaporan && (
                    <MenuItem icon={FileText} label="Tutup Buku Triwulan" onClick={onOpenLaporan} />
                  )}
                  {isBendahara && onOpenRiwayat && (
                    <MenuItem icon={History} label="Riwayat Aktivitas" onClick={onOpenRiwayat} />
                  )}
                  {isBendahara && onOpenAnggota && (
                    <MenuItem icon={Users} label="Kelola Anggota" onClick={onOpenAnggota} />
                  )}
                  {isBendahara && onOpenBackup && (
                    <MenuItem icon={DatabaseBackup} label="Backup & Restore" onClick={onOpenBackup} />
                  )}
                  {isBendahara && <div className="my-1.5 border-t border-line dark:border-gray-800" />}
                  {onOpenTentang && (
                    <MenuItem icon={Info} label="Tentang Aplikasi" onClick={onOpenTentang} />
                  )}
                  <MenuItem
                    icon={isDark ? Sun : Moon}
                    label={isDark ? 'Mode Terang' : 'Mode Gelap'}
                    onClick={onToggleTheme}
                  />
                  <MenuItem icon={LogOut} label="Keluar" onClick={onLogout} danger />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Strip LURING — hanya ada saat perangkat benar-benar terputus, jadi nol
          biaya ruang ketika online. Kenapa perlu: app ini merender dari snapshot
          (pola SWR pageCache), sehingga tanpa sinyal layar tetap menampilkan
          nominal LAMA yang terlihat persis seperti data terkini — terukur 31 Jul:
          Rp4.485.000 tampil sama saja offline maupun online, tanpa satu pun tanda.
          Untuk app kas, angka yang mungkin basi wajib mengaku. Tidak bisa
          ditutup: begitu sinyal kembali, strip ini hilang sendiri. */}
      {!online && (
        <div
          role="status"
          className="border-t border-amber-200/70 bg-amber-50 px-5 py-1.5 dark:border-amber-800/40 dark:bg-amber-900/25"
        >
          <p className="mx-auto flex max-w-lg items-center justify-center gap-1.5 text-center text-micro font-semibold text-warn dark:text-amber-300">
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Tanpa sinyal — angka yang tampil salinan terakhir
          </p>
        </div>
      )}

      {/* ── Banner "Mode Warga — hanya bisa melihat data" DIBUANG (24 Agu 2026) ──
          Ia mengatakan persis apa yang sudah dikatakan pil `WARGA` di baris tepat
          DI ATASNYA, yang bahkan membawa InfoTip "Apa itu Mode Warga?" untuk
          warga yang ingin penjelasan lengkap. Dua pengumuman untuk satu fakta.

          Ongkosnya bukan di Beranda saja: 56px ini duduk di SETIAP halaman,
          setiap kali warga membuka app, selamanya — sementara ia kabar yang
          sudah selesai dibaca pada kunjungan pertama. Strip LURING di atas
          tetap ada dan memang tak bisa ditutup: ia keadaan yang berubah-ubah
          dan menyangkut kebenaran angka. Ini tidak.

          `bannerDismissed` / `dismissBanner` & kunci localStorage
          `hadiran-warga-banner` ikut dilepas — penyimpanan untuk keadaan yang
          tak lagi punya wujud. */}
    </header>
  );
}
