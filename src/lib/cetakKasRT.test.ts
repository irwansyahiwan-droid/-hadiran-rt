/**
 * Penjaga ISI dokumen cetak — bukan warnanya, bukan responsnya.
 *
 * Kenapa ada (4 Sep 2026): app punya 9 generator PDF/Excel (1.109 baris, 29
 * call-site) dan tak satu pun diuji isinya. Yang sudah ada cuma `warnaCetak`
 * (palet) dan pembungkus berbagi; `audit:respon` menyentuh jalur ekspor tapi
 * hanya bertanya "apakah ketukannya diakui", bukan "apakah dokumennya benar".
 * Layar dijaga 31 sapuan, kertas nol — padahal PDF-lah yang dicetak, di-WA-kan
 * ke grup, dan jadi catatan resmi RT.
 *
 * Yang dijaga di sini INVARIAN, bukan tata letak: **ringkasan bertanda tangan
 * wajib REKONSILIASI dengan baris di atasnya.** `buildKasRTPDF` menerima
 * `stats` dari pemanggil dan mencetaknya apa adanya — ia tak pernah menghitung
 * ulang dari `list`. Terukur: dgn stats yang sengaja bertentangan, dokumen
 * tetap tercetak rapi — ringkasan Rp88.000.000 di atas baris yang jumlahnya
 * Rp6.250.000, tanpa satu pun keberatan.
 *
 * Hari ini call-site-nya BENAR (`KasRT.tsx:553` mengirim `list` utuh dgn stats
 * yang dihitung dari `list` juga, bukan `displayList` yang tersaring). Jaraknya
 * satu kata: mengganti `list` → `displayList` (mis. "ekspor yang sedang saya
 * lihat") langsung melahirkan dokumen yang membantah dirinya sendiri.
 *
 * BATAS: ini membaca literal string dari isi halaman PDF — cukup untuk teks
 * Latin jsPDF, dan TIDAK memeriksa tata letak (posisi, pemenggalan halaman).
 * Kalau nanti generator pindah dari jsPDF, helper ini yang pertama patah.
 */
import { describe, it, expect } from 'vitest';
import { buildKasRTPDF } from './generateKasRTPDF';
import type { KasRT } from './types';

function teksPdf(doc: unknown): string[] {
  const pages = (doc as { internal: { pages: string[][] } }).internal.pages;
  const isi = pages.flat().filter(Boolean).join('\n');
  const out: string[] = [];
  const re = /\(((?:\\.|[^()\\])*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(isi))) out.push(m[1].replace(/\\([()\\])/g, '$1'));
  return out;
}

/* Kategori WAJIB dari `kategoriKasRt.ts` — bukan karangan. Generator menyaring
   baris per kategori, jadi kunci yang salah membuat SELURUH tabel kosong dan
   uji ini lulus palsu. Terjadi saat probe pertama ditulis. */
const baris = (i: number, tipe: 'masuk' | 'keluar', nominal: number, kategori: string, ket: string): KasRT => ({
  id: `x${i}`, tipe, nominal, keterangan: ket, tanggal: `2026-08-0${(i % 9) + 1}`,
  tarikan_id: null, kategori, saldo_setelah: 0, created_at: '2026-08-01T00:00:00Z',
});

const LIST: KasRT[] = [
  baris(1, 'masuk', 5_000_000, 'hadiran', 'Setoran kas Hadiran'),
  baris(2, 'masuk', 1_250_000, 'iuran_warga', 'Iuran warga blok C'),
  baris(3, 'keluar', 750_000, 'sosial', 'Santunan warga sakit'),
  baris(4, 'keluar', 2_000_000, 'pemeliharaan', 'Perbaikan saluran air'),
];
const jml = (t: 'masuk' | 'keluar') => LIST.filter((k) => k.tipe === t).reduce((s, k) => s + k.nominal, 0);
const rp = (n: number) => n.toLocaleString('id-ID');

describe('PDF Kas RT — isi dokumen', () => {
  it('mencetak setiap baris transaksi', () => {
    const { doc } = buildKasRTPDF(LIST, { saldo: jml('masuk') - jml('keluar'), totalMasuk: jml('masuk'), totalKeluar: jml('keluar'), saldoAwal: 0 });
    const t = teksPdf(doc).join(' | ');
    for (const k of LIST) {
      /* Fixture WAJIB bermakna dulu — `toContain('')` selalu benar, jadi
         keterangan kosong membuat pemeriksaan di bawahnya HAMPA. Kelas yang
         sama ketemu lewat mutasi di `cetakKasHadiran.test.ts`. */
      expect(k.keterangan.length, 'fixture cacat: keterangan kosong').toBeGreaterThan(2);
      expect(t, `keterangan "${k.keterangan}" hilang dari kertas`).toContain(k.keterangan);
    }
    /* Populasi kosong = penjaga buta: kalau saringan kategori meleset, tabel
       kosong dan pemeriksaan di atas bisa lulus tanpa isi. */
    expect(teksPdf(doc).length, 'terlalu sedikit string — tabel kemungkinan kosong').toBeGreaterThan(40);
  });

  it('RINGKASAN rekonsiliasi dengan baris di atasnya', () => {
    const stats = { saldo: jml('masuk') - jml('keluar'), totalMasuk: jml('masuk'), totalKeluar: jml('keluar'), saldoAwal: 0 };
    const t = teksPdf(buildKasRTPDF(LIST, stats).doc);
    /* Kesamaan PERSIS + tanda. Substring buta tanda: `"6.250.000"` cocok di
       dalam `"-Rp6.250.000"`, jadi rumus yang terbalik tetap lolos. Ketahuan
       lewat mutasi di `cetakLaporanTriwulan.test.ts`. */
    expect(t, `total masuk harus "+Rp${rp(jml('masuk'))}"`).toContain(`+Rp${rp(jml('masuk'))}`);
    expect(t, `total keluar harus "-Rp${rp(jml('keluar'))}"`).toContain(`-Rp${rp(jml('keluar'))}`);
    expect(t, 'saldo bersih salah/tak tercetak').toContain(`Rp${rp(jml('masuk') - jml('keluar'))}`);
  });

  it('PENJAGA BERGIGI: stats yang bertentangan menghasilkan dokumen yang membantah dirinya sendiri', () => {
    /* Bukan pengujian app, melainkan pembuktian bahwa uji di atas BISA merah.
       Generator memang tak menghitung ulang — jadi angka bohong ikut tercetak,
       dan itulah yang membuat penjaga ini perlu ada. */
    const bohong = { saldo: 99_000_000, totalMasuk: 88_000_000, totalKeluar: 1_000, saldoAwal: 0 };
    const t = teksPdf(buildKasRTPDF(LIST, bohong).doc);
    expect(t.join(' | ')).toContain('88.000.000');          // ringkasan palsu tercetak…
    expect(t.join(' | ')).toContain('Setoran kas Hadiran');  // …di atas baris yang benar
    expect(t).not.toContain(`+Rp${rp(jml('masuk'))}`);   // dan total yang BENAR tak ada
  });
});
