import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Test logika bisnis Hadiran RT.
 *
 * Cakupan:
 *  1. Rumus iuran/kas/talangan/sohibul (sesuai konstanta di Jadwal.tsx).
 *  2. Formula saldo dashboard — diuji lewat KODE ASLI `fetchDashboardSummary`.
 *  3. Reversibilitas transaksi (proses↔batal, bayar↔batal) — memastikan
 *     data kembali persis ke kondisi awal setelah dibatalkan.
 *
 * Operasi DB ditranskrip 1:1 dari urutan supabase di Jadwal.tsx (simpan/batalkan)
 * dan Talangan.tsx (bayar/batalkanBayar), dijalankan di atas fake in-memory DB.
 */

// ── In-memory fake Supabase (mendukung chain yang dipakai aplikasi) ──────────
const h = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const store: Record<string, Row[]> = {
    warga: [], tarikan: [], absensi: [], talangan: [], transaksi_kas: [],
  };
  let idSeq = 1;
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

  function makeBuilder(table: string) {
    const filters: [string, unknown][] = [];
    let action: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: Row[] | Row | null = null;
    let countOpt = false;
    let orderCol: string | null = null;
    let orderAsc = true;

    const matched = () => store[table].filter(r => filters.every(([c, v]) => r[c] === v));

    const builder: Record<string, unknown> = {
      select(_cols?: string, opts?: { count?: string }) { action = 'select'; if (opts?.count) countOpt = true; return builder; },
      insert(rows: Row | Row[]) { action = 'insert'; payload = Array.isArray(rows) ? rows : [rows]; return builder; },
      update(patch: Row) { action = 'update'; payload = patch; return builder; },
      delete() { action = 'delete'; return builder; },
      eq(col: string, val: unknown) { filters.push([col, val]); return builder; },
      not() { return builder; },
      order(col: string, opt?: { ascending?: boolean }) { orderCol = col; orderAsc = opt?.ascending ?? true; return builder; },
      then(resolve: (res: unknown) => void) {
        let result: unknown;
        if (action === 'select') {
          let data = matched();
          if (orderCol) {
            const col = orderCol;
            data = [...data].sort((a, b) => orderAsc
              ? Number(a[col]) - Number(b[col])
              : Number(b[col]) - Number(a[col]));
          }
          result = { data: clone(data), count: countOpt ? data.length : null, error: null };
        } else if (action === 'insert') {
          const rows = payload as Row[];
          const inserted = rows.map(r => ({ id: r.id ?? `id_${idSeq++}`, ...r }));
          store[table].push(...inserted);
          result = { data: clone(inserted), error: null };
        } else if (action === 'update') {
          const rows = matched();
          rows.forEach(r => Object.assign(r, payload));
          result = { data: clone(rows), error: null };
        } else { // delete
          store[table] = store[table].filter(r => !filters.every(([c, v]) => r[c] === v));
          result = { data: null, error: null };
        }
        resolve(result);
      },
    };
    return builder;
  }

  return {
    store,
    supabase: { from: (t: string) => makeBuilder(t) },
    reset() {
      store.warga = []; store.tarikan = []; store.absensi = [];
      store.talangan = []; store.transaksi_kas = []; idSeq = 1;
    },
  };
});

vi.mock('../src/lib/supabase', () => ({ supabase: h.supabase }));

// Impor KODE ASLI (utils memakai supabase yang sudah di-mock di atas)
import { fetchDashboardSummary, formatRupiah, formatRupiahPlain } from '../src/lib/utils';

const s = h.supabase;
type Row = Record<string, unknown>;

// ── Transkrip operasi DB (mirror Jadwal.tsx / Talangan.tsx) ──────────────────
async function prosesTarikan(tarikan: Row, hadirIds: string[], tidakIds: string[]) {
  const tarikanId = tarikan.id;
  const { data: existingLunas } = (await s.from('talangan')
    .select('warga_id, tanggal_lunas').eq('tarikan_id', tarikanId).eq('status_lunas', true)) as { data: Row[] };
  const lunasMap = new Map<string, unknown>((existingLunas ?? []).map(t => [t.warga_id, t.tanggal_lunas]));

  await s.from('absensi').delete().eq('tarikan_id', tarikanId);
  if (hadirIds.length) await s.from('absensi').insert(hadirIds.map(warga_id => ({ tarikan_id: tarikanId, warga_id, status: 'hadir' })));
  if (tidakIds.length) await s.from('absensi').insert(tidakIds.map(warga_id => ({ tarikan_id: tarikanId, warga_id, status: 'tidak_hadir' })));

  await s.from('talangan').delete().eq('tarikan_id', tarikanId);
  if (tidakIds.length) await s.from('talangan').insert(tidakIds.map(warga_id => ({
    tarikan_id: tarikanId, warga_id, nominal: 50000,
    status_lunas: lunasMap.has(warga_id), tanggal_lunas: lunasMap.get(warga_id) ?? null,
  })));

  await s.from('transaksi_kas').delete().eq('tarikan_id', tarikanId).eq('tipe', 'kas_masuk');
  if (hadirIds.length) await s.from('transaksi_kas').insert({
    tipe: 'kas_masuk', nominal: hadirIds.length * 5000,
    keterangan: `Kas hadiran tarikan #${tarikan.nomor}`, tanggal: tarikan.tanggal,
    tarikan_id: tarikanId, saldo_setelah: 0,
  });

  await s.from('tarikan').update({
    status: 'selesai', total_hadir: hadirIds.length, total_terkumpul: hadirIds.length * 5000,
  }).eq('id', tarikanId);
}

