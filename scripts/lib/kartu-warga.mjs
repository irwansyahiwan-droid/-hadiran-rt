/* Pembuka Kartu Warga bersama untuk sapuan (15 Okt 2026).
 *
 * Kartu Warga (`c4134f1`) lahir dari sesi lain dan tak masuk populasi sapuan
 * mana pun. Ia punya DUA layar, dan yang kedua tak pernah ada tanpa ketukan:
 *   1. "Cari nama Anda" — kunjungan pertama di HP itu (konteks sapuan selalu segar).
 *   2. Kartu — sesudah sebuah nama diketuk (lalu diingat di localStorage).
 *
 * Isi kartu bergantung DATA warga yang diketuk, jadi warganya tak dipilih dari
 * urutan alfabet: yang dipilih warga dgn talangan BELUM LUNAS terbanyak — varian
 * berteks paling banyak (daftar "Tarikan #N" + nominal + kalimat lunas), tempat
 * teks lemah paling mungkin bersembunyi. Datanya dibaca lewat GET anon, data yang
 * memang terbuka untuk warga di tab Talangan; tak ada yang ditulis.
 *
 * Harness dikunci read-only, jadi pembantu ini berkas sendiri. Kaitnya peran
 * (`dialog`, `section[aria-label]`), bukan kelas.
 */
import { SUPA_URL, ANON, openMenuItem, closeLayer } from './audit-harness.mjs';

let namaTerkaya;

/** Nama warga aktif dgn talangan belum lunas terbanyak; null kalau tak ada / gagal. */
export async function namaKartuTerkaya() {
  if (namaTerkaya !== undefined) return namaTerkaya;
  const h = { apikey: ANON, authorization: `Bearer ${ANON}` };
  try {
    const tal = await (await fetch(`${SUPA_URL}/rest/v1/talangan?select=warga_id&status_lunas=eq.false`, { headers: h })).json();
    const warga = await (await fetch(`${SUPA_URL}/rest/v1/warga?select=id,nama&status_aktif=eq.true`, { headers: h })).json();
    const n = new Map();
    for (const t of tal) n.set(t.warga_id, (n.get(t.warga_id) || 0) + 1);
    const [id] = [...n.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    namaTerkaya = warga.find((w) => w.id === id)?.nama ?? null;
  } catch {
    namaTerkaya = null;
  }
  return namaTerkaya;
}

/* Kaitnya label dialognya sendiri (`useDialog` label "Kartu warga"), bukan
   "dialog terakhir" — dialog lain yang masih beranimasi keluar bisa ada di DOM. */
/* Label "Kartu saya" sejak 19 Okt 2026 (keputusan user: fitur ini bernama
   "Kartu Saya" di menu, judul & slide Beranda). Nama fungsi/berkas tetap. */
const SELEKTOR = '[role="dialog"][aria-label="Kartu saya"]';
const lapisan = (page) => page.locator(SELEKTOR);

/** Dari layar "Cari nama Anda" yang sudah terbuka: tunggu daftar nyata (baris
 *  kerangka tak punya tombol), ketuk warga terkaya (cadangan: baris pertama),
 *  lalu tunggu kartunya. false = layar kartu tak tercapai — penelepon WAJIB
 *  menghitungnya PROBE CACAT, bukan melewatinya diam-diam. */
export async function pilihKartuWarga(page) {
  const dlg = lapisan(page);
  const baris = dlg.locator('ul li button');
  try { await baris.first().waitFor({ timeout: 15000 }); } catch { return false; }
  const nama = await namaKartuTerkaya();
  const sasaran = nama ? baris.filter({ hasText: nama }).first() : baris.first();
  await ((await sasaran.count()) ? sasaran : baris.first()).click();
  try {
    await dlg.locator('section[aria-label="Giliran Sohibul Bait"]').waitFor({ timeout: 15000 });
  } catch { return false; }
  await page.waitForTimeout(600);
  return true;
}

/** Tunggu layar "Cari nama Anda" berisi daftar NYATA (baris kerangka tak punya
 *  tombol). Untuk sapuan yang memungut tanpa menunggu kerangka habis. */
export async function tungguDaftarKartu(page) {
  try { await lapisan(page).locator('ul li button').first().waitFor({ timeout: 15000 }); } catch { return false; }
  await page.waitForTimeout(400);
  return true;
}

/** Buka Kartu Warga dari Menu, ukur KEDUA layarnya lewat `ukur('pilih' | 'kartu')`,
 *  lalu tutup. Mengembalikan daftar alasan PROBE CACAT (kosong = keduanya
 *  terukur). Layar yang tak tercapai dilaporkan, tak pernah dilewati diam-diam. */
export async function jelajahKartuWarga(page, ukur) {
  if (!(await openMenuItem(page, 'Kartu Saya'))) return ['Kartu Warga: item Menu tak ada'];
  const cacat = [];
  let siap = await tungguDaftarKartu(page);
  /* Lapisan yang TERTUTUP SENDIRI sebelum daftarnya tampil. Terjadi sekali di
     rantai 15 Okt (320/warga, tepat sesudah Tentang Aplikasi ditutup) dan tak
     terulang sendirian. Sebabnya BELUM terbukti: dua menit kemudian sapuan
     berikutnya melihat SEMUA layar warga gagal muat (gangguan Supabase sesaat),
     jadi tersangka terkuat data yang tak datang; tersangka kedua Back susulan
     `closeLayer` yang mendarat sesudah lapisan ini terbuka. Dibuka ulang SEKALI
     hanya kalau lapisannya hilang; gagal lagi tetap PROBE CACAT, dan pesannya
     menyebut keadaan layar (`keadaanLapisan`) supaya kali berikutnya terbaca. */
  if (!siap && !(await lapisan(page).count())) {
    if (await openMenuItem(page, 'Kartu Saya')) siap = await tungguDaftarKartu(page);
  }
  if (siap) await ukur('pilih');
  else cacat.push(`Kartu Warga: daftar nama tak tampil (${await keadaanLapisan(page)})`);
  if (await pilihKartuWarga(page)) await ukur('kartu');
  else cacat.push('Kartu Warga: kartu tak terbuka');
  await closeLayer(page);
  return cacat;
}

/** Untuk pesan PROBE CACAT: apa yang SEBENARNYA ada di layar — penjaga yang tak
 *  bisa menyebut keadaannya memaksa orang menebak (pelajaran ke-41). */
async function keadaanLapisan(page) {
  return page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')];
    return `dialog ${d.length}: ` + d.map((x) => `"${x.getAttribute('aria-label') ?? ''}" tombol-nama ${x.querySelectorAll('ul li button').length} kerangka ${x.querySelectorAll('.skeleton').length}`).join(' | ')
      + ` · menu terbuka ${document.querySelectorAll('[role="menu"]').length}`;
  }).catch((e) => `tak terbaca: ${e.message.slice(0, 60)}`);
}
