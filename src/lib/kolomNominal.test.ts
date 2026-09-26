import { describe, expect, it } from 'vitest';
import { formatNominal, posisiKursor, suntingNominal } from './kolomNominal';

/**
 * Kolom nominal diformat ulang tiap ketikan; yang dikunci di sini: kursor
 * TETAP di tempat yang dimaksud bendahara. Sebelum ada berkas ini, koreksi
 * digit pertama "1.500.000" → ketik 2 menghasilkan "5.000.002".
 */

/** Simulasikan satu suntingan lalu kembalikan teks terformat + kursornya. */
function sunting(lama: string, teksDom: string, kursorDom: number, jenis = 'insertText') {
  const { nilai, digitSebelum } = suntingNominal(teksDom, kursorDom, lama, jenis);
  const teks = formatNominal(nilai);
  return { teks, kursor: posisiKursor(teks, digitSebelum) };
}

describe('kolom nominal — kursor tak melompat ke ujung', () => {
  it('koreksi digit pertama: "1|.500.000" Backspace lalu 2 → "2.500.000"', () => {
    const a = sunting('1.500.000', '.500.000', 0, 'deleteContentBackward');
    expect(a).toEqual({ teks: '500.000', kursor: 0 });
    const b = sunting(a.teks, '2500.000', 1);
    expect(b).toEqual({ teks: '2.500.000', kursor: 1 });
  });

  it('sisip di tengah: "15|0.000" + 0 + 0 → "15.000.000", kursor tetap di tengah', () => {
    const a = sunting('150.000', '1500.000', 3);
    expect(a).toEqual({ teks: '1.500.000', kursor: 4 });   // "1.50|0.000"
    const b = sunting(a.teks, '1.5000.000', 5);
    expect(b).toEqual({ teks: '15.000.000', kursor: 5 });  // "15.00|0.000"
  });

  it('mengetik di ujung tetap di ujung', () => {
    expect(sunting('150.000', '150.0005', 8)).toEqual({ teks: '1.500.005', kursor: 9 });
  });

  it('Backspace tepat sesudah pemisah menghapus DIGIT sebelumnya', () => {
    // "1.|500.000" → peramban membuang "." → "1500.000", kursor 1
    expect(sunting('1.500.000', '1500.000', 1, 'deleteContentBackward')).toEqual({ teks: '500.000', kursor: 0 });
  });

  it('Delete tepat sebelum pemisah menghapus DIGIT sesudahnya', () => {
    // "1|.500.000" → peramban membuang "." → "1500.000", kursor 1
    expect(sunting('1.500.000', '1500.000', 1, 'deleteContentForward')).toEqual({ teks: '100.000', kursor: 1 });
  });

  it('nol di depan dibuang, kursor ikut', () => {
    expect(sunting('500.000', '0500.000', 1)).toEqual({ teks: '500.000', kursor: 0 });
  });

  it('huruf diabaikan, kursor tetap', () => {
    expect(sunting('1.500', '1.5a00', 4)).toEqual({ teks: '1.500', kursor: 3 });
  });

  it('dikosongkan → teks kosong', () => {
    expect(sunting('5', '', 0, 'deleteContentBackward')).toEqual({ teks: '', kursor: 0 });
  });
});
