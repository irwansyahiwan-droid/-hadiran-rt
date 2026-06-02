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
  const [wargaRes, tarikanRes, talanganRes, transaksiRes, jadwalRes] = await Promise.all([
    supabase.from('warga').select('id', { count: 'exact' }).eq('status_aktif', true),
    supabase.from('tarikan').select('*').order('nomor', { ascending: false }),
    supabase.from('talangan').select('nominal, status_lunas'),
    supabase.from('transaksi_kas').select('tipe, nominal'),
    supabase.from('jadwal').select('id', { count: 'exact' }).eq('status', 'terjadwal'),
  ]);

  const jumlahAnggota = wargaRes.count ?? 0;
  const tarikanList = tarikanRes.data ?? [];
  const talanganList = talanganRes.data ?? [];
  const transaksiList = transaksiRes.data ?? [];
  const jumlahJadwal = jadwalRes.count ?? 0;

  const totalTalanganBelumLunas = talanganList
    .filter((t) => !t.status_lunas)
    .reduce((sum, t) => sum + t.nominal, 0);

  const totalKasMasuk = transaksiList
    .filter((t) => t.tipe === 'kas_masuk')
    .reduce((sum, t) => sum + t.nominal, 0);

  const totalTalanganMasuk = transaksiList
    .filter((t) => t.tipe === 'talangan_masuk')
    .reduce((sum, t) => sum + t.nominal, 0);

  const totalSetor = transaksiList
    .filter((t) => t.tipe === 'setor_kas_rt')
    .reduce((sum, t) => sum + t.nominal, 0);

  const totalKasKeluar = transaksiList
    .filter((t) => t.tipe === 'kas_keluar')
    .reduce((sum, t) => sum + t.nominal, 0);

  const saldoAktif = totalKasMasuk + totalTalanganMasuk - totalSetor - totalKasKeluar;
  const totalKasTerkumpul = totalKasMasuk + totalTalanganMasuk;

  return {
    saldo_aktif: saldoAktif,
    total_talangan_belum_lunas: totalTalanganBelumLunas,
    total_setor_kas_rt: totalSetor,
    total_kas_terkumpul: totalKasTerkumpul,
    jumlah_anggota: jumlahAnggota,
    jumlah_tarikan: tarikanList.length,
    jumlah_jadwal: jumlahJadwal,
    tarikan_terakhir: tarikanList[0] ?? null,
  };
}
