// Audit GAGAL-SEBAGIAN: satu tabel rest/v1 gagal, sisanya sehat.
//
// Kenapa sapuan TERPISAH, bukan mode baru di `audit:keadaan`: berkas itu
// dikunci `chmod a-w` dgn sengaja, dan kunci yang dipasang sengaja tidak
// dibuka diam-diam (preseden `audit:luring-pertama`).
//
// Kenapa ada (25 Sep 2026): di Kas RT bendahara, kalau GET `kas_rt` gagal
// sementara GET `pengaturan` (target) berhasil, `TargetKasRT` menyatakan
// "0% terkumpul · Rp0 / Rp25.000.000 · Kurang Rp25.000.000" — nol yang lahir
// dari list kosong, persis kelas yang dilarang ("app kas dilarang menyatakan
// nominal saat gagal muat"). `audit:keadaan` tak bisa melihatnya karena ia
// menggagalkan SEMUA request sekaligus: komponen yang punya fetch SENDIRI ikut
// gagal lalu `return null`, dan kombinasi gagal-SEBAGIAN tak pernah masuk
// populasi siapa pun.
//
// CARA KERJA — vonisnya SELISIH, bukan "ada digit":
//   Saat gagal-sebagian, angka dari tabel yang SEHAT memang sah tampil, jadi
//   aturan "nol digit di layar" milik `audit:keadaan` mode gagal akan berteriak
//   palsu di tiap layar. Yang pasti bohong adalah angka yang TAK PERNAH ADA saat
//   semua tabel sehat: "0% terkumpul" di layar yang sehatnya "72% terkumpul".
//   Jadi tiap peran dijalankan:
//     1. GARIS DASAR dua kali (semua sehat) — baris berangka per layar. Dua
//        kali supaya baris yang berubah sendiri (jam relatif, autoplay) tercatat
//        TAK STABIL dan tak pernah jadi temuan palsu; jumlahnya DICETAK.
//     2. Satu jalan per tabel yang diminta garis dasar: tabel itu dibalas 500,
//        sisanya diteruskan ke DB hidup (tulis tetap diblokir).
//   Baris berangka di jalan gagal yang tak ada di kedua garis dasar = ANGKA
//   KARANGAN. Probe baris & pengecualiannya (tanggal, jam, versi, chrome,
//   `data-keadaan`) SAMA dgn bagian ANGKA TELANJANG `audit:keadaan`.
//
// BATAS, diakui: angka karangan yang KEBETULAN sama dgn angka sehat tak
// terlihat (mis. "0 talangan" saat talangan memang nol). Hanya layar (tab +
// overlay bendahara), bukan sheet/form FAB. Butuh DB HIDUP — tanpa itu garis
// dasarnya sendiri gagal dan sapuan keluar PROBE CACAT, bukan hijau.
//
// Pakai:  node scripts/audit-keadaan-sebagian.mjs
//   CAP_URL=http://localhost:5199
//   PERAN=warga|bendahara|dua   (default dua)
//   HANYA=kas_rt,pengaturan     (saring tabel — untuk validasi; populasinya dicetak)
//   KONKUREN=3                  (jalan paralel)
//   W=360
//   MUTASI=1                    (jalan gagal menyuntik satu baris "MUTASI 99%" di
//                                lapisan teratas → TIAP pasangan wajib merah;
//                                membuktikan probe menggigit di semua layar, bukan
//                                cuma di Kas RT tempat cacat aslinya hidup)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { newCtx, loginWarga } from './lib/audit-harness.mjs';

const URL_APP = process.env.CAP_URL || 'http://localhost:5199';
const W = Number(process.env.W || 360);
const PERAN = (process.env.PERAN ?? 'dua') === 'dua' ? ['warga', 'bendahara'] : [process.env.PERAN];
const HANYA = process.env.HANYA ? process.env.HANYA.split(',').map((s) => s.trim()) : null;
const KONKUREN = Number(process.env.KONKUREN || 3);
const MUTASI = process.env.MUTASI === '1';
const OUT = process.env.OUT_DIR || `.audit-keadaan-sebagian-${W}`;
mkdirSync(OUT, { recursive: true });

const OVERLAY = ['Tutup Buku Triwulan', 'Riwayat Aktivitas', 'Kelola Anggota'];

