import { describe, it, expect } from 'vitest';
import { bentrokSohibul, bentrokTanggal, tanggalBawaanBerikut } from './bentrokJadwal';
import type { Tarikan } from './types';

const t = (id: string, tanggal: string, sohibul: string | null): Tarikan =>
  ({ id, nomor: Number(id), tanggal, sohibul_bait_id: sohibul, status: 'dijadwalkan' }) as unknown as Tarikan;

/* Data nyata 20 Okt 2026: #70 & #71 sama-sama 23 Okt 2027. */
const LIST = [t('69', '2027-10-16', 'w69'), t('70', '2027-10-23', 'w70'), t('71', '2027-10-23', null)];

describe('bentrokTanggal', () => {
  it('menemukan tarikan LAIN bertanggal sama', () => {
    expect(bentrokTanggal(LIST, '2027-10-23')?.id).toBe('70');
    expect(bentrokTanggal(LIST, '2027-10-23', '70')?.id).toBe('71');
  });
  it('tanggal sendiri / kosong / bebas bukan bentrok', () => {
    expect(bentrokTanggal(LIST, '2027-10-16', '69')).toBeNull();
    expect(bentrokTanggal(LIST, '')).toBeNull();
    expect(bentrokTanggal(LIST, '2027-10-30')).toBeNull();
  });
});

describe('bentrokSohibul', () => {
  it('giliran ganda terdeteksi, diri sendiri & "belum ditentukan" tidak', () => {
    expect(bentrokSohibul(LIST, 'w70')?.id).toBe('70');
    expect(bentrokSohibul(LIST, 'w70', '70')).toBeNull();
    expect(bentrokSohibul(LIST, '')).toBeNull();
  });
});

describe('tanggalBawaanBerikut', () => {
  it('seminggu sesudah tarikan terakhir, menyeberang bulan & tahun', () => {
    expect(tanggalBawaanBerikut(LIST, '2026-10-20')).toBe('2027-10-30');
    expect(tanggalBawaanBerikut([t('1', '2027-12-28', 'a')], '2026-10-20')).toBe('2028-01-04');
  });
  it('jadwal kosong / sudah lewat semua → hari ini, bukan tanggal lampau', () => {
    expect(tanggalBawaanBerikut([], '2026-10-20')).toBe('2026-10-20');
    expect(tanggalBawaanBerikut([t('1', '2026-01-03', 'a')], '2026-10-20')).toBe('2026-10-20');
  });
});