async function batalkanTarikan(tarikanId: string) {
  await s.from('absensi').delete().eq('tarikan_id', tarikanId);
  await s.from('talangan').delete().eq('tarikan_id', tarikanId);
  await s.from('transaksi_kas').delete().eq('tarikan_id', tarikanId);
  await s.from('tarikan').update({ status: 'dijadwalkan', total_hadir: 0, total_terkumpul: 0 }).eq('id', tarikanId);
}

async function bayarTalangan(t: Row, today = '2026-06-15') {
  await s.from('talangan').update({ status_lunas: true, tanggal_lunas: today }).eq('id', t.id);
  await s.from('transaksi_kas').insert({
    tipe: 'talangan_masuk', nominal: t.nominal, keterangan: 'Talangan lunas',
    tanggal: today, warga_id: t.warga_id, tarikan_id: t.tarikan_id, saldo_setelah: 0,
  });
}

async function batalkanBayarTalangan(t: Row) {
  await s.from('talangan').update({ status_lunas: false, tanggal_lunas: null }).eq('id', t.id);
  await s.from('transaksi_kas').delete().eq('tipe', 'talangan_masuk').eq('warga_id', t.warga_id).eq('tarikan_id', t.tarikan_id);
}

// ── Seed: 5 warga aktif + 1 tarikan terjadwal ───────────────────────────────
function seed() {
  h.reset();
  for (let i = 1; i <= 5; i++) {
    h.store.warga.push({ id: `w${i}`, nama: `Warga ${i}`, status_aktif: true });
  }
  h.store.tarikan.push({
    id: 't1', nomor: 1, tanggal: '2026-06-10', status: 'dijadwalkan',
    total_hadir: 0, total_terkumpul: 0, total_warga: 5,
    jumlah_per_orang: 0, sohibul_bait_id: 'w1', created_at: '2026-01-01',
  });
}

const talanganOf = (warga_id: string) => h.store.talangan.find(t => t.warga_id === warga_id)!;

beforeEach(seed);

// ─────────────────────────────────────────────────────────────────────────────
describe('Rumus format (kode asli utils.ts)', () => {
  it('formatRupiah memberi tanda +/- dan ribuan id-ID', () => {
    expect(formatRupiah(20000)).toBe('+Rp20.000');
    expect(formatRupiah(-30000)).toBe('-Rp30.000');
    expect(formatRupiah(0)).toBe('Rp0');
  });
  it('formatRupiahPlain selalu absolut tanpa tanda', () => {
    expect(formatRupiahPlain(-30000)).toBe('Rp30.000');
    expect(formatRupiahPlain(1710000)).toBe('Rp1.710.000');
  });
});

describe('Proses tarikan — rumus iuran/kas/talangan', () => {
  it('4 hadir + 1 tidak hadir menghitung kas, talangan, sohibul dengan benar', async () => {
    await prosesTarikan(h.store.tarikan[0], ['w1', 'w2', 'w3', 'w4'], ['w5']);

    // Kas hadiran = 4 × 5.000 = 20.000
    const kasMasuk = h.store.transaksi_kas.find(t => t.tipe === 'kas_masuk')!;
    expect(kasMasuk.nominal).toBe(20000);
    expect(h.store.tarikan[0].total_terkumpul).toBe(20000);
    expect(h.store.tarikan[0].total_hadir).toBe(4);
    expect(h.store.tarikan[0].status).toBe('selesai');

    // Talangan = 1 × 50.000 (warga tidak hadir)
    const talangan = h.store.talangan.filter(t => !t.status_lunas);
    expect(talangan).toHaveLength(1);
    expect(talangan[0].nominal).toBe(50000);
    expect(talangan[0].warga_id).toBe('w5');

    // Absensi tercatat untuk semua 5 warga
    expect(h.store.absensi.filter(a => a.status === 'hadir')).toHaveLength(4);
    expect(h.store.absensi.filter(a => a.status === 'tidak_hadir')).toHaveLength(1);
  });

  it('semua hadir → tidak ada talangan', async () => {
    await prosesTarikan(h.store.tarikan[0], ['w1', 'w2', 'w3', 'w4', 'w5'], []);
    expect(h.store.talangan).toHaveLength(0);
    expect(h.store.tarikan[0].total_terkumpul).toBe(25000);
  });
});

