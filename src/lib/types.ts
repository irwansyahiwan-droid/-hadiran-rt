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
  created_at: string;
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

export interface Jadwal {
  id: string;
  warga_id: string;
  tanggal: string;
  keterangan: string;
  status: 'terjadwal' | 'selesai' | 'dibatalkan';
  nominal: number;
  created_at: string;
  warga?: Warga;
}

export interface DashboardSummary {
  saldo_aktif: number;
  total_talangan_belum_lunas: number;
  total_setor_kas_rt: number;
  total_kas_terkumpul: number;
  jumlah_anggota: number;
  jumlah_tarikan: number;
  jumlah_jadwal: number;
  tarikan_terakhir: Tarikan | null;
}
