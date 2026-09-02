/**
 * Audit JARAK TEKS — WCAG 2.1 §1.4.12 *Text Spacing* (AA, **WAJIB**).
 *
 * Kenapa ada (2 Sep 2026): dari 29 sapuan, **tak satu pun pernah menyentuh
 * §1.4.12**, dan itu bukan ambang pilihan app melainkan syarat konformansi AA
 * yang selama ini diklaim lulus. Bentuk cacatnya sama persis dgn pelajaran
 * ke-33 (ambang AAA yang dinyatakan tapi tak pernah dicetak alat): sapuan
 * hijau cuma membuktikan apa yang DIUKURNYA.
 *
 * Kriteriannya: tak boleh ada isi/fungsi yang HILANG ketika pengguna menyetel
 *   line-height   >= 1,5 x ukuran font
 *   jarak paragraf>= 2   x ukuran font
 *   letter-spacing>= 0,12x ukuran font
 *   word-spacing  >= 0,16x ukuran font
 * Keempatnya dipasang sekaligus lewat satu stylesheet — itu memang cara uji
 * baku §1.4.12 (bookmarklet resmi WCAG melakukan hal yang sama, ber-`*` dan
 * ber-`!important`, sehingga `style=` inline pun kalah seperti pada pengguna
 * yang memasang user stylesheet).
 *
 * ── SUMBU Y ADALAH YANG BARU, DAN ITU INTINYA ─────────────────────────────
 * `audit:potong` mengukur LEBAR (Range vs clientWidth), `audit:lebar` mengukur
 * luapan mendatar nominal, `audit:reflow` mencari geser samping. Ketiganya
 * MENDATAR. Ditelusuri di seluruh `scripts/`: satu-satunya pemakaian
 * `scrollHeight` untuk vonis ada di `audit-kontras-deep.mjs`, dan itu untuk
 * MENEMUKAN wadah yang bisa digulir, bukan untuk memvonis teks terpenggal.
 * Jadi **tak ada satu pun sapuan yang pernah membandingkan tinggi teks lawan
 * tinggi kotaknya sendiri** — padahal justru itu yang dirusak §1.4.12:
 * line-height 1,5 menambah TINGGI, dan yang menahannya adalah tinggi tetap,
 * `line-clamp`, dan tinggi cadangan `contain-intrinsic-block-size`.
 *
 * ── DUA UJI KONTROL, keduanya WAJIB ───────────────────────────────────────
 * K1 — override benar-benar MENDARAT. Dibaca balik dari `getComputedStyle`
 *      elemen teks nyata. Tanpa ini "app patuh §1.4.12" dan "alatku tak
 *      pernah menyuntik apa pun" mencetak angka yang sama (pelajaran ke-23 &
 *      cacat ke-21/22: sapuan tanpa kontrol tak bisa membedakan keduanya).
 * K2 — GARIS DASAR dikurangkan. Probe yang sama dijalankan TANPA override.
 *      Elemen yang sudah terpotong sebelum disentuh bukan temuan §1.4.12 —
 *      itu milik `audit:potong`. Vonisnya DELTA, dan garis dasarnya ikut
 *      dicetak supaya tak ada yang mengklaim temuan orang lain.
 * Populasi kosong = `PROBE CACAT`, bukan lulus.
 *
 * ── VALIDASI MUTASI ───────────────────────────────────────────────────────
 * `MUTASI=1` memangkas tiap kotak teks yang TERKURUNG jadi 70% tingginya,
 * tepat sebelum pemungutan. Temuan sumbu Y WAJIB melonjak. Batasnya diakui
 * jujur: mutasi ini membuktikan probe SAMPAI ke populasinya & hitungannya
 * benar — ia tidak membuktikan app rapuh. Itu tugas angka DELTA-nya.
 *
 * Bendahara lewat `newCtx(..., { bendahara: true })` harness bersama (mock 3
 * lapis). Jangan salin alur login ke sini.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { newCtx, loginWarga, gotoTab, closeLayer, openMenuItem } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const OUT = process.env.OUT_DIR || '.audit-jarak-teks';
mkdirSync(OUT, { recursive: true });

/* Set baku §1.4.12. `*` + `!important` disengaja: itu bentuk user stylesheet
   yang kriteria ini bayangkan, dan tanpa `!important` seluruh `style=` inline
   app (Odometer menulis `lineHeight: 1` inline) tak akan pernah tertekan. */
const CSS_1412 = `*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}
p{margin-bottom:2em!important}`;

