import { describe, it, expect } from 'vitest';
import { ringkasAbsensi } from './absensiHitung';
import type { AbsensiStatus, Warga } from './types';

// Anggota minimal untuk uji rumus (field lain tak memengaruhi hitungan).
function w(id: string, nama: string): Warga {
  return { id, nama, no_rumah: '', no_hp: '', role: 'warga', status_aktif: true, created_at: '' };
}

// 5 anggota; w1 = Sohibul Bait (penerima, bukan pembayar) → 4 pembayar.
const wargaList = [w('1', 'Sohibul'), w('2', 'Budi'), w('3', 'Siti'), w('4', 'Andi'), w('5', 'Eka')];
const SOHIBUL = '1';
const map = (s: Record<string, AbsensiStatus>) => s;

describe('ringkasAbsensi', () => {
  it('hanya pembayar tidak_hadir yang kena talangan; titip & hadir bebas', () => {
    const r = ringkasAbsensi(
      wargaList,
      map({ '1': 'hadir', '2': 'hadir', '3': 'titip', '4': 'tidak_hadir', '5': 'tidak_hadir' }),
      SOHIBUL,
    );
    expect(r.hadirCount).toBe(1);          // hanya w2 (w1 Sohibul dikecualikan)
    expect(r.titipCount).toBe(1);          // w3
    expect(r.tidakCount).toBe(2);          // w4 + w5
    expect(r.talanganCount).toBe(2);       // w4, w5
    expect(r.talanganIds).toEqual(['4', '5']);
    expect(r.tidakHadirNama).toEqual(['Andi', 'Eka']);
    // titip (Siti) TIDAK ikut talangan
    expect(r.talanganIds).not.toContain('3');
    expect(r.tidakHadirNama).not.toContain('Siti');
  });

  it('kas & bagian Sohibul KONSTAN (berbasis jumlah pembayar, bukan kehadiran)', () => {
    const semuaHadir = ringkasAbsensi(
      wargaList,
      map({ '1': 'hadir', '2': 'hadir', '3': 'hadir', '4': 'hadir', '5': 'hadir' }),
      SOHIBUL,
    );
    const banyakTitip = ringkasAbsensi(
      wargaList,
      map({ '1': 'hadir', '2': 'titip', '3': 'titip', '4': 'tidak_hadir', '5': 'titip' }),
      SOHIBUL,
    );
    // 4 pembayar di kedua skenario → kas & sohibul identik
    expect(semuaHadir.kasTotal).toBe(4 * 5000);          // 20.000
    expect(semuaHadir.sohibulBaitTerima).toBe(4 * 45000); // 180.000
    expect(banyakTitip.kasTotal).toBe(semuaHadir.kasTotal);
    expect(banyakTitip.sohibulBaitTerima).toBe(semuaHadir.sohibulBaitTerima);
  });

  it('semua titip → talangan nol, kas tetap penuh', () => {
    const r = ringkasAbsensi(
      wargaList,
      map({ '1': 'hadir', '2': 'titip', '3': 'titip', '4': 'titip', '5': 'titip' }),
      SOHIBUL,
    );
    expect(r.titipCount).toBe(4);
    expect(r.talanganCount).toBe(0);
    expect(r.talanganTotal).toBe(0);
    expect(r.kasTotal).toBe(20000);
  });

  it('talanganTotal = jumlah pembayar tidak_hadir × Rp50.000', () => {
    const r = ringkasAbsensi(
      wargaList,
      map({ '1': 'hadir', '2': 'tidak_hadir', '3': 'tidak_hadir', '4': 'tidak_hadir', '5': 'hadir' }),
      SOHIBUL,
    );
    expect(r.talanganCount).toBe(3);
    expect(r.talanganTotal).toBe(3 * 50000); // 150.000
  });

  it('Sohibul Bait tidak pernah kena talangan walau ditandai tidak_hadir', () => {
    const r = ringkasAbsensi(
      wargaList,
      map({ '1': 'tidak_hadir', '2': 'hadir', '3': 'hadir', '4': 'hadir', '5': 'hadir' }),
      SOHIBUL,
    );
    expect(r.talanganIds).not.toContain('1');
    expect(r.talanganCount).toBe(0);
    // Sohibul 'tidak_hadir' TIDAK menambah tidakCount (di luar akuntansi pembayar)
    expect(r.tidakCount).toBe(0); // w2..w5 semua hadir → tak ada pembayar absen
    expect(r.hadirCount).toBe(4); // w2..w5
  });

  it('status hilang dianggap tidak_hadir → pembayar tanpa data kena talangan', () => {
    // Hanya w2 yang punya status; w3..w5 (pembayar) tak ada di map → tidak_hadir.
    const r = ringkasAbsensi(wargaList, map({ '1': 'hadir', '2': 'hadir' }), SOHIBUL);
    expect(r.talanganIds).toEqual(['3', '4', '5']);
    expect(r.talanganTotal).toBe(3 * 50000);
  });
});
