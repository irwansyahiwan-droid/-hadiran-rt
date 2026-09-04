/**
 * Penjaga ISI PDF Daftar Hadir — dokumen absensi bertanda tangan.
 *
 * Invariannya INTERNAL, seperti Kas Hadiran: dokumen menyebut jumlah yang sama
 * dua kali — strip statistik di atas, dan baris tabel di bawah. Kalau keduanya
 * berselisih, daftar hadir bertanda tangan membantah dirinya sendiri.
 *
 * CELAH TITIP — DITEMUKAN, DIPATOK, LALU DITUTUP (4 Sep 2026). Strip dulu hanya
 * menyebut HADIR · TIDAK HADIR · TALANGAN LUNAS, sementara status TITIP ada di
 * tabel DAN ikut "Total Anggota Tercatat". Terukur dgn 5 hadir/1 titip/2 tidak:
 * strip berbunyi 5 dan 2, kaki berbunyi 8 — orang ke-8 tak disebut di ringkasan
 * mana pun. Layar app sudah lama menampilkan Titip sbg stat sendiri; kertasnya
 * yang tertinggal.
 *
 * Alurnya sengaja dua langkah: celah dipatok dulu sbg uji (supaya tak bergeser
 * diam-diam), keputusan menambah kolom diambil user, BARU diubah. Waktu kolom
 * Titip dipasang, uji ketiga langsung merah dgn pesan "perbarui catatan" —
 * penjaga yang memberi tahu bahwa keputusan sudah diambil, persis maksudnya.
 * Kini uji itu menuntut REKONSILIASI PENUH: Hadir + Titip + Tidak = Total.
 */
import { describe, it, expect } from 'vitest';
import { buildAbsensiPDF } from './generateAbsensiPDF';
import type { Tarikan } from './types';

function teksPdf(doc: unknown): string[] {
  const pages = (doc as { internal: { pages: string[][] } }).internal.pages;
  const isi = pages.flat().filter(Boolean).join('\n');
  const out: string[] = [];
  const re = /\(((?:\\.|[^()\\])*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(isi))) out.push(m[1].replace(/\\([()\\])/g, '$1'));
  return out;
}

const TARIKAN = {
  id: 't1', nomor: 18, tanggal: '2026-08-28', jumlah_per_orang: 50_000,
  total_hadir: 5, total_warga: 8, sohibul_bait_id: 'w0', status: 'selesai',
  total_terkumpul: 400_000, created_at: '2026-08-28T00:00:00Z',
  sohibul_bait: { id: 'w0', nama: 'Karta Saleh' },
} as unknown as Tarikan;

const HADIR = [{ nama: 'Ahmad' }, { nama: 'Budi' }, { nama: 'Cecep' }, { nama: 'Dedi' }, { nama: 'Eko' }];
const TIDAK = [{ nama: 'Fajar', lunas: true }, { nama: 'Gilang', lunas: false }];
const TITIP = [{ nama: 'Hendra' }];
const build = () => teksPdf(buildAbsensiPDF(TARIKAN, HADIR, TIDAK, TITIP).doc);

/** Berapa kali sebuah status muncul sbg sel STATUS di tabel. */
const hitungStatus = (t: string[], status: string) => t.filter((x) => x === status).length;

describe('PDF Daftar Hadir — isi dokumen', () => {
  it('mencetak setiap nama beserta statusnya', () => {
    const t = build();
    for (const o of [...HADIR, ...TITIP, ...TIDAK]) {
      expect(o.nama.length, 'fixture cacat: nama kosong').toBeGreaterThan(2);
      expect(t, `"${o.nama}" hilang dari daftar hadir`).toContain(o.nama);
    }
    expect(t, 'Sohibul Bait hilang dari kepala dokumen').toContain(`Jumat, 28 Agustus 2026 · Sohibul Bait: ${TARIKAN.sohibul_bait!.nama}`);
    expect(t.length, 'terlalu sedikit string — tabel kemungkinan kosong').toBeGreaterThan(30);
  });

  it('STRIP STATISTIK sepakat dengan baris tabel', () => {
    const t = build();
    expect(hitungStatus(t, 'Hadir'), 'baris berstatus Hadir').toBe(HADIR.length);
    expect(hitungStatus(t, 'Titip'), 'baris berstatus Titip').toBe(TITIP.length);
    expect(hitungStatus(t, 'Talangan Lunas') + hitungStatus(t, 'Talangan'), 'baris talangan').toBe(TIDAK.length);
    /* Strip mencetak angkanya sbg string tersendiri, tepat SESUDAH labelnya. */
    const angkaSesudah = (label: string) => t[t.indexOf(label) + 1];
    expect(angkaSesudah('HADIR'), 'strip HADIR ≠ baris Hadir').toBe(String(HADIR.length));
    expect(angkaSesudah('TIDAK HADIR'), 'strip TIDAK HADIR ≠ baris talangan').toBe(String(TIDAK.length));
    expect(angkaSesudah('TALANGAN LUNAS'), 'strip TALANGAN LUNAS ≠ baris lunas').toBe(String(TIDAK.filter((x) => x.lunas).length));
  });

  it('REKONSILIASI PENUH: strip menjumlah tepat ke Total Anggota Tercatat', () => {
    const t = build();
    const total = HADIR.length + TITIP.length + TIDAK.length;
    const angkaSesudah = (label: string) => Number(t[t.indexOf(label) + 1]);

    expect(t, 'kaki Total Anggota Tercatat salah/hilang').toContain(`Total Anggota Tercatat: ${total}`);
    expect(t, 'kolom TITIP hilang dari strip — celah rekonsiliasi kembali terbuka').toContain('TITIP');
    expect(angkaSesudah('TITIP'), 'strip TITIP ≠ baris Titip').toBe(TITIP.length);

    /* Inti dokumen ini: ketiga status di strip WAJIB menjumlah tepat ke total
       di kaki. Sebelum kolom Titip ada, 5 + 2 = 7 sementara kaki berbunyi 8 —
       pembaca menemukan satu nama hilang tanpa penjelasan. */
    expect(
      angkaSesudah('HADIR') + angkaSesudah('TITIP') + angkaSesudah('TIDAK HADIR'),
      'strip tak menjumlah ke Total Anggota Tercatat — ada status yang tak diringkas',
    ).toBe(total);
  });
});
