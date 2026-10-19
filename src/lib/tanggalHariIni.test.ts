import { describe, it, expect, afterEach } from 'vitest';
import { tanggalHariIni } from './utils';

/* `toISOString()` = tanggal UTC. WIB = UTC+7 → 00:00–07:00 WIB "hari ini"
   versi UTC masih KEMARIN. Data produksi memuat empat pembayaran talangan
   ±05.00 WIB yang tercatat sehari terlalu awal (19 Okt 2026). */
const asli = process.env.TZ;
afterEach(() => { process.env.TZ = asli; });

describe('tanggalHariIni — zona perangkat, bukan UTC', () => {
  it('05.30 WIB 20 Okt → "2026-10-20" (cara lama: 19 Okt)', () => {
    process.env.TZ = 'Asia/Jakarta';
    const d = new Date('2026-10-19T22:30:00Z');
    expect(d.toISOString().slice(0, 10)).toBe('2026-10-19'); // bug lama, dipaku sbg pembanding
    expect(tanggalHariIni(d)).toBe('2026-10-20');
  });

  it('dini hari tanggal 1 tetap di BULAN BARU (laporan tak jatuh ke triwulan lalu)', () => {
    process.env.TZ = 'Asia/Jakarta';
    expect(tanggalHariIni(new Date('2026-09-30T18:00:00Z'))).toBe('2026-10-01'); // 01.00 WIB 1 Okt
  });

  it('siang hari: sama dgn UTC (tak ada yang bergeser)', () => {
    process.env.TZ = 'Asia/Jakarta';
    expect(tanggalHariIni(new Date('2026-10-19T05:00:00Z'))).toBe('2026-10-19');
  });

  it('bulan & tanggal satu digit diberi nol di depan', () => {
    process.env.TZ = 'Asia/Jakarta';
    expect(tanggalHariIni(new Date('2026-02-04T03:00:00Z'))).toBe('2026-02-04');
  });
});
