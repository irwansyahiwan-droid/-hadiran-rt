import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `restoreBackup` adalah operasi paling merusak di app ini: HAPUS TOTAL seluruh
 * data operasional, lalu tulis ulang dari file. Tak ada undo.
 *
 * SEJAK 4 Agu 2026 jalur itu pindah ke RPC `pulihkan_backup()` (satu transaksi
 * plpgsql). Berkas ini dulu mengunci URUTAN hapus/tulis dan potongan 500 baris —
 * dua hal yang kini tinggal di SQL, tak bisa lagi dilihat dari sini, dan tak
 * boleh dipalsukan dgn mock seolah masih ada di TypeScript. Uji yang dulu
 * "hijau" untuk urutan sekarang berbahaya: ia akan tetap hijau walau atomisitas
 * hilang. Diganti dgn invarian yang MASIH nyata di sisi klien:
 *
 *  1. TEPAT SATU panggilan RPC yang membawa SELURUH file. Ini definisi atomik
 *     di sisi klien — begitu ada yang memecahnya jadi per-tabel "supaya bisa
 *     progress bar", satu transaksi hilang tanpa suara.
 *  2. NOL tulisan langsung ke tabel. Regresi paling mungkin adalah orang
 *     mengembalikan loop delete/insert lama karena terlihat lebih sederhana.
 *  3. `.rpc()` ikut jebakan `.select()`: gagal TIDAK melempar, ia mengembalikan
 *     `{data:null, error}`. Tiap kegagalan wajib MELEDAK — restore yang pulang
 *     diam-diam adalah kehilangan data tanpa jejak.
 *  4. Hasil yang bukan daftar = tak ada ringkasan; melaporkannya sukses berarti
 *     bilang "pulih" tanpa tahu apa pun.
 *  5. `validasiBackup` tetap penjaga terakhir sebelum penghapusan total.
 *  6. Urutan `TABEL_BACKUP` dikunci — ia wajib sama dgn `v_tables` di migrasi.
 *
 * `downloadBackup` TIDAK diuji di sini: ia murni DOM (Blob + <a download>), dan
 * suite ini berjalan di environment node. Yang berisiko bukan bagian itu.
 */
type Res = { data: unknown; error: unknown };
type Op = { tabel: string; jenis: 'select' | 'delete' | 'insert' };
type Rpc = { fn: string; args: Record<string, unknown> };

let ops: Op[] = [];
let rpcs: Rpc[] = [];
let dataPer: Record<string, unknown[]> = {};
let errPer: Record<string, Partial<Record<'select' | 'delete' | 'insert', unknown>>> = {};
let rpcRes: Res = { data: [], error: null };

function builder(t: string): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  const balas = (jenis: 'select' | 'delete' | 'insert') => {
    ops.push({ tabel: t, jenis });
    const error = errPer[t]?.[jenis] ?? null;
    const res: Res = { data: jenis === 'select' ? (dataPer[t] ?? []) : null, error };
    return { then: (r: (v: Res) => unknown) => Promise.resolve(res).then(r) };
  };
  b.select = () => balas('select');
  b.delete = () => ({ not: () => balas('delete') });
  b.insert = () => balas('insert');
  return b;
}

vi.mock('./supabase', () => ({
  supabase: {
    from: (t: string) => builder(t),
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcs.push({ fn, args });
      return { then: (r: (v: Res) => unknown) => Promise.resolve(rpcRes).then(r) };
    },
  },
}));

const { fetchBackup, restoreBackup, validasiBackup, ringkasBackup, TABEL_BACKUP } = await import('./backup');

const URUT_INSERT = ['warga', 'tarikan', 'absensi', 'talangan', 'transaksi_kas', 'kas_rt', 'pengaturan'];
const file = (tables: Record<string, Record<string, unknown>[]> = {}) =>
  ({ app: 'hadiran-rt' as const, version: 1 as const, exportedAt: '2026-08-04T00:00:00.000Z', tables });

beforeEach(() => { ops = []; rpcs = []; dataPer = {}; errPer = {}; rpcRes = { data: [], error: null }; });

describe('restoreBackup — atomik: satu transaksi, bukan 14 request', () => {
  it('memanggil RPC pulihkan_backup TEPAT sekali', async () => {
    await restoreBackup(file({ warga: [{ id: 1 }], absensi: [{ id: 2 }] }));
    expect(rpcs).toHaveLength(1);
    expect(rpcs[0].fn).toBe('pulihkan_backup');
  });

  it('mengirim SELURUH file apa adanya — bukan per tabel', async () => {
    const b = file({ warga: [{ id: 1 }, { id: 2 }], kas_rt: [{ id: 9 }] });
    await restoreBackup(b);
    expect(rpcs[0].args.p_backup).toBe(b);
  });

  it('TIDAK menghapus atau menulis tabel langsung dari klien', async () => {
    await restoreBackup(file(Object.fromEntries(URUT_INSERT.map((t) => [t, [{ id: 1 }]]))));
    expect(ops.filter((o) => o.jenis === 'delete')).toHaveLength(0);
    expect(ops.filter((o) => o.jenis === 'insert')).toHaveLength(0);
  });

  it('audit_log tidak ikut dikirim untuk dihapus/ditulis — ia append-only', async () => {
    await restoreBackup(file({ audit_log: [{ id: 1 }] }));
    expect(ops.some((o) => o.tabel === 'audit_log')).toBe(false);
  });

  it('meneruskan ringkasan per tabel dari database, bukan menghitung ulang di klien', async () => {
    rpcRes = { data: [{ table: 'warga', count: 69 }, { table: 'kas_rt', count: 4 }], error: null };
    const hasil = await restoreBackup(file({ warga: [{ id: 1 }] }));
    expect(hasil).toEqual([{ table: 'warga', count: 69 }, { table: 'kas_rt', count: 4 }]);
  });
});

describe('urutan tabel = kontrak dgn migrasi SQL', () => {
  it('TABEL_BACKUP induk→anak persis seperti v_tables di pulihkan_backup()', () => {
    // Kalau uji ini gagal, migrasi 20260804000000_restore_atomik.sql WAJIB ikut
    // diubah di baris `v_tables` — kalau tidak, hapus/tulis melanggar FK.
    expect([...TABEL_BACKUP]).toEqual(URUT_INSERT);
  });
});

describe('kegagalan wajib MELEDAK, bukan pulang diam-diam', () => {
  it('RPC mengembalikan error → melempar (gagal TIDAK melempar sendiri)', async () => {
    rpcRes = { data: null, error: { message: 'deadlock terdeteksi' } };
    await expect(restoreBackup(file({ warga: [{ id: 1 }] }))).rejects.toThrow(/deadlock terdeteksi/);
  });

  it('pesan galat database ikut terbawa, tidak ditelan jadi kalimat umum', async () => {
    rpcRes = { data: null, error: { message: 'Hanya bendahara yang boleh memulihkan backup' } };
    await expect(restoreBackup(file())).rejects.toThrow(/Hanya bendahara/);
  });

  it('hasil BUKAN daftar (null / objek) → melempar, jangan lapor "pulih"', async () => {
    for (const jelek of [null, undefined, { ok: true }, 'sukses']) {
      rpcRes = { data: jelek, error: null };
      await expect(restoreBackup(file({ warga: [{ id: 1 }] }))).rejects.toThrow(/ringkasan/);
    }
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