/** Kunci tabel dari URL: `kas_rt`, `rpc/nama_fungsi`. */
const kunciTabel = (u) => {
  const i = u.indexOf('/rest/v1/');
  if (i < 0) return null;
  return u.slice(i + 9).split('?')[0];
};

/* Probe baris berangka — aturan & pengecualian SAMA dgn bagian ANGKA
   TELANJANG `audit:keadaan` (disalin, karena berkas itu dikunci & tak
   mengekspor apa pun). Bedanya satu: di sini seluruh baris dikembalikan, tak
   dipotong 6, karena vonisnya selisih himpunan. Ditambah satu pengecualian yang
   HANYA perlu di sapuan selisih: jam relatif ("5 menit lalu") berubah antar
   jalan tanpa ada yang salah. */
const PROBE = () => {
  const BULAN = 'Jan(uari)?|Feb(ruari)?|Mar(et)?|Apr(il)?|Mei|Jun(i)?|Jul(i)?|Agu(stus)?|Sep(tember)?|Okt(ober)?|Nov(ember)?|Des(ember)?';
  const reTanggal = new RegExp(`\\b(${BULAN})\\b`, 'i');
  const reRelatif = /\b\d+\s*(detik|menit|jam|hari|minggu)\s+(yang\s+)?lalu\b/i;
  const baris = new Set();
  const nav = document.querySelector('nav');
  const header = document.querySelector('header');
  /* Lingkup = LAPISAN TERATAS saja (preseden `audit:potong`): halaman di
     belakang overlay TIDAK di-unmount, jadi memungut se-dokumen membuat satu
     angka karangan Kas RT terhitung ulang di tiap overlay bendahara — terukur
     saat validasi: 1 cacat → 4 temuan. Satu cacat, satu baris. */
  const dialogs = document.querySelectorAll('[role="dialog"]');
  const akar = dialogs.length ? dialogs[dialogs.length - 1] : document.body;
  const w = document.createTreeWalker(akar, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const s = (n.textContent || '').trim();
    if (!s || !/\d/.test(s)) continue;
    const el = n.parentElement;
    if (!el || !el.offsetParent) continue;
    if (nav?.contains(el) || header?.contains(el)) continue;
    if (el.closest('[data-keadaan]')) continue;
    const b = (el.closest('p, div, span, li, h1, h2, h3')?.innerText || s).trim();
    if (reTanggal.test(b) || reRelatif.test(b)) continue;
    if (/^\d{1,2}:\d{2}/.test(s)) continue;
    if (/v?\d+\.\d+\.\d+/.test(s)) continue;
    baris.add(b.replace(/\s+/g, ' ').slice(0, 64));
  }
  const t = document.body.innerText;
  return {
    baris: [...baris],
    mengaku: /Gagal memuat|Gagal memperbarui/i.test(t),
    skeleton: akar.querySelectorAll('.skeleton').length,
    lapisan: dialogs.length,
  };
};

/** TENANG itu keadaan, bukan jeda (pelajaran ke-34): nol skeleton & dua bacaan
 *  teks identik. Batas 10 dtk; yang tak pernah tenang tetap diukur & diakui. */
async function tungguTenang(page) {
  let prev = null;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ sk: document.querySelectorAll('.skeleton').length, t: document.body.innerText }));
    if (r.sk === 0 && prev === r.t) return true;
    prev = r.t;
  }
  return false;
}

const suntik = (page) => page.evaluate(() => {
  const d = document.querySelectorAll('[role="dialog"]');
  const p = document.createElement('p');
  p.textContent = 'MUTASI 99%';
  (d.length ? d[d.length - 1] : document.querySelector('main') || document.body).appendChild(p);
});

/** Satu jalan: login, kunjungi tiap tab (+ overlay bendahara), potret probe.
 *  `gagal` = kunci tabel yang dibalas 500, atau null untuk garis dasar. */
