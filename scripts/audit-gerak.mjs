/* audit:gerak — ANIMASI MASUK: apakah ia benar terjadi, mendarat, dan PATUH
 * saat pengguna minta "kurangi gerak".
 *
 * KENAPA SAPUAN INI ADA
 * ---------------------
 * 24 sapuan lain memotret atau mengukur layar yang SUDAH TENANG. `audit:lompat`
 * mengukur apakah isinya MELOMPAT (CLS), `audit:respon` mengukur BERAPA LAMA
 * jarak ketukan→cat. Tak satu pun bertanya apakah animasi masuknya sendiri
 * berperilaku benar — dan justru di situ cacat nyata bersembunyi selama
 * berbulan-bulan.
 *
 * Terukur 24 Agu 2026: blok `prefers-reduced-motion: reduce` di index.css cuma
 * memampatkan `animation-duration`, TIDAK `animation-delay`. Sepuluh permukaan
 * ber-stagger memakai delay inline (sampai 10 × 0,05s), dan `.rise` ber-fill-mode
 * `both` — artinya barisnya bertahan di keyframe `from` (opacity 0) selama jeda
 * itu. Pengguna yang minta "kurangi gerak" justru mendapat daftar KOSONG sampai
 * setengah detik lalu MELETUS muncul: persis kebalikan dari yang ia minta, dan
 * lebih buruk daripada animasi aslinya. Cacat itu lolos SEMUA sapuan sejak
 * stagger pertama dipasang, karena semua sapuan memakai `reducedMotion: 'reduce'`
 * lalu MENUNGGU layar tenang sebelum mengukur — jendela cacatnya sudah lewat.
 *
 * TIGA SIFAT, dan yang pertama adalah UJI KONTROL
 * -----------------------------------------------
 *   K. (kontrol, motion normal) animasi masuk WAJIB benar-benar TERLIHAT
 *      terjadi — min-opacity pernah < 1. Kalau tidak pernah, yang gagal ALATNYA,
 *      bukan appnya, dan sapuan keluar sebagai PROBE CACAT. Tanpa ini "app
 *      patuh" dan "aku tak pernah menyentuh apa-apa" mencetak angka yang sama.
 *      Pelajaran itu sudah dibayar dua kali di repo ini (audit:gestur G1, dan
 *      probe pertama verifikasi stagger sesi ini yang lulus palsu karena
 *      `gotoTab()` menunggu 3,5 dtk di dalamnya).
 *   R. (reduced-motion) TAK BOLEH ada elemen ber-animasi-masuk yang PERNAH tak
 *      terlihat atau tergeser. Ini penjaga cacat di atas.
 *   D. (mendarat) sesudah tenang, tiap elemen yang tadi beranimasi WAJIB duduk
 *      di keadaan akhirnya (opacity 1, tanpa sisa geser). Menangkap animasi yang
 *      NYANGKUT — kelas yang sudah pernah menggigit repo ini lewat fill-mode
 *      `both/forwards` di elemen ber-transform inline (memory sheet-exit-luncur).
 *
 * Vonis WAJIB menyebut NAMA elemen yang dilihat, bukan cuma berapa — penghitung
 * yang benar bisa menyembunyikan peristiwa yang salah (pelajaran audit:mundur).
 *
 * Divalidasi MUTASI: `MUTASI=1` mencabut `animation-delay` dari blok
 * reduced-motion lewat suntikan CSS (mengembalikan keadaan pra-perbaikan) →
 * bagian R WAJIB merah.
 */
import { chromium } from 'playwright';
import { newCtx, loginWarga } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI === '1';

/* Populasi = kelas animasi MASUK di index.css (finite, ber-fill-mode).
   Loop dekoratif abadi (skeleton shimmer, aurora Login, empty-bob float) SENGAJA
   di luar: ia memang tak pernah "mendarat", jadi sifat D tak berlaku untuknya. */
const KELAS_MASUK = [
  '.rise', '.reveal', '.reveal-fade', '.sheet-panel',
  '.toast-in', '.cf-in', '.page-in-right', '.page-in-left', '.success-pop',
];

const temuan = [];
const catat = (peran, layar, bagian, pesan) => temuan.push({ peran, layar, bagian, pesan });

/** Ketuk tab DARI DALAM halaman lalu cuplik tiap frame sejak task yang sama.
 *  Wajib dari dalam: `locator.click()` Playwright mendarat di task berbeda dan
 *  frame-frame pertama animasi — justru yang diukur — sudah lewat. */
