import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `restoreBackup` adalah operasi paling merusak di app ini: HAPUS TOTAL seluruh
 * data operasional, lalu tulis ulang dari file. Tak ada undo. Yang dikunci di
 * sini bukan "fungsinya jalan", tapi hal-hal yang kalau rusak menghasilkan
 * kerusakan SENYAP:
 *
 *  1. URUTAN. Hapus wajib anak→induk dan tulis wajib induk→anak. Kalau salah
 *     arah, foreign key menolak di tengah jalan — dan saat itu data lama SUDAH
 *     terhapus sebagian. Ini satu-satunya aturan di berkas ini yang kegagalannya
 *     tak bisa diperbaiki dengan mengulang.
 *  2. `pengaturan` dikunci kolom `key`, tabel lain `id`. Salah kolom = filter
 *     tak cocok, tabelnya tak pernah benar-benar dikosongkan, lalu insert
 *     menabrak baris lama.
 *  3. Tiap kegagalan wajib DILEMPAR dengan menyebut tabelnya. Restore yang
 *     gagal separuh dan pulang diam-diam adalah kehilangan data tanpa jejak.
 *  4. `validasiBackup` adalah satu-satunya penjaga sebelum penghapusan total.
 *     File asing yang lolos = seluruh kas RT terhapus.
 *  5. Potongan 500 baris: kalau pemotongannya salah, sebagian baris hilang tanpa
 *     error apa pun — 69 anggota tak akan menyentuhnya, tapi absensi/talangan
 *     yang menumpuk bertahun-tahun bisa.
 *
 * `downloadBackup` TIDAK diuji di sini: ia murni DOM (Blob + <a download>), dan
 * suite ini berjalan di environment node. Yang berisiko bukan bagian itu.
 */

type Res = { data: unknown; error: unknown };
type Op = { tabel: string; jenis: 'select' | 'delete' | 'insert'; kunci?: string; n?: number };

let ops: Op[] = [];
let dataPer: Record<string, unknown[]> = {};
let errPer: Record<string, Partial<Record<'select' | 'delete' | 'insert', unknown>>> = {};

function builder(t: string): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  const balas = (jenis: 'select' | 'delete' | 'insert', extra: Partial<Op> = {}) => {
    ops.push({ tabel: t, jenis, ...extra });
    const error = errPer[t]?.[jenis] ?? null;
    const res: Res = { data: jenis === 'select' ? (dataPer[t] ?? []) : null, error };
    return { then: (r: (v: Res) => unknown) => Promise.resolve(res).then(r) };
  };
  b.select = () => balas('select');
  b.delete = () => ({ not: (kunci: string) => balas('delete', { kunci }) });
  b.insert = (rows: unknown[]) => balas('insert', { n: rows.length });
  return b;
}

vi.mock('./supabase', () => ({ supabase: { from: (t: string) => builder(t) } }));

const { fetchBackup, restoreBackup, validasiBackup, ringkasBackup } = await import('./backup');

const URUT_INSERT = ['warga', 'tarikan', 'absensi', 'talangan', 'transaksi_kas', 'kas_rt', 'pengaturan'];
const file = (tables: Record<string, Record<string, unknown>[]> = {}) =>
  ({ app: 'hadiran-rt' as const, version: 1 as const, exportedAt: '2026-08-04T00:00:00.000Z', tables });

beforeEach(() => { ops = []; dataPer = {}; errPer = {}; });

describe('restoreBackup — urutan, satu-satunya kesalahan yang tak bisa diulang', () => {
  it('menghapus ANAK dulu baru induk (kebalikan urutan tulis)', async () => {
    await restoreBackup(file());
    const urutHapus = ops.filter((o) => o.jenis === 'delete').map((o) => o.tabel);
    expect(urutHapus).toEqual([...URUT_INSERT].reverse());
  });

  it('menulis INDUK dulu baru anak', async () => {
    await restoreBackup(file(Object.fromEntries(URUT_INSERT.map((t) => [t, [{ id: 1 }]]))));
    const urutTulis = ops.filter((o) => o.jenis === 'insert').map((o) => o.tabel);
    expect(urutTulis).toEqual(URUT_INSERT);
  });

  it('SEMUA penghapusan selesai sebelum penulisan pertama', async () => {
    await restoreBackup(file({ warga: [{ id: 1 }] }));
    const hapusTerakhir = ops.map((o) => o.jenis).lastIndexOf('delete');
    const tulisPertama = ops.map((o) => o.jenis).indexOf('insert');
    expect(tulisPertama).toBeGreaterThan(hapusTerakhir);
  });

  it('`pengaturan` dikunci kolom `key`, tabel lain `id`', async () => {
    await restoreBackup(file());
    const kunci = Object.fromEntries(ops.filter((o) => o.jenis === 'delete').map((o) => [o.tabel, o.kunci]));
    expect(kunci.pengaturan).toBe('key');
    expect(kunci.warga).toBe('id');
    expect(kunci.transaksi_kas).toBe('id');
  });

  it('audit_log tidak ikut dihapus maupun ditulis — ia append-only', async () => {
    await restoreBackup(file({ audit_log: [{ id: 1 }] }));
    expect(ops.some((o) => o.tabel === 'audit_log')).toBe(false);
  });
});

