import { describe, it, expect, vi } from 'vitest';

vi.mock('./supabase', () => ({ supabase: {} }));
const { kumpulkanHalaman } = await import('./bacaSemua');

/** Server tiruan: `baris` total, memotong tiap jawaban di `maxRows` (seperti
 *  PostgREST), dan — kecuali `tanpaHitungan` — mengirim `count` exact. */
function server(baris: number, { maxRows = 1000, tanpaHitungan = false, gagalDi = -1 } = {}) {
  const data = Array.from({ length: baris }, (_, i) => ({ i }));
  const panggilan: [number, number][] = [];
  const ambil = async (dari: number, sampai: number) => {
    panggilan.push([dari, sampai]);
    if (panggilan.length - 1 === gagalDi) return { data: null, error: { message: 'HTTP 500' } };
    const n = Math.min(sampai - dari + 1, maxRows);
    return { data: data.slice(dari, dari + n), error: null, ...(tanpaHitungan ? {} : { count: baris }) };
  };
  return { ambil, panggilan };
}

describe('kumpulkanHalaman — Supabase memotong di max_rows tanpa galat', () => {
  it('1680 baris (absensi hari ini) terbaca UTUH lewat dua halaman', async () => {
    const s = server(1680);
    const hasil = await kumpulkanHalaman(s.ambil);
    expect(hasil).toHaveLength(1680);
    expect(new Set(hasil.map((r) => r.i)).size).toBe(1680); // tanpa ganda
    expect(s.panggilan).toEqual([[0, 999], [1000, 1999]]);
  });

  it('di bawah satu halaman: SATU permintaan saja (hitungan server menghentikannya)', async () => {
    const s = server(341);
    expect(await kumpulkanHalaman(s.ambil)).toHaveLength(341);
    expect(s.panggilan).toHaveLength(1);
  });

  it('kelipatan pas 1000: berhenti tanpa permintaan kosong tambahan', async () => {
    const s = server(2000);
    expect(await kumpulkanHalaman(s.ambil)).toHaveLength(2000);
    expect(s.panggilan).toHaveLength(2);
  });

  it('max_rows server DITURUNKAN di bawah ukuran halaman: tetap utuh (halaman tak penuh ≠ akhir)', async () => {
    const s = server(1680, { maxRows: 500 });
    expect(await kumpulkanHalaman(s.ambil)).toHaveLength(1680);
  });

  it('tanpa hitungan server: berhenti di halaman tak penuh', async () => {
    const s = server(1680, { tanpaHitungan: true });
    expect(await kumpulkanHalaman(s.ambil)).toHaveLength(1680);
  });

  it('galat di halaman kedua MELEMPAR — bukan separuh data yang terlihat sah', async () => {
    const s = server(1680, { gagalDi: 1 });
    await expect(kumpulkanHalaman(s.ambil, { nama: 'absensi' })).rejects.toThrow(/absensi: HTTP 500/);
  });

  it('ketat (Backup): hitungan wajib ada & wajib cocok', async () => {
    await expect(kumpulkanHalaman(server(10, { tanpaHitungan: true }).ambil, { ketat: true })).rejects.toThrow(/jumlah baris/);
    // data bertambah saat dibaca → terbaca lebih sedikit dari hitungan terakhir
    let n = 0;
    const berubah = async (dari: number, sampai: number) => {
      n++;
      const total = n === 1 ? 1500 : 1501;
      return { data: Array.from({ length: Math.min(sampai - dari + 1, Math.max(0, 1500 - dari)) }, (_, i) => ({ i: dari + i })), error: null, count: total };
    };
    await expect(kumpulkanHalaman(berubah, { ketat: true })).rejects.toThrow(/data berubah/);
  });
});
