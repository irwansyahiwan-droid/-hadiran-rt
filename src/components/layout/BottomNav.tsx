import { haptic } from '../../lib/utils';
import { useScrollHide } from '../../hooks/useScrollDirection';
import { tabTerlihat, type TabName } from './tabs';

/* Daftar tab & `labelTab` pindah ke `./tabs.ts` — berkas ini kini HANYA
   mengekspor komponen, syarat Fast Refresh bekerja (react-refresh/
   only-export-components). Jangan tambahkan ekspor non-komponen di sini;
   letakkan di tabs.ts supaya urutan tab tetap satu sumber. */

interface BottomNavProps {
  active: TabName;
  onChange: (tab: TabName) => void;
  isWargaMode?: boolean;
}

export default function BottomNav({ active, onChange, isWargaMode }: BottomNavProps) {
  // Warga tidak punya tab Talangan — diakses lewat tombol "Lihat" di Beranda.
  // Penyaringnya dibagi pakai dgn navigasi swipe di App.tsx (lihat tabs.ts),
  // supaya bar nav & swipe tak pernah menampilkan urutan yang berbeda.
  const visibleTabs = tabTerlihat(!!isWargaMode);
  const activeIndex = visibleTabs.findIndex(t => t.id === active);

  // Auto-hide: scroll turun (masuk ke konten) → nav menyelinap turun keluar layar;
  // scroll naik → muncul lagi. Beri ruang baca list yg panjang. Dekat puncak (y<80)
  // selalu tampil. Listener scroll dibagi pakai (lihat hook).
  const tucked = useScrollHide({ threshold: 80 });

  return (
    <nav
      // Bar DOK bawah — permintaan user (4 Agu 2026): "kembalikan seperti awal,
      // bukan kapsul, seperti di app Google". Kapsul melayang ala GitHub Mobile
      // (3 Agu) DIBATALKAN; ini kembali ke bentuk 2 Jul: bar penuh NEMPEL tepi
      // bawah layar dgn indikator pil Material 3 di belakang ikon. Latar bar
      // mengisi sampai belakang home indicator (safe-area = padding DI DALAM
      // bar, bukan jarak di bawahnya).
      className="fixed inset-x-0 bottom-0 z-nav"
      style={{
        // Geser 100% + buffer 8px (sisa hairline/bayangan atas) → nav bersih
        // total keluar layar; safe-area sudah ikut karena bagian dari tinggi bar.
        // Opacity fade = jaring pengaman andai ada sisa posisi sepiksel.
        // translate3d (bukan translateY) + backface-hidden + will-change →
        // PAKSA layer GPU stabil. Tanpa ini, iOS Safari kadang tak mempromosikan
        // elemen fixed ke compositor, lalu nav "melompat ke atas-tengah"
        // saat scroll (address-bar muncul/sembunyi me-relayout containing block).
        transform: tucked
          ? 'translate3d(0, calc(100% + 8px), 0)'
          : 'translate3d(0, 0, 0)',
        opacity: tucked ? 0 : 1,
        /* `opacity` ikut kurva yang sama dgn `transform`. Tanpa timing function
           ia jatuh ke `ease` bawaan browser, jadi bar ini menyingkir dengan DUA
           kurva sekaligus — geser dan pudarnya tak sinkron (kanon §6). */
        transition: 'transform 0.32s var(--ease-out-expo), opacity 0.26s var(--ease-out-expo)',
        willChange: 'transform',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Permukaan SOLID putih penuh selebar layar (dark = gray-900), pemisah
          cuma hairline atas + bayangan naik tipis via .nav-dock — bar dok datar
          ala app Google/bank, tanpa ring/radius kapsul. Slot tombol tetap
          max-w-lg di tengah agar sejajar kolom konten di layar lebar.

          Tinggi TOTAL = 70px + safe-area, PERSIS seperti sebelum kapsul. Angka
          itu dipakai ulang sebagai `4.5rem` di empat tempat (padding-bawah
          <main> App, Fab, tombol sticky Absensi Jadwal, prompt PWA/Install) —
          menaikkannya tanpa menyentuh keempatnya = konten ngumpet di balik bar. */}
      <div
        className="nav-dock bg-white dark:bg-gray-900"
        // Tucked (scroll turun) = bar meluncur keluar layar: matikan interaksi
        // agar tak ada tap "hantu" yang tertangkap saat nav tak terlihat.
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          pointerEvents: tucked ? 'none' : 'auto',
        }}
      >
      <div className="relative max-w-lg mx-auto flex items-stretch h-[70px]">
        {/* Indikator pil meluncur (spring) — slot selebar tombol, pil di area ikon.
            Row TANPA padding horizontal agar slot = lebar tombol persis. */}
        {activeIndex >= 0 && (
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 pointer-events-none transition-transform duration-masuk"
            style={{
              width: `${100 / visibleTabs.length}%`,
              transform: `translateX(${activeIndex * 100}%)`,
              transitionTimingFunction: 'var(--ease-spring)',
            }}
          >
            {/* Pil aktif ala Google (Material 3): tonal DATAR — satu fill tint
                brand, tanpa gradient/ring/glow. Bentuk stadium (rounded-full)
                w-16 h-8 mengikuti spec indikator M3 (64×32, ikon 24). Yang
                bergerak hanya pil-nya (slide spring antar slot).

                Tint diambil dari `brand` (#0F4C2E), BUKAN `brand-link`, dan di
                GELAP sengaja MENGGELAPKAN (brand/40 di atas gray-900), bukan
                menerangkan. Alasannya kontras, bukan rupa: tint terang di gelap
                menaikkan luminansi latar tepat di bawah label aktif dan
                menjatuhkannya ke ±4,1:1 (terukur saat kapsul 3 Agu). Tonal
                container gelap justru menaikkannya ke 7,7:1 — sejalan pula dgn
                aturan panel di permukaan gelap app ini yang memang `bg-black/xx`. */}
            <span className="absolute left-1/2 -translate-x-1/2 top-3 w-16 h-8 rounded-full bg-brand/[0.14] dark:bg-brand/40" />
          </div>
        )}
        {visibleTabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => { if (!isActive) haptic(); onChange(id); }}
              className="press relative flex flex-col items-center justify-center flex-1 w-full h-full py-2 select-none"
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Ala Google/M3: ikon DIAM di tempat (tanpa scale/lift) — yang
                  berpindah hanya pil tonal di belakangnya. Ikon 24px duduk di
                  blok h-8 yg sejajar persis dgn pil. Aktif tetap DIISI (fill
                  tint) → outline→solid, active terbaca "padat" bukan cuma warna. */}
              <span className="flex items-center justify-center w-16 h-8">
                {/* Warna 150ms (bukan 300): nav ditekan puluhan kali sehari →
                    respons harus crisp; gerak "hidup" cukup dari pil spring. */}
                <Icon
                  className={`w-6 h-6 transition-colors duration-ketuk ${isActive ? 'text-brand dark:text-brand-linkDark' : 'text-ink-sub dark:text-gray-300'}`}
                  strokeWidth={isActive ? 2.2 : 2}
                  fill={isActive ? 'currentColor' : 'none'}
                  style={{ fillOpacity: isActive ? 0.2 : 0, transition: 'fill-opacity 200ms ease-out' }}
                />
              </span>
              {/* Timing spring DIHAPUS dari warna: kurva overshoot (>1) meng-
                  extrapolate interpolasi warna melewati target (kilat aneh).
                  Spring hanya utk transform (pil); warna = ease standar.

                  Tab TAK AKTIF pun bertinta pekat (ink-sub / gray-300, ≥12:1) —
                  bukan abu pudar. Bedanya aktif-vs-tidak dibawa pil + warna
                  brand + tebal huruf, bukan dgn meredupkan yang tak aktif. */}
              <span
                className={`text-micro leading-none mt-1 transition-colors duration-ketuk ${isActive ? 'font-bold text-brand dark:text-brand-linkDark' : 'font-semibold text-ink-sub dark:text-gray-300'}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      </div>
    </nav>
  );
}
