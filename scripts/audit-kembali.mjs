// Audit KEMBALI DARI LATAR: apakah data di layar masih boleh dipercaya sesudah
// app ditinggal, lalu dibuka lagi.
//
// Kenapa alat sendiri — tepi yang tak disentuh 17 sapuan lain: semuanya menguji
// SATU kunjungan yang berjalan terus. `audit:masuk` satu-satunya yang pernah
// memuat ULANG halaman (dan itu memang reload penuh: state React lahir baru).
// Tak satu pun pernah menguji sesi yang TETAP HIDUP tapi ditinggal — padahal
// itu cara app ini benar-benar dipakai: warga buka Hadiran RT, pindah ke
// WhatsApp membalas grup, lalu kembali. Halaman tak dimuat ulang, `useEffect`
// mount tak jalan lagi, dan halaman-halaman utama TIDAK memasang realtime
// (`useRealtime` cuma dipakai Riwayat Aktivitas) — jadi yang terbaca warga
// adalah angka saat ia membuka app tadi, tanpa satu pun tanda bahwa itu basi.
// Untuk app kas, "saldo lama yang tampak seperti saldo sekarang" bukan soal
// rasa; itu pernyataan keliru tentang uang.
//
// EMPAT sifat diuji sekaligus, karena memperbaiki yang pertama gampang merusak
// sisanya:
//   1. KEMBALI LAMA  → data diambil ulang (≥1 GET rest/v1).
//   2. KEMBALI SEBENTAR → TIDAK diambil ulang. Warga menyentuh notifikasi lalu
//      balik dalam 3 detik; menyegarkan tiap kali itu = badai request di paket
//      Supabase GRATIS, dan baterai HP kelas bawah.
//   3. DIAM-DIAM → penyegarannya tak boleh memunculkan skeleton lagi. Layar
//      yang berkedip balik ke abu tiap kali app dibuka terasa lebih murah
//      daripada data basi yang diam.
//   4. PENYEGARANNYA GAGAL → app wajib MENGAKU (4a) dan angka lamanya wajib
//      BERTAHAN (4b). Sifat 1-3 semuanya mengandaikan penyegaran BERHASIL;
//      rinciannya di atas `putaranGagal`.
//
// BATAS SAPUAN — diakui, bukan disembunyikan: Chromium di harness ini TIDAK
// BISA benar-benar disembunyikan. `Emulation.setPageVisibilityOverride` sudah
// tak ada di protokol, `Page.setWebLifecycleState({state:'hidden'})` ditolak,
// dan tab kedua yang dibawa ke depan TIDAK menyembunyikan tab pertama (diuji
// headless MAUPUN headed: `visibilityState` tetap 'visible', nol event).
// Karena itu transisinya DISUNTIK — getter `visibilityState`/`hidden` ditimpa
// lalu `visibilitychange` dikirim. Artinya sapuan ini menguji HANDLER app
// terhadap kontrak peramban, bukan peramban itu sendiri. Jeda "ditinggal"-nya
// TIDAK dipalsukan: sapuan menunggu betulan, supaya ambang basi app benar-benar
// terlampaui.
//
// Pakai:  npm run audit:kembali
//   CAP_URL=https://hadiran-rt.vercel.app   (wajib sekali sebelum dianggap benar)
//   LAMA=65 SEBENTAR=4                      (detik ditinggal)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const LAMA = +(process.env.LAMA || 65) * 1000;
const SEBENTAR = +(process.env.SEBENTAR || 4) * 1000;
const TUNGGU_GET = 6000;   // sabar menunggu GET sesudah kembali

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

/* Suntikan visibilitas. `configurable: true` supaya bisa dibolak-balik, dan
   `document.hidden` ikut ditimpa — kode yang membaca salah satunya saja tetap
   melihat dunia yang konsisten. */
const PASANG_VIS = () => {
  const set = (v) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  window.__sembunyi = () => set('hidden');
  window.__tampil = () => set('visible');
};

/* Pemungut nominal & pengakuan, dipasang DI HALAMAN supaya observer bisa
   memakainya SELAMA jendela kegagalan, bukan cuma memotret sesudahnya. */
