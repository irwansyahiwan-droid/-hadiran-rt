import { describe, it, expect, afterEach } from 'vitest';
import { tanggalHariIni, selisihHari } from './utils';

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

describe('selisihHari — hari KALENDER, berganti tengah malam (bukan 07.00 WIB)', () => {
  const pada = (iso: string) => new Date(iso);
  it('sepanjang 19 Okt sama: 06.00 & 20.00 WIB → 73 hari ke 31 Des', () => {
    process.env.TZ = 'Asia/Jakarta';
    expect(selisihHari('2026-12-31', pada('2026-10-18T23:00:00Z'))).toBe(73); // 06.00 WIB (dulu 74)
    expect(selisihHari('2026-12-31', pada('2026-10-19T13:00:00Z'))).toBe(73); // 20.00 WIB
  });
  it('hari H = 0; sehari sesudahnya NEGATIF (dulu 1 Jan 06.00 masih "0 hari lagi")', () => {
    process.env.TZ = 'Asia/Jakarta';
    expect(selisihHari('2026-12-31', pada('2026-12-30T23:00:00Z'))).toBe(0);  // 31 Des 06.00 WIB
    expect(selisihHari('2026-12-31', pada('2026-12-31T23:00:00Z'))).toBe(-1); // 1 Jan 06.00 WIB
  });
});

