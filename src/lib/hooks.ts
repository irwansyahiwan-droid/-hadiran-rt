import { useState, useEffect, useRef, useReducer, useCallback} from 'react';
import { showToast } from './toast';
import { useOnline } from '../hooks/useOnline';

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
/** Lebar layar tersempit yang masih sanggup memuat kaki stat TIGA kolom.
 *  Ditambahkan 24 Agu 2026: ambang lama hanya menimbang TINGGI, padahal
 *  kekurangan ruangnya bisa datang dari sumbu mana pun. Terukur di 320px
 *  (lebar WAJIB §1.4.10) oleh `audit:lebar` yang baru diperluas: tiga kolom
 *  masing-masing tinggal 65,3px, nominal 64,6px pada huruf yang SUDAH di
 *  lantai 9,6px — "Rp5.865.000" dan "Rp1.500.000" bersentuhan menyeberangi
 *  divider, dan label "Setor Kas RT" pecah dua baris sehingga nominal kolom
 *  ketiga turun & tak lagi sebaris.
 *
 *  Alasan melepasnya PERSIS sama dgn alasan sumbu tinggi yang sudah tertulis
 *  di atas — ketiga angka itu tak hilang, masing-masing punya halamannya
 *  sendiri — jadi ini memperluas keputusan yang ada, bukan membuat yang baru.
 *
 *  CATATAN: di HP 320px NYATA (mis. iPhone SE 320x568) kaki stat memang sudah
 *  lepas lewat sumbu tinggi. Yang ditutup di sini justru kombinasi 320px LEBAR
 *  dgn layar TINGGI — yaitu skenario reflow 400% zoom yang §1.4.10 maksudkan. */
const VW_RINGKAS = 360;

/** `vw` opsional supaya pemanggil lama (dan uji sumbu tinggi) tetap sah;
 *  SEMUA pembaca runtime wajib mengirimnya. */
export function heroRingkas(vh: number, vw = Number.POSITIVE_INFINITY): boolean {
  return vh < VH_RINGKAS || vw < VW_RINGKAS;
}

/** Ukuran layar yang ikut resize/rotasi. Satu implementasi untuk semua pembaca:
 *  dua listener terpisah pernah jadi sumber drift geometri hero — itu sebabnya
 *  LEBAR ikut dititipkan ke hook ini alih-alih diberi hook & listener sendiri.
 *
 *  Objeknya dijaga identitasnya saat nilainya tak berubah: `resize` menyala
 *  jauh lebih sering daripada ukuran benar-benar bergeser (bar URL mobile
 *  muncul/hilang), dan mengembalikan objek baru tiap kali akan me-render ulang
 *  seluruh carousel tanpa satu piksel pun berubah. Versi lama mengembalikan
 *  number, jadi React membatalkannya sendiri; begitu jadi objek, penjaga ini
 *  yang menggantikan peran itu. */
