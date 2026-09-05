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
import jsPDF from 'jspdf';
import { teksPdf, geometriPdf } from './pdfTeksUji';

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

/* ── KEPALA KOLOM: sekali per halaman, bukan sekali per kategori ───────────
   Sembilan kategori berbagi kolom yang IDENTIK, jadi laporan 12 transaksi
   dulu mencetak 9 label seksi + 9 baris kepala = 18 baris chrome untuk 12
   baris data. Label seksi berhak (pengelompokan + subtotal); nama kolomnya
   tidak.

   INVARIANNYA yang dijaga di sini, bukan penghematannya: tiap halaman yang
   memuat baris transaksi WAJIB menyebut nama kolomnya. Generator memakai
   TAKSIRAN tinggi untuk menebak apakah sebuah tabel akan meluap — dan taksiran
   boleh salah SELAMA uji ini yang memvonis. */
describe('Kas RT — kepala kolom per halaman', () => {
  const TGL = /^\d{2} \w{3} \d{2}$/;

  const bikin = (n: number) => {
    const kat = ['hadiran', 'iuran_warga', 'lainnya', 'sosial', 'pemeliharaan', 'hut_ri',
      'kegiatan_keagamaan', 'donasi_rawat_inap', 'musholah_al_jihad'];
    const rows: KasRT[] = Array.from({ length: n }, (_, i) => ({
      id: `x${i}`, tipe: i % 3 === 0 ? 'masuk' : 'keluar', nominal: 100_000 + i * 1_000,
      keterangan: `Transaksi nomor ${i + 1} untuk keperluan warga`,
      tanggal: `2026-0${(i % 9) + 1}-1${i % 9}`, tarikan_id: null,
      kategori: kat[i % kat.length], saldo_setelah: 0, created_at: '2026-08-01T00:00:00Z',
    }));
    return buildKasRTPDF(rows, { saldo: 0, totalMasuk: 0, totalKeluar: 0, saldoAwal: 0 }).doc;
  };

  const petakan = (doc: ReturnType<typeof bikin>) => {
    const { runs } = geometriPdf(doc, jsPDF);
    const halData = new Set(runs.filter((r) => TGL.test(r.teks)).map((r) => r.hal));
    const halKepala = new Set(runs.filter((r) => r.teks === 'KETERANGAN').map((r) => r.hal));
    return { halData, halKepala, kepala: runs.filter((r) => r.teks === 'KETERANGAN').length,
      seksi: runs.filter((r) => r.teks.startsWith('PENERIMAAN') || r.teks.startsWith('PENGELUARAN')).length };
  };

  for (const n of [12, 40, 90]) {
    it(`${n} transaksi: tiap halaman berisi baris transaksi punya nama kolom`, () => {
      const { halData, halKepala } = petakan(bikin(n));
      expect(halData.size, 'nol halaman berdata — probe tak mendarat').toBeGreaterThan(0);
      const telanjang = [...halData].filter((p) => !halKepala.has(p)).sort();
      expect(telanjang, `halaman berisi baris transaksi TANPA nama kolom`).toEqual([]);
    });
  }

  it('seksi BESAR yang BUKAN pertama di halaman tetap berkepala saat meluap', () => {
    /* Cabang paling berisiko, dan fixture merata di atas TIDAK PERNAH
       menyentuhnya: di sana tak ada seksi bukan-pertama yang meluap, jadi
       `MUTASI tinggiKira = 0` lewat tanpa memerahkan apa pun — mutasi yang
       membunuh PRASYARAT bukan menguji cabangnya, ia melewatinya.
       Di sini kategori pertama sengaja PENDEK (1 baris) supaya kategori kedua
       mulai di tengah halaman lalu PASTI menumpah. */
    const rows: KasRT[] = [
      { id: 'a', tipe: 'masuk', nominal: 1_000, keterangan: 'Setoran tunggal', tanggal: '2026-01-01',
        tarikan_id: null, kategori: 'hadiran', saldo_setelah: 0, created_at: '2026-01-01T00:00:00Z' },
      ...Array.from({ length: 60 }, (_, i) => ({
        id: `b${i}`, tipe: 'keluar' as const, nominal: 10_000 + i, keterangan: `Pemeliharaan bagian ${i + 1}`,
        tanggal: `2026-0${(i % 9) + 1}-1${i % 9}`, tarikan_id: null, kategori: 'pemeliharaan',
        saldo_setelah: 0, created_at: '2026-01-01T00:00:00Z',
      })),
    ];
    const doc = buildKasRTPDF(rows, { saldo: 0, totalMasuk: 1_000, totalKeluar: 600_000, saldoAwal: 0 }).doc;
    const { halData, halKepala } = petakan(doc);
    expect(halData.size, 'fixture harus menumpah halaman').toBeGreaterThan(1);
    expect([...halData].filter((p) => !halKepala.has(p)).sort(),
      'halaman lanjutan seksi besar TANPA nama kolom').toEqual([]);
  });

  it('kepala kolom lebih sedikit daripada seksi — penghematannya nyata', () => {
    /* Tanpa ini, "tiap halaman punya kepala" tetap hijau kalau kepalanya
       dicetak sembilan kali seperti dulu. */
    const { kepala, seksi, halData } = petakan(bikin(12));
    expect(seksi, 'fixture harus punya banyak seksi').toBeGreaterThan(4);
    expect(kepala, `kepala (${kepala}) harus < seksi (${seksi})`).toBeLessThan(seksi);
    expect(kepala, 'tiap halaman berdata tetap butuh satu').toBeGreaterThanOrEqual(halData.size);
  });
});
