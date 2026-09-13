import { useLayoutEffect, type RefObject } from 'react';

/** Jarak napas antara chrome dan elemen yang difokus (anak tangga spasi `2`). */
const JARAK_PX = 8;

type Sisi = 'atas' | 'bawah';

/**
 * Chrome sticky/fixed MENCADANGKAN ruangnya sendiri di wadah gulirnya lewat
 * `scroll-padding`, supaya elemen yang difokus papan ketik tak digulir ke
 * bawahnya (WCAG §2.4.11 AA · §2.4.12 AAA).
 *
 * Tanpa ini peramban meratakan elemen fokus ke TEPI viewport — tepi yang di app
 * ini diduduki Header sticky (atas), bar nav & FAB fixed (bawah). Terukur 13 Sep
 * 2026 @390x844: 1042 titik fokus, 34 tertutup PENUH ("Apa itu Sohibul Bait?"
 * 0% terlihat) dan 333 sebagian; sesudahnya 0 & 0 di 2078 titik (390x844 +
 * 360x568). Dijaga `npm run audit:fokus-tertutup`.
 *
 * TIGA keputusan, masing-masing menutup jebakan yang terukur:
 *
 * 1. Diukur dari ELEMENNYA, bukan angka di CSS. Tinggi Header tidak tetap — ia
 *    menyusut saat digulir, tumbuh saat strip LURING/BASI hidup, dan membawa
 *    safe-area. Angka CSS yang cocok hari ini meleset persis di keadaan yang
 *    paling jarang diuji (tanpa sinyal).
 *
 * 2. Cadangan = offset CSS (`top`/`bottom`) + `offsetHeight`, BUKAN
 *    `getBoundingClientRect`. Bar nav & FAB MENYINGKIR lewat transform; rect
 *    yang terbaca saat tucked ada di luar layar dan cadangannya jatuh ke nol —
 *    lalu tak pernah pulih, karena transform tak memicu ResizeObserver.
 *
 * 3. Beberapa chrome di SATU wadah digabung lewat MAKS per sisi. Bar nav
 *    (70px) dan FAB (melayang 28px di atasnya) sama-sama menulis sisi bawah
 *    viewport; yang terakhir menulis akan menimpa yang lain.
 *
 * Dipasang di KOMPONEN chrome, bukan per halaman — preseden
 * `adaLapisanTerbuka()`: overlay baru yang memakai `OverlayHeader`/`Fab` ikut
 * aman tanpa satu baris pun di call-site. Wadahnya dicari sendiri: scroller
 * terdekat (overlay `fixed inset-0 overflow-y-auto`) atau viewport (`<html>`).
 */
export function useCadanganGulir(ref: RefObject<HTMLElement>, sisi: Sisi) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const wadah = wadahGulir(el);
    const kunci = Symbol(sisi);
    const tulis = () => {
      const offset = parseFloat(getComputedStyle(el)[sisi === 'atas' ? 'top' : 'bottom']);
      daftar(wadah).set(kunci, { sisi, px: Math.ceil((Number.isFinite(offset) ? offset : 0) + el.offsetHeight) + JARAK_PX });
      terapkan(wadah);
    };
    // border-box: safe-area duduk di PADDING chrome, jadi content-box melewatkannya.
    const ro = new ResizeObserver(tulis);
    ro.observe(el, { box: 'border-box' });
    tulis();
    return () => {
      ro.disconnect();
      daftar(wadah).delete(kunci);
      terapkan(wadah);
    };
  }, [ref, sisi]);
}

const cadangan = new WeakMap<HTMLElement, Map<symbol, { sisi: Sisi; px: number }>>();

function daftar(wadah: HTMLElement) {
  let m = cadangan.get(wadah);
  if (!m) cadangan.set(wadah, (m = new Map()));
  return m;
}

function terapkan(wadah: HTMLElement) {
  let atas = 0, bawah = 0;
  for (const c of daftar(wadah).values()) {
    if (c.sisi === 'atas') atas = Math.max(atas, c.px);
    else bawah = Math.max(bawah, c.px);
  }
  wadah.style.scrollPaddingTop = atas ? `${atas}px` : '';
  wadah.style.scrollPaddingBottom = bawah ? `${bawah}px` : '';
}

function wadahGulir(el: HTMLElement): HTMLElement {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === 'auto' || oy === 'scroll') return p;
  }
  return document.documentElement;
}
