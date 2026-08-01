import { supabase } from './supabase';
import { hitungSaldoHadiran } from './utils';
import type { DashboardSummary } from './types';

/**
 * Ringkasan angka Beranda. Dipisah dari `lib/utils.ts` (31 Jul) karena utils
 * di-import oleh layar LOGIN (untuk `haptic`), dan satu-satunya pemakai
 * Supabase di sana adalah fungsi ini — akibatnya klien Supabase (34 KB gzip)
 * ikut terseret ke jalur kritis boot padahal gate warga sepenuhnya lokal.
 * Diukur di 400 kbps/CPU 4×: chunk itu selesai di 3369 ms dari total 4138 ms
 * "siap-pakai". Memindahnya = memangkas satu unduhan penuh sebelum kolom sandi
 * bisa dipakai.
 */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const [wargaRes, tarikanRes, talanganRes, transaksiRes] = await Promise.all([
    supabase.from('warga').select('id', { count: 'exact' }).eq('status_aktif', true),
    supabase.from('tarikan').select('*').order('nomor', { ascending: false }),
    supabase.from('talangan').select('nominal, status_lunas'),
    supabase.from('transaksi_kas').select('tipe, nominal'),
  ]);

  // Sama seperti helper laporan: `.select()` tak melempar, jadi tanpa cek ini
  // satu query gagal jadi ringkasan Rp0 yang tampil sebagai fakta di hero
  // Beranda. Pemanggilnya (Beranda.load) sudah menangkap & memasang ErrorState.
  const gagal = wargaRes.error ?? tarikanRes.error ?? talanganRes.error ?? transaksiRes.error;
  if (gagal) throw gagal;

  const jumlahAnggota = wargaRes.count ?? 0;
  const tarikanList = tarikanRes.data ?? [];
  const talanganList = talanganRes.data ?? [];
  const transaksiList = transaksiRes.data ?? [];
  const jumlahJadwal = tarikanList.filter((t: { status: string }) => t.status === 'dijadwalkan').length;

  const totalTalanganBelumLunas = talanganList
    .filter((t) => !t.status_lunas)
    .reduce((sum, t) => sum + t.nominal, 0);

  const totalSetor = transaksiList
    .filter((t) => t.tipe === 'setor_kas_rt')
    .reduce((sum, t) => sum + t.nominal, 0);

  // Kas Hadiran Terkumpul = SUM(tarikan.total_terkumpul) tarikan selesai
  const totalKasTerkumpul = tarikanList
    .filter((t: { status: string }) => t.status === 'selesai')
    .reduce((sum: number, t: { total_terkumpul: number }) => sum + (t.total_terkumpul ?? 0), 0);

  // Saldo = kas terkumpul − talangan belum lunas − setoran ke kas RT (satu sumber)
  const saldoAktif = hitungSaldoHadiran(totalKasTerkumpul, totalTalanganBelumLunas, totalSetor);

  return {
    saldo_aktif: saldoAktif,
    total_talangan_belum_lunas: totalTalanganBelumLunas,
    total_setor_kas_rt: totalSetor,
    total_kas_terkumpul: totalKasTerkumpul,
    jumlah_anggota: jumlahAnggota,
    jumlah_tarikan: tarikanList.filter((t: { status: string }) => t.status === 'selesai').length,
    jumlah_dijadwalkan: jumlahJadwal,
    tarikan_terakhir: tarikanList[0] ?? null,
  };
}
