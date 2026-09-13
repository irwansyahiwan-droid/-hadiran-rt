// Audit FOKUS TERTUTUP: apakah elemen yang sedang difokus papan ketik tertutup
// chrome sticky/fixed milik app sendiri (WCAG §2.4.11 AA · §2.4.12 AAA).
//
// Kenapa alat sendiri: `audit:papan-ketik` bertanya apakah tiap kontrol
// TERGAPAI Tab, dan menjawab benar. Ia tak pernah bertanya apakah kontrol yang
// sudah tergapai itu TERLIHAT. Peramban menggulir elemen yang difokus ke tepi
// viewport — tepi yang, di app ini, diduduki Header sticky di atas dan bar nav
// fixed di bawah. Tanpa `scroll-padding`, fokus mendarat TEPAT di bawahnya.
//
// GARIS DASAR PERTAMA (13 Sep 2026, @390x844, sebelum `useCadanganGulir`):
// 1042 titik fokus di 16 layar — **34 tertutup PENUH**, 333 sebagian, 65 DI
// LUAR LAYAR. Tiga kelas sekaligus:
//   · Header sticky menutup elemen yang dicapai Shift+Tab ("Apa itu Sohibul
//     Bait?" 0%, 16 tombol aksi tarikan di Jadwal bendahara 0%);
//   · bar nav fixed menutup yang dicapai Tab ("Urutkan", chip filter Hadiran 0%);
//   · bar nav yang TUCKED tetap memegang tombolnya di urutan Tab — fokus
//     mendarat di y=852 pada layar 844, kedua peran;
//   · (sisa sesudah dua obat pertama) FAB menutup 36–80% baris di tepi bawah.
// Sesudah perbaikan: 2078 titik di 32 layar (2 ukuran) · 0 · 0 · 0.
// Temuan ini lahir dari audit Web Interface Guidelines ("sticky headers must
// not cover the focused element"), bukan dari sapuan repo — tak satu pun
// memeriksanya.
//
// VONIS dari HIT-TEST, bukan geometri: `elementFromPoint` pada kisi 5x5 di
// dalam kotak elemen (dijepit ke viewport). Satu titik TERTUTUP kalau yang
// tercat paling atas di sana duduk di subpohon `position: fixed|sticky` yang
// TIDAK memuat elemen fokus. Membandingkan rect elemen dgn rect header akan
// salah di dua arah: header yang sedang menyusut/tucked, dan elemen di DALAM
// chrome itu sendiri (tombol Menu di Header bukan "tertutup Header").
//
// BATAS YANG DIAKUI:
//  · Hanya penutup fixed/sticky yang dihitung. Tumpang-tindih biasa (lencana
//    di sudut tombol, avatar yang menjorok) bukan kelas ini dan tak divonis.
//  · Penutup ber-`pointer-events: none` tak terlihat `elementFromPoint`.
//    Chrome app yang memakainya (bar nav saat tucked) memang juga tak
//    tercat di sana, jadi hari ini itu benar; penutup dekoratif pe:none yang
//    OPAK kelak takkan tertangkap.
//  · Populasi = titik fokus yang benar-benar dicapai Tab maju DAN Shift+Tab
//    mundur. Dua arah itu wajib: maju meratakan elemen ke tepi BAWAH (bar
//    nav), mundur ke tepi ATAS (Header). Satu arah = separuh cacat.
//
// Pakai:  npm run audit:fokus-tertutup
//   W=360 H=568        → satu ukuran saja (bawaan: 390x844 + 360x568)
//   CAP_URL=https://hadiran-rt.vercel.app   (wajib sekali sebelum dianggap benar)
//   MUTASI=1  → cabut SEMUA scroll-padding (`!important`, menang atas inline
//               style hook) — vonis penuh/sebagian WAJIB merah
//   MUTASI=2  → paksa bar nav tetap TUCKED walau tombolnya difokus — vonis
//               DI LUAR LAYAR WAJIB merah. Mutasi terpisah karena cabangnya
//               terpisah: MUTASI=1 tak pernah menyentuhnya.
//   Nol temuan di bawah mutasi mana pun = PROBE CACAT (exit 2).
import { chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab, openMenuItem, closeLayer } from './lib/audit-harness.mjs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI || '';
const UKURAN = process.env.W && process.env.H
  ? [[+process.env.W, +process.env.H]]
  : [[390, 844], [360, 568]];
/* Batas langkah per arah. Layar terpadat hari ini ~200 titik fokus; batas ini
   hanya jaring untuk fokus yang berputar tanpa pernah kembali ke titik awal. */
const BATAS = 700;
const OVERLAY = {
  warga: ['Riwayat Aktivitas', 'Tentang Aplikasi'],
  bendahara: ['Riwayat Aktivitas', 'Kelola Anggota', 'Tutup Buku Triwulan', 'Backup & Restore', 'Tentang Aplikasi'],
};

