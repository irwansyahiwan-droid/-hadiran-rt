/**
 * Penjaga ISI PDF Rincian Pendapatan satu tarikan.
 *
 * Dokumen ini yang menjelaskan ke warga BERAPA yang diterima Sohibul Bait dan
 * dari siapa saja — jadi invariannya soal POPULASI, bukan cuma angka: setiap
 * anggota WAJIB masuk tepat satu golongan (hadir · titip · talangan lunas ·
 * talangan belum), dan Sohibul Bait dikecualikan dari semuanya (ia penerima,
 * bukan pembayar — aturan yang sama dipakai `ringkasAbsensi`).
 *
 * Kalau golongan-golongan itu tak menjumlah ke jumlah pembayar, ada nama yang
 * hilang dari rincian sementara uangnya tetap dihitung.
 */
import { describe, it, expect } from 'vitest';
import { buildPendapatanPDF } from './generatePendapatanPDF';
import { teksPdf, angkaSesudah } from './pdfTeksUji';
import type { Tarikan, Warga, AbsensiStatus } from './types';

const w = (i: number): Warga => ({
  id: `w${i}`, nama: `Warga ${i}`, no_rumah: `A${i}`, no_hp: '08123',
  role: 'warga', status_aktif: true, created_at: '2026-01-01T00:00:00Z',
});

const TARIKAN = {
  id: 't1', nomor: 18, tanggal: '2026-08-28', jumlah_per_orang: 50_000,
  total_hadir: 3, total_warga: 6, sohibul_bait_id: 'w0', status: 'selesai',
  total_terkumpul: 250_000, created_at: '2026-08-28T00:00:00Z',
  sohibul_bait: { id: 'w0', nama: 'Karta Saleh' },
} as unknown as Tarikan;

/* w0 = Sohibul Bait (dikecualikan). Lima pembayar: 2 hadir · 1 titip ·
   1 talangan lunas · 1 talangan belum. */
const WARGA: Warga[] = [{ ...w(0), nama: 'Karta Saleh' }, w(1), w(2), w(3), w(4), w(5)];
const ABSENSI: Record<string, AbsensiStatus> = {
  w1: 'hadir', w2: 'hadir', w3: 'titip', w4: 'tidak_hadir', w5: 'tidak_hadir',
};
const LUNAS = new Set(['w4']);
const build = () => teksPdf(buildPendapatanPDF(TARIKAN, WARGA, ABSENSI, LUNAS).doc);

describe('PDF Rincian Pendapatan — isi dokumen', () => {
  it('mencetak setiap PEMBAYAR, dan Sohibul Bait tetap disebut sbg penerima', () => {
    const teks = build();
    for (const x of WARGA.filter((p) => p.id !== TARIKAN.sohibul_bait_id)) {
      expect(x.nama.length, 'fixture cacat: nama kosong').toBeGreaterThan(2);
      expect(teks, `"${x.nama}" hilang dari rincian pendapatan`).toContain(x.nama);
    }
    expect(teks, 'Sohibul Bait tak disebut').toContain('Karta Saleh');
    expect(teks.length, 'terlalu sedikit string — tabel kemungkinan kosong').toBeGreaterThan(30);
  });

  it('REKONSILIASI: strip Total Anggota sama dengan seluruh warga', () => {
    const teks = build();
    expect(teks, 'label strip hilang').toContain('TOTAL ANGGOTA');
    expect(angkaSesudah(teks, 'TOTAL ANGGOTA'), 'Total Anggota ≠ jumlah warga').toBe(WARGA.length);
  });

  it('POPULASI: golongan yang DICETAK menjumlah ke seluruh pembayar', () => {
    /* Dibaca dari DOKUMEN, bukan dihitung ulang dari fixture — versi pertama
       uji ini hanya menjumlah fixture-nya sendiri, jadi ia tautologi yang tak
       bisa menangkap cacat generator apa pun. */
    const teks = build();
    const berapa = (label: string) => teks.filter((x) => x === label).length;
    const pembayar = WARGA.length - 1;                       // Sohibul dikecualikan
    const titip = berapa('Titip');
    const lunas = berapa('Lunas');
    const belum = berapa('Talangan');
    /* Baris HADIR sengaja bersel status KOSONG, jadi ia dihitung sbg sisa —
       dan barisnya sendiri sudah dipastikan ada lewat nama di uji pertama. */
    const hadir = pembayar - (titip + lunas + belum);

    expect(berapa('SOHIBUL BAIT'), 'Sohibul Bait harus muncul TEPAT sekali').toBe(1);
    expect(titip, 'baris Titip di kertas ≠ data').toBe(WARGA.filter((p) => ABSENSI[p.id] === 'titip').length);
    expect(lunas, 'baris Lunas di kertas ≠ data').toBe(WARGA.filter((p) => ABSENSI[p.id] === 'tidak_hadir' && LUNAS.has(p.id)).length);
    expect(belum, 'baris Talangan di kertas ≠ data').toBe(WARGA.filter((p) => ABSENSI[p.id] === 'tidak_hadir' && !LUNAS.has(p.id)).length);
    expect(hadir, 'sisa baris hadir tak masuk akal — ada golongan yang bocor').toBe(
      WARGA.filter((p) => p.id !== TARIKAN.sohibul_bait_id && ABSENSI[p.id] === 'hadir').length,
    );
    /* Penomoran baris WAJIB sampai ke orang terakhir: sohibul + seluruh
       pembayar. Kalau ada yang tak dirender, nomor terakhir tak pernah tercetak. */
    expect(teks, `baris ke-${WARGA.length} tak pernah dicetak — ada nama yang hilang`).toContain(String(WARGA.length));
  });
});
