import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AbsensiStatus, Warga } from './types';

/**
 * Jalur tulis PALING MENENTUKAN di app: menutup satu tarikan.
 *
 * Empat tabel ditulis berurutan dan setiap angkanya masuk buku kas. Yang paling
 * mahal bila rusak adalah aturan status lunas: baris talangan DIHAPUS lalu
 * dibuat ulang tiap "Hitung Ulang", jadi kalau status lunas lama tak dibawa,
 * warga yang SUDAH membayar kembali jadi "belum lunas" — dan ditagih dua kali.
 * Aturan itu mustahil terlihat dari layar (butuh tarikan lama + pelunasan lama),
 * jadi di sinilah tempatnya dikunci.
 */

type Res = { data: unknown; error: unknown };
/** Tiap panggilan tabel dicatat: {tabel, aksi, muatan}. */
let jejak: { tabel: string; aksi: string; muatan?: unknown }[] = [];
/** Jawaban per-langkah; kosong = sukses hampa. */
let antrean: Res[] = [];
const ambil = (): Res => antrean.shift() ?? { data: [], error: null };

function builder(tabel: string) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'in']) b[m] = () => b;
  for (const m of ['insert', 'update', 'delete', 'upsert']) {
    b[m] = (muatan?: unknown) => { jejak.push({ tabel, aksi: m, muatan }); return b; };
  }
  b.single = () => Promise.resolve(ambil());
  b.maybeSingle = () => Promise.resolve(ambil());
  b.then = (resolve: (v: Res) => unknown) => Promise.resolve(ambil()).then(resolve);
  return b;
}

vi.mock('./supabase', () => ({ supabase: { from: (t: string) => builder(t) } }));

const { simpanTarikanSelesai } = await import('./simpanTarikan');

const w = (id: string, nama: string): Warga => ({ id, nama, no_rumah: '', no_hp: '', role: 'warga', status_aktif: true, created_at: '' });
// w1 = Sohibul Bait (penerima, bukan pembayar) → 3 pembayar: w2, w3, w4.
const WARGA = [w('w1', 'Sohibul'), w('w2', 'Budi'), w('w3', 'Siti'), w('w4', 'Andi')];
const TARIKAN = { id: 't1', nomor: 7, tanggal: '2026-07-26' };
const SOHIBUL = 'w1';
const MAP: Record<string, AbsensiStatus> = { w1: 'hadir', w2: 'hadir', w3: 'titip', w4: 'tidak_hadir' };

const tulis = (tabel: string, aksi: string) => jejak.filter((j) => j.tabel === tabel && j.aksi === aksi);

beforeEach(() => { jejak = []; antrean = []; });

