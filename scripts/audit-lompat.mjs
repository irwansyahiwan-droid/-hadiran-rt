// Audit TATA LETAK MELOMPAT (layout shift) saat skeleton berganti isi nyata.
//
// Kenapa alat sendiri: `audit:muat` mengukur KAPAN app tercat (FCP) & kapan bisa
// dipakai — bukan apakah isinya MELOMPAT sesudah itu. Sapuan geometri lain
// (`audit:sheet`, `audit:lebar`, `audit:potong`) memotret SATU keadaan diam:
// mereka mengukur layar yang sudah tenang, jadi perpindahan skeleton → data
// nyata terjadi SEBELUM pengukuran dan tak pernah terlihat oleh satu pun.
// Padahal di situlah jempol warga sudah menyentuh layar: baris bergeser tepat
// saat diketuk, dan yang terbuka bukan baris yang dituju.
//
// Diukur pakai PerformanceObserver('layout-shift') yang dipasang lewat
// addInitScript — WAJIB terpasang sebelum skrip app jalan, kalau tidak geseran
// paling awal (justru yang terbesar) sudah lewat sebelum observer ada.
//
// DUA angka dilaporkan terpisah, sengaja:
//   tanpa-input — geseran yang TAK didahului interaksi (definisi CLS Google)
//   total       — termasuk yang terjadi <500ms sesudah ketukan
// Yang kedua BUKAN pelengkap: pindah tab itu ketukan, jadi seluruh perpindahan
// skeleton → isi sesudahnya ditandai `hadRecentInput` dan HILANG dari CLS resmi.
// Justru itu geseran yang paling dirasakan warga. Menilai app ini cuma dari
// angka pertama = menyetujui lompatan yang paling sering kena jempol.
//
// Pakai:  npm run audit:lompat
//   CAP_URL=https://hadiran-rt.vercel.app   (wajib sekali sebelum dianggap benar)
//   CPU=4 KBPS=400 LATENCY=400              (kondisi HP warga; 0 = tanpa throttle)
//   MUTASI=1                                (suntik geseran palsu → sapuan HARUS merah)
//   MUTASI=2                                (geseran KECIL 30px sekali → menguji vonis
//                                            PIKSEL saja: skornya di bawah ambang, jadi
//                                            sapuan lama akan hijau & yang baru merah)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const CPU = +(process.env.CPU || 4);
const KBPS = +(process.env.KBPS || 400);
const LATENCY = +(process.env.LATENCY || 400);
const MUTASI = +(process.env.MUTASI || 0);
// Ambang APP, bukan WCAG. Google menyebut CLS "baik" di <=0.1; app kas dipakai
// sambil berdiri di majelis, jadi dipakai ambang yang sama tapi diberlakukan ke
// angka TOTAL — termasuk geseran pasca-ketukan yang CLS resmi buang.
const AMBANG = +(process.env.AMBANG || 0.1);
/* AMBANG KEDUA, dalam PIKSEL — dan ini yang menutup titik buta skor.
   Terukur 2 Sep 2026: hero Kas Hadiran melompat 164 -> 238px (74px, kartu
   terbesar & terpenting di layar) saat kerangka berganti isi, dan sapuan ini
   melaporkannya `OK` — skornya cuma 0,040 di warga & 0,041 di bendahara, jauh
   di bawah 0,1. Skornya tidak salah hitung: CLS mengalikan jarak dgn FRAKSI
   DAMPAK, dan hero duduk di puncak halaman sehingga sebagian isi yang terdorong
   ada di bawah lipatan. Agregat yang benar menyembunyikan peristiwa yang salah —
   cacat ke-19 repo ini, persis: `sapuan wajib menyebut NAMA apa yang ia lihat,
   bukan berapa`.
   Angkanya DIUKUR, bukan dikarang: layar app yang sehat memuncak di 13px
   (`muat-awal` di dua peran), sedangkan satu anak tangga spasi terbesar app
   = 32px.
   24px = lebih besar dari gerakan sehat mana pun, lebih kecil dari satu langkah
   tata letak yang berarti. */