const PASANG_PUNGUT = () => {
  const POLA_AKU = /Gagal mem|tanpa sinyal|salinan terakhir|Coba lagi/i;
  /* Hero saldo dirender Odometer: tiap digit adalah kolom 0-9 yang bertumpuk,
     jadi `innerText` di sana berbunyi "Rp\n0\n1\n2…" dan pola `Rp\d` TIDAK
     cocok — angka PALING penting di layar justru yang tak terlihat probe.
     Nilai aslinya hidup di `aria-label` (`role="text"`), jadi itu ikut
     dipungut; tanpa ini sapuan menyempitkan populasinya sendiri tanpa mengaku
     (cacat alat ke-17/18/19 repo ini). */
  const heroTeks = () => [...document.querySelectorAll('[role="text"][aria-label]')]
    .map((x) => x.getAttribute('aria-label')).join('\n');
  window.__teks = () => `${heroTeks()}\n${document.body.innerText}`;
  /* HERO DULU, lalu badan. Bukan kosmetik: nominal hero datang dari
     `aria-label`, dan menaruhnya di EKOR lalu memotong daftar membuang justru
     angka yang paling penting — Beranda punya lebih dari 6 nominal di badan,
     jadi saldo hero selalu jatuh di luar jendela. Batasnya ada supaya laporan
     tak jadi dinding teks, bukan supaya populasinya menyempit. */
  window.__nominal = () => {
    const ambil = (t) => t.match(/[-+]?Rp[\d.]+/g) ?? [];
    return [...ambil(heroTeks()), ...ambil(document.body.innerText)].slice(0, 12);
  };
  /* Toast galat pergi ke region ASSERTIVE `role="alert"`; wadah toast yang
     TERLIHAT sengaja TANPA role (anti-baca-dobel) — cacat alat ke-10 repo ini.
     Ketiga permukaan dibaca. */
  window.__aku = () => POLA_AKU.test(
    window.__teks() + [...document.querySelectorAll('[role="alert"],[role="status"]')].map((x) => x.innerText).join(' '));

  /* Tanda yang MASIH TERLIHAT sesudah toast mati (~2,6 dtk + 200 ms keluar),
     sementara basinya PERMANEN. Dilaporkan TERPISAH & tak dihitung "gagal" —
     disiplin sama dgn bagian teks-200% `audit:reflow` dan ambang app
     `audit:mati`: ia ambang APP, bukan invariant yang dilanggar.
     `.sr-only` SENGAJA dibuang di sini (dan hanya di sini): itu teks pembaca
     layar, bukan tanda yang dilihat warga — dan Toaster menahan isi region live
     itu SELAMANYA (sengaja, anti-pembacaan-dobel), jadi membacanya di sini akan
     selalu menjawab "ada tanda" untuk layar yang sebenarnya sudah bersih. */
  window.__tandaTampak = () => {
    const jalan = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let t = '';
    for (let n = jalan.nextNode(); n; n = jalan.nextNode()) {
      if (n.parentElement?.closest('.sr-only')) continue;
      t += `${n.nodeValue} `;
    }
    return POLA_AKU.test(t);
  };
};

async function siapkan(browser, { bendahara }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript(PASANG_VIS);
  await ctx.addInitScript(PASANG_PUNGUT);
  await ctx.addInitScript(({ ref, s, b }) => {
    try {
      localStorage.setItem('hadiran-welcome-v2', '1');
      localStorage.setItem('hadiran-theme', 'light');
      if (b) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
    } catch { /* abaikan */ }
  }, { ref: REF, s: sesiPalsu(), b: bendahara });

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
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 120)));
  return { ctx, page };
}

let gagal = 0, cacat = 0;
const browser = await chromium.launch();