/* MUTASI bagian O — kembalikan geometri Odometer PRA-perbaikan: jendela dipaku
   `1em` sementara selnya ikut `line-height`. Bukan mutasi karangan; ini persis
   keadaan yang terukur 2 Sep 2026 (jendela 34px, sel 51px). Bagian O WAJIB
   merah karenanya. */
const MUTASI_ODO = `[data-odo]{height:1em!important}`;

const PUNGUT = (mutasi) => {
  /* Lingkup = LAPISAN TERATAS saja. Halaman di belakang overlay tidak
     di-unmount, jadi memungut se-dokumen membuat baris yang sama terhitung
     ulang di tiap overlay — populasi salah, bukan temuan (pelajaran
     `audit:potong`). */
  const dialogs = document.querySelectorAll('[role="dialog"]');
  const akar = dialogs.length ? dialogs[dialogs.length - 1] : document;

  const nama = (el) => {
    const c = el.className;
    const s = (typeof c === 'string' ? c : c?.baseVal || '').trim();
    return s ? s.slice(0, 64) : `<${el.tagName.toLowerCase()}>`;
  };
  /* `.sr-only` & kawan: kotak 1px ber-clip. Dilaporkan "terpotong" pernah jadi
     cacat alat ke-4 di repo ini — jangan diulang. */
  const srOnly = (el, cs) =>
    cs.clip !== 'auto' || (cs.clipPath && cs.clipPath !== 'none') ||
    el.clientWidth <= 2 || el.clientHeight <= 2;

  const kandidat = [];
  akar.querySelectorAll('*').forEach((el) => {
    if (el.tagName === 'HTML' || el.tagName === 'BODY') return;
    /* Pita digit Odometer SENGAJA terkurung — 10 digit di jendela setinggi
       satu baris. Probe `scrollHeight` akan selalu melaporkannya "hilang
       285-323px", dan itu fakta rancangan, bukan temuan (kelas cacat alat
       yang sama sudah dibayar `audit:lebar` & `audit:kembali`: komponen yang
       merender angka lewat KOLOM hilang/menyesatkan di populasi berbasis
       teks). Yang benar-benar bisa rusak di sini bukan tingginya melainkan
       KESEJAJARANNYA — dan itu diuji terpisah di bagian O. */
    if (el.closest('[data-odo]')) return;
    if (!(el.textContent || '').trim()) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return;
    if (srOnly(el, cs)) return;
    kandidat.push([el, cs]);
  });

  /* MUTASI dipasang SESUDAH populasi dikumpulkan & SEBELUM diukur, supaya ia
     menekan kotak yang persis akan divonis. */
  if (mutasi) {
    for (const [el, cs] of kandidat) {
      if (/^(hidden|clip)$/.test(cs.overflowY)) {
        el.style.setProperty('height', Math.max(4, Math.round(el.clientHeight * 0.7)) + 'px', 'important');
        el.style.setProperty('min-height', '0', 'important');
      }
    }
  }

  const out = [];
  for (const [el, cs0] of kandidat) {
    const cs = mutasi ? getComputedStyle(el) : cs0;
    /* Y — TERKURUNG saja (`hidden`/`clip`). `auto`/`scroll` bisa digulir, jadi
       isinya tidak hilang; melaporkannya = menyuruh orang membetulkan sheet
       yang justru bekerja. */
    if (/^(hidden|clip)$/.test(cs.overflowY)) {
      const k = el.scrollHeight - el.clientHeight;
      if (k > 0.5) out.push({ ax: 'Y', k: +k.toFixed(1), t: (el.textContent || '').trim().slice(0, 44), cls: nama(el) });
    }
    /* X — daun saja, lewat `Range` bukan `scrollWidth` (pelajaran ke-16:
       scrollWidth ikut menghitung keturunan absolut & span probe FitAmount). */
    if (!el.children.length && /^(hidden|clip)$/.test(cs.overflowX)) {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      const k = rg.getBoundingClientRect().width - el.clientWidth;
      if (k > 0.5) out.push({ ax: 'X', k: +k.toFixed(1), t: (el.textContent || '').trim().slice(0, 44), cls: nama(el) });
    }
  }
  return { n: kandidat.length, out };
};

/** Kunci identitas temuan — SENGAJA tanpa `k`: nilai luberannya memang berubah
 *  antara garis dasar & sesudah override, dan mengunci ke situ membuat tiap
 *  temuan lama terhitung "baru". */
const kunci = (f) => `${f.ax}|${f.cls}|${f.t}`;

