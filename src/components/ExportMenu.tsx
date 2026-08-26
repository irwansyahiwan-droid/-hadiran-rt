import { useEffect, useId, useRef, useState } from 'react';
import { Download, ChevronDown, Loader2, type LucideIcon } from 'lucide-react';
import { haptic } from '../lib/utils';
import { useExitAnim } from '../lib/hooks';
import { useBackDismiss } from '../hooks/useBackDismiss';

export interface ExportItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** Warna teks/ikon opsional (mis. emerald untuk Excel) — default netral. */
  tone?: string;
}

interface ExportMenuProps {
  items: ExportItem[];
  /** Arah buka dropdown relatif tombol. 'right' (default) = tepi kanan dropdown
   *  sejajar tombol → cocok saat tombol di kanan layar (Kas RT). 'left' = buka
   *  ke kanan → cocok saat tombol di kiri (Kas Hadiran), agar tak terpotong. */
  align?: 'left' | 'right';
  /** Matikan ekspor saat data TIDAK bisa dipercaya (mis. muat gagal).
   *
   *  Aturan "app kas dilarang menyatakan nominal saat gagal muat" selama ini
   *  berhenti di LAYAR: saat muat gagal halaman memang menampilkan ErrorState
   *  tanpa satu angka pun — tapi tombol Ekspor duduk di PageHeader, di luar
   *  cabang error itu, jadi ia tetap hidup. Menekannya saat itu menghasilkan
   *  PDF berisi Rp0 (atau angka basi dari cache) LENGKAP dengan tanggal cetak
   *  hari ini dan tiga kolom tanda tangan — dokumen yang tampak sah untuk
   *  diarsipkan, padahal angkanya tak pernah termuat. Layar salah bisa
   *  di-refresh; berkas yang sudah tersebar di grup WA tidak. */
  disabled?: boolean;
  /** Alasan yang dibacakan pembaca layar & muncul sebagai tooltip. */
  disabledReason?: string;
  /** Sedang menyiapkan berkas (chunk ekspor diunduh + berkas dirender).
   *
   *  Ada karena jeda ini NYATA dan dulu tak terlihat sama sekali: 6,2 detik di
   *  Kas RT pada 400 kbps + CPU 4× tanpa satu pun perubahan di layar
   *  (`npm run audit:respon` bagian D). Ikon jadi pemintal & tombol nonaktif —
   *  ketukan MENGAKU diterima. Penjaga berkas-gandanya sendiri bukan di sini
   *  tapi di latch sinkron `useAksiBerat()`; `disabled` baru berlaku sesudah
   *  React render, dan ketukan kedua yang bermasalah datang sebelum itu. */
  busy?: boolean;
}

/** Tombol "Ekspor" + dropdown — menyatukan aksi ekspor yang JARANG dipakai
 *  (PDF / Excel) ke satu menu, agar aksi utama (FAB) tak tersaingi di toolbar.
 *  Satu aksi primer per layar. Popover ringan (bukan sheet) selaras menu Header:
 *  tutup via Escape / klik luar. */