export function useUkuranLayar(): { vh: number; vw: number } {
  const [uk, setUk] = useState(() => ({
    vh: typeof window !== 'undefined' ? window.innerHeight : 800,
    vw: typeof window !== 'undefined' ? window.innerWidth : 390,
  }));
  useEffect(() => {
    const onResize = () =>
      setUk((p) => (p.vh === window.innerHeight && p.vw === window.innerWidth
        ? p
        : { vh: window.innerHeight, vw: window.innerWidth }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return uk;
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
/**
 * `saving` + latch SINKRON. Kembarannya `useState(false)` biasa, tapi nilainya
 * juga ditulis ke ref supaya bisa dibaca SEBELUM React sempat me-render.
 *
 * Kenapa ada (19 Agu 2026): semua jalur tulis app memakai pola
 * `const [saving, setSaving] = useState(false)` + `disabled={saving || …}`.
 * Itu penjaga UI, dan ia hanya bekerja SETELAH React me-render ulang. Dua
 * ketukan di TASK YANG SAMA — ghost-click iOS/Android, atau warga menekan lagi
 * karena HP-nya terasa tak merespons — masuk ke handler dua kali sebelum render
 * itu terjadi. Terukur di Kas RT: satu ketukan ganda mengirim **dua `POST`**,
 * yaitu dua transaksi tercatat untuk satu niat. Di app kas itu uang, bukan
 * kosmetik.
 *
 * `useRef`, BUKAN state kedua: ref berubah SEKARANG JUGA, jadi ia kebal
 * terhadap waktu render — persis sifat yang kurang pada `saving`.
 *
 * Pakai:
 *   const [saving, setSaving, sedangSimpan] = useSaving();
 *   async function submit(e) {
 *     e.preventDefault();
 *     if (!nominal || sedangSimpan()) return;   // ← penjaga
 *     setSaving(true);
 *     try { await tulis(); } finally { setSaving(false); }
 *   }
 *
 * Penjaganya SATU BARIS di tiap handler dan tak mengubah satu pun jalur keluar
 * yang sudah ada: `setSaving(false)` di mana pun ia dipanggil ikut melepas
 * latch, jadi handler bertahap (mis. Kelola Anggota) tetap benar apa adanya.
 */
export function useSaving(): [boolean, (v: boolean) => void, () => boolean] {
  const [saving, setSavingRaw] = useState(false);
  const kunci = useRef(false);
  const setSaving = useCallback((v: boolean) => {
    kunci.current = v;
    setSavingRaw(v);
  }, []);
  const sedangSimpan = useCallback(() => kunci.current, []);
  return [saving, setSaving, sedangSimpan];
}

/* ── Aksi BERAT: ekspor, cetak, bagikan ──────────────────────────
 * Saudara `useSaving()` untuk jalur yang TIDAK menulis apa pun ke DB tapi tetap
 * membuat orang menunggu lama: tiap "Cetak PDF" / "Ekspor Excel" / "Bagikan"
 * memanggil `await import(...)` chunk yang baru diunduh SAAT DIKETUK (Excel
 * 941 kB, PDF triwulan 399 kB, html2canvas 201 kB) lalu merender berkasnya di
 * main thread.
 *
 * Terukur 20 Agu 2026 di Kas RT, 400 kbps + CPU 4× (`npm run audit:respon`):
 * "Ekspor Excel" butuh **6.247 ms** sampai berkas turun, dan selama enam detik
 * itu layar TIDAK BERUBAH SAMA SEKALI — nol spinner, nol tombol nonaktif, nol
 * kata tunggu, nol toast. Tiga akibat, ketiganya terukur di hari yang sama:
 *
 *   1. Terasa MURAH. Ini justru satu-satunya jeda panjang yang tersisa di app:
 *      `audit:respon` bagian A & B mengukur 34 interaksi lain dan yang
 *      TERBURUK 56 ms. Ekspor 110× lebih lambat dari tetangganya dan
 *      satu-satunya yang tak mengaku sedang bekerja.
 *   2. Ketukan kedua menghasilkan **DUA berkas identik** (terukur: 2 unduhan
 *      untuk satu ketukan ganda). `disabled={sibuk}` saja tak menolong —
 *      penjaga UI baru berlaku sesudah React me-render, sedangkan dua ketukan
 *      di TASK YANG SAMA masuk lebih dulu. Alasan yang sama persis melahirkan
 *      `useSaving()`; jalur ekspor tak pernah kebagian.
 *   3. Kalau chunk-nya gagal diunduh, layar diam SELAMANYA. Bukan hipotesis:
 *      `vercel.json` merewrite semua path ke `index.html`, jadi sesudah deploy
 *      chunk lama dibalas HTTP 200 berisi HTML dan `import()` menolak dgn galat
 *      MIME. Terukur dgn menyuntik balasan itu: jalur Excel — yang tak punya
 *      `catch` sama sekali — cuma meninggalkan satu `pageerror` di konsol yang
 *      tak pernah dilihat siapa pun.
 *
 * Intinya sengaja dipisah dari hook-nya supaya bisa DIUJI di node (repo ini tak
 * memasang testing-library, jadi apa pun yang hidup di dalam `useState` cuma
 * bisa diuji lewat browser).
 */

/** Batas sabar aksi berat. Beda dari `BATAS_REQ_MS` (20 dtk, request Supabase)
 *  karena yang ditunggu di sini bukan API tapi UNDUHAN CHUNK: 270 kB gzip di
 *  400 kbps sudah 5,4 dtk sehat, dan memotongnya di 20 dtk akan menyebut
 *  jaringan pelan sebagai "gagal". Yang dijaga cuma satu: tombol tak boleh
 *  terkunci selamanya. `import()` tak bisa dibatalkan — kalau batas ini lewat,
 *  yang dilepas hanya UI-nya; berkasnya tetap turun kalau akhirnya sampai. */
export const BATAS_AKSI_MS = 30_000;

/* Tiga angka di bawah ini yang membedakan "ada spinner" dari "terasa mahal".
   Keadaan sibuk TIDAK dipasang serta-merta: chunk yang sudah ter-cache selesai
   dalam ~180 ms (terukur di jalur PDF Kas RT), dan memasang pemintal untuk itu
   cuma menghasilkan KEDIPAN — mata membacanya sebagai kerusakan, bukan sebagai
   kerja. Jadi: tunggu sebentar sebelum mengaku sibuk, lalu kalau sudah terlanjur
   mengaku, bertahanlah cukup lama untuk terbaca. */
const TUNDA_SIBUK_MS = 250;   // di bawah ini: selesai diam-diam, tanpa kedipan
const MIN_SIBUK_MS = 400;     // sekali tampil, jangan hilang sebelum terbaca
const WARTA_MS = 1200;        // masih berjalan selama ini → beri KATA, bukan cuma ikon

export function buatAksiBerat(setSibuk: (v: boolean) => void, batasMs = BATAS_AKSI_MS) {
  let kunci = false;      // latch SINKRON — berubah sebelum React sempat render
  let sesi = 0;           // penanda giliran: pelepasan telat tak boleh membuka kunci giliran baru
  return {
    sedangSibuk: () => kunci,
    async jalankan(
      aksi: () => unknown,
      opts: { mulai?: string; gagal?: string } = {},
    ) {
      const {
        mulai = 'Menyiapkan berkas…',
        gagal = 'Gagal menyiapkan berkas. Coba muat ulang aplikasi.',
      } = opts;
      if (kunci) return;                       // ketukan kedua di task yang sama: mental di sini
      kunci = true;
      const id = ++sesi;
      let tampilSejak = 0;

      const jamTampil = setTimeout(() => {
        if (id !== sesi || !kunci) return;
        tampilSejak = Date.now();
        setSibuk(true);
      }, TUNDA_SIBUK_MS);
      const jamWarta = setTimeout(() => {
        if (id !== sesi || !kunci) return;
        showToast(mulai, 'info');
      }, WARTA_MS);

      const lepas = async () => {
        if (id !== sesi) return;
        const sisa = tampilSejak ? MIN_SIBUK_MS - (Date.now() - tampilSejak) : 0;
        if (sisa > 0) await new Promise((r) => setTimeout(r, sisa));
        if (id !== sesi) return;
        kunci = false;
        if (tampilSejak) setSibuk(false);
      };

      const jamBatas = setTimeout(() => {
        if (id !== sesi || !kunci) return;
        kunci = false;
        if (tampilSejak) setSibuk(false);
        showToast('Jaringan lambat — berkas belum selesai disiapkan. Coba lagi.', 'error');
      }, batasMs);

      try {
        await aksi();
      } catch {
        showToast(gagal, 'error');
      } finally {
        clearTimeout(jamTampil);
        clearTimeout(jamWarta);
        clearTimeout(jamBatas);
        await lepas();
      }
    },
  };
}

/** Versi React dari `buatAksiBerat`: `[sibuk, jalankan]`.
 *
 *  Pakai:
 *    const [ekspor, jalankanEkspor] = useAksiBerat();
 *    onClick={() => jalankanEkspor(async () => {
 *      const { generateX } = await import('../lib/generateX');
 *      generateX(data);
 *    })}
 *
 *  `sibuk` dipasang ke tombolnya (`busy`/`disabled`) supaya ketukan itu MENGAKU
 *  diterima; latch di dalamnya yang mencegah berkas ganda. Jalur ekspor/berbagi
 *  BARU wajib memakainya — `try/catch` polos akan lolos semua sapuan lain. */
export function useAksiBerat(): [boolean, (aksi: () => unknown, opts?: { mulai?: string; gagal?: string }) => Promise<void>] {
  const [sibuk, setSibuk] = useState(false);
  const hidup = useRef(true);
  useEffect(() => () => { hidup.current = false; }, []);
  const inti = useRef<ReturnType<typeof buatAksiBerat> | null>(null);
  if (!inti.current) inti.current = buatAksiBerat((v) => { if (hidup.current) setSibuk(v); });
  return [sibuk, inti.current.jalankan];
}

/* ── Kembali dari latar ──────────────────────────────────────────
 * Halaman-halaman utama memuat datanya SEKALI di `useEffect` mount, dan tak
 * satu pun memasang realtime (`useRealtime` cuma dipakai Riwayat Aktivitas).
 * Selama tab-nya tak ditutup, itu berarti angka yang terbaca warga adalah angka
 * saat ia membuka app — bisa berjam-jam lalu.
 *
 * Terukur 20 Agu 2026 (`npm run audit:kembali`): ditinggal 65 detik lalu dibuka
 * lagi → **nol GET**, di kedua peran. Bukan skenario karangan; itu cara app ini
 * dipakai: buka Hadiran RT, pindah ke WhatsApp membalas grup, kembali. Untuk
 * app kas, saldo lama yang tampak persis seperti saldo sekarang bukan soal
 * rasa — itu pernyataan keliru tentang uang, jenis kesalahan terburuk di sini.
 *
 * Ambangnya ADA supaya obatnya tak lebih buruk dari penyakitnya: warga yang
 * menyentuh notifikasi lalu balik dalam 3 detik tak boleh memicu satu request
 * pun (paket Supabase GRATIS, dan HP kelas bawah membayar tiap fetch dengan
 * baterai). Yang dijaga cuma "pergi lama".
 *
 * `load()` tiap halaman sudah memilih mode diam-diam sendiri (`silent =
 * list.length > 0`), jadi penyegaran ini TIDAK memunculkan skeleton lagi —
 * layar yang berkedip balik ke abu tiap kali app dibuka terasa lebih murah
 * daripada data basi yang diam. Dijaga sifat ke-3 di `audit:kembali`.
 */
export const AMBANG_BASI_MS = 60_000;

export function useKembaliDariLatar(muat: () => void, ambangMs = AMBANG_BASI_MS): void {
  /* Handler halaman lahir BARU tiap render (deklarasi fungsi di dalam
     komponen), jadi yang dipasang ke listener harus yang TERBARU — kalau
     ditangkap sekali di mount, ia akan memanggil `load` dgn closure state lama
     dan menimpa cache dgn data yang dihitung dari daftar usang. */
  const muatRef = useRef(muat);
  useEffect(() => { muatRef.current = muat; });

  const sejakSembunyi = useRef<number | null>(null);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') { sejakSembunyi.current = Date.now(); return; }
      const pergi = sejakSembunyi.current === null ? 0 : Date.now() - sejakSembunyi.current;
      sejakSembunyi.current = null;
      if (pergi >= ambangMs) muatRef.current();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [ambangMs]);
}

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

/**
 * Subjudul "Per <tanggal>" untuk halaman ber-SALDO — beserta penjaganya.
 *
 * Dua hal yang dulu salah, dan yang kedua jauh lebih serius.
 *
 * (1) POPULASI tak beraturan: dari lima halaman ber-PageHeader hanya DUA yang
 *     memakainya (Kas RT & Kas Hadiran), tanpa aturan tertulis di mana pun.
 *     Aturannya sekarang eksplisit: "per <tanggal>" itu KUALIFIKASI atas sebuah
 *     SALDO — angka uang tak lengkap tanpa "per kapan". Jadi ia milik halaman
 *     yang heronya menyatakan UANG (Kas RT, Kas Hadiran, Talangan), dan BUKAN
 *     milik halaman jadwal: di sana tanggal hidup di tiap baris, dan satu
 *     tanggal di kepala halaman justru menambah satu suara yang tak menerangkan
 *     apa-apa (lihat komentar PageHeader di Jadwal.tsx — keputusan yang sudah
 *     ada di sana sejak 30 Jul: "satu fakta satu suara").
 *
 * (2) Nilainya `new Date()` — TANGGAL SAAT MERENDER, bukan kesegaran datanya.
 *     Terukur 30 Agu 2026: saat muat GAGAL dan saat LURING, layar tetap
 *     berbunyi "Per 30 Agustus 2026" — berdampingan dgn "Gagal memuat data"
 *     dan strip "Tanpa sinyal — angka yang tampil salinan terakhir". Dua
 *     pernyataan yang saling bertentangan di satu layar, dan yang lebih
 *     dipercaya justru tanggalnya: ia terbaca sebagai jaminan bahwa saldo di
 *     bawahnya berlaku HARI INI.
 *
 *     Kelas yang SAMA dgn "0 Selesai · 0 Terjadwal" di Jadwal (ditutup 24 Agu)
 *     dan dgn kanon "app kas DILARANG menyatakan nominal saat muat gagal".
 *     `audit:keadaan` tak menangkapnya sendiri karena ia sengaja mengecualikan
 *     TANGGAL dari daftar klaim — pengecualian yang benar untuk tanggal baris,
 *     dan justru buta untuk tanggal yang berfungsi sebagai "per".
 *
 * Karena itu: tak tahu → tak bilang. Menyembunyikannya berbiaya 1px (tinggi
 * PageHeader ditentukan baris tombol 44px, bukan blok judul — diukur 45 → 44),
 * jadi tak ada geseran yang perlu ditukar demi kejujuran ini.
 */
export function usePerTanggal(loading: boolean, error: boolean): string {
  const online = useOnline();
  /* Barisnya DICADANGKAN (spasi tak-putus), bukan dihilangkan — dan angkanya
     diukur, bukan diasumsikan. Di Kas Hadiran menyembunyikannya cuma berbiaya
     1px karena tinggi PageHeader di sana ditentukan baris tombol 44px; di
     TALANGAN, yang tak punya tombol aksi sama sekali, tingginya ditentukan blok
     judul sehingga subjudul bernilai 21px PENUH (kepala 24 → 45). Muncul-sesudah-
     muat di sana menggeser seluruh halaman: `audit:lompat` b-Talangan 0,022 →
     0,056 (dibuktikan dgn `git stash` + build ulang, bukan disimpulkan).
     Spasi tak-putus menahan tingginya tanpa menyatakan apa pun — pembaca layar
     tak membacakannya, dan layar tak berpindah. */
  if (loading || error || !online) return '\u00A0';
  return `Per ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}