async function jalan(browser, peran, gagal) {
  const bendahara = peran === 'bendahara';
  const { ctx, page } = await newCtx(browser, 'light', { bendahara });
  await page.setViewportSize({ width: W, height: 844 });
  let ember = null;
  const disajikan500 = { n: 0 };
  page.on('request', (req) => {
    const k = kunciTabel(req.url());
    if (k && ember) ember.add(k);
  });
  /* Didaftarkan SESUDAH harness → dipanggil lebih dulu. Tabel lain jatuh ke
     handler harness (bendahara: paksa-anon + tulis diblokir) atau jaringan
     (warga). Tulis dari warga ikut diblokir di sini: sapuan ini memakai DB
     produksi, jadi tak ada jalan tulis yang boleh lolos dari peran mana pun. */
  await ctx.route('**/rest/v1/**', (route) => {
    const req = route.request();
    const m = req.method();
    const baca = m === 'GET' || m === 'HEAD' || m === 'OPTIONS' || (m === 'POST' && req.url().includes('/rpc/'));
    if (!baca) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"audit: tulis diblokir"}' });
    if (gagal && kunciTabel(req.url()) === gagal) {
      disajikan500.n++;
      return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"audit: gagal sebagian"}' });
    }
    return route.fallback();
  });

  const layar = [];
  try {
    ember = new Set();
    await page.goto(URL_APP, { waitUntil: 'networkidle', timeout: 45000 });
    if (!bendahara) await loginWarga(page);
    for (let i = 0; i < 30; i++) { if (await page.locator('nav button').count()) break; await page.waitForTimeout(600); }
    await tungguTenang(page);
    const awal = ember;

    const tabs = (await page.locator('nav button').allInnerTexts()).map((x) => x.trim().split('\n')[0]);
    for (const tab of tabs) {
      ember = new Set(layar.length === 0 ? awal : []);
      const n0 = layar.length === 0 ? 0 : disajikan500.n; // layar pertama menanggung muat boot
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator('nav button', { hasText: tab }).first().click({ force: true });
      const tenang = await tungguTenang(page);
      if (MUTASI && gagal) await suntik(page);
      const r = await page.evaluate(PROBE);
      layar.push({ label: `${peran}/${tab}`, ...r, tenang, tabel: [...ember], kena500: disajikan500.n - n0 });
    }
    if (bendahara) {
      for (const label of OVERLAY) {
        ember = new Set();
        const n0 = disajikan500.n;
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.getByRole('button', { name: 'Menu' }).click();
        await page.waitForTimeout(600);
        const item = page.getByRole('menu').getByText(label, { exact: false });
        if (!(await item.count())) { await page.keyboard.press('Escape'); continue; }
        await item.first().click();
        const tenang = await tungguTenang(page);
        if (MUTASI && gagal) await suntik(page);
        const r = await page.evaluate(PROBE);
        const lbl = `${peran}/overlay-${label.split(' ')[0]}`;
        /* Kontrol lingkup: overlay yang TAK ber-role dialog membuat probe
           memungut halaman di belakangnya — itu populasi salah, jadi keras. */
        if (!r.lapisan) throw new Error(`${lbl}: overlay tak ber-[role=dialog] — lingkup probe salah`);
        layar.push({ label: lbl, ...r, tenang, tabel: [...ember], kena500: disajikan500.n - n0 });
        if (gagal) await page.screenshot({ path: `${OUT}/${gagal.replace('/', '_')}-${lbl.replace('/', '-')}.png` }).catch(() => {});
        await page.goBack();
        await page.waitForTimeout(1200);
      }
    }
    return { layar, kena500: disajikan500.n, galat: null };
  } catch (e) {
    return { layar, kena500: disajikan500.n, galat: e.message.split('\n')[0].slice(0, 140) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

async function kolam(tugas, n) {
  const hasil = new Array(tugas.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, tugas.length) }, async () => {
    while (i < tugas.length) { const k = i++; hasil[k] = await tugas[k](); }
  }));
  return hasil;
}

const browser = await chromium.launch();
let bermasalah = 0, cacat = 0, pasangan = 0, jalanGagal = 0;
const temuanRingkas = [];