describe('simpanTarikanSelesai — aturan uang & data', () => {
  it('membawa status lunas lama saat Hitung Ulang (warga tak ditagih dua kali)', async () => {
    // w4 kena talangan DAN sudah pernah lunas 10 Jul.
    antrean = [{ data: [{ warga_id: 'w4', tanggal_lunas: '2026-07-10' }], error: null }];
    await simpanTarikanSelesai(TARIKAN, WARGA, MAP, SOHIBUL);

    const baris = tulis('talangan', 'insert')[0].muatan as Array<Record<string, unknown>>;
    expect(baris).toHaveLength(1);
    expect(baris[0]).toMatchObject({ warga_id: 'w4', status_lunas: true, tanggal_lunas: '2026-07-10' });
  });

  it('yang belum pernah lunas tetap belum lunas (tanggal null)', async () => {
    antrean = [{ data: [], error: null }];
    await simpanTarikanSelesai(TARIKAN, WARGA, MAP, SOHIBUL);
    const baris = tulis('talangan', 'insert')[0].muatan as Array<Record<string, unknown>>;
    expect(baris[0]).toMatchObject({ warga_id: 'w4', status_lunas: false, tanggal_lunas: null });
  });

  it('talangan HANYA untuk pembayar tidak_hadir — titip & hadir bebas, nominal 50.000', async () => {
    antrean = [{ data: [], error: null }];
    await simpanTarikanSelesai(TARIKAN, WARGA, MAP, SOHIBUL);
    const baris = tulis('talangan', 'insert')[0].muatan as Array<Record<string, unknown>>;
    expect(baris.map((b) => b.warga_id)).toEqual(['w4']); // w3 'titip' TIDAK kena
    expect(baris[0].nominal).toBe(50000);
  });

  it('absensi ditulis untuk SEMUA anggota termasuk Sohibul, apa adanya', async () => {
    antrean = [{ data: [], error: null }];
    await simpanTarikanSelesai(TARIKAN, WARGA, MAP, SOHIBUL);
    const baris = tulis('absensi', 'insert')[0].muatan as Array<Record<string, unknown>>;
    expect(baris).toHaveLength(4);
    expect(baris.find((b) => b.warga_id === 'w3')?.status).toBe('titip');
    expect(baris.find((b) => b.warga_id === 'w1')?.status).toBe('hadir');
  });

  it('kas masuk = pembayar × Rp5.000 dan ter-link ke tarikan', async () => {
    antrean = [{ data: [], error: null }];
    await simpanTarikanSelesai(TARIKAN, WARGA, MAP, SOHIBUL);
    const kas = tulis('transaksi_kas', 'insert')[0].muatan as Record<string, unknown>;
    expect(kas).toMatchObject({ tipe: 'kas_masuk', nominal: 3 * 5000, tarikan_id: 't1', tanggal: '2026-07-26' });
  });

  it('ringkasan tarikan: total_hadir hanya PEMBAYAR hadir (Sohibul tak dihitung)', async () => {
    antrean = [{ data: [], error: null }];
    await simpanTarikanSelesai(TARIKAN, WARGA, MAP, SOHIBUL);
    const upd = tulis('tarikan', 'update')[0].muatan as Record<string, unknown>;
    // w1 Sohibul 'hadir' TIDAK ikut; hanya w2 → 1
    expect(upd).toMatchObject({ status: 'selesai', total_hadir: 1, total_terkumpul: 15000 });
  });

  it('baris lama dihapus dulu supaya Hitung Ulang tak menggandakan', async () => {
    antrean = [{ data: [], error: null }];
    await simpanTarikanSelesai(TARIKAN, WARGA, MAP, SOHIBUL);
    for (const t of ['absensi', 'talangan', 'transaksi_kas']) {
      expect(tulis(t, 'delete').length, `${t} harus dihapus dulu`).toBe(1);
      const iHapus = jejak.findIndex((j) => j.tabel === t && j.aksi === 'delete');
      const iTulis = jejak.findIndex((j) => j.tabel === t && j.aksi === 'insert');
      if (iTulis >= 0) expect(iHapus).toBeLessThan(iTulis);
    }
  });

  it('tanpa pembayar sama sekali → tak ada baris kas masuk yang dibuat', async () => {
    antrean = [{ data: [], error: null }];
    await simpanTarikanSelesai(TARIKAN, [w('w1', 'Sohibul')], { w1: 'hadir' }, SOHIBUL);
    expect(tulis('transaksi_kas', 'insert')).toHaveLength(0);
  });

  it('hasil yang dikembalikan cocok dgn yang tersimpan (kartu rincian tak berbohong)', async () => {
    antrean = [{ data: [], error: null }];
    const r = await simpanTarikanSelesai(TARIKAN, WARGA, MAP, SOHIBUL);
    expect(r).toMatchObject({
      tarikanNomor: 7, hadirCount: 1, titipCount: 1, tidakCount: 1,
      kasTotal: 15000, talanganTotal: 50000, tidakHadirNama: ['Andi'],
    });
  });
});

describe('simpanTarikanSelesai — kegagalan tak boleh diam', () => {
  const langkah: [string, number][] = [
    ['baca status lunas', 0],
    ['hapus absensi', 1],
    ['tulis absensi', 2],
    ['hapus talangan', 3],
    ['tulis talangan', 4],
    ['hapus kas masuk', 5],
    ['tulis kas masuk', 6],
    ['perbarui tarikan', 7],
  ];
  for (const [nama, ke] of langkah) {
    it(`melempar saat "${nama}" gagal`, async () => {
      antrean = Array.from({ length: ke }, () => ({ data: [], error: null }));
      antrean.push({ data: null, error: { message: `${nama} gagal` } });
      await expect(simpanTarikanSelesai(TARIKAN, WARGA, MAP, SOHIBUL)).rejects.toBeTruthy();
    });
  }
});