async function pungutLayar(page, fase, nama, hasil) {
  /* Gulir sampai DASAR: baris di bawah lipatan tak dirender
     (`content-visibility:auto`) — memungut sekali di puncak = menyempitkan
     populasi tanpa mengaku. */
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(130);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(320);
  const { n, out } = await page.evaluate(PUNGUT, fase === 'pasang' && !!process.env.MUTASI);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(180);
  const uniq = new Map();
  for (const f of out) {
    const k = kunci(f);
    if (!uniq.has(k) || uniq.get(k).k < f.k) uniq.set(k, f);
  }
  const odo = await pungutOdometer(page);
  hasil.push({ fase, layar: nama, populasi: n, odo, item: [...uniq.values()].sort((a, b) => b.k - a.k) });
}

/**
 * Bagian O — INVARIAN ODOMETER: tinggi jendela == tinggi satu sel digit.
 *
 * Kenapa terpisah dari probe umum: yang rusak di sini bukan "isi terpotong"
 * (pita 10 digit memang terkurung) melainkan pita yang bergeser dgn LANGKAH
 * yang tak lagi sama dengan tinggi selnya. Sebelum 2 Sep 2026 jendela dipaku
 * `height: 1em` sementara sel mengikuti `line-height`; di bawah §1.4.12 itu
 * jadi 34px lawan 51px, dan saldo hero — nominal terpenting di app —
 * mencetak serpihan digit TETANGGA di atas angkanya.
 *
 * Diukur dari DOM, bukan dari piksel: langkahnya persentase pita, jadi
 * "sel == jendela" adalah syarat yang cukup & tepat.
 */
async function pungutOdometer(page) {
  return page.evaluate(() => {
    const out = [];
    for (const kol of document.querySelectorAll('[data-odo]')) {
      const pita = kol.lastElementChild;
      if (!pita || pita.children.length !== 10) continue;
      const jendela = kol.clientHeight;
      const sel = pita.scrollHeight / 10;
      if (!jendela || !sel) continue;
      const beda = Math.abs(sel - jendela);
      if (beda > 0.5) {
        const host = kol.closest('[aria-label]');
        out.push({
          nominal: host?.getAttribute('aria-label') || '(tanpa label)',
          jendela: +jendela.toFixed(1), sel: +sel.toFixed(1), beda: +beda.toFixed(1),
        });
      }
    }
    const uniq = new Map();
    for (const o of out) uniq.set(o.nominal + o.beda, o);
    return [...uniq.values()];
  });
}

/** K1 — apakah override benar-benar mendarat di elemen teks nyata? */
async function kontrolOverride(page) {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('span,p,h1,h2,h3,div,button')]
      .find((e) => !e.children.length && (e.textContent || '').trim().length > 8 && e.clientHeight > 4);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize) || 16;
    return {
      lh: +(parseFloat(cs.lineHeight) / fs).toFixed(2),
      ls: +(parseFloat(cs.letterSpacing) / fs).toFixed(3),
      ws: +((parseFloat(cs.wordSpacing) || 0) / fs).toFixed(3),
    };
  });
}

async function jelajahWarga(page, fase, hasil) {
  await loginWarga(page);
  if (!(await page.locator('nav button').count())) {
    console.log(`  PROBE CACAT [${fase}]: gate warga tak terlewati`);
    process.exitCode = 2; return;
  }
  const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
  for (const tab of tabs) { await gotoTab(page, tab); await pungutLayar(page, fase, `w-${tab}`, hasil); }
}

async function jelajahBendahara(page, fase, hasil) {
  if (!(await page.locator('nav button').count())) {
    console.log(`  PROBE CACAT [${fase}]: mock bendahara gagal — masih di login`);
    process.exitCode = 2; return;
  }
  const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
  for (const tab of tabs) { await gotoTab(page, tab); await pungutLayar(page, fase, `b-${tab}`, hasil); }

  for (const [tab, aria, nama] of [
    ['Hadiran', 'Setor ke Kas RT', 'b-sheet-setor'],
    ['Kas RT', 'Tambah transaksi Kas RT', 'b-sheet-kasrt'],
  ]) {
    await gotoTab(page, tab);
    const fab = page.getByRole('button', { name: aria });
    if (await fab.count()) {
      await fab.click().catch(() => {});
      await page.waitForTimeout(900);
      if (await page.locator('[role="dialog"]').count()) { await pungutLayar(page, fase, nama, hasil); await closeLayer(page); }
    }
  }
  for (const [label, nama] of [
    ['Tutup Buku Triwulan', 'b-laporan'], ['Riwayat Aktivitas', 'b-riwayat'],
    ['Kelola Anggota', 'b-anggota'], ['Backup & Restore', 'b-backup'],
    ['Tentang Aplikasi', 'b-tentang'],
  ]) {
    if (await openMenuItem(page, label)) { await pungutLayar(page, fase, nama, hasil); await closeLayer(page); }
  }
}

