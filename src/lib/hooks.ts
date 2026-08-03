import { useState, useEffect, useRef, useReducer } from 'react';

/* ── Tinggi layar & hero ringkas ─────────────────────────────────
 * Dipakai BERSAMA oleh kartu saldo (Beranda), skeleton-nya, dan rumus tinggi
 * kartu di BannerCarousel. Ditaruh di sini, bukan di BannerCarousel, semata agar
 * berkas komponen tak mengekspor non-komponen (fast-refresh). Yang penting tetap
 * dijaga: definisinya cuma SATU di seluruh app. */

/** Ambang "hero ringkas". 700px = di bawah iPhone SE (667) & Android 640, di atas
 *  HP 2026 terpendek sekalipun. */
const VH_RINGKAS = 700;

/** Layar sependek ini butuh hero RINGKAS: kaki stat 3 kolom (Terkumpul/Talangan/
 *  Setor Kas RT) dilepas dari kartu saldo.
 *
 *  Kenapa kaki stat yang dikorbankan, bukan tinggi kartu saja: isi kartu hero TIDAK
 *  reflow. Tingginya boleh diperkecil, isinya tidak ikut menyusut — terukur 3 Agu,
 *  celah caption ke garis kaki stat turun linear 43px (kartu 344) → 1px (kartu 259),
 *  jadi memendekkan kartu di bawah ~290px cuma membuat teks bertumpuk garis. Padahal
 *  di 360×640 blok hero menghabiskan layar pertama sampai NOL konten mengintip di
 *  atas bar nav — warga tak dapat sinyal apa pun bahwa masih ada isi di bawah.
 *
 *  Ketiga angka itu bukan hilang: masing-masing punya halaman sendiri (Hadiran,
 *  Talangan, Kas RT) dan tap di kaki stat memang cuma jalan pintas ke sana.
 *
 *  Tiga tempat WAJIB membaca fungsi ini — kartu asli, skeleton, dan cardHeight.
 *  Kalau salah satu memakai ambang sendiri, skeleton & kartu beda tinggi → layar
 *  meloncat saat data datang. */
export function heroRingkas(vh: number): boolean {
  return vh < VH_RINGKAS;
}

/** Tinggi layar yang ikut resize/rotasi. Satu implementasi untuk semua pembaca:
 *  dua listener terpisah pernah jadi sumber drift geometri hero. */
export function useTinggiLayar(): number {
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return vh;
}

/* ── Sembunyikan nominal (privasi, ala bank app) ─────────────────
 * State global ringan: tersimpan di localStorage & disinkronkan ke semua
 * komponen yang pakai (hero Beranda & Kas RT) lewat listener — sekali toggle
 * berlaku app-wide. */
const HIDE_KEY = 'hadiran-hide-amount';
let hideAmount =
  typeof window !== 'undefined' && localStorage.getItem(HIDE_KEY) === '1';
const hideListeners = new Set<() => void>();

export function toggleHideAmount(): void {
  hideAmount = !hideAmount;
  try { localStorage.setItem(HIDE_KEY, hideAmount ? '1' : '0'); } catch { /* abaikan */ }
  hideListeners.forEach((l) => l());
}

export function useHideAmount(): boolean {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    hideListeners.add(force);
    return () => { hideListeners.delete(force); };
  }, []);
  return hideAmount;
}

/* ── Gerbang "mainkan sekali per sesi" ───────────────────────────────
 * Entrance yang menyenangkan (count-up, sheen, draw-on) jadi pajak waktu
 * bila replay tiap remount. Beranda dibuka puluhan kali/hari (tab/back) →
 * komponennya remount → animasi mengulang. Helper ini menandai sebuah key
 * di sessionStorage: TRUE sekali (kunjungan pertama sesi), FALSE setelahnya.
 * Dipakai lewat useState-initializer agar konsumsi terjadi sekali per mount. */
function consumeFirstPlay(key: string): boolean {
  if (typeof window === 'undefined') return false;
  const k = 'fp:' + key;
  try {
    if (sessionStorage.getItem(k)) return false;
    sessionStorage.setItem(k, '1');
    return true;
  } catch {
    return true;
  }
}

/** Mengembalikan `true` hanya pada mount pertama key ini dalam satu sesi. */
export function useFirstPlay(key: string): boolean {
  return useState(() => consumeFirstPlay(key))[0];
}

/**
 * Menunda unmount agar elemen sempat memainkan animasi keluar.
 * `open` = niat tampil; kembalian `mounted` = apakah masih perlu dirender.
 * Saat `open` jadi false, `mounted` tetap true selama `ms` (mainkan exit),
 * lalu false. Pemanggil: render saat `mounted`, pakai kelas exit saat `!open`.
 */
export function useExitAnim(open: boolean, ms = 120): boolean {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return mounted;
}

/**
 * Menganimasikan angka menuju `target`.
 * - Mount pertama: menghitung naik dari 0.
 * - Perubahan berikutnya (mis. setelah refresh): menganimasikan dari nilai
 *   sebelumnya, bukan reset ke 0 — terasa halus, bukan menyentak.
 * - Menghormati `prefers-reduced-motion` (langsung ke nilai akhir).
 * - `animate=false` → langsung ke nilai akhir tanpa hitung-naik (mis. saat
 *   remount Beranda agar count-up tak mengulang tiap kunjungan).
 */
export function useCountUp(target: number, duration = 1000, animate = true): number {
  const [current, setCurrent] = useState(animate ? 0 : target);
  const fromRef = useRef(animate ? 0 : target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced =
      !animate ||
      (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    if (prefersReduced) {
      fromRef.current = target;
      setCurrent(target);
      return;
    }

    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return;

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setCurrent(Math.round(from + delta * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, animate]);

  return current;
}
