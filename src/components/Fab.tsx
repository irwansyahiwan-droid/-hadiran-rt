import { Plus, type LucideIcon } from 'lucide-react';
import { haptic } from '../lib/utils';
import { useScrollHide } from '../hooks/useScrollDirection';

interface FabProps {
  onClick: () => void;
  label: string;
  icon?: LucideIcon;
  ariaLabel?: string;
  /** Halaman overlay (Kelola Anggota dll.) tak punya bottom-nav → FAB duduk
   *  lebih rendah. Default true = ada nav yang harus dilewati. */
  overNav?: boolean;
}

/** Floating Action Button — aksi-buat utama di ZONA JEMPOL (kanan-bawah),
 *  melayang di atas bottom-nav & menghormati safe-area. Pola fintech 2026
 *  (Revolut/Cash App/Jago): aksi paling sering dipakai dalam jangkauan satu
 *  tangan, bukan di pojok atas. Memakai resep .btn-brand (gradient + glow) +
 *  .press (spring) → konsisten dgn CTA utama lain. z-30 → di bawah sheet/modal
 *  (z-50) sehingga tertutup backdrop saat form terbuka.
 *
 *  PINTAR (Material 3 2026): MENYINGKIR saat scroll turun, kembali dengan label
 *  saat scroll naik/berhenti. Dulu ia hanya mengkerut jadi bulat — tetap
 *  melayang di jalur nominal rata-kanan, dan di "Rekap per Kategori" Kas RT ia
 *  memotong angka "+Rp17.566.000" (terlihat di screenshot 390px). Di app kas,
 *  tak boleh ada elemen yang menutupi nominal: itu angka yang dicari warga. */
export default function Fab({ onClick, label, icon: Icon = Plus, ariaLabel, overNav = true }: FabProps) {
  /* Menyingkir saat scroll turun, kembali saat scroll NAIK. `idleExpandMs`
     sengaja TIDAK dipakai: dengan ia, FAB balik 900ms setelah gulir berhenti —
     tepat pada detik warga berdiam untuk MEMBACA nominal, jadi ia menutupi
     angka itu lagi dan tujuan menyingkirnya batal. Naik = niat ke aksi. */
  const compact = useScrollHide({ threshold: 80 });

  return (
    // Wrapper fixed TERPISAH dari tombol: translate3d + backface-hidden +
    // will-change PAKSA layer GPU stabil (pola sama dgn BottomNav/Header/
    // Toaster). Tanpa ini iOS Safari kadang tak mempromosikan elemen fixed
    // ke compositor → FAB ikut terseret naik bersama konten saat scroll
    // (address-bar muncul/sembunyi me-relayout containing block). Guard tak
    // bisa ditaruh inline di tombol: transform inline menimpa scale
    // .press:active sehingga efek tekan mati.
    <div
      className="fixed right-4 z-fab"
      style={{
        bottom: overNav
          ? 'calc(4.5rem + env(safe-area-inset-bottom) + 1.75rem)'
          : 'calc(env(safe-area-inset-bottom) + 1.25rem)',
        /* Menyingkir = translate pada WRAPPER (bukan tombol): transform inline
           di tombol akan menimpa scale .press:active. Nilai 0 tetap dipakai
           saat tampil supaya kunci lapisan GPU tak pernah lepas. */
        transform: compact ? 'translate3d(0, 150%, 0)' : 'translate3d(0, 0, 0)',
        opacity: compact ? 0 : 1,
        pointerEvents: compact ? 'none' : undefined,
        transition: 'transform 0.28s var(--ease-out-expo), opacity 0.2s ease',
        willChange: 'transform',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
      }}
      aria-hidden={compact}
    >
    <button
      onClick={() => { haptic(); onClick(); }}
      aria-label={ariaLabel ?? label}
      /* Saat menyingkir wrapper-nya aria-hidden — jangan tinggalkan tombol yang
         masih bisa di-Tab (fokus mendarat di elemen tak terlihat). */
      tabIndex={compact ? -1 : undefined}
      className="btn-brand press inline-flex items-center justify-center h-14 px-4 rounded-full text-sm font-bold overflow-hidden"
      style={{ transition: 'box-shadow 0.2s ease, transform 0.15s var(--ease-spring)' }}
    >
      <Icon className="w-5 h-5 shrink-0" strokeWidth={2.4} />
      <span
        className="whitespace-nowrap overflow-hidden"
        style={{
          maxWidth: compact ? 0 : '140px',
          opacity: compact ? 0 : 1,
          marginLeft: compact ? 0 : '0.5rem',
          transition: 'max-width 0.3s var(--ease-out-expo), opacity 0.25s ease, margin-left 0.3s var(--ease-out-expo)',
        }}
      >
        {label}
      </span>
    </button>
    </div>
  );
}