const browser = await chromium.launch();
const hasil = [];
const kontrol = {};

for (const fase of ['dasar', 'pasang']) {
  for (const bendahara of [false, true]) {
    const { ctx, page } = await newCtx(browser, 'light', { bendahara });
    if (fase === 'pasang') {
      await ctx.addInitScript((css) => {
        const pasang = () => {
          const s = document.createElement('style');
          s.textContent = css;
          (document.head || document.documentElement).appendChild(s);
        };
        if (document.head) pasang(); else document.addEventListener('DOMContentLoaded', pasang);
      }, CSS_1412 + (process.env.MUTASI ? '\n' + MUTASI_ODO : ''));
    }
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(bendahara ? 4000 : 1200);
    if (bendahara) await jelajahBendahara(page, fase, hasil);
    else await jelajahWarga(page, fase, hasil);
    kontrol[`${fase}-${bendahara ? 'b' : 'w'}`] = await kontrolOverride(page);
    await ctx.close();
  }
}
await browser.close();
writeFileSync(`${OUT}/hasil.json`, JSON.stringify({ kontrol, hasil }, null, 1));

// ── vonis ──────────────────────────────────────────────────────────────────
const per = (fase) => hasil.filter((h) => h.fase === fase);
const petaDasar = new Map();
for (const h of per('dasar')) petaDasar.set(h.layar, new Set(h.item.map(kunci)));

const baru = [];
for (const h of per('pasang')) {
  const lama = petaDasar.get(h.layar) || new Set();
  const it = h.item.filter((f) => !lama.has(kunci(f)));
  if (it.length) baru.push({ layar: h.layar, item: it });
}

const populasi = per('pasang').reduce((s, h) => s + h.populasi, 0);
const nDasar = per('dasar').reduce((s, h) => s + h.item.length, 0);
const nPasang = per('pasang').reduce((s, h) => s + h.item.length, 0);
const nBaru = baru.reduce((s, h) => s + h.item.length, 0);

/* Bagian O dinilai dari fase `pasang` saja: di garis dasar jendela & sel memang
   sama (line-height app), jadi mengurangkannya tak menambah apa pun. */
const odo = [];
for (const h of per('pasang')) for (const o of h.odo || []) odo.push({ layar: h.layar, ...o });
const odoUniq = [...new Map(odo.map((o) => [o.nominal + o.beda, o])).values()];

console.log(`\n=== JARAK TEKS · WCAG §1.4.12 (AA, WAJIB) ===`);
console.log(`  populasi teks terukur     : ${populasi} elemen / ${per('pasang').length} layar`);
console.log(`  garis dasar (tanpa setel) : ${nDasar}   ← milik audit:potong, bukan temuan di sini`);
console.log(`  sesudah §1.4.12 dipasang  : ${nPasang}`);
console.log(`  ISI HILANG karena §1.4.12 : ${nBaru}`);
console.log(`  O. invarian Odometer      : ${odoUniq.length} nominal tak sejajar`);
for (const o of odoUniq.slice(0, 6)) {
  console.log(`     ${o.layar.padEnd(14)} "${o.nominal}"  jendela ${o.jendela}px vs sel ${o.sel}px (beda ${o.beda}px)`);
}

console.log(`\n  ── kontrol ──`);
for (const [k, v] of Object.entries(kontrol)) {
  console.log(`  K1 ${k.padEnd(10)} line-height ${v ? v.lh : '?'}x · letter ${v ? v.ls : '?'}em · word ${v ? v.ws : '?'}em`);
}
const pasangOK = ['pasang-w', 'pasang-b'].every((k) => kontrol[k] && kontrol[k].lh >= 1.49 && kontrol[k].ls >= 0.119);
if (!pasangOK) { console.log(`  PROBE CACAT: override §1.4.12 TIDAK mendarat — angka di atas tak berarti apa-apa.`); process.exitCode = 2; }
if (!populasi) { console.log(`  PROBE CACAT: populasi KOSONG.`); process.exitCode = 2; }

for (const h of baru) {
  console.log(`\n  ${h.layar}`);
  for (const it of h.item.slice(0, 8)) console.log(`    ${it.ax} hilang ${String(it.k).padStart(6)}px  "${it.t}"  .${it.cls}`);
  if (h.item.length > 8) console.log(`    … +${h.item.length - 8} lagi`);
}

process.exitCode = (nBaru + odoUniq.length) ? 1 : (process.exitCode || 0);
