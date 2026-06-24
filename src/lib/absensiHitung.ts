import type { AbsensiStatus, Warga } from './types';

// Konstanta uang per pembayar (semua anggota KECUALI Sohibul Bait).
export const KAS_PER_PEMBAYAR = 5000;        // Rp5.000 → Kas Hadiran
export const SOHIBUL_PER_PEMBAYAR = 45000;   // Rp45.000 → Sohibul Bait
export const TALANGAN_PER_ORANG = 50000;     // talangan per pembayar absen

export interface RingkasanAbsensi {
  hadirCount: number;       // status 'hadir' (seluruh anggota)
  titipCount: number;       // status 'titip' — tidak hadir tapi iuran masuk
  tidakCount: number;       // status 'tidak_hadir' (seluruh anggota)
  pembayarCount: number;    // semua anggota kecuali Sohibul Bait
  talanganCount: number;    // pembayar 'tidak_hadir' (HANYA ini kena talangan)
  kasTotal: number;         // konstan: pembayarCount × KAS_PER_PEMBAYAR
  talanganTotal: number;    // talanganCount × TALANGAN_PER_ORANG
  sohibulBaitTerima: number;// konstan: pembayarCount × SOHIBUL_PER_PEMBAYAR
  talanganIds: string[];    // id pembayar kena talangan (urut sesuai wargaList)
  tidakHadirNama: string[]; // nama pembayar kena talangan (urut sesuai wargaList)
}

/**
 * Satu-satunya sumber rumus kehadiran & talangan satu tarikan. Dipakai layar
 * absensi (live + saat simpan) supaya tampilan, PDF, dan data tersimpan tak
 * pernah beda hitungan. Aturan inti:
 * - Kas & bagian Sohibul KONSTAN (berbasis jumlah pembayar, bukan jumlah hadir).
 * - HANYA pembayar 'tidak_hadir' kena talangan. 'hadir' & 'titip' bebas
 *   (titip = tidak hadir fisik tapi iurannya tetap masuk).
 * - Sohibul Bait tidak pernah kena talangan (dia penerima, bukan pembayar).
 */
export function ringkasAbsensi(
  wargaList: Warga[],
  map: Record<string, AbsensiStatus>,
  sohibulId: string,
): RingkasanAbsensi {
  const statusOf = (id: string): AbsensiStatus => map[id] ?? 'tidak_hadir';

  const hadirCount = wargaList.filter(w => statusOf(w.id) === 'hadir').length;
  const titipCount = wargaList.filter(w => statusOf(w.id) === 'titip').length;
  const tidakCount = wargaList.filter(w => statusOf(w.id) === 'tidak_hadir').length;

  const pembayar = wargaList.filter(w => w.id !== sohibulId);
  const pembayarCount = pembayar.length;
  const talanganPembayar = pembayar.filter(w => statusOf(w.id) === 'tidak_hadir');

  return {
    hadirCount,
    titipCount,
    tidakCount,
    pembayarCount,
    talanganCount: talanganPembayar.length,
    kasTotal: pembayarCount * KAS_PER_PEMBAYAR,
    talanganTotal: talanganPembayar.length * TALANGAN_PER_ORANG,
    sohibulBaitTerima: pembayarCount * SOHIBUL_PER_PEMBAYAR,
    talanganIds: talanganPembayar.map(w => w.id),
    tidakHadirNama: talanganPembayar.map(w => w.nama),
  };
}
