import { describe, it, expect } from 'vitest';
import { hitungUlangNomorJadwal } from './jadwalNomor';
import type { Tarikan } from './types';

// Tarikan minimal untuk uji penomoran (field lain tak memengaruhi urutan).
function t(id: string, nomor: number, tanggal: string, status: Tarikan['status']): Tarikan {
  return {
    id, nomor, tanggal, status,
    jumlah_per_orang: 50000, total_hadir: 0, total_warga: 69, total_terkumpul: 0,
    sohibul_bait_id: null, created_at: '',
  } as Tarikan;
}

describe('hitungUlangNomorJadwal', () => {
  it('menggeser nomor terjadwal mengikuti tanggal, selesai terkunci', () => {
    // #1–11 selesai. Terjadwal: Yatmo(#12) direvisi ke 1 Agu (paling akhir),
    // Saman(#13, 25 Jul) & Budi(#14, 20 Jul) tetap. Urutan tanggal: Budi, Saman, Yatmo.
    const list = [
      t('a', 11, '2026-07-01', 'selesai'),
      t('yatmo', 12, '2026-08-01', 'dijadwalkan'),
      t('saman', 13, '2026-07-25', 'dijadwalkan'),
      t('budi', 14, '2026-07-20', 'dijadwalkan'),
    ];
    const changes = hitungUlangNomorJadwal(list);
    // Nomor efektif = nomor lama, ditimpa perubahan. Saman sudah #13 → tetap,
    // jadi wajar tak muncul di changes.
    const eff = new Map(list.map(x => [x.id, x.nomor]));
    changes.forEach(c => eff.set(c.id, c.nomor));
    expect(eff.get('budi')).toBe(12);
    expect(eff.get('saman')).toBe(13);
    expect(eff.get('yatmo')).toBe(14);
    expect(changes.find(c => c.id === 'saman')).toBeUndefined();
  });

  it('tidak mengubah nomor tarikan selesai', () => {
    const list = [
      t('a', 1, '2026-05-01', 'selesai'),
      t('b', 2, '2026-06-01', 'selesai'),
      t('c', 3, '2026-07-01', 'dijadwalkan'),
    ];
    const changes = hitungUlangNomorJadwal(list);
    expect(changes.some(c => c.id === 'a' || c.id === 'b')).toBe(false);
  });

  it('mengembalikan kosong bila sudah urut', () => {
    const list = [
      t('a', 1, '2026-05-01', 'selesai'),
      t('b', 2, '2026-06-01', 'dijadwalkan'),
      t('c', 3, '2026-07-01', 'dijadwalkan'),
    ];
    expect(hitungUlangNomorJadwal(list)).toEqual([]);
  });

  it('mulai dari 1 bila belum ada yang selesai', () => {
    const list = [
      t('x', 5, '2026-08-01', 'dijadwalkan'),
      t('y', 6, '2026-07-01', 'dijadwalkan'),
    ];
    const changes = hitungUlangNomorJadwal(list);
    const map = new Map(changes.map(c => [c.id, c.nomor]));
    expect(map.get('y')).toBe(1);
    expect(map.get('x')).toBe(2);
  });
});