const AMBANG_PX = +(process.env.AMBANG_PX || 24);

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const SUPA = env.match(/VITE_SUPABASE_URL=(\S+)/)[1];
const ANON = env.match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1];
const REF = SUPA.match(/https:\/\/([^.]+)\./)[1];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesiPalsu = () => ({
  access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: '00000000-0000-4000-8000-0000000000aa', role: 'authenticated', exp: 4102444800, user_metadata: { role: 'bendahara' } })}.audit`,
  token_type: 'bearer', expires_in: 31536000, expires_at: 4102444800, refresh_token: 'audit-refresh',
  user: { id: '00000000-0000-4000-8000-0000000000aa', aud: 'authenticated', email: 'audit@lokal', app_metadata: { provider: 'email' }, user_metadata: { role: 'bendahara' }, created_at: '2026-01-01T00:00:00Z' },
});

/* Dipasang SEBELUM skrip app. Menyimpan tiap geseran + PENYEBABNYA.
   `entry.sources` itu yang bikin laporan bisa ditindaklanjuti: tanpa itu yang
   didapat cuma angka, dan angka tak memberi tahu baris mana yang melompat. */
const PASANG_OBSERVER = () => {
  window.__lompat = [];
  const jelas = (n) => {
    if (!n || n.nodeType !== 1) return '?';
    const cls = (typeof n.className === 'string' ? n.className : '').split(/\s+/).filter(Boolean).slice(0, 3).join('.');
    const teks = (n.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 34);
    return `${n.tagName.toLowerCase()}${cls ? '.' + cls : ''}${teks ? ` "${teks}"` : ''}`;
  };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__lompat.push({
          nilai: e.value,
          input: !!e.hadRecentInput,
          t: Math.round(e.startTime),
          asal: (e.sources || []).slice(0, 3).map((s) => ({
            n: jelas(s.node),
            dy: Math.round((s.currentRect?.top ?? 0) - (s.previousRect?.top ?? 0)),
            dx: Math.round((s.currentRect?.left ?? 0) - (s.previousRect?.left ?? 0)),
          })),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* browser tanpa layout-shift → sapuan melapor 'tak terukur' */ }
};

async function siapkan(browser, { bendahara }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await ctx.addInitScript(PASANG_OBSERVER);
  await ctx.addInitScript(({ ref, s, b, mut }) => {
    try {
      localStorage.setItem('hadiran-welcome-v2', '1');
      localStorage.setItem('hadiran-theme', 'light');
      if (b) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
    } catch { /* abaikan */ }
    if (mut) {
      /* MUTASI=1 — pita yang tumbuh 120px lalu 240px. Menguji vonis SKOR &
         membuktikan observernya terpasang. Kalau tetap hijau, observernya mati.
         MUTASI=2 — SATU geseran 30px saja. Sengaja kecil: skornya jatuh di bawah
         AMBANG, jadi sapuan versi LAMA (yang cuma menilai skor) akan hijau dan
         versi baru WAJIB merah lewat [piksel]. Tanpa mutasi terpisah ini, vonis
         piksel tak pernah terbukti bergigi — persis pelajaran ke-34: probe yang
         vonisnya berubah WAJIB dapat mutasinya sendiri di saat yang sama. */
      addEventListener('DOMContentLoaded', () => {
        const d = document.createElement('div');
        d.style.cssText = 'height:0;background:#f00';
        document.body.prepend(d);
        if (mut === 1) {
          setTimeout(() => { d.style.height = '120px'; }, 1000);
          setTimeout(() => { d.style.height = '240px'; }, 2500);
        } else {
          setTimeout(() => { d.style.height = '30px'; }, 1500);
        }
      });
    }
  }, { ref: REF, s: sesiPalsu(), b: bendahara, mut: MUTASI });

  if (bendahara) {
    await ctx.route('**/rest/v1/**', (route) => {
      const q = route.request(); const m = q.method();
      if (!(m === 'GET' || m === 'HEAD' || m === 'OPTIONS')) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"audit: tulis diblokir"}' });
      return route.continue({ headers: { ...q.headers(), authorization: `Bearer ${ANON}`, apikey: ANON } });
    });
    await ctx.route('**/auth/v1/**', (route) => {
      const u = route.request().url();
      if (u.includes('/logout')) return route.fulfill({ status: 204, body: '' });
      if (u.includes('/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sesiPalsu().user) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sesiPalsu()) });
    });
  } else {
    await ctx.route('**/rest/v1/**', (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
  }

  const page = await ctx.newPage();
  if (CPU || KBPS) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    if (CPU) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    if (KBPS) await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: (KBPS * 1024) / 8, uploadThroughput: (KBPS * 1024) / 8, latency: LATENCY });
  }
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 120)));
  return { ctx, page };
}

/* Ambil geseran yang tercatat SESUDAH penanda, lalu geser penandanya.
   Slice per-tab, bukan total sesi: kalau digabung, satu tab buruk tak bisa
   dibedakan dari lima tab yang masing-masing sedikit. */
async function panen(page, sejak) {
  const semua = await page.evaluate(() => window.__lompat || []);
  return { entri: semua.filter((e) => e.t >= sejak), tandaBaru: semua.length ? Math.max(...semua.map((e) => e.t)) + 1 : sejak };
}

/* DUA VONIS, dan yang kedua lahir dari kegagalan yang pertama.
   (a) SKOR agregat > AMBANG — kualitas keseluruhan layar, definisi CLS.
   (b) SATU geseran >= AMBANG_PX — peristiwa tunggal yang terlihat mata.
   Keduanya wajib, karena tak satu pun menangkap yang lain: hero yang melompat
   74px lolos (a) dgn skor 0,040, sementara banyak geseran kecil yang menumpuk
   lolos (b) sambil merusak layar. Menilai cuma dari (a) = menyetujui lompatan
   sebesar sepertiga hero asalkan halamannya cukup pendek.

   Dan sumbernya kini SELALU dicetak, bukan hanya saat merah. Sebelumnya detail
   muncul hanya di layar yang gagal, jadi 74px itu tak meninggalkan SATU BARIS
   pun di laporan — pembacanya tak punya cara tahu ada yang bergerak. Laporan
   yang cuma bicara saat gagal membuat regresi di bawah ambang jadi tak terlihat
   sampai ia cukup besar untuk gagal. Garis dasar layar sehat (2 Sep 2026): puncak
   dy 13px, dan itulah kenapa AMBANG_PX 24 punya margin. */
function lapor(nama, entri) {
  const tanpaInput = entri.filter((e) => !e.input).reduce((s, e) => s + e.nilai, 0);
  const total = entri.reduce((s, e) => s + e.nilai, 0);

  /* PSEUDO-ELEMENT DIBUANG dari pemilihan puncak, dan alasannya bukan kerapian.
     Satu geseran nyata bisa menyeret `::after` milik elemen yang bergerak, dan
     angkanya membengkak: waktu vonis piksel ini pertama dijalankan lawan cacat
     hero 74px yang sengaja direproduksi, sapuan dgn patuh melaporkan
     `PUNCAK +629px ::after` — nama yang tak bisa ditunjuk siapa pun, sekaligus
     menutupi sumber ASLINYA (`div.cf-out … dy +74`) yang ada di entri yang sama.
     Nama yang tak bisa ditindaklanjuti sama buruknya dgn tak ada nama; angkanya
     pun bukan gerakan isi, melainkan artefak hiasan yang ikut terseret.
     Mereka tetap DICETAK di baris sumber di bawah — dibuang dari pemilihan
     puncak, bukan dari laporan. */
  let puncak = { dy: 0, n: '(tak ada sumber)', t: 0, input: false };
  for (const e of entri) {
    for (const src of e.asal) {
      if (/^::/.test(src.n)) continue;
      if (Math.abs(src.dy) > Math.abs(puncak.dy)) puncak = { dy: src.dy, n: src.n, t: e.t, input: e.input };
    }
  }
  const burukSkor = total > AMBANG;
  const burukPx = Math.abs(puncak.dy) >= AMBANG_PX;
  const buruk = burukSkor || burukPx;
  const sebab = buruk ? `  ⚠ LOMPAT${burukSkor ? ' [skor]' : ''}${burukPx ? ' [piksel]' : ''}` : '  OK';
  console.log(`\n### ${nama}   tanpa-input ${tanpaInput.toFixed(3)} · total ${total.toFixed(3)} · puncak ${puncak.dy > 0 ? '+' : ''}${puncak.dy}px${sebab}`);

  if (burukPx) {
    console.log(`    PUNCAK ${puncak.dy > 0 ? '+' : ''}${puncak.dy}px @${puncak.t}ms${puncak.input ? ' [pasca-ketuk]' : ''}  ${puncak.n}`);
  }
  /* SELALU, bukan cuma saat merah — lihat catatan di atas. */
  for (const e of entri.filter((x) => x.nilai >= 0.005).sort((a, b) => b.nilai - a.nilai).slice(0, 5)) {
    const asal = e.asal.map((x) => `${x.n} (dy ${x.dy > 0 ? '+' : ''}${x.dy})`).join(' | ') || '(tak ada sumber)';
    console.log(`    ${e.nilai.toFixed(3)} @${e.t}ms${e.input ? ' [pasca-ketuk]' : ''}  ${asal}`);
  }
  return buruk;
}

