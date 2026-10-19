import { describe, it, expect } from 'vitest';
import { formatRupiahBertanda, formatRupiahPlain } from './utils';

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