describe('Formula saldo dashboard (kode asli fetchDashboardSummary)', () => {
  it('saldo = kas terkumpul − talangan belum lunas − setor kas RT', async () => {
    await prosesTarikan(h.store.tarikan[0], ['w1', 'w2', 'w3', 'w4'], ['w5']);
    const sum = await fetchDashboardSummary();
    // 20.000 − 50.000 − 0 = −30.000
    expect(sum.total_kas_terkumpul).toBe(20000);
    expect(sum.total_talangan_belum_lunas).toBe(50000);
    expect(sum.total_setor_kas_rt).toBe(0);
    expect(sum.saldo_aktif).toBe(-30000);
    expect(sum.jumlah_tarikan).toBe(1);     // selesai
    expect(sum.jumlah_dijadwalkan).toBe(0);
    expect(sum.jumlah_anggota).toBe(5);
  });
});

describe('Bayar talangan ↔ batalkan (reversibel)', () => {
  it('bayar membuat talangan lunas + transaksi masuk; saldo naik', async () => {
    await prosesTarikan(h.store.tarikan[0], ['w1', 'w2', 'w3', 'w4'], ['w5']);
    await bayarTalangan(talanganOf('w5'));

    expect(talanganOf('w5').status_lunas).toBe(true);
    expect(h.store.transaksi_kas.filter(t => t.tipe === 'talangan_masuk')).toHaveLength(1);

    const sum = await fetchDashboardSummary();
    expect(sum.total_talangan_belum_lunas).toBe(0);
    expect(sum.saldo_aktif).toBe(20000); // 20.000 − 0 − 0
  });

  it('batalkan bayar mengembalikan ke BELUM + hapus transaksi; saldo balik', async () => {
    await prosesTarikan(h.store.tarikan[0], ['w1', 'w2', 'w3', 'w4'], ['w5']);
    await bayarTalangan(talanganOf('w5'));
    await batalkanBayarTalangan(talanganOf('w5'));

    expect(talanganOf('w5').status_lunas).toBe(false);
    expect(talanganOf('w5').tanggal_lunas).toBeNull();
    expect(h.store.transaksi_kas.filter(t => t.tipe === 'talangan_masuk')).toHaveLength(0);

    const sum = await fetchDashboardSummary();
    expect(sum.saldo_aktif).toBe(-30000); // kembali seperti sebelum bayar
  });
});

describe('Hitung ulang mempertahankan status lunas', () => {
  it('warga yang sudah lunas tetap lunas setelah proses ulang', async () => {
    await prosesTarikan(h.store.tarikan[0], ['w1', 'w2', 'w3', 'w4'], ['w5']);
    await bayarTalangan(talanganOf('w5'));
    // Hitung ulang dengan kehadiran sama
    await prosesTarikan(h.store.tarikan[0], ['w1', 'w2', 'w3', 'w4'], ['w5']);

    expect(talanganOf('w5').status_lunas).toBe(true);
    expect(talanganOf('w5').tanggal_lunas).toBe('2026-06-15');
  });
});

describe('Batalkan tarikan — data kembali NOL (round-trip penuh)', () => {
  it('setelah proses lalu dibatalkan, seluruh DB persis seperti kondisi awal', async () => {
    const initial = JSON.parse(JSON.stringify(h.store));

    await prosesTarikan(h.store.tarikan[0], ['w1', 'w2', 'w3', 'w4'], ['w5']);
    await bayarTalangan(talanganOf('w5'));        // ada transaksi kas + talangan lunas
    await batalkanTarikan('t1');                  // batalkan semuanya

    expect(h.store.absensi).toHaveLength(0);
    expect(h.store.talangan).toHaveLength(0);
    expect(h.store.transaksi_kas).toHaveLength(0);
    expect(h.store.tarikan[0].status).toBe('dijadwalkan');
    expect(h.store.tarikan[0].total_terkumpul).toBe(0);
    expect(h.store.tarikan[0].total_hadir).toBe(0);

    // DB identik dengan awal
    expect(JSON.parse(JSON.stringify(h.store))).toEqual(initial);

    // Dashboard juga balik nol
    const sum = await fetchDashboardSummary();
    expect(sum.saldo_aktif).toBe(0);
    expect(sum.total_kas_terkumpul).toBe(0);
    expect(sum.total_talangan_belum_lunas).toBe(0);
    expect(sum.jumlah_tarikan).toBe(0);
    expect(sum.jumlah_dijadwalkan).toBe(1);
  });
});
