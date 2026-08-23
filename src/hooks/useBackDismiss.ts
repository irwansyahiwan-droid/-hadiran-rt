import { useEffect, useRef } from 'react';

/**
 * Integrasi tombol "Back" HP / browser dengan lapisan yang bisa ditutup
 * (overlay, bottom sheet, modal, tab non-Beranda). Tanpa ini, menekan Back
 * akan KELUAR dari aplikasi alih-alih menutup panel — terasa tidak native.
 *
 * Cara kerja: tiap lapisan aktif mendorong satu entri history. Tombol Back
 * memunculkan `popstate` → kita tutup lapisan TERATAS saja (back-stack
 * terpusat agar tidak saling tabrak saat bertumpuk). Menutup lewat tombol di
 * UI memanggil `history.back()` sendiri agar history tetap sinkron.
 */

interface Layer { id: number; close: () => void; lapisan: boolean }

const stack: Layer[] = [];
let seq = 0;
let inited = false;

/* ── Serialisasi operasi history ──────────────────────────────────────────
   `history.back()` cuma MENJADWALKAN traversal (asinkron), sedangkan
   `pushState` berjalan sinkron. Tanpa serialisasi, urutan back()→pushState
   (layer ditutup programatik lalu layer lain langsung buka; StrictMode dev
   men-double effect dgn pola yang sama) membuat traversal mendarat SETELAH
   push → posisi history terdampar DI BELAKANG entri push, dan back()
   berikutnya melempar keluar app (dev: about:blank, blank total).
   Solusi: back kiriman kita dihitung (pendingBack); push/back lanjutan
   diantrikan dan baru dijalankan setelah popstate traversal-nya tiba. */
let pendingBack = 0;
const opQueue: Array<() => void> = [];

/* ── Entri YATIM dari page life sebelumnya ────────────────────────────────
   Entri history SELAMAT dari reload; `stack` di atas lahir KOSONG. Jadi app
   yang dimuat ulang saat sebuah lapisan terbuka duduk di atas entri yang tak
   lagi dimiliki siapa pun, dan ketukan Back PERTAMA warga terbakar percuma:
   traversal-nya mendarat, `stack` kosong, tak ada yang ditutup — tab tetap,
   app tak keluar, NOL yang bisa dilihat. Baru ketukan kedua bekerja.

   Bukan skenario karangan: `PwaUpdatePrompt` memanggil `location.reload()`
   saat warga menekan "Muat ulang" pada toast versi baru, jadi tiap deploy
   satu putaran — dan lapisan yang kebetulan terbuka saat itu (menu, popover
   istilah) meninggalkan entrinya.

   Obatnya menyapu entri itu SAAT BOOT, bukan saat Back ditekan: memundurkan
   satu entri lagi dari dalam handler popstate tetap menyisakan ketukan yang
   tak terlihat efeknya — yang harus hilang entrinya, bukan gejalanya.
   Menonton `history.state` saja MENIPU: state memang berubah tiap entri yatim
   dikonsumsi, dan itu membuat ketukan mati terbaca seperti ketukan yang
   bekerja (lihat bagian D `npm run audit:mundur`). */
let menyapuYatim = false;
let jaringSapu: number | undefined;

const sibuk = () => pendingBack > 0 || menyapuYatim;

function runOrQueue(op: () => void) {
  if (sibuk()) opQueue.push(op);
  else op();
}

function flushQueue() {
  while (!sibuk() && opQueue.length > 0) opQueue.shift()!();
}

function selesaiSapu() {
  menyapuYatim = false;
  window.clearTimeout(jaringSapu);
  flushQueue();
}

/** Satu langkah mundur + jaring pengaman. */
function mundurSapu() {
  window.clearTimeout(jaringSapu);
  /* WAJIB ada: `history.back()` di entri PERTAMA tab tak menghasilkan traversal
     dan popstate tak pernah datang. Tanpa jaring ini `menyapuYatim` menyala
     selamanya dan SELURUH pendaftaran lapisan sesudahnya ikut terantri — obat
     yang justru mematikan back-stack yang mau diperbaiki. */
  jaringSapu = window.setTimeout(selesaiSapu, 1000);
  window.history.back();
}

