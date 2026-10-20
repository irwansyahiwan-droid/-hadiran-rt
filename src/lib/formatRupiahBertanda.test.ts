import { describe, it, expect } from 'vitest';
import { formatRupiah, formatRupiahArah, formatRupiahBertanda, formatRupiahPlain, namaSohibul } from './utils';

/* 19 Okt 2026: sheet setor menulis "Saldo hadiran: Rp450.000" (hijau) saat saldo
   −Rp450.000 — `formatRupiahPlain` sengaja Math.abs. Saldo WAJIB bertanda. */
describe('formatRupiahBertanda — saldo minus tak boleh tampil positif', () => {
  it('minus tetap minus', () => {
    expect(formatRupiahPlain(-450_000)).toBe('Rp450.000'); // pembanding: Plain membuang tanda
    expect(formatRupiahBertanda(-450_000)).toBe('-Rp450.000');
  });
  it('positif & nol tanpa tanda', () => {
    expect(formatRupiahBertanda(16_352_000)).toBe('Rp16.352.000');
    expect(formatRupiahBertanda(0)).toBe('Rp0');
  });
});

/* 20 Okt 2026: "Talangan Belum Lunas -Rp0" — keadaan yang DIMINTA aturan RT
   (semua lunas sebelum tarikan berikutnya) tercetak seolah masih terutang. */
describe('formatRupiahArah — nol tak punya arah', () => {
  it('besaran bukan nol membawa arahnya', () => {
    expect(formatRupiahArah(1_500_000, '-')).toBe('-Rp1.500.000');
    expect(formatRupiahArah(8_280_000, '+')).toBe('+Rp8.280.000');
  });
  it('nol tanpa tanda di kedua arah', () => {
    expect(formatRupiahArah(0, '-')).toBe('Rp0');
    expect(formatRupiahArah(0, '+')).toBe('Rp0');
  });
  it('nominal bertanda (net Beranda) juga nol tanpa tanda', () => {
    expect(formatRupiah(0)).toBe('Rp0');
    expect(formatRupiah(-345_000)).toBe('-Rp345.000');
    expect(formatRupiah(50_000)).toBe('+Rp50.000');
  });
});

/* 20 Okt 2026: tarikan tanpa Sohibul tercetak "—" (daftar, PDF, Excel, WA). */
describe('namaSohibul — kata yang sama dgn pilihan kosong di form', () => {
  it('ada nama → nama; tak ada → "Belum ditentukan"', () => {
    expect(namaSohibul({ sohibul_bait: { nama: 'Dhiman' } })).toBe('Dhiman');
    expect(namaSohibul({ sohibul_bait: null })).toBe('Belum ditentukan');
    expect(namaSohibul({})).toBe('Belum ditentukan');
  });
});
