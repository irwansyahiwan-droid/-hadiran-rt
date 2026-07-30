import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Sun, Moon, Eye, History, FileText, MoreVertical, DatabaseBackup, Info, Users, X, type LucideIcon } from 'lucide-react';
import logoRT from '../../assets/logo-rt.svg';
import { haptic } from '../../lib/utils';
import { useExitAnim } from '../../lib/hooks';
import { useScrolledPast } from '../../hooks/useScrollDirection';
import Tag from '../Tag';
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
  const [menuOpen, setMenuOpen] = useState(false);
  // Banner "Mode Warga" bisa ditutup permanen — pendatang baru tetap lihat,
  // pengguna lama bebas hilangkan agar konten dapat ruang. Disimpan di localStorage.
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return localStorage.getItem('hadiran-warga-banner') === '1'; } catch { return false; }
  });
  function dismissBanner() {
    haptic(8);
    setBannerDismissed(true);
    try { localStorage.setItem('hadiran-warga-banner', '1'); } catch { /* abaikan */ }
  }
  const menuMounted = useExitAnim(menuOpen);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Saat menu buka: fokus item pertama → pola menu WAI-ARIA (keyboard mulai di dalam).
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [menuOpen]);

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
  }

  // Item menu overflow (kebab) — semua aksi dirapikan ke sini agar top bar lega.
  const MenuItem = ({ icon: Icon, label, onClick, danger }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) => (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={() => { haptic(); setMenuOpen(false); onClick(); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
        danger
          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 active:bg-rose-100 dark:hover:bg-rose-900/20 dark:active:bg-rose-900/35'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700'
      }`}
    >
      <Icon className={`w-[18px] h-[18px] ${danger ? 'text-rose-500' : 'text-gray-400'}`} />
      {label}
    </button>
  );

  return (
    <header
      // Saat menu hidup: naik ke tier z-menu (45) di atas scrim portal z-40,
      // tetap di bawah overlay z-50 — header ber-transform = stacking context
      // sendiri, jadi z-50 milik dropdown tak bisa menembus keluar; tanpa bump
      // ini scrim (lebih akhir di DOM) menutup menu & item tak bisa diklik.
      // `transition` utility sengaja TIDAK dipasang di sini: properti + durasi
      // sudah ditulis eksplisit di `style.transition` di bawah, dan inline style
      // menang atas class → utility-nya cuma jadi kode mati yang menyesatkan.
      className={`sticky top-0 ${menuMounted ? 'z-menu' : 'z-40'} backdrop-blur-xl backdrop-saturate-150 ${
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
        transition: 'box-shadow 0.3s var(--ease-out-expo), background-color 0.3s',
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
        <div className="flex items-center gap-2.5">
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
          <p className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100 whitespace-nowrap">
            Hadiran RT
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tag tone={isBendahara ? 'success' : 'info'} className="tracking-wide">
            {isBendahara ? 'BENDAHARA' : 'WARGA'}
          </Tag>

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
              <div aria-hidden="true" className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />,
              document.body,
            )}
            {menuMounted && (
              <>
                <div
                  ref={menuRef}
                  role="menu"
                  aria-label="Menu aplikasi"
                  onKeyDown={onMenuKeyDown}
                  className={`${menuOpen ? 'pop-menu' : 'pop-menu-out'} absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden py-1.5 origin-top-right`}
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
      {!isBendahara && !bannerDismissed && (
        <div
          className="border-t border-line bg-gray-50 overflow-hidden px-5 dark:bg-gray-800/60 dark:border-gray-800 transition-[max-height,opacity] duration-300"
          style={{
            maxHeight: scrolled ? '0px' : '40px',
            opacity: scrolled ? 0 : 1,
            paddingTop: scrolled ? 0 : '0.375rem',
            paddingBottom: scrolled ? 0 : '0.375rem',
            transitionTimingFunction: 'var(--ease-out-expo)',
          }}
        >
          <div className="relative max-w-lg mx-auto flex items-center justify-center">
            {/* Chip read-only "tercetak" (ring-inset, bahasa Etched Premium) —
                mata brand-emerald = percikan identitas, bukan strip abu mati. */}
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-sub dark:text-gray-200 bg-white dark:bg-gray-900/50 ring-1 ring-inset ring-line dark:ring-gray-700 rounded-full pl-2.5 pr-3 py-1">
              <Eye className="w-3.5 h-3.5 text-brand-link dark:text-brand-linkDark" /> Mode Warga — hanya bisa melihat data
            </span>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Tutup info Mode Warga"
              /* dark:text-gray-400 (bukan gray-500): ikon kontrol wajib ≥3:1
                 (WCAG 1.4.11). gray-500 di atas fill banner gelap (gray-800/60
                 di atas gray-900 ≈ #192231) cuma 2,8:1 — di bawah ambang. */
              className="press absolute right-0 -mr-2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-ink-sub dark:text-gray-400 dark:hover:text-gray-200 active:opacity-70 before:absolute before:-inset-1.5 before:content-['']"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
