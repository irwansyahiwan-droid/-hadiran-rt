import { supabase } from './supabase';
import type { AbsensiStatus } from './types';

/**
 * Baca absensi yang SUDAH tersimpan untuk satu tarikan selesai.
 *
 * Dipakai saat bendahara membuka kembali editor absensi tarikan lama (revisi /
 * Hitung Ulang). Sebelumnya query ini hidup inline di `AbsensiView` dan hanya
 * mengambil `data` — errornya dibuang.
 *
 * Kenapa itu jalur TULIS, bukan sekadar baca: layar mengawali SEMUA anggota
 * sebagai 'tidak_hadir' lalu menimpanya dengan baris yang terbaca. Query gagal
 * (koneksi putus, RLS menolak) mengembalikan `{data: null, error}` tanpa
 * melempar, jadi tak ada baris yang menimpa dan seluruh ~79 anggota tampil
 * tidak hadir — persis seperti tarikan yang memang nihil kehadiran. Bendahara
 * yang menekan Simpan dari layar itu menuliskan talangan Rp50.000 ke semua
 * orang dan menghapus kehadiran asli.
 *
 * Karena itu helper ini MELEMPAR. Pemanggilnya wajib memasang ErrorState, bukan
 * meneruskan peta kosong ke layar yang bisa disimpan.
 */
export async function fetchAbsensiTersimpan(
  tarikanId: string
): Promise<Record<string, AbsensiStatus>> {
  const { data, error } = await supabase
    .from('absensi')
    .select('warga_id, status')
    .eq('tarikan_id', tarikanId);
  if (error) throw error;
  const map: Record<string, AbsensiStatus> = {};
  for (const a of (data ?? []) as { warga_id: string; status: string }[]) {
    map[a.warga_id] = a.status as AbsensiStatus;
  }
  return map;
}
