import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Saldo berjalan Kas RT (`saldo_setelah` tiap baris) — dihitung ulang tiap kali
 * transaksi ditambah/diubah/dihapus. Angka ini tampil di kolom "Saldo:" tiap
 * baris mutasi DAN ikut ke Ekspor Excel, jadi ia bagian dari buku kas yang
 * dipertanggungjawabkan.
 *
 * Dua hal yang dikunci di sini:
 *  1. RUMUSNYA — kronologis, masuk menambah & keluar mengurangi, dan hanya baris
 *     yang benar-benar berubah yang ditulis ulang (hemat write, dan bukti bahwa
 *     baris yang sudah benar tidak disentuh).
 *  2. KEGAGALAN TIDAK BOLEH DIAM — Supabase memulangkan `{ data: null, error }`,
 *     tidak melempar. Sebelum uji ini, error select & update sama-sama diabaikan
 *     sehingga fungsi pulang normal seolah sukses, lalu UI memasang toast
 *     "tersimpan" di atas saldo yang basi. Pola jaring yang sama dengan
 *     anggota.test.ts (recomputeTarikan).
 */

type Res = { data: unknown; error: unknown };

let baris: Res = { data: [], error: null };
/* UPDATE yang berhasil kini mengembalikan BARIS-nya: jalur tulis memakai
   `.select('id')` supaya "berhasil, 0 baris" bisa dibedakan dari "berhasil,
   1 baris" — tanpa itu keduanya sama-sama 204 kosong (lihat lib/tulisAman.ts). */
let updateRes: Res = { data: [{ id: 'ok' }], error: null };
/** Rekam tiap UPDATE: [id, saldo_setelah] — untuk membuktikan baris mana saja yang ditulis. */
let ditulis: [string, number][] = [];

function builder(): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  let idTerakhir = '';
  let saldoTerakhir = 0;
  b.select = () => b;
  b.order = () => b;
  b.update = (v: { saldo_setelah: number }) => { saldoTerakhir = v.saldo_setelah; return b; };
  b.eq = (_k: string, v: string) => { idTerakhir = v; return b; };
  b.then = (resolve: (v: Res) => unknown) => {
    // `update(...).eq(...)` → tulis; selain itu = select daftar baris.
    if (idTerakhir) {
      ditulis.push([idTerakhir, saldoTerakhir]);
      return Promise.resolve(updateRes).then(resolve);
    }
    return Promise.resolve(baris).then(resolve);
  };
  return b;
}

vi.mock('./supabase', () => ({ supabase: { from: () => builder() } }));

const { recomputeKasRTSaldo } = await import('./kasRt');

const row = (id: string, tipe: 'masuk' | 'keluar', nominal: number, saldo_setelah: number) =>
  ({ id, tipe, nominal, saldo_setelah });

beforeEach(() => {
  baris = { data: [], error: null };
  updateRes = { data: [{ id: 'ok' }], error: null };
  ditulis = [];
});

describe('recomputeKasRTSaldo — rumus saldo berjalan', () => {
  it('masuk menambah, keluar mengurangi, kronologis', async () => {
    baris = { data: [
      row('a', 'masuk', 1_000_000, 0),
      row('b', 'keluar', 250_000, 0),
      row('c', 'masuk', 500_000, 0),
    ], error: null };
    await recomputeKasRTSaldo();
    expect(ditulis).toEqual([['a', 1_000_000], ['b', 750_000], ['c', 1_250_000]]);
  });

  it('baris yang saldonya SUDAH benar tidak ditulis ulang', async () => {
    baris = { data: [
      row('a', 'masuk', 1_000_000, 1_000_000),   // sudah benar
      row('b', 'keluar', 250_000, 999),          // salah → harus ditulis
      row('c', 'masuk', 500_000, 1_250_000),     // sudah benar
    ], error: null };
    await recomputeKasRTSaldo();
    expect(ditulis).toEqual([['b', 750_000]]);
  });

  it('saldo boleh menembus nol (pengeluaran mendahului pemasukan)', async () => {
    baris = { data: [row('a', 'keluar', 300_000, 0), row('b', 'masuk', 100_000, 0)], error: null };
    await recomputeKasRTSaldo();
    expect(ditulis).toEqual([['a', -300_000], ['b', -200_000]]);
  });

  it('tanpa baris sama sekali: tak menulis apa pun, tak melempar', async () => {
    baris = { data: [], error: null };
    await expect(recomputeKasRTSaldo()).resolves.toBeUndefined();
    expect(ditulis).toEqual([]);
  });
});

describe('recomputeKasRTSaldo — kegagalan tidak boleh diam', () => {
  it('melempar saat SELECT daftar baris gagal', async () => {
    baris = { data: null, error: { message: 'select kas_rt 500' } };
    await expect(recomputeKasRTSaldo()).rejects.toBeTruthy();
  });

  it('melempar saat UPDATE saldo ditolak (mis. policy RLS belum aktif)', async () => {
    baris = { data: [row('a', 'masuk', 1_000_000, 0)], error: null };
    updateRes = { data: null, error: { message: 'update kas_rt ditolak' } };
    await expect(recomputeKasRTSaldo()).rejects.toBeTruthy();
  });

  /* Kegagalan yang PALING diam: server menjawab SUKSES tapi tak ada baris yang
     cocok. Itu jawaban asli PostgREST saat barisnya sudah dihapus/diubah admin
     lain, atau saat policy RLS hilang — dan tanpa `.select()` balasannya 204
     kosong, byte per byte identik dgn tulis yang berhasil. Di loop saldo
     akibatnya paling jahat: sebagian baris tersimpan, sisanya tidak, dan saldo
     berjalan jadi tak konsisten tanpa satu pun galat muncul. */
  it('melempar saat UPDATE SUKSES tapi mengubah NOL baris', async () => {
    baris = { data: [row('a', 'masuk', 1_000_000, 0)], error: null };
    updateRes = { data: [], error: null };
    await expect(recomputeKasRTSaldo()).rejects.toThrow(/tak ada baris yang berubah/i);
  });

  it('berhenti di kegagalan pertama — tak melanjutkan menulis baris berikutnya', async () => {
    baris = { data: [row('a', 'masuk', 1_000, 0), row('b', 'masuk', 2_000, 0)], error: null };
    updateRes = { data: null, error: { message: 'ditolak' } };
    await expect(recomputeKasRTSaldo()).rejects.toBeTruthy();
    expect(ditulis).toHaveLength(1);
  });
});