/** Ukur elemen yang SEKARANG difokus. Dijalankan di halaman. */
const UKUR = () => {
  const a = document.activeElement;
  if (!a || a === document.body || a === document.documentElement) return { kosong: true };
  if (!a.dataset.ft) a.dataset.ft = String((window.__ftN = (window.__ftN || 0) + 1));
  const nama = (a.getAttribute('aria-label') || a.innerText || a.getAttribute('placeholder') || a.tagName)
    .replace(/\s+/g, ' ').trim().slice(0, 44);

  /* Kontrol yang disembunyikan visual (radio `sr-only` di balik label kustom)
     kotaknya 1px: kisi 5x5 di sana cuma mengenai tetangganya. Yang dilihat
     mata adalah LABEL-nya, jadi itulah yang diukur. */
  let el = a, b = a.getBoundingClientRect();
  if (b.width < 4 || b.height < 4) {
    const wakil = a.labels?.[0] || a.parentElement;
    if (wakil) { el = wakil; b = wakil.getBoundingClientRect(); }
  }
  const x0 = Math.max(b.left, 0), x1 = Math.min(b.right, innerWidth);
  const y0 = Math.max(b.top, 0), y1 = Math.min(b.bottom, innerHeight);
  if (x1 - x0 < 1 || y1 - y0 < 1) return { key: a.dataset.ft, nama, luar: true, top: Math.round(b.top) };

  const chromeDari = (n) => {
    for (let e = n; e && e !== document.documentElement; e = e.parentElement) {
      const p = getComputedStyle(e).position;
      if (p === 'fixed' || p === 'sticky') return e;
    }
    return null;
  };
  const opak = (e) => {
    let o = 1;
    for (let x = e; x && x !== document.documentElement; x = x.parentElement) o *= +getComputedStyle(x).opacity;
    return o > 0.05;
  };
  const sebut = (e) => e.getAttribute('aria-label')
    || (e.tagName === 'HEADER' ? 'header' : e.tagName === 'NAV' ? 'nav' : '')
    || `${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 3).join('.')}`;

  const kisi = (lo, hi) => (hi - lo < 6 ? [(lo + hi) / 2] : [0, 1, 2, 3, 4].map((i) => lo + 2 + ((hi - lo - 4) * i) / 4));
  let total = 0, tampak = 0;
  const penutup = new Set();
  for (const y of kisi(y0, y1)) for (const x of kisi(x0, x1)) {
    const atas = document.elementFromPoint(x, y);
    if (!atas) continue;
    total++;
    if (el.contains(atas) || atas.contains(el) || a.contains(atas)) { tampak++; continue; }
    const c = chromeDari(atas);
    if (c && !c.contains(el) && opak(c)) penutup.add(sebut(c));
    else tampak++;
  }
  return { key: a.dataset.ft, nama, frac: total ? tampak / total : 1, penutup: [...penutup], top: Math.round(b.top), bot: Math.round(b.bottom) };
};

/** Dua rAF: `useScrollHide`/`useScrolledPast` merender sesudah event gulir. */
const DUA_FRAME = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

async function jelajah(page, arah) {
  const kunci = arah === 'maju' ? 'Tab' : 'Shift+Tab';
  await page.evaluate((ar) => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].pop();
    const gulir = dlg && dlg.scrollHeight > dlg.clientHeight ? dlg : document.scrollingElement;
    gulir.scrollTop = ar === 'maju' ? 0 : gulir.scrollHeight;
    if (dlg) { dlg.focus(); return; }
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
  }, arah);
  await page.waitForTimeout(250);

  const hasil = [];
  const seen = new Set();
  let pertama = null, kosongBeruntun = 0;
  for (let i = 0; i < BATAS; i++) {
    await page.keyboard.press(kunci);
    await page.evaluate(DUA_FRAME);
    const r = await page.evaluate(UKUR);
    if (r.kosong) { if (++kosongBeruntun >= 2 || hasil.length) break; continue; }
    kosongBeruntun = 0;
    if (pertama === null) pertama = r.key;
    else if (r.key === pertama) break;          // satu putaran penuh
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    hasil.push(r);
  }
  return hasil;
}

/** Pasang mutasi & BUKTIKAN ia mendarat — mutasi yang diam-diam tak terpasang
 *  mencetak hijau yang terbaca sbg "probe kuat" (pelajaran audit:muat (a)). */
async function pasangMutasi(page) {
  if (MUTASI === '1') {
    await page.addStyleTag({ content: 'html, html * { scroll-padding: 0 !important; }' });
    return page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop === '0px');
  }
  if (MUTASI === '2') {
    await page.addStyleTag({ content: 'nav.fixed { transform: translate3d(0, calc(100% + 8px), 0) !important; }' });
    return page.evaluate(() => {
      const n = document.querySelector('nav.fixed');
      return !n || n.getBoundingClientRect().top >= innerHeight;   // overlay tanpa nav: tak relevan, dihitung mendarat
    });
  }
  return false;
}

const adaChrome = (page) => page.evaluate(() => {
  const dlg = [...document.querySelectorAll('[role="dialog"]')].pop();
  const akar = dlg || document.body;
  return [...akar.querySelectorAll('header, nav, [class*="sticky"], [class*="fixed"]')].some((e) => {
    const s = getComputedStyle(e), b = e.getBoundingClientRect();
    return (s.position === 'fixed' || s.position === 'sticky') && b.width > 100 && b.height > 20 && b.bottom > 0 && b.top < innerHeight;
  });
});