for (const peran of PERAN) {
  console.log(`\n══ ${peran} ══`);
  const [d1, d2] = await kolam([() => jalan(browser, peran, null), () => jalan(browser, peran, null)], 2);
  for (const d of [d1, d2]) if (d.galat) { console.log(`  PROBE CACAT: garis dasar mati — ${d.galat}`); cacat++; }
  const dasar = new Map();
  for (const l of d1.layar) dasar.set(l.label, { satu: new Set(l.baris), dua: new Set(), l });
  for (const l of d2.layar) dasar.get(l.label)?.dua && l.baris.forEach((b) => dasar.get(l.label).dua.add(b));

  /* Kontrol: garis dasar WAJIB sehat. Kalau ia sendiri mengaku gagal, DB-nya
     tak hidup — dan selisih lawan garis dasar yang gagal tak membuktikan apa
     pun (dua layar kosong "sama"). */
  const dasarGagal = d1.layar.filter((l) => l.mengaku).map((l) => l.label);
  if (dasarGagal.length) { console.log(`  PROBE CACAT: garis dasar sudah mengaku GAGAL di ${dasarGagal.join(', ')} — DB tak hidup?`); cacat++; }
  let takStabil = 0;
  for (const [lbl, v] of dasar) {
    const beda = [...v.satu].filter((b) => !v.dua.has(b)).concat([...v.dua].filter((b) => !v.satu.has(b)));
    if (beda.length) { takStabil += beda.length; console.log(`  tak stabil antar garis dasar ${lbl}: ${JSON.stringify(beda.slice(0, 4))}`); }
  }
  const tabelDasar = [...new Set(d1.layar.flatMap((l) => l.tabel))].sort();
  const tabel = HANYA ? tabelDasar.filter((t) => HANYA.includes(t)) : tabelDasar;
  console.log(`  garis dasar: ${d1.layar.length} layar · ${d1.layar.reduce((a, l) => a + l.baris.length, 0)} baris berangka · ${takStabil} tak stabil`);
  console.log(`  tabel yang diminta: ${tabelDasar.join(', ')}${HANYA ? `  (HANYA → ${tabel.join(', ') || 'KOSONG'})` : ''}`);
  if (tabel.length === 0) { console.log('  PROBE CACAT: nol tabel untuk digagalkan'); cacat++; continue; }

  const hasil = await kolam(tabel.map((t) => () => jalan(browser, peran, t)), KONKUREN);
  tabel.forEach((t, i) => {
    const h = hasil[i];
    console.log(`\n### ${peran} · gagal: ${t}  (500 disajikan: ${h.kena500})`);
    if (h.galat) { console.log(`  ⚠ PROBE CACAT: jalan mati — ${h.galat}`); cacat++; jalanGagal++; return; }
    /* Kontrol: tabel ini DIMINTA di garis dasar, jadi jalan ini WAJIB
       menyajikan >=1 balasan 500. Nol = gangguan tak pernah mendarat, dan
       "0 temuan" darinya bukan hasil. */
    if (h.kena500 === 0) { console.log('  ⚠ PROBE CACAT: 500 tak pernah disajikan — gangguan tak mendarat'); cacat++; return; }
    for (const l of h.layar) {
      const d = dasar.get(l.label);
      if (!d) { console.log(`  ${l.label}: tak ada di garis dasar — dilewat`); continue; }
      pasangan++;
      const karangan = l.baris.filter((b) => !d.satu.has(b) && !d.dua.has(b));
      const m = [];
      if (karangan.length) m.push(`MENYATAKAN ANGKA yang tak ada saat sehat: ${JSON.stringify(karangan.slice(0, 5))}`);
      if (l.skeleton && !l.tenang) m.push(`skeleton tak selesai: ${l.skeleton}`);
      if (m.length) {
        bermasalah++;
        temuanRingkas.push(`${t} → ${l.label}`);
        console.log(`  ${l.label}${l.kena500 ? ` (500×${l.kena500})` : ''}`);
        m.forEach((x) => console.log(`    ⚠ ${x}`));
      } else if (l.kena500 && !l.mengaku) {
        /* Catatan, BUKAN vonis: layar yang kena 500 tapi tak mengaku & tak
           mengarang angka — kartu opsional yang menyembunyikan dirinya
           (mis. target saat `pengaturan` gagal). Itu menyembunyikan, bukan
           berbohong; ambang untuknya belum diputuskan. */
        console.log(`  ${l.label}: kena 500×${l.kena500}, tak mengaku, tak mengarang (catatan)`);
      }
    }
  });
}

await browser.close();
if (MUTASI) console.log(`\nMUTASI=1: ${bermasalah}/${pasangan} pasangan merah — WAJIB semua; kurang = ada layar tempat probe tak menggigit`);
console.log(`\n=== GAGAL-SEBAGIAN: ${pasangan} pasangan tabel×layar diperiksa · ${bermasalah} bermasalah · ${cacat} probe cacat ===`);
if (temuanRingkas.length) temuanRingkas.forEach((x) => console.log(`  - ${x}`));
if (cacat) console.log('PROBE CACAT — hasil di atas tak boleh dibaca hijau');
process.exit(cacat ? 2 : bermasalah ? 1 : 0);
