import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Jebakan Supabase yang paling mahal di app ini: `.select()` TIDAK melempar saat
 * gagal — ia mengembalikan `{data: null, error}`.
 *
 * Editor absensi mengawali SEMUA anggota sebagai 'tidak_hadir' lalu menimpanya
 * dengan baris yang terbaca. Kalau helper ini menelan error dan mengembalikan
 * peta kosong, layar tampil "semua tidak hadir" — tak bisa dibedakan dari
 * tarikan yang memang nihil — dan satu tap Simpan menuliskan talangan Rp50.000
 * ke ~79 warga sekaligus.
 *
 * Test pertama di bawah adalah penjaganya. Buang `if (error) throw error` di
 * absensiTersimpan.ts dan HANYA test itu yang gagal — itu bukti ia menguji
 * aturannya, bukan sekadar ikut hijau.
 */

type Res = { data: unknown; error: unknown };
let jawaban: Res = { data: [], error: null };
let jejak: { tabel: string; kolom?: string; filter?: [string, unknown] }[] = [];

function builder(tabel: string) {
  const rekam: { tabel: string; kolom?: string; filter?: [string, unknown] } = { tabel };
  jejak.push(rekam);
  const b: Record<string, unknown> = {};
  b.select = (kolom: string) => { rekam.kolom = kolom; return b; };
  b.eq = (k: string, v: unknown) => { rekam.filter = [k, v]; return b; };
  b.then = (resolve: (v: Res) => unknown) => Promise.resolve(jawaban).then(resolve);
  return b;
}

vi.mock('./supabase', () => ({ supabase: { from: (t: string) => builder(t) } }));

const { fetchAbsensiTersimpan } = await import('./absensiTersimpan');

beforeEach(() => { jejak = []; jawaban = { data: [], error: null }; });

describe('fetchAbsensiTersimpan — gagal baca tak boleh menyamar jadi "semua tidak hadir"', () => {
  it('MELEMPAR saat Supabase mengembalikan error (bukan peta kosong)', async () => {
    jawaban = { data: null, error: { message: 'network' } };
    await expect(fetchAbsensiTersimpan('t1')).rejects.toBeTruthy();
  });

  it('membedakan gagal dari tarikan yang memang nihil absensi', async () => {
    jawaban = { data: [], error: null };
    await expect(fetchAbsensiTersimpan('t1')).resolves.toEqual({});
  });

  it('memetakan warga_id → status apa adanya, termasuk titip', async () => {
    jawaban = {
      data: [
        { warga_id: 'w1', status: 'hadir' },
        { warga_id: 'w2', status: 'titip' },
        { warga_id: 'w3', status: 'tidak_hadir' },
      ],
      error: null,
    };
    await expect(fetchAbsensiTersimpan('t1')).resolves.toEqual({
      w1: 'hadir', w2: 'titip', w3: 'tidak_hadir',
    });
  });

  it('data null tanpa error tetap aman (peta kosong, tidak meledak)', async () => {
    jawaban = { data: null, error: null };
    await expect(fetchAbsensiTersimpan('t1')).resolves.toEqual({});
  });

  it('membaca tabel absensi dan menyaring tepat pada tarikan yang diminta', async () => {
    await fetchAbsensiTersimpan('t-77');
    expect(jejak).toHaveLength(1);
    expect(jejak[0].tabel).toBe('absensi');
    expect(jejak[0].filter).toEqual(['tarikan_id', 't-77']);
  });
});