/* Daftar tab DIBACA dari bar nav yang benar-benar dirender, bukan disalin.
   `src/components/layout/tabs.ts` sendiri melarang menyalin daftarnya ke tempat
   lain — dan alasannya langsung terbukti di sini: warga TAK punya tab Talangan
   (`tabTerlihat()` menyaringnya; diaksesnya lewat tombol "Lihat" di Beranda).
   Daftar hardcode bikin sapuan menunggu tombol yang memang tak pernah ada lalu
   mati time-out — populasi salah yang menyamar jadi kegagalan app. */
const bacaTab = (page) => page.$$eval('nav button', (bs) => bs.map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean));
const browser = await chromium.launch();
let gagal = 0, diukur = 0;

for (const bendahara of [false, true]) {
  const peran = bendahara ? 'b' : 'w';
  const { ctx, page } = await siapkan(browser, { bendahara });
  await page.goto(APP, { waitUntil: 'domcontentloaded' });

  if (!bendahara) {
    const pw = page.locator('#masuk-warga');
    await pw.waitFor({ timeout: 60000 });
    await pw.click();
  }
  // Tunggu bottom-nav MENGAKU ada; jangan pakai jeda tetap — di CPU 4x lambat
  // jeda tetap kadang memotret layar yang belum hidrasi lalu "lolos" palsu.
  await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(6000);

  let tanda = 0;
  {
    const { entri, tandaBaru } = await panen(page, tanda); tanda = tandaBaru;
    diukur++; if (lapor(`${peran}-muat-awal`, entri)) gagal++;
  }

  const tabAda = await bacaTab(page);
  console.log(`  (tab ${peran}: ${tabAda.join(' · ')})`);
  for (const t of tabAda.slice(1)) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const { tandaBaru } = await panen(page, tanda); tanda = tandaBaru;
    await page.locator('nav button', { hasText: t }).first().click({ force: true });
    await page.waitForTimeout(7000);
    const { entri, tandaBaru: tb } = await panen(page, tanda); tanda = tb;
    diukur++; if (lapor(`${peran}-${t}`, entri)) gagal++;
  }
  await ctx.close();
}

await browser.close();
console.log(`\n=== ${diukur} layar diukur @390px · CPU ${CPU}x · ${KBPS}kbps · ambang skor ${AMBANG} + piksel ${AMBANG_PX}px · ${gagal} melompat ===`);
if (MUTASI && gagal === 0) { console.log(`\nPROBE CACAT: MUTASI=${MUTASI} tapi nol temuan — ${MUTASI === 1 ? 'observer tak terpasang' : 'vonis PIKSEL tak bergigi'}.`); process.exit(2); }
process.exit(gagal ? 1 : 0);