/** Satu putaran: sembunyikan `jeda` ms, tampilkan lagi, laporkan apa yang terjadi. */
async function putaran(page, tabel, { jeda, wajibAmbil }) {
  const get = [];
  const dengar = (r) => { if (r.url().includes('/rest/v1/') && r.method() === 'GET') get.push(r.url().split('/rest/v1/')[1].split('?')[0]); };
  await page.evaluate(() => window.__sembunyi());
  await page.waitForTimeout(jeda);
  page.on('request', dengar);
  /* Skeleton dihitung SELAMA jendela, bukan sesudahnya: kalau ia muncul lalu
     hilang dalam 300ms, memotretnya belakangan akan melaporkan "tak ada". */
  await page.evaluate(() => {
    window.__skel = 0;
    window.__pantau?.disconnect?.();
    window.__pantau = new MutationObserver(() => {
      if (document.querySelector('.skeleton, .skeleton-bar')) window.__skel++;
    });
    window.__pantau.observe(document.body, { childList: true, subtree: true });
  });
  await page.evaluate(() => window.__tampil());
  await page.waitForTimeout(TUNGGU_GET);
  page.off('request', dengar);
  const skel = await page.evaluate(() => { window.__pantau?.disconnect?.(); return window.__skel; });

  const ambil = get.length;
  let vonis = 'OK', pesan = '';
  if (wajibAmbil && ambil === 0) { vonis = '⚠ DATA BASI DIAM'; pesan = 'nol GET sesudah kembali — angka di layar tetap yang lama'; }
  else if (!wajibAmbil && ambil > 0) { vonis = '⚠ BADAI REQUEST'; pesan = `${ambil} GET untuk perginya cuma ${jeda / 1000} dtk`; }
  else if (wajibAmbil && skel > 0) { vonis = '⚠ BERKEDIP'; pesan = 'skeleton muncul lagi — penyegaran tak diam-diam'; }
  console.log(`  ${tabel.padEnd(30)} pergi ${String(jeda / 1000).padStart(2)} dtk → GET ${String(ambil).padStart(2)}${skel ? ` · skeleton ${skel}` : ''}  ${vonis}${pesan ? ` (${pesan})` : ''}`);
  if (vonis !== 'OK') gagal++;
  return ambil;
}

/* ── Sifat 4: kembali dari latar tapi PENYEGARANNYA GAGAL ────────────────────
 * Tepi yang diakui sifat 1–3: ketiganya mengasumsikan penyegarannya BERHASIL.
 * Yang belum pernah diuji siapa pun adalah keadaan di ANTARA dua sapuan yang
 * sudah ada: `audit:keadaan` menguji muat PERTAMA yang gagal (layar belum punya
 * angka sama sekali), `audit:luring` menguji tanpa sinyal (app mengaku &
 * melabeli "salinan terakhir"). Di antaranya: warga kembali dari WhatsApp,
 * sinyal ADA, tapi server membalas galat. Penyegarannya SENGAJA senyap (sifat 3
 * melarang skeleton), jadi tanpa penjaga tak ada satu pun tanda bahwa angka di
 * layar sudah tidak dipercaya app-nya sendiri.
 *
 * DUA SISI, dan sisi kedua yang gampang dirusak sambil "memperbaiki" yang
 * pertama:
 *   4a. app WAJIB MENGAKU gagal menyegarkan (toast/banner).
 *   4b. angka lama WAJIB BERTAHAN — jangan dinolkan/dikosongkan. Menukar
 *       "saldo terakhir yang diketahui" dgn "Rp0" bukan kejujuran, itu
 *       pernyataan baru yang salah, dan justru kelas yang ditutup 93f606c. */
/* MUTASI sifat 4 — dua, satu per sisi, karena satu mutasi tak bisa menguji
   keduanya sekaligus:
     MUTASI=1  bungkam pengakuan → 4a WAJIB merah "DIAM".
               Node-nya DIBUANG, bukan disembunyikan, dan itu bukan detail:
               percobaan pertama menyuntik `display:none !important` dan mutasi
               itu TIDAK MENGGIGIT — `innerText` pada elemen yang TIDAK DIRENDER
               jatuh kembali ke `textContent` (spec), jadi probe yang membaca
               `[role=alert]` LANGSUNG tetap melihat teksnya. Menyembunyikan
               membutakan `document.body.innerText` saja, bukan pembacaan
               per-elemen — dan probe ini sengaja membaca keduanya (cacat alat
               ke-10 repo: toast galat pergi ke region assertive, wadah toast
               yang terlihat sengaja tanpa role).
     MUTASI=2  server membalas 200 `[]` alih-alih 500. Ini BUKAN sekadar varian:
               ia meniru kegagalan yang paling menipu — app mengira BERHASIL,
               menimpa cache dgn daftar kosong, nominal lenyap, dan tak ada
               yang perlu diakui. 4b WAJIB merah. */