const browser = await chromium.launch();
let titik = 0, layar = 0, cacat = 0, mutasiMendarat = 0;
const penuh = [], sebagian = [], luar = [];

async function ujiLayar(page, label) {
  await page.evaluate(() => document.querySelectorAll('[data-ft]').forEach((e) => e.removeAttribute('data-ft')));
  if (MUTASI && (await pasangMutasi(page))) mutasiMendarat++;
  if (!(await adaChrome(page))) {
    console.log(`\n### ${label}   PROBE CACAT: tak ada chrome sticky/fixed — tak ada yang bisa menutupi, probe tak bisa menggigit`);
    cacat++;
    return;
  }
  const semua = [...(await jelajah(page, 'maju')).map((r) => ({ ...r, arah: 'maju' })),
                 ...(await jelajah(page, 'mundur')).map((r) => ({ ...r, arah: 'mundur' }))];
  const unik = new Set(semua.map((r) => r.key));
  layar++; titik += unik.size;
  if (!unik.size) { console.log(`\n### ${label}   PROBE CACAT: populasi 0 — Tab tak pernah mendarat`); cacat++; return; }

  const p = semua.filter((r) => !r.luar && r.frac === 0);
  const s = semua.filter((r) => !r.luar && r.frac > 0 && r.frac < 1);
  const l = semua.filter((r) => r.luar);
  const baris = (r) => `[${r.arah}] "${r.nama}" y=${r.top}..${r.bot ?? '?'}${r.luar ? ' DI LUAR LAYAR' : ` terlihat ${Math.round(r.frac * 100)}% · ditutup ${r.penutup.join(' + ')}`}`;
  p.forEach((r) => penuh.push(`${label} ${baris(r)}`));
  s.forEach((r) => sebagian.push(`${label} ${baris(r)}`));
  l.forEach((r) => luar.push(`${label} ${baris(r)}`));
  const bersih = !p.length && !s.length && !l.length;
  console.log(`\n### ${label}   fokus ${unik.size} · penuh ${p.length} · sebagian ${s.length}${l.length ? ` · luar ${l.length}` : ''}${bersih ? '  OK' : ''}`);
  [...p, ...l, ...s].slice(0, 10).forEach((r) => console.log(`    ${baris(r)}`));
}

for (const [W, H] of UKURAN) {
  for (const bendahara of [false, true]) {
    const peran = bendahara ? 'bendahara' : 'warga';
    const { ctx, page } = await newCtx(browser, 'light', { bendahara });
    await page.setViewportSize({ width: W, height: H });
    await page.goto(APP, { waitUntil: 'networkidle' });
    if (!bendahara && !(await loginWarga(page))) { console.log(`PROBE CACAT: ${peran} gagal masuk`); process.exit(2); }
    await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });

    // Daftar tab DIBACA dari nav (warga tak punya Talangan) — preseden audit:papan-ketik.
    const tabs = await page.$$eval('nav button', (bs) => bs.map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean));
    for (const t of tabs) {
      await gotoTab(page, t);
      await ujiLayar(page, `[${W}x${H} ${peran}/${t}]`);
    }
    await gotoTab(page, 'Beranda');
    for (const o of OVERLAY[peran]) {
      if (!(await openMenuItem(page, o))) { console.log(`\n### [${W}x${H} ${peran}/${o}]   PROBE CACAT: overlay tak terbuka`); cacat++; continue; }
      await page.waitForTimeout(1500);
      await ujiLayar(page, `[${W}x${H} ${peran}/${o}]`);
      await closeLayer(page);
    }
    await ctx.close();
  }
}
await browser.close();

console.log(`\n=== FOKUS TERTUTUP: ${titik} titik fokus diperiksa di ${layar} layar · penuh ${penuh.length} (§2.4.11 AA) · sebagian ${sebagian.length} (§2.4.12 AAA, ambang app) · di luar layar ${luar.length} ===`);
if (penuh.length || luar.length) { console.log('\n  TERTUTUP PENUH / DI LUAR LAYAR:'); [...penuh, ...luar].forEach((x) => console.log('   ' + x)); }
if (sebagian.length) { console.log('\n  TERTUTUP SEBAGIAN:'); sebagian.slice(0, 40).forEach((x) => console.log('   ' + x)); }

if (MUTASI) {
  if (mutasiMendarat < layar) { console.log(`\nPROBE CACAT: mutasi cuma mendarat di ${mutasiMendarat}/${layar} layar`); process.exit(2); }
  const kena = MUTASI === '2' ? luar.length : penuh.length + sebagian.length;
  if (!kena) { console.log(`\nPROBE CACAT: MUTASI=${MUTASI} tapi nol temuan di cabangnya — probe tak menggigit`); process.exit(2); }
}
if (cacat) process.exit(2);
process.exit(penuh.length || sebagian.length || luar.length ? 1 : 0);
