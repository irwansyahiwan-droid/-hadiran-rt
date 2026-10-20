import { describe, it, expect } from 'vitest';
import { gabungAktivitas } from './aktivitas';
import type { AktivitasLog } from './types';

/* Riwayat yang sudah LENGKAP digabung dgn halaman terbaru saat muat ulang /
   realtime (20 Okt 2026) — bukan diunduh ulang ±86 kB tiap ada aktivitas. */
const a = (id: string, jam: string) => ({ id, created_at: `2026-10-20T${jam}:00Z` }) as unknown as AktivitasLog;

describe('gabungAktivitas', () => {
  const lama = [a('c', '10:00'), a('b', '09:00'), a('a', '08:00')];
  it('menambahkan yang baru di depan, tanpa kembar', () => {
    const hasil = gabungAktivitas([a('d', '11:00'), a('c', '10:00')], lama);
    expect(hasil.map((r) => r.id)).toEqual(['d', 'c', 'b', 'a']);
  });
  it('tak ada yang baru → array yang SAMA (tanpa render ulang)', () => {
    expect(gabungAktivitas([a('c', '10:00')], lama)).toBe(lama);
  });
});