const MUT = Number(process.env.MUTASI || 0);

async function putaranGagal(ctx, page, label) {
  const sebelum = await page.evaluate(() => window.__nominal());
  /* Pengakuan yang SUDAH ada sebelum diuji membuat vonis 4a tak bisa dibaca:
     region live `role="alert"` menahan teksnya selamanya (Toaster sengaja tak
     mengosongkannya), jadi sisa toast dari putaran lain akan terbaca sbg
     "app mengaku". Itu PROBE CACAT, bukan hijau. */
  const akuAwal = await page.evaluate(() => window.__aku());

  await page.evaluate(() => window.__sembunyi());
  await page.waitForTimeout(LAMA);
  if (MUT === 1) {
    await page.evaluate(() => {
      const sapu = () => {
        document.querySelectorAll('[role="alert"],[role="status"]').forEach((el) => { el.textContent = ''; });
        document.querySelectorAll('.toast-in,.toast-out').forEach((el) => el.remove());
      };
      sapu();
      window.__bisu?.disconnect?.();
      window.__bisu = new MutationObserver(sapu);
      window.__bisu.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  }

  /* Rute kegagalan dipasang dgn handler BERNAMA supaya `unroute` melepas
     PUNYA DIA SAJA: `ctx.unroute(pola)` tanpa handler membuang SEMUA handler
     pola itu — termasuk mock bendahara (anon paksa + tulis diblokir) yang
     dipasang `siapkan()`. Hari ini putaran ini yang terakhir sebelum
     `ctx.close()`, jadi kebocorannya tak terlihat; menaruh putaran lain
     sesudahnya akan menjalankannya dgn kredensial & izin tulis yang salah. */
  const rusak = (r) => {
    const m = r.request().method();
    if (m !== 'GET' && m !== 'HEAD') return r.fulfill({ status: 403, contentType: 'application/json', body: '{}' });
    if (MUT === 2) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/0' }, body: '[]' });
    return r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"audit: gagal segarkan"}' });
  };
  await ctx.route('**/rest/v1/**', rusak);

  /* Pengakuan dipantau SELAMA jendela, bukan sesudahnya — toast hidup ~2,6 dtk
     lalu dicabut dari DOM, sedangkan probe ini menunggu 9 dtk. Memotret
     belakangan berarti menilai app dari SISA di region live, dan sapuan akan
     berubah merah begitu region itu dibersihkan — padahal app tetap mengaku.
     Disiplin yang sama sudah dipakai penghitung skeleton di sifat 3. */
  await page.evaluate(() => {
    window.__lihatAku = false;
    window.__mata?.disconnect?.();
    window.__mata = new MutationObserver(() => { if (window.__aku()) window.__lihatAku = true; });
    window.__mata.observe(document.body, { childList: true, subtree: true, characterData: true });
  });

  const get = [];
  const dengar = (r) => { if (r.url().includes('/rest/v1/') && r.method() === 'GET') get.push(r.url().split('/rest/v1/')[1].split('?')[0]); };
  page.on('request', dengar);
  await page.evaluate(() => window.__tampil());
  await page.waitForTimeout(TUNGGU_GET + 3000);
  page.off('request', dengar);

  const r = await page.evaluate(() => {
    window.__mata?.disconnect?.();
    window.__bisu?.disconnect?.();
    return { rp: window.__nominal(), aku: window.__lihatAku || window.__aku(), tanda: window.__tandaTampak() };
  });
  await ctx.unroute('**/rest/v1/**', rusak);

  /* Uji KONTROL: kalau penyegarannya tak pernah terjadi, tak ada kegagalan yang
     bisa diakui — dan "app patuh" akan mencetak angka yang sama dgn "alatku tak
     pernah menyentuh apa-apa" (pelajaran G1 `audit:gestur`). */
  const cacatProbe = [];
  if (!sebelum.length) cacatProbe.push('nol nominal SEBELUM ditinggal — tak ada yang bisa dibandingkan');
  if (akuAwal) cacatProbe.push('pengakuan galat SUDAH ada sebelum jendela dibuka — vonis 4a tak terbaca');
  if (!get.length) cacatProbe.push('nol GET sesudah kembali — penyegaran tak pernah terjadi, jadi tak ada kegagalan yang diuji');

  const m = [];
  if (!cacatProbe.length) {
    if (!r.aku) m.push('DIAM: penyegaran gagal tapi app tak mengaku — angka lama terbaca sbg angka sekarang');
    if (!r.rp.length) m.push(`NOMINAL LENYAP: ${sebelum.length} nominal → 0. Menghapus angka terakhir yang diketahui bukan kejujuran, itu pernyataan baru yang salah`);
    else if (r.rp.join('|') !== sebelum.join('|')) m.push(`NOMINAL BERUBAH padahal penyegaran GAGAL: ${JSON.stringify(sebelum.slice(0, 3))} → ${JSON.stringify(r.rp.slice(0, 3))}`);
  }
  const vonis = cacatProbe.length ? `PROBE CACAT: ${cacatProbe[0]}` : m.length ? `⚠ ${m[0]}` : 'OK';
  console.log(`  ${label.padEnd(30)} GET ${String(get.length).padStart(2)} · nominal ${sebelum.length} → ${r.rp.length} · mengaku=${r.aku} · tanda bertahan=${r.tanda}  ${vonis}`);
  /* Bukan vonis. Kalau pengakuannya ADA tapi sudah lenyap dari layar sementara
     angka basinya masih terpampang, itu dicatat sbg CATATAN ambang app —
     presedennya strip LURING di Header ("salinan terakhir", tak bisa ditutup),
     yang lahir dari pengukuran 31 Jul atas kelas yang sama. */
  if (!cacatProbe.length && r.aku && !r.tanda) {
    console.log(`  ${' '.repeat(30)} · catatan (ambang app, BUKAN gagal): pengakuannya SEMENTARA (toast ~2,6 dtk) sementara basinya permanen`);
  }
  [...cacatProbe.slice(1), ...m.slice(1)].forEach((x) => console.log(`  ${' '.repeat(30)} ⚠ ${x}`));
  if (cacatProbe.length) cacat++;
  else if (m.length) gagal++;
}

for (const bendahara of [false, true]) {
  const peran = bendahara ? 'BENDAHARA' : 'WARGA';
  const tab = bendahara ? 'Kas RT' : 'Beranda';
  console.log(`\n════════ ${peran} · tab ${tab} ════════`);
  const { ctx, page } = await siapkan(browser, { bendahara });
  await page.goto(APP, { waitUntil: 'domcontentloaded' });

  if (!bendahara) {
    const pw = page.locator('#warga-password');
    await pw.waitFor({ timeout: 60000 });
    await pw.focus();
    await pw.pressSequentially('warga', { delay: 60 });
    await page.getByRole('button', { name: 'Masuk Sekarang' }).click();
  }
  await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(4000);
  if (bendahara) {
    await page.locator('nav button', { hasText: tab }).first().click({ force: true });
    await page.waitForTimeout(4000);
  }
  const siap = await page.evaluate(() => typeof window.__sembunyi === 'function');
  if (!siap) { console.log('  PROBE CACAT: suntikan visibilitas tak terpasang'); cacat++; await ctx.close(); continue; }

  await putaran(page, '1. ditinggal LAMA', { jeda: LAMA, wajibAmbil: true });
  await page.waitForTimeout(1500);
  await putaran(page, '2. ditinggal SEBENTAR', { jeda: SEBENTAR, wajibAmbil: false });
  await page.waitForTimeout(1500);
  await putaranGagal(ctx, page, '4. kembali, SEGARKAN GAGAL');
  await ctx.close();
}

await browser.close();
console.log(`\n=== ditinggal ${LAMA / 1000} dtk (lama) & ${SEBENTAR / 1000} dtk (sebentar) · 2 peran · ${gagal} bermasalah ===`);
if (cacat) console.log(`${cacat} probe cacat (bukan vonis app) — betulkan ALATNYA.`);
/* Probe cacat IKUT memerahkan: sapuan tak boleh LULUS dari populasi kosong
   — laporan hijau tanpa populasi itu kepercayaan palsu (pelajaran ke-23). */
process.exit(gagal || cacat ? 1 : 0);