function init() {
  if (inited || typeof window === 'undefined') return;
  inited = true;
  window.addEventListener('popstate', () => {
    if (menyapuYatim) {
      // Rantai entri yatim bisa lebih dari satu (lapisan bertumpuk saat reload).
      if ((window.history.state as { backId?: number } | null)?.backId != null) { mundurSapu(); return; }
      selesaiSapu();
      return;
    }
    if (pendingBack > 0) { pendingBack -= 1; flushQueue(); return; } // pop kiriman kita sendiri
    const top = stack.pop();
    if (top) top.close();
  });
}

function registerBack(close: () => void, lapisan: boolean): () => void {
  if (typeof window === 'undefined') return () => {};
  init();
  const id = ++seq;
  stack.push({ id, close, lapisan });
  runOrQueue(() => window.history.pushState({ backId: id }, ''));
  return () => {
    const i = stack.findIndex((e) => e.id === id);
    if (i === -1) return;          // sudah ditutup via tombol Back HP
    stack.splice(i, 1);
    runOrQueue(() => { pendingBack += 1; window.history.back(); });
  };
}

/**
 * Ada LAPISAN (sheet / modal / menu / popover) yang sedang terbuka?
 *
 * Dipakai gestur tingkat-App untuk menolak menembus lapisan. `stack` di berkas
 * ini sumber kebenaran yang paling tepercaya untuk itu: tiap lapisan WAJIB
 * mendaftar di sini (dijaga `npm run audit:mundur`), jadi lapisan baru ikut
 * terlindungi tanpa call-site-nya perlu ingat apa-apa — beda dgn menghitung
 * `[role=dialog]` di DOM, yang meleset untuk popover ber-role lain dan untuk
 * lapisan yang sedang beranimasi keluar.
 *
 * TAPI stack ini juga memuat entri TAB (App mendaftarkan `activeTab !==
 * 'beranda'` supaya Back kembali ke Beranda), dan entri itu BUKAN lapisan —
 * tak ada yang menutupi layar. Menghitungnya ikut membuat gestur mati di SEMUA
 * tab selain Beranda: swipe ganti-tab dan pull-to-refresh berhenti bekerja
 * justru di halaman tempat warga paling sering memakainya. Terjadi 23 Agu
 * (tertangkap uji kontrol G3 `audit:gestur`), jadi pendaftar wajib menyatakan
 * dirinya lapisan atau bukan.
 */
export function adaLapisanTerbuka(): boolean {
  return stack.some((e) => e.lapisan);
}

/**
 * @param active true saat lapisan terbuka.
 * @param onClose dipanggil saat user menekan Back (atau saat ditutup programatik).
 * @param opts.lapisan default true. Setel FALSE untuk pendaftar yang bukan
 *   permukaan menutupi layar (mis. entri tab di App) — lihat `adaLapisanTerbuka`.
 */
export function useBackDismiss(active: boolean, onClose: () => void, opts?: { lapisan?: boolean }): void {
  const ref = useRef(onClose);
  ref.current = onClose;
  const lapisan = opts?.lapisan !== false;
  useEffect(() => {
    if (!active) return;
    return registerBack(() => ref.current(), lapisan);
  }, [active, lapisan]);
}

/* Dijalankan sekali saat modul diimpor — SENGAJA bukan dari `registerBack`.
   `init()` selama ini lazy, dan di Beranda tak satu lapisan pun mendaftar,
   jadi penyapu yang menumpang di sana takkan pernah jalan justru di layar
   tempat warga paling sering menekan Back. */
export function sapuEntriYatim(): void {
  if (typeof window === 'undefined') return;
  init();
  if ((window.history.state as { backId?: number } | null)?.backId == null) return;
  menyapuYatim = true;
  mundurSapu();
}

sapuEntriYatim();
