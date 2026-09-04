/**
 * Penjaga ISI PDF Jadwal Tarikan.
 *
 * Invarian REKONSILIASI, seperti Daftar Hadir: subtitle mengumumkan
 * `N tarikan · X selesai · Y terjadwal`, dan X + Y WAJIB tepat N — status
 * `Tarikan` hanya tiga (`selesai` | `dijadwalkan` | `berlangsung`), jadi tak
 * ada status keempat yang boleh menguap dari ringkasan. Kalau nanti status
 * baru ditambahkan tanpa diringkas, uji inilah yang memberi tahu.
 */
import { describe, it, expect } from 'vitest';
import { buildJadwalPDF } from './generateJadwalPDF';
import { teksPdf } from './pdfTeksUji';
import type { Tarikan } from './types';

const t = (n: number, status: Tarikan['status']): Tarikan => ({
  id: `t${n}`, nomor: n, tanggal: `2026-0${n}-10`, jumlah_per_orang: 50_000,
  total_hadir: 60, total_warga: 69, sohibul_bait_id: `w${n}`, status,
  total_terkumpul: 3_000_000, created_at: `2026-0${n}-10T00:00:00Z`,
  sohibul_bait: { id: `w${n}`, nama: `Warga ${n}` } as Tarikan['sohibul_bait'],
});

const LIST: Tarikan[] = [t(1, 'selesai'), t(2, 'selesai'), t(3, 'berlangsung'), t(4, 'dijadwalkan')];

describe('PDF Jadwal Tarikan — isi dokumen', () => {
  it('mencetak tiap tarikan & sohibulnya', () => {
    const teks = teksPdf(buildJadwalPDF(LIST).doc);
    for (const x of LIST) {
      const nama = x.sohibul_bait!.nama;
      expect(nama.length, 'fixture cacat: nama kosong').toBeGreaterThan(2);
      expect(teks, `Sohibul tarikan #${x.nomor} hilang dari kertas`).toContain(nama);
    }
    expect(teks.length, 'terlalu sedikit string — tabel kemungkinan kosong').toBeGreaterThan(25);
  });

  it('REKONSILIASI: selesai + terjadwal tepat sama dengan jumlah tarikan', () => {
    const teks = teksPdf(buildJadwalPDF(LIST).doc);
    const selesai = LIST.filter((x) => x.status === 'selesai').length;
    const terjadwal = LIST.length - selesai;
    expect(teks, 'subtitle tak menjumlah — ada status yang tak diringkas')
      .toContain(`${LIST.length} tarikan · ${selesai} selesai · ${terjadwal} terjadwal`);
  });
});
