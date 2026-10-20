import { describe, it, expect } from 'vitest';
import { labelHariTarikan } from './utils';

/* 20 Okt 2026: daftar jadwal memajang tanggal saja — Jumat/Sabtu tak menyebut
   "Besok"/"Hari ini", dan Selasa sesudahnya #25 masih "Jadwal Berikutnya"
   bertanggal lampau tanpa tanda. Jam LOKAL (konstruktor komponen). */
const t = (tanggal: string, status = 'dijadwalkan') => ({ tanggal, status });

describe('labelHariTarikan', () => {
  it('Besok (H-1) & Hari ini (hari-H), termasuk tepat sesudah/ sebelum tengah malam', () => {
    expect(labelHariTarikan(t('2026-10-24'), new Date(2026, 9, 23, 19, 0))?.teks).toBe('Besok');
    expect(labelHariTarikan(t('2026-10-24'), new Date(2026, 9, 24, 0, 5))?.teks).toBe('Hari ini');
    expect(labelHariTarikan(t('2026-10-24'), new Date(2026, 9, 24, 23, 55))?.teks).toBe('Hari ini');
  });
  it('lewat tapi belum diproses → Belum dicatat (amber)', () => {
    const l = labelHariTarikan(t('2026-10-24'), new Date(2026, 9, 25, 0, 5));
    expect(l).toEqual({ teks: 'Belum dicatat', nada: 'warn' });
  });
  it('selesai, atau ≥2 hari lagi → tanpa label', () => {
    expect(labelHariTarikan(t('2026-10-24', 'selesai'), new Date(2026, 9, 24, 12))).toBeNull();
    expect(labelHariTarikan(t('2026-10-24'), new Date(2026, 9, 22, 12))).toBeNull();
    expect(labelHariTarikan(t(''), new Date(2026, 9, 22, 12))).toBeNull();
  });
});