describe('restoreBackup — potongan 500 baris', () => {
  it('1200 baris jadi 3 potongan 500/500/200, bukan satu tembakan', async () => {
    const rows = Array.from({ length: 1200 }, (_, i) => ({ id: i }));
    await restoreBackup(file({ absensi: rows }));
    const potongan = ops.filter((o) => o.jenis === 'insert' && o.tabel === 'absensi').map((o) => o.n);
    expect(potongan).toEqual([500, 500, 200]);
    expect(potongan.reduce((a, b) => a! + b!, 0)).toBe(1200);
  });

  it('tepat 500 baris = satu potongan, tidak menyisakan panggilan kosong', async () => {
    await restoreBackup(file({ absensi: Array.from({ length: 500 }, (_, i) => ({ id: i })) }));
    expect(ops.filter((o) => o.jenis === 'insert' && o.tabel === 'absensi').map((o) => o.n)).toEqual([500]);
  });

  it('tabel kosong tidak memanggil insert sama sekali, tapi tetap dilaporkan 0', async () => {
    const hasil = await restoreBackup(file({ warga: [] }));
    expect(ops.some((o) => o.jenis === 'insert')).toBe(false);
    expect(hasil).toContainEqual({ table: 'warga', count: 0 });
  });

  it('ringkasan mengembalikan jumlah baris per tabel', async () => {
    const hasil = await restoreBackup(file({ warga: [{ id: 1 }, { id: 2 }], tarikan: [{ id: 9 }] }));
    expect(hasil).toContainEqual({ table: 'warga', count: 2 });
    expect(hasil).toContainEqual({ table: 'tarikan', count: 1 });
  });
});

describe('kegagalan wajib MELEDAK, bukan pulang diam-diam', () => {
  it('penghapusan gagal → melempar & menyebut tabelnya', async () => {
    errPer = { talangan: { delete: { message: 'FK' } } };
    await expect(restoreBackup(file())).rejects.toThrow(/talangan/);
  });

  it('penghapusan gagal → penulisan TIDAK ikut dijalankan', async () => {
    errPer = { kas_rt: { delete: { message: 'FK' } } };
    await restoreBackup(file({ warga: [{ id: 1 }] })).catch(() => {});
    expect(ops.some((o) => o.jenis === 'insert')).toBe(false);
  });

  it('penulisan gagal → melempar & menyebut tabelnya', async () => {
    errPer = { warga: { insert: { message: 'duplikat' } } };
    await expect(restoreBackup(file({ warga: [{ id: 1 }] }))).rejects.toThrow(/warga/);
  });

  it('fetchBackup: satu tabel gagal dibaca → melempar, bukan backup separuh isi', async () => {
    errPer = { tarikan: { select: { message: 'timeout' } } };
    await expect(fetchBackup()).rejects.toThrow(/tarikan/);
  });

  it('fetchBackup: mengambil KETUJUH tabel dan menandai app+versi', async () => {
    dataPer = { warga: [{ id: 1 }] };
    const b = await fetchBackup();
    expect(ops.filter((o) => o.jenis === 'select').map((o) => o.tabel)).toEqual(URUT_INSERT);
    expect(b.app).toBe('hadiran-rt');
    expect(b.version).toBe(1);
    expect(b.tables.warga).toHaveLength(1);
    expect(b.tables.tarikan).toEqual([]); // data null → array kosong, bukan undefined
  });
});

describe('validasiBackup — penjaga terakhir sebelum penghapusan total', () => {
  it('file app lain ditolak', () => {
    expect(() => validasiBackup({ app: 'app-lain', tables: {} })).toThrow();
  });
  it('tanpa `tables` ditolak', () => {
    expect(() => validasiBackup({ app: 'hadiran-rt' })).toThrow();
  });
  it('null / string / angka ditolak', () => {
    for (const jelek of [null, undefined, 'bukan objek', 42, []]) {
      expect(() => validasiBackup(jelek)).toThrow();
    }
  });
  it('file sah diloloskan apa adanya', () => {
    const b = file({ warga: [] });
    expect(validasiBackup(b)).toBe(b);
  });
});

describe('ringkasBackup', () => {
  it('mencacah ketujuh tabel; yang hilang dihitung 0, bukan dilewati', () => {
    const r = ringkasBackup(file({ warga: [{ id: 1 }, { id: 2 }] }));
    expect(r.map((x) => x.table)).toEqual(URUT_INSERT);
    expect(r.find((x) => x.table === 'warga')!.count).toBe(2);
    expect(r.find((x) => x.table === 'kas_rt')!.count).toBe(0);
  });
});
