/**
 * Penjaga ISI PDF Kas Hadiran — generator TERBESAR app (237 baris).
 *
 * Invariannya lebih tajam daripada Kas RT, dan bisa diperiksa TANPA mempercayai
 * angka harapan dari luar: dokumen ini mencetak totalnya DUA KALI, dari DUA
 * SUMBER BERBEDA, di halaman yang sama —
 *
 *   kaki TABEL      dihitung generator dari baris nyata (`totalKas`, `totalTal`,
 *                   `totalSetor`, `totalNet` lewat `hitungSaldoHadiran`)
 *   blok RINGKASAN  `stats.*` dari pemanggil, dicetak apa adanya
 *
 * Kalau keduanya berselisih, pembaca melihat kaki tabel mengatakan satu hal dan
 * ringkasan bertanda tangan mengatakan hal lain — di SATU halaman. Risiko itu
 * bahkan sudah diakui di kode (komentar baris ~106: `totalSetor` "TIDAK
 * struktural", karena halaman menjumlahkan semua transaksi sementara map-nya
 * belum tentu) — diakui, tapi tak pernah dijaga.
 *
 * Karena itu uji ini TIDAK membandingkan dokumen dgn angka karangan; ia
 * membandingkan dokumen dengan DIRINYA SENDIRI. Fixture boleh berubah tanpa
 * membuat uji ini rapuh.
 */
import { describe, it, expect } from 'vitest';
import { buildKasHadiranPDF } from './generateKasHadiranPDF';
import { hitungSaldoHadiran } from './utils';
import type { Tarikan } from './types';
import { teksPdf } from './pdfTeksUji';

const tarikan = (n: number, terkumpul: number): Tarikan => ({
  id: `t${n}`, nomor: n, tanggal: `2026-0${n}-10`, jumlah_per_orang: 50_000,
  total_hadir: 60, total_warga: 69, sohibul_bait_id: `w${n}`, status: 'selesai',
  total_terkumpul: terkumpul, created_at: `2026-0${n}-10T00:00:00Z`,
  sohibul_bait: { id: `w${n}`, nama: `Warga ${n}` } as Tarikan['sohibul_bait'],
});

const LIST: Tarikan[] = [tarikan(1, 3_000_000), tarikan(2, 3_450_000), tarikan(3, 2_900_000)];
const TALANGAN = { t1: { count: 2, total: 100_000 }, t3: { count: 1, total: 50_000 } };
const SETOR = { t1: 1_000_000, t2: 1_500_000 };

const KAS = LIST.reduce((s, t) => s + t.total_terkumpul, 0);
const TAL = Object.values(TALANGAN).reduce((s, v) => s + v.total, 0);
const SET = Object.values(SETOR).reduce((s, v) => s + v, 0);
const NET = hitungSaldoHadiran(KAS, TAL, SET);
const rp = (n: number) => n.toLocaleString('id-ID');

const konsisten = { totalKasTerkumpul: KAS, totalTalanganBelum: TAL, totalSetor: SET, saldoAktif: NET };

describe('PDF Kas Hadiran — isi dokumen', () => {
  it('mencetak tiap tarikan & sohibulnya', () => {
    const t = teksPdf(buildKasHadiranPDF(LIST, TALANGAN, SETOR, konsisten).doc);
    const gab = t.join(' | ');
    for (const x of LIST) {
      const nama = x.sohibul_bait!.nama;
      /* Fixture WAJIB bermakna dulu: `toContain('')` selalu benar, jadi nama
         kosong membuat pemeriksaan di bawahnya HAMPA — lulus tanpa memeriksa
         apa pun. Ketahuan lewat mutasi (nama dikosongkan → uji tetap hijau). */
      expect(nama.length, 'fixture cacat: nama sohibul kosong').toBeGreaterThan(2);
      expect(gab, `Sohibul tarikan #${x.nomor} hilang dari kertas`).toContain(nama);
    }
    /* Populasi: kalau tabel kosong, pemeriksaan di atas bisa lulus tanpa isi. */
    expect(t.length, 'terlalu sedikit string — tabel kemungkinan kosong').toBeGreaterThan(40);
  });

  it('KAKI TABEL & RINGKASAN menyebut angka yang SAMA', () => {
    const t = teksPdf(buildKasHadiranPDF(LIST, TALANGAN, SETOR, konsisten).doc);
    /* Dipatok DUA KALI, karena dokumen memang mencetaknya dua kali dari dua
       sumber: kaki TABEL tanpa prefiks (`3.000.000`), ringkasan dgn prefiks
       (`Rp3.000.000`). Menuntut keduanya ada = menuntut keduanya SEPAKAT.
       Kesamaan PERSIS + tanda; substring buta tanda (`"150.000"` cocok di
       dalam `"-150.000"`). */
    for (const [nama, kaki, ringkas] of [
      ['kas terkumpul', rp(KAS), `Rp${rp(KAS)}`],
      ['talangan', `-${rp(TAL)}`, `-Rp${rp(TAL)}`],
      ['setor', `-${rp(SET)}`, `-Rp${rp(SET)}`],
      ['saldo bersih', rp(NET), `Rp${rp(NET)}`],
    ] as const) {
      expect(t, `${nama}: kaki tabel harus "${kaki}"`).toContain(kaki);
      expect(t, `${nama}: ringkasan harus "${ringkas}"`).toContain(ringkas);
    }
  });

  it('PENJAGA BERGIGI: stats yang menyimpang membuat SATU halaman menyebut DUA angka berbeda', () => {
    /* Bukan menguji app — membuktikan uji di atas bisa merah. Generator tak
       pernah merekonsiliasi keduanya, jadi angka pemanggil ikut tercetak
       berdampingan dgn angka kaki tabel yang benar. */
    const menyimpang = { ...konsisten, totalKasTerkumpul: 77_000_000 };
    const t = teksPdf(buildKasHadiranPDF(LIST, TALANGAN, SETOR, menyimpang).doc);
    expect(t).toContain('Rp77.000.000');   // ringkasan (pemanggil)
    expect(t).toContain(rp(KAS));          // kaki tabel (generator) — DUA angka, satu halaman
  });
});
