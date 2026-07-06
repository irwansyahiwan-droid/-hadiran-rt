import type { Tarikan } from './types';

// Nomor tarikan ("tarikan ke-berapa") mengikuti URUTAN TANGGAL, bukan urutan
// dibuat. Tarikan yang SUDAH ditarik ('selesai') terkunci — nomornya sejarah &
// tak boleh digeser. Tarikan yang BELUM ditarik dinomori ulang menurut tanggal
// naik, melanjutkan dari nomor 'selesai' tertinggi.
//
// Contoh: #1–11 selesai; terjadwal Yatmo(18 Jul), Saman(25 Jul). Yatmo direvisi
// ke 1 Agu → sekarang paling belakang → Saman jadi #12, Yatmo jadi #13/#14.

type TarikanNomor = Pick<Tarikan, 'id' | 'nomor' | 'tanggal' | 'status'>;

/**
 * Hitung penomoran ulang tarikan TERJADWAL berdasarkan tanggal.
 * Mengembalikan HANYA baris yang nomornya berubah ({ id, nomor }) supaya
 * pemanggil cukup meng-update seperlunya. Kosong bila sudah urut.
 */
export function hitungUlangNomorJadwal(list: TarikanNomor[]): { id: string; nomor: number }[] {
  // Batas bawah = nomor tarikan selesai tertinggi (0 bila belum ada yang selesai).
  const base = list.reduce((max, t) => (t.status === 'selesai' ? Math.max(max, t.nomor) : max), 0);

  // Terjadwal (belum ditarik) diurutkan tanggal naik; seri → pertahankan nomor
  // lama agar urutan stabil (tak loncat-loncat saat tanggal sama).
  const terjadwal = list
    .filter(t => t.status !== 'selesai')
    .sort((a, b) => (a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : a.nomor - b.nomor));

  const changes: { id: string; nomor: number }[] = [];
  terjadwal.forEach((t, i) => {
    const nomorBaru = base + 1 + i;
    if (nomorBaru !== t.nomor) changes.push({ id: t.id, nomor: nomorBaru });
  });
  return changes;
}
