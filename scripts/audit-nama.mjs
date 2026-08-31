// Audit NAMA KONTROL — apakah tiap kontrol bisa DIBEDAKAN saat tak terlihat.
//
// Kenapa alat sendiri: `audit:papan-ketik` membuktikan tiap kontrol TERGAPAI
// (§2.1.1) dan `audit:sentuh` membuktikan ia cukup luas untuk jempol. Tak satu
// pun bertanya apakah kontrol itu bisa DIBEDAKAN dari kontrol lain ketika
// layarnya tak dilihat. Untuk app yang dipakai lansia — dan Voice Control iOS
// menerima perintah lewat NAMA kontrol — bedanya nyata: nama yang kembar
// membuat satu perintah punya banyak jawaban.
//
// Ditemukan waktu sapuan ini pertama ditulis (30 Agu 2026): `aria-label`
// "Hitung Ulang" adalah string TETAP di daftar Jadwal, sementara daftarnya
// punya 18 tarikan selesai — delapan belas tombol dgn nama identik. Yang
// melihat layar membedakannya dari BARIS tempat tombol duduk; yang tidak,
// tidak. Dan polanya bukan hal baru: dua tetangga langsungnya di baris yang
// SAMA sudah bernomor sejak lama (`Proses tarikan #N`, `Aksi lainnya tarikan
// #N`) — satu tombol terlewat, di antara dua yang benar.
//
// DUA BAGIAN:
//   A. Tiap kontrol yang TERLIHAT & aktif punya nama yang tak kosong (§4.1.2).
//   B. Dalam SATU layar, tak ada dua kontrol bernama sama.
//
// Nama dihitung mendekati urutan spec: aria-label → aria-labelledby →
// `label[for]`/label pembungkus → teks → title. **`label[for]` WAJIB ada di
// rantai itu** — percobaan pertama melewatkannya dan melaporkan dua kolom
// Login sbg "tanpa nama", padahal keduanya berlabel "Email" & "Password".
// Cacat POPULASI, bukan temuan.
//
// Nama TIDAK dipotong sebelum dibanding. Percobaan pertama memotongnya di 44
// karakter dan melaporkan "nama kembar" di Kas RT; aslinya 39 nama, 39 UNIK —
// keterangan transaksi memang panjang & berawalan sama. Membandingkan versi
// terpotong = mengarang temuan.
//
// IZIN: nama kembar yang aksinya SAMA bukan pelanggaran (§2.4.4 mempersoalkan
// nama sama dgn TUJUAN berbeda). Didaftar satu per satu dgn alasan, bukan
// disaring dgn pola.
//
// Pakai:  npm run audit:nama
//   MUTASI=1 → semua `aria-label` dicabut; bagian A WAJIB merah.
import { chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI === '1';

/* Pasangan yang SAH bernama sama — sebutkan alasannya, jangan pola. */
const IZIN = [
  ['w-Beranda', 'Lihat semua transaksi', 'dua tombol (kepala & kaki daftar) menuju tab yang SAMA; §2.4.4 hanya melarang nama sama dgn tujuan BERBEDA'],
  ['b-Beranda', 'Lihat semua transaksi', 'pasangan yang sama di peran bendahara'],
];
const berizin = (layar, nama) => IZIN.some(([l, n]) => l === layar && n === nama);

const namaKontrol = () => {
  const nama = (el) => {
    const al = el.getAttribute('aria-label');
    if (al && al.trim()) return al.trim();
    const lb = el.getAttribute('aria-labelledby');
    if (lb) {
      const t = lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
      if (t) return t;
    }
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l?.textContent?.trim()) return l.textContent.trim();
    }
    const w = el.closest('label');
    if (w && (w.textContent || '').trim()) return w.textContent.trim();
    const txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    if (txt) return txt;
    const ti = el.getAttribute('title');
    if (ti && ti.trim()) return ti.trim();
    return '';
  };
  const out = [];
  document.querySelectorAll('button,a[href],[role="button"],[role="menuitem"],[role="tab"],input,select,textarea,summary').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    if (el.closest('[aria-hidden="true"]') || el.disabled) return;
    out.push({ nama: nama(el), tag: el.tagName.toLowerCase(), kelas: (el.className || '').toString().slice(0, 40) });
  });
  return out;
};

const browser = await chromium.launch();
const perLayar = {};
const kumpul = async (page, layar) => { perLayar[layar] = await page.evaluate(namaKontrol); };
const cabut = (page) => page.evaluate(() => document.querySelectorAll('[aria-label]').forEach((e) => e.removeAttribute('aria-label')));

{
  const { ctx, page } = await newCtx(browser, 'light', {});
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#masuk-warga').waitFor({ timeout: 30000 });
  await page.waitForTimeout(2000);
  if (MUTASI) await cabut(page);
  await kumpul(page, 'Login');
  await loginWarga(page);
  for (const t of ['Beranda', 'Jadwal', 'Hadiran', 'Kas RT']) {
    await gotoTab(page, t); await page.waitForTimeout(2000);
    if (MUTASI) await cabut(page);
    await kumpul(page, `w-${t}`);
  }
  await ctx.close();
}
{
  const { ctx, page } = await newCtx(browser, 'light', { bendahara: true });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  for (const t of ['Beranda', 'Jadwal', 'Talangan', 'Hadiran', 'Kas RT']) {
    await gotoTab(page, t); await page.waitForTimeout(2000);
    if (MUTASI) await cabut(page);
    await kumpul(page, `b-${t}`);
  }
  await ctx.close();
}
await browser.close();

let total = 0, gagal = 0;
const kosong = [], kembar = [];
for (const [layar, daftar] of Object.entries(perLayar)) {
  total += daftar.length;
  daftar.filter((d) => !d.nama).forEach((d) => kosong.push(`${layar}  <${d.tag} class="${d.kelas}">`));
  const c = new Map();
  daftar.filter((d) => d.nama).forEach((d) => c.set(d.nama, (c.get(d.nama) || 0) + 1));
  for (const [n, k] of c) if (k > 1 && !berizin(layar, n)) kembar.push(`${layar}  "${n}" ×${k}`);
}

console.log(`\n### A. kontrol TANPA nama (§4.1.2)${kosong.length ? '' : '  OK'}`);
kosong.forEach((x) => console.log('  ⚠ ' + x));
console.log(`\n### B. nama KEMBAR dalam satu layar${kembar.length ? '' : '  OK'}`);
kembar.forEach((x) => console.log('  ⚠ ' + x));

gagal = kosong.length + kembar.length;
console.log(`\n=== NAMA KONTROL · ${total} kontrol di ${Object.keys(perLayar).length} layar · ${gagal} bermasalah ===`);
if (!total) { console.log('PROBE CACAT: populasi kosong — sapuan tak menguji apa pun.'); process.exit(2); }
if (MUTASI && !kosong.length) { console.log('PROBE CACAT: MUTASI=1 tapi bagian A nol — aria-label tak benar-benar tercabut.'); process.exit(2); }
process.exit(gagal ? 1 : 0);
