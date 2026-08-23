import { describe, it, expect } from 'vitest';
import { wajibSukses, wajibBerubah } from './tulisAman';

/**
 * Dua kegagalan Supabase yang sama-sama DIAM. Uji ini menjaga keduanya tetap
 * berisik — lihat komentar panjang di `tulisAman.ts` untuk kenapa keduanya ada.
 */
describe('wajibSukses — kegagalan ber-error', () => {
  it('meneruskan hasil saat tak ada error', () => {
    const res = { data: [{ id: 'a' }], error: null };
    expect(wajibSukses(res, 'menyimpan')).toBe(res);
  });

  it('melempar saat error, dan menyebut langkahnya', () => {
    expect(() => wajibSukses({ error: { message: 'ditolak' } }, 'menyimpan data anggota'))
      .toThrow(/menyimpan data anggota/i);
  });

  it('meneruskan Error asli apa adanya (jejak tumpukan tak hilang)', () => {
    const asli = new Error('RLS');
    expect(() => wajibSukses({ error: asli }, 'menyimpan')).toThrow(asli);
  });
});

describe('wajibBerubah — SUKSES tapi NOL baris', () => {
  it('mengembalikan baris saat ada yang berubah', () => {
    expect(wajibBerubah({ data: [{ id: 'a' }], error: null }, 'menyimpan')).toEqual([{ id: 'a' }]);
  });

  it('melempar saat data kosong — inilah kasus 204-kosong PostgREST', () => {
    expect(() => wajibBerubah({ data: [], error: null }, 'menyimpan data anggota'))
      .toThrow(/tak ada baris yang berubah/i);
  });

  /* `data: null` = pemanggil LUPA `.select()`. Harus ikut melempar: kalau
     dibiarkan lolos, penjaga ini diam-diam mati di call-site yang paling butuh. */
  it('melempar saat data null (pemanggil lupa .select())', () => {
    expect(() => wajibBerubah({ data: null, error: null }, 'menyimpan'))
      .toThrow(/tak ada baris yang berubah/i);
  });

  it('error tetap menang atas cek nol-baris', () => {
    expect(() => wajibBerubah({ data: [], error: { message: 'ditolak' } }, 'menyimpan'))
      .toThrow(/menyimpan/i);
  });
});
