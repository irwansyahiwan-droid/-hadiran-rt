import { useEffect, useState } from 'react';

/* ── SATU sumber scroll untuk seluruh app ──────────────────────────────
   Dulu Header, BottomNav, dan Fab masing-masing memasang
   window.addEventListener('scroll') sendiri (3 listener terpisah). Di sini
   SATU listener global (passive) memberi tahu semua subscriber lewat
   (y, prevY); tiap hook menurunkan state-nya sendiri & hanya re-render saat
   nilainya berubah (setState boolean → React bail-out otomatis). Listener
   dipasang lazy saat subscriber pertama, dilepas saat subscriber terakhir
   pergi (ref-counted) → tak ada listener menggantung. */

type Listener = (y: number, prevY: number) => void;

const listeners = new Set<Listener>();
let lastY = typeof window !== 'undefined' ? window.scrollY : 0;
let attached = false;

function handleScroll() {
  /* iOS Safari rubber-band: mentok atas/bawah lalu memantul membuat scrollY
     keluar rentang (negatif / lewat maksimum) lalu balik sendiri — tanpa
     clamp, pantulan itu terbaca "naik lalu turun" dan nav/FAB ikut
     muncul-sembunyi cepat (terlihat melompat). Clamp ke rentang dokumen
     valid → selama pantulan nilai konstan, tak ada event arah palsu. */
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const y = Math.min(Math.max(0, window.scrollY), max);
  if (y === lastY) return;
  const prev = lastY;
  lastY = y;
  listeners.forEach((fn) => fn(y, prev));
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  if (!attached) {
    window.addEventListener('scroll', handleScroll, { passive: true });
    attached = true;
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && attached) {
      window.removeEventListener('scroll', handleScroll);
      attached = false;
    }
  };
}

/* ── Sembunyi mengikuti arah scroll (BottomNav & Fab) ───────────────────
   Scroll TURUN melewati `threshold` → true (sembunyi/mengkerut); scroll NAIK
   → false (muncul). Opsi `idleExpandMs`: setelah diam sekian ms, kembalikan
   ke false (Fab memanjang lagi saat berhenti). Histeresis ±4px sama persis
   dgn logika lama agar tak gemetar di getaran scroll kecil. */
export function useScrollHide(
  { threshold = 80, idleExpandMs }: { threshold?: number; idleExpandMs?: number } = {},
): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let idle: ReturnType<typeof setTimeout> | undefined;
    const unsub = subscribe((y, prev) => {
      if (y > prev + 4 && y > threshold) setHidden(true);   // turun → sembunyi
      else if (y < prev - 4) setHidden(false);              // naik → muncul
      if (idleExpandMs) {
        clearTimeout(idle);
        idle = setTimeout(() => setHidden(false), idleExpandMs); // diam → muncul lagi
      }
    });
    return () => { unsub(); clearTimeout(idle); };
  }, [threshold, idleExpandMs]);
  return hidden;
}

/* ── Sudah tergeser melewati `px` dari puncak (Header) ──────────────────
   Sinyal POSISI (bukan arah): true saat scrollY > px. Disinkron sekali saat
   mount agar paritas dgn pemanggilan onScroll() langsung di versi lama. */
export function useScrolledPast(px = 0): boolean {
  const [past, setPast] = useState(
    () => (typeof window !== 'undefined' ? window.scrollY > px : false),
  );
  useEffect(() => {
    setPast(window.scrollY > px); // sync saat mount
    return subscribe((y) => setPast(y > px));
  }, [px]);
  return past;
}