export default function ExportMenu({ items, align = 'right', disabled = false, disabledReason, busy = false }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  /* Tombol Back HP menutup menu ini — bukan meninggalkan app. Warga app ini
     tak punya tombol Escape; `audit:papan-ketik` menguji Escape dan melaporkan
     menu ini sehat, dan justru itu titik butanya. Lihat `npm run audit:mundur`. */
  useBackDismiss(open, () => setOpen(false));
  const mounted = useExitAnim(open);
  const ref = useRef<HTMLDivElement>(null);
  const alasanId = useId();
  const menuRef = useRef<HTMLDivElement>(null);

  // Menu yang kebetulan sedang terbuka saat muat gagal WAJIB ikut tertutup —
  // kalau tidak, itemnya tetap bisa diketuk lewat popover yang sudah terlanjur
  // ada di layar dan penjaga di tombolnya jadi tak berarti.
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  /* Tombol yang dinonaktifkan saat sibuk membuang fokusnya ke <body> — pengguna
     papan ketik yang baru menekan Enter di sini kehilangan tempatnya selama
     berkas disiapkan, lalu Tab berikutnya mulai lagi dari awal halaman.
     Kembalikan begitu selesai, dan HANYA kalau fokusnya memang terbuang (jangan
     merebut fokus yang sudah pindah ke tempat lain atas kemauan pengguna). */
  const sibukRef = useRef(false);
  useEffect(() => {
    if (sibukRef.current && !busy && document.activeElement === document.body) {
      ref.current?.querySelector('button')?.focus();
    }
    sibukRef.current = busy;
  }, [busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  /* Saat menu buka: fokus item pertama → keyboard mulai di dalam (pola WAI-ARIA).
     Dependensi WAJIB ikut `mounted`, bukan `open` saja — jebakan yang SAMA
     PERSIS dgn menu Header (diperbaiki 19 Agu 2026 pagi; ini instans keduanya,
     dan satu-satunya yang tersisa: dari tiga pemakai `useExitAnim`, FilterChips
     tak menyentuh DOM anaknya). `useExitAnim` menaikkan `mounted` dari dalam
     useEffect-nya, jadi di commit tempat `open` baru true panelnya BELUM ada di
     DOM: `menuRef.current` null dan `?.focus()` diam-diam tak berbuat apa-apa.
     Fokus lalu tertinggal di tombol pemicu selamanya — dan karena
     `onMenuKeyDown` menempel di WADAH menu, panah/Home/End tak pernah kebagian
     event. Terukur 19 Agu: fokus mendarat di button "Ekspor", bukan di menu. */
  useEffect(() => {
    if (!open || !mounted) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open, mounted]);

  // Navigasi keyboard: panah naik/turun siklik, Home/End.
  function onMenuKeyDown(e: React.KeyboardEvent) {
    const els = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (els.length === 0) return;
    const idx = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(idx + 1) % els.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(idx - 1 + els.length) % els.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); els[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); els[els.length - 1].focus(); }
    /* Tab MENUTUP menu (pola WAI-ARIA menu button), tanpa preventDefault supaya
       fokus tetap melanjutkan ke elemen berikutnya. Tanpa ini Tab diam-diam
       berjalan KELUAR sementara menunya tetap terbuka: pengguna lalu menyusuri
       halaman di BELAKANG scrim — elemen yang tak bisa diklik karena scrim
       menangkap pointer — dan Escape ikut mati, karena handler ini menempel di
       wadah menu yang sudah ditinggalkan fokus. Terukur 19 Agu di menu Header:
       Tab ke-6 mendarat di "Ke slide 1" milik carousel Beranda. */
    else if (e.key === 'Tab') { setOpen(false); }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { haptic(); setOpen((o) => !o); }}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        title={disabled ? disabledReason : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-describedby={disabled && disabledReason ? alasanId : undefined}
        /* `btn-mati` = keluarga tombol TERISI non-brand; resep `:disabled`-nya
           (fill .inset-soft + label ink-faint) ada di index.css, jadi keadaan
           nonaktif di sini terbaca 8,9:1 — bukan `opacity-50` yang dulu
           menjatuhkan label ke 2,2:1 (lihat `npm run audit:mati`). */
        className="btn-mati press flex items-center gap-2 bg-white dark:bg-gray-800 border border-control dark:border-control-dark text-gray-700 dark:text-gray-300 text-body font-semibold min-h-[44px] px-3 py-2 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:border-transparent disabled:shadow-none"
      >
        {/* Ikon ditukar di tempat, label TETAP "Ekspor": label yang memanjang
            jadi "Menyiapkan…" menekan judul halaman di sebelahnya dan itu
            berakhir sbg teks terpotong di 360px (`audit:potong`). Kata tunggunya
            disampaikan toast — yang sekaligus dibacakan pembaca layar lewat
            region live permanen Toaster. */}
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Ekspor
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2.25} />
      </button>
      {disabled && disabledReason && <span id={alasanId} className="sr-only">{disabledReason}</span>}

      {/* `z-scrim` (42), BUKAN `z-40`: z-40 sama persis dgn bar nav, jadi yang
          menang cuma urutan DOM — dan nav menang. Terbukti dgn MENGUJI, bukan
          dibaca: saat menu ini terbuka, `elementFromPoint` di tengah tombol nav
          menjawab ikon nav, dan ketukan di sana MEMINDAHKAN TAB alih-alih
          menutup menu. Persis kegagalan yang sudah diperbaiki untuk menu Header
          4 Agu (urutan chrome: nav 40 < scrim 42 < menu 45) — dua penangkap
          klik ini tertinggal. Dropdown-nya sendiri z-overlay (50), jadi tetap
          duduk di atas penangkap. */}
      {open && <div className="fixed inset-0 z-scrim" aria-hidden="true" onClick={() => setOpen(false)} />}
      {mounted && (
        <>
          <div
            ref={menuRef}
            role="menu"
            aria-label="Ekspor"
            onKeyDown={onMenuKeyDown}
            className={`${open ? 'pop-menu' : 'pop-menu-out'} absolute top-[calc(100%+8px)] z-overlay w-48 rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden py-2 ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`}
            style={{ boxShadow: 'var(--shadow-float)' }}
          >
            {items.map(({ label, icon: Icon, onClick, tone }) => (
              <button
                key={label}
                role="menuitem"
                tabIndex={-1}
                onClick={() => { haptic(); setOpen(false); onClick(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-body font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 transition-colors"
              >
                <Icon className={`w-[18px] h-[18px] ${tone ?? 'text-gray-400'}`} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
