import { supabase } from './supabase';
import type { DashboardSummary } from './types';

export function formatRupiah(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('id-ID');
  if (amount < 0) return `-Rp${formatted}`;
  if (amount > 0) return `+Rp${formatted}`;
  return `Rp${formatted}`;
}

export function formatRupiahPlain(amount: number): string {
  return `Rp${Math.abs(amount).toLocaleString('id-ID')}`;
}

/** Haptic feedback ringan untuk interaksi utama (no-op bila perangkat tak mendukung). */
export function haptic(pattern: number | number[] = 8): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* abaikan */ }
  }
}

export function formatTanggal(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTanggalShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const [wargaRes, tarikanRes, talanganRes, transaksiRes] = await Promise.all([
    supabase.from('warga').select('id', { count: 'exact' }).eq('status_aktif', true),
    supabase.from('tarikan').select('*').order('nomor', { ascending: false }),
    supabase.from('talangan').select('nominal, status_lunas'),
    supabase.from('transaksi_kas').select('tipe, nominal'),
  ]);

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

  // Saldo = kas terkumpul − talangan belum lunas − setoran ke kas RT
  const saldoAktif = totalKasTerkumpul - totalTalanganBelumLunas - totalSetor;

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
