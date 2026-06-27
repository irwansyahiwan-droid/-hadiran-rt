/**
 * Status kehadiran anggota pada satu tarikan.
 * - hadir       : hadir fisik, bayar          → tidak talangan
 * - titip       : tidak hadir, iuran masuk     → tidak talangan
 * - tidak_hadir : tidak hadir, iuran tidak ada → kena talangan Rp50.000
 */
export type AbsensiStatus = 'hadir' | 'titip' | 'tidak_hadir';

export interface Warga {
  id: string;
  nama: string;
  no_rumah: string;
  no_hp: string;
  role: 'bendahara' | 'warga';
  status_aktif: boolean;
  created_at: string;
}

export interface Tarikan {
  id: string;
  nomor: number;
  tanggal: string;
  jumlah_per_orang: number;
  total_hadir: number;
  total_warga: number;
  sohibul_bait_id: string | null;
  status: 'dijadwalkan' | 'berlangsung' | 'selesai';
  total_terkumpul: number;
  created_at: string;
  sohibul_bait?: Warga;
}

export interface Talangan {
  id: string;
  warga_id: string;
  tarikan_id: string;
  nominal: number;
  status_lunas: boolean;
  tanggal_lunas: string | null;
  created_at: string;
  warga?: Warga;
  tarikan?: Tarikan;
}

export interface TransaksiKas {
  id: string;
  tipe: 'kas_masuk' | 'kas_keluar' | 'setor_kas_rt' | 'talangan_masuk' | 'talangan_keluar';
  nominal: number;
  keterangan: string;
  tanggal: string;
  warga_id: string | null;
  tarikan_id: string | null;
  saldo_setelah: number;
  created_at: string;
  warga?: Warga;
  tarikan?: Tarikan;
}

export interface KasRT {
  id: string;
  tipe: 'masuk' | 'keluar';
  nominal: number;
  keterangan: string;
  tanggal: string;
  tarikan_id: string | null;
  kategori: string | null;   // lihat lib/kategoriKasRt.ts; NULL = Saldo Awal / belum dikategorikan
  saldo_setelah: number;
  created_at: string;
}

export interface AktivitasLog {
  id: string;
  table_name: 'transaksi_kas' | 'kas_rt' | 'tarikan' | 'talangan' | string;
  record_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardSummary {
  saldo_aktif: number;
  total_talangan_belum_lunas: number;
  total_setor_kas_rt: number;
  total_kas_terkumpul: number;
  jumlah_anggota: number;
  jumlah_tarikan: number;
  jumlah_dijadwalkan: number;
  tarikan_terakhir: Tarikan | null;
}
