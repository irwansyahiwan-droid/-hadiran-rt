import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `getTargetKasRT` mengembalikan `null` untuk "target belum diatur". Kalau error
 * query ditelan, koneksi putus juga menghasilkan `null` — dan kedua keadaan itu
 * tak bisa dibedakan pemanggilnya. Layar lalu menawarkan "Tetapkan Target", dan
 * bendahara yang mengisinya meng-UPSERT di atas target lama yang masih hidup.
 *
 * Buang `if (error) throw error` di pengaturan.ts → test pertama gagal.
 */

type Res = { data: unknown; error: unknown };
let jawaban: Res = { data: null, error: null };
let jejak: { tabel: string; aksi: string; muatan?: unknown }[] = [];

function builder(tabel: string) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq']) b[m] = () => b;
  for (const m of ['upsert', 'delete']) {
    b[m] = (muatan?: unknown) => { jejak.push({ tabel, aksi: m, muatan }); return b; };
  }
  b.maybeSingle = () => Promise.resolve(jawaban);
  b.then = (resolve: (v: Res) => unknown) => Promise.resolve(jawaban).then(resolve);
  return b;
}

vi.mock('./supabase', () => ({ supabase: { from: (t: string) => builder(t) } }));

const { getTargetKasRT, setTargetKasRT, clearTargetKasRT } = await import('./pengaturan');

beforeEach(() => { jejak = []; jawaban = { data: null, error: null }; });

describe('getTargetKasRT — "gagal baca" ≠ "belum diatur"', () => {
  it('MELEMPAR saat query gagal, tidak mengembalikan null', async () => {
    jawaban = { data: null, error: { message: 'network' } };
    await expect(getTargetKasRT()).rejects.toBeTruthy();
  });

  it('null hanya untuk baris yang memang tidak ada', async () => {
    jawaban = { data: null, error: null };
    await expect(getTargetKasRT()).resolves.toBeNull();
  });

  it('nominal 0 dianggap belum diatur (target tanpa angka tak berarti)', async () => {
    jawaban = { data: { value: { nominal: 0, keterangan: 'Dana 17 Agustus' } }, error: null };
    await expect(getTargetKasRT()).resolves.toBeNull();
  });

  it('membaca nominal, keterangan, dan tanggal batas', async () => {
    jawaban = {
      data: { value: { nominal: 5000000, keterangan: 'Dana 17 Agustus', tanggal: '2026-08-17' } },
      error: null,
    };
    await expect(getTargetKasRT()).resolves.toEqual({
      nominal: 5000000, keterangan: 'Dana 17 Agustus', tanggal: '2026-08-17',
    });
  });

  it('nominal berupa string dari JSONB tetap jadi angka', async () => {
    jawaban = { data: { value: { nominal: '750000' } }, error: null };
    const t = await getTargetKasRT();
    expect(t?.nominal).toBe(750000);
    expect(t?.keterangan).toBe('');
    expect(t?.tanggal).toBeNull();
  });
});

describe('setTargetKasRT / clearTargetKasRT — hasil tulis dilaporkan apa adanya', () => {
  it('upsert gagal melaporkan false, bukan sukses palsu', async () => {
    jawaban = { data: null, error: { message: 'rls' } };
    await expect(
      setTargetKasRT({ nominal: 1000, keterangan: 'x', tanggal: null })
    ).resolves.toBe(false);
  });

  it('upsert sukses menulis ke tabel pengaturan pada key target_kas_rt', async () => {
    const ok = await setTargetKasRT({ nominal: 1000, keterangan: 'x', tanggal: null });
    expect(ok).toBe(true);
    expect(jejak).toHaveLength(1);
    expect(jejak[0].tabel).toBe('pengaturan');
    expect(jejak[0].aksi).toBe('upsert');
    expect(jejak[0].muatan).toMatchObject({ key: 'target_kas_rt' });
  });

  it('hapus gagal melaporkan false', async () => {
    jawaban = { data: null, error: { message: 'rls' } };
    await expect(clearTargetKasRT()).resolves.toBe(false);
  });
});
