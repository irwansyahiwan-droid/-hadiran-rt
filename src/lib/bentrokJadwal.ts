import type { Tarikan } from './types';
import { tanggalHariIni } from './utils';

/**
 * Bentrok jadwal (20 Okt 2026) — dasar petunjuk amber di form Tambah & Revisi
 * jadwal. Terukur di data nyata hari itu: Tarikan #70 & #71 sama-sama 23 Okt
 * 2027, dan #71 tanpa Sohibul. Form tak pernah memberi tahu.
 *
 * Petunjuk, BUKAN galat: aturan RT memang lentur (jadwal ditukar H-1), dan
 * menukar dua tarikan melewati keadaan bentrok sesaat — menghalangi simpan
 * akan memaksa bendahara memakai tanggal palsu sebagai batu loncatan.
 */

/** Tarikan LAIN yang memakai tanggal yang sama. */
export function bentrokTanggal(list: Tarikan[], tanggal: string, kecualiId?: string): Tarikan | null {
  if (!tanggal) return null;
  return list.find((t) => t.id !== kecualiId && (t.tanggal ?? '').slice(0, 10) === tanggal) ?? null;
}

/** Tarikan LAIN yang Sohibul Bait-nya orang yang sama — giliran ganda. */
export function bentrokSohibul(list: Tarikan[], sohibulId: string, kecualiId?: string): Tarikan | null {
  if (!sohibulId) return null;
  return list.find((t) => t.id !== kecualiId && t.sohibul_bait_id === sohibulId) ?? null;
}

/** Tanggal bawaan tarikan BARU: seminggu sesudah tarikan terakhir — arisan
 *  berjalan mingguan. Jadwal yang sudah lewat semuanya (atau kosong) tak boleh
 *  menyarankan tanggal lampau, jadi lantainya hari ini. Aritmetika lewat
 *  komponen tanggal LOKAL, bukan `Date('YYYY-MM-DD')` (= UTC; lihat
 *  `tanggalHariIni`). */
export function tanggalBawaanBerikut(list: Tarikan[], hariIni: string = tanggalHariIni()): string {
  const terakhir = list.reduce((m, t) => {
    const d = (t.tanggal ?? '').slice(0, 10);
    return d > m ? d : m;
  }, '');
  if (!terakhir) return hariIni;
  const [y, mo, d] = terakhir.split('-').map(Number);
  const berikut = tanggalHariIni(new Date(y, mo - 1, d + 7));
  return berikut > hariIni ? berikut : hariIni;
}