async function cuplikTab(page, label, sel, ms = 1800) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.evaluate(({ label, sel, ms }) => {
    const jejak = { frameBerisi: 0, pelanggar: [], nMaks: 0 };
    window.__gerak = jejak;
    const nama = (el) => {
      const cls = [...el.classList].filter((c) => sel.includes('.' + c)).join('.') || el.className.toString().slice(0, 24);
      const teks = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 32);
      return `${el.tagName.toLowerCase()}.${cls}${teks ? ` "${teks}"` : ''}`;
    };
    const geser = (cs) => {
      const m = new DOMMatrixReadOnly(cs.transform === 'none' ? '' : cs.transform);
      return Math.hypot(m.m41, m.m42);
    };
    const mulai = performance.now();
    const tick = () => {
      const els = document.querySelectorAll(sel.join(','));
      if (els.length) {
        jejak.frameBerisi++;
        jejak.nMaks = Math.max(jejak.nMaks, els.length);
        for (const el of els) {
          const cs = getComputedStyle(el);
          const o = +cs.opacity;
          const d = geser(cs);
          if (o < 0.99 || d > 1) {
            const k = nama(el);
            let p = jejak.pelanggar.find((x) => x.nama === k);
            if (!p) { p = { nama: k, minOp: 1, maxGeser: 0 }; jejak.pelanggar.push(p); }
            p.minOp = Math.min(p.minOp, o);
            p.maxGeser = Math.max(p.maxGeser, d);
          }
        }
      }
      if (performance.now() - mulai < ms) requestAnimationFrame(tick);
      else jejak.selesai = true;
    };
    const btn = [...document.querySelectorAll('nav button')].find((b) => b.textContent.includes(label));
    requestAnimationFrame(tick);
    btn?.click();
  }, { label, sel, ms });

  await page.waitForTimeout(ms + 500);
  const jejak = await page.evaluate(() => window.__gerak);

  /* Sifat D diukur TERPISAH sesudah tenang — bukan dari jejak, karena elemen
     yang sehat memang sempat opacity 0 di awal. */
  const nyangkut = await page.evaluate((sel) => {
    const out = [];
    for (const el of document.querySelectorAll(sel.join(','))) {
      const cs = getComputedStyle(el);
      const m = new DOMMatrixReadOnly(cs.transform === 'none' ? '' : cs.transform);
      const d = Math.hypot(m.m41, m.m42);
      if (+cs.opacity < 0.99 || d > 1) {
        const teks = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 32);
        out.push(`${el.tagName.toLowerCase()} "${teks}" opacity ${(+cs.opacity).toFixed(2)} geser ${d.toFixed(1)}px`);
      }
    }
    return out;
  }, sel);

  return { ...jejak, nyangkut };
}

const browser = await chromium.launch();

for (const peran of ['warga', 'bendahara']) {
  for (const gerak of ['no-preference', 'reduce']) {
    const { ctx, page } = await newCtx(browser, 'light', { bendahara: peran === 'bendahara' });
    await page.emulateMedia({ reducedMotion: gerak });

    if (MUTASI && gerak === 'reduce') {
      /* Reproduksi keadaan PRA-perbaikan: durasi tetap dimampatkan app, tapi
         JEDA dikembalikan. Dipaksa ke nilai tetap 0,4s, BUKAN `revert` —
         percobaan pertama memakai `revert` dan itu cacat: aturan author
         ber-`!important` yang di-revert jatuh ke nilai UA (`0s`), yaitu lebih
         BENAR dari aslinya, sehingga mutasinya tak menggigit dan sapuan tetap
         hijau. Yang harus ditiru = fill-mode `both` + jeda + durasi ~0, yakni
         elemen yang bertahan di keyframe `from` selama jeda itu. */
      await page.addStyleTag({ content: '@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-delay:.4s!important}}' }).catch(() => {});
    }

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    if (peran === 'warga' && !(await loginWarga(page))) {
      catat(peran, '-', 'PROBE', 'gagal masuk warga — populasi peran ini KOSONG');
      await ctx.close();
      continue;
    }
    await page.waitForTimeout(2500);
    if (MUTASI && gerak === 'reduce') {
      await page.addStyleTag({ content: '@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-delay:.4s!important}}' }).catch(() => {});
    }

    const tabs = peran === 'warga' ? ['Jadwal', 'Hadiran', 'Kas RT'] : ['Jadwal', 'Talangan', 'Hadiran', 'Kas RT'];
    for (const tab of tabs) {
      const j = await cuplikTab(page, tab, KELAS_MASUK);

      if (!j.frameBerisi) {
        catat(peran, tab, 'PROBE', 'tak satu frame pun memuat elemen animasi-masuk — populasi kosong, vonis tak sah');
        continue;
      }

      if (gerak === 'no-preference') {
        // K — uji kontrol
        if (!j.pelanggar.length) {
          catat(peran, tab, 'K', `KONTROL GAGAL: ${j.nMaks} elemen animasi-masuk hadir tapi tak satu pun pernah terlihat beranimasi — alat buta, bukan app patuh`);
        }
      } else {
        // R — patuh reduced-motion
        for (const p of j.pelanggar.slice(0, 6)) {
          catat(peran, tab, 'R', `${p.nama} — sempat opacity ${p.minOp.toFixed(2)}, geser ${p.maxGeser.toFixed(1)}px PADAHAL pengguna minta kurangi gerak`);
        }
        if (j.pelanggar.length > 6) catat(peran, tab, 'R', `… + ${j.pelanggar.length - 6} elemen lain`);
      }

      // D — mendarat (berlaku di kedua mode)
      for (const n of j.nyangkut.slice(0, 4)) catat(peran, tab, 'D', `NYANGKUT sesudah tenang: ${n}`);
    }
    await ctx.close();
  }
}
await browser.close();

const probe = temuan.filter((t) => t.bagian === 'PROBE' || t.bagian === 'K');
for (const bagian of ['PROBE', 'K', 'R', 'D']) {
  const t = temuan.filter((x) => x.bagian === bagian);
  if (!t.length) continue;
  console.log(`\n── ${bagian} ──`);
  for (const x of t) console.log(`  ${x.peran}/${x.layar}: ${x.pesan}`);
}
console.log(`\n=== ${temuan.length} temuan${probe.length ? ` (termasuk ${probe.length} PROBE/KONTROL — vonis TIDAK sah)` : ''} ===`);
if (MUTASI) console.log('MUTASI=1 aktif — bagian R WAJIB merah, kalau hijau berarti mutasinya tak menggigit.');
process.exit(temuan.length ? 1 : 0);
