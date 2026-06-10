import { supabase } from './supabase';
import { formatRupiahPlain } from './utils';
import type { AktivitasLog } from './types';

/**
 * Mengubah baris audit_log mentah (lihat migrasi 20260605000000_audit_log.sql)
 * menjadi teks Indonesia yang enak dibaca warga awam. Semua di sini murni
 * presentasi — tidak ada akses DB selain fetchAktivitas().
 */

export type Accent = 'emerald' | 'rose' | 'amber' | 'blue';

export interface AktivitasView {
  title: string;                 // baris utama, mis. "Tambah Setoran"
  detail: string | null;         // keterangan / nama
  amount: number | null;         // nominal untuk ditampilkan (null bila tak relevan)
  changes: { label: string; from: string; to: string }[]; // diff untuk UPDATE
  actor: string;                 // siapa yang melakukan
  accent: Accent;
  actionLabel: string;           // Tambah / Ubah / Hapus
  tableLabel: string;            // Kas Hadiran / Kas RT / Tarikan / Talangan
  penjelasan: string | null;     // narasi alur/proses/pencatatan utk warga awam
}

const TIPE_KAS: Record<string, string> = {
  kas_masuk: 'Kas Masuk',
  kas_keluar: 'Kas Keluar',
  setor_kas_rt: 'Setor ke Kas RT',
  talangan_masuk: 'Talangan Masuk',
  talangan_keluar: 'Talangan Keluar',
};

const STATUS_TARIKAN: Record<string, string> = {
  dijadwalkan: 'Dijadwalkan',
  berlangsung: 'Berlangsung',
  selesai: 'Selesai',
};

const TABLE_LABEL: Record<string, string> = {
  transaksi_kas: 'Kas Hadiran',
  kas_rt: 'Kas RT',
  tarikan: 'Tarikan',
  talangan: 'Talangan',
  warga: 'Anggota',
};

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

/** Nama aktor yang ramah: pakai nama → bagian depan email → "Sistem". */
export function namaAktor(row: AktivitasLog): string {
  if (row.actor_name && row.actor_name.trim()) return row.actor_name.trim();
  const email = (row.actor_email ?? '').trim();
  if (!email || email === 'sistem') return 'Sistem';
  return email.split('@')[0];
}

export function formatWaktu(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatWaktuRelatif(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const hari = Math.floor(h / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return formatWaktu(dateStr);
}

const ACTION_LABEL: Record<AktivitasLog['action'], string> = {
  INSERT: 'Tambah',
  UPDATE: 'Ubah',
  DELETE: 'Hapus',
};

export function formatAktivitas(row: AktivitasLog): AktivitasView {
  const data = (row.new_data ?? row.old_data ?? {}) as Record<string, unknown>;
  const old = (row.old_data ?? {}) as Record<string, unknown>;
  const baru = (row.new_data ?? {}) as Record<string, unknown>;
  const actor = namaAktor(row);
  const tableLabel = TABLE_LABEL[row.table_name] ?? row.table_name;
  const actionLabel = ACTION_LABEL[row.action] ?? row.action;
  const accent: Accent =
    row.action === 'INSERT' ? 'emerald' : row.action === 'DELETE' ? 'rose' : 'amber';

  const changes: AktivitasView['changes'] = [];

  // Helper diff untuk UPDATE
  const diffNominal = () => {
    const a = num(old.nominal), b = num(baru.nominal);
    if (row.action === 'UPDATE' && a != null && b != null && a !== b)
      changes.push({ label: 'Nominal', from: formatRupiahPlain(a), to: formatRupiahPlain(b) });
  };
  const diffText = (key: string, label: string) => {
    const a = str(old[key]), b = str(baru[key]);
    if (row.action === 'UPDATE' && a !== b)
      changes.push({ label, from: a || '—', to: b || '—' });
  };

  switch (row.table_name) {
    case 'transaksi_kas': {
      const tipeRaw = str(data.tipe);
      const tipe = TIPE_KAS[tipeRaw] ?? 'Transaksi Kas';
      diffNominal();
      diffText('keterangan', 'Keterangan');
      let penjelasan: string;
      if (row.action === 'DELETE') penjelasan = `Transaksi ${tipe} dihapus — saldo Kas Hadiran dihitung ulang.`;
      else if (row.action === 'UPDATE') penjelasan = 'Transaksi Kas Hadiran diubah — saldo berjalan disesuaikan otomatis.';
      else if (tipeRaw === 'setor_kas_rt') penjelasan = 'Setoran dari Kas Hadiran ke Kas RT. Dicatat ganda: saldo Kas Hadiran berkurang, Kas RT bertambah dengan nilai sama.';
      else if (tipeRaw === 'kas_masuk') penjelasan = 'Iuran satu tarikan tercatat sebagai pemasukan Kas Hadiran (Rp5.000 per pembayar). Otomatis dibuat saat tarikan ditutup.';
      else if (tipeRaw === 'kas_keluar') penjelasan = 'Pengeluaran langsung dari Kas Hadiran — saldo berkurang.';
      else if (tipeRaw === 'talangan_masuk') penjelasan = 'Pelunasan talangan tercatat. Ini mengganti dana yang sempat ditalangi panitia, bukan pendapatan kas baru.';
      else penjelasan = 'Transaksi Kas Hadiran tercatat.';
      return {
        title: `${actionLabel} ${tipe}`,
        detail: str(data.keterangan) || null,
        amount: num(data.nominal),
        changes, actor, accent, actionLabel, tableLabel, penjelasan,
      };
    }
    case 'kas_rt': {
      const isKeluar = str(data.tipe) === 'keluar';
      const arah = isKeluar ? 'Keluar' : 'Masuk';
      diffNominal();
      diffText('keterangan', 'Keterangan');
      let penjelasan: string;
      if (row.action === 'DELETE') penjelasan = 'Transaksi Kas RT dihapus — saldo Kas RT dihitung ulang.';
      else if (row.action === 'UPDATE') penjelasan = 'Transaksi Kas RT diubah — saldo berjalan disesuaikan otomatis.';
      else if (isKeluar) penjelasan = 'Pengeluaran Kas RT (mis. kegiatan/operasional RT) — saldo Kas RT berkurang.';
      else penjelasan = 'Pemasukan Kas RT — bisa setoran dari Kas Hadiran atau iuran manual dari anggota di luar hadiran. Saldo Kas RT bertambah.';
      return {
        title: `${actionLabel} Kas RT ${arah}`,
        detail: str(data.keterangan) || null,
        amount: num(data.nominal),
        changes, actor, accent, actionLabel, tableLabel, penjelasan,
      };
    }
    case 'tarikan': {
      const nomor = str(data.nomor);
      if (row.action === 'UPDATE') {
        const sOld = str(old.status), sNew = str(baru.status);
        if (sOld !== sNew) {
          const keSelesai = sNew === 'selesai';
          return {
            title: `Tarikan #${nomor}: ${STATUS_TARIKAN[sOld] ?? sOld} → ${STATUS_TARIKAN[sNew] ?? sNew}`,
            detail: null, amount: num(baru.total_terkumpul),
            changes, actor, accent, actionLabel, tableLabel,
            penjelasan: keSelesai
              ? 'Tarikan ditutup. Iuran Rp5.000/pembayar masuk Kas Hadiran; anggota yang tidak hadir otomatis ditalangi panitia Rp50.000; Sohibul Bait menerima jatah dari para pembayar.'
              : 'Tarikan dikembalikan ke status terjadwal. Absensi, talangan, & kas masuk yang terkait tarikan ini ikut dihapus.',
          };
        }
        diffText('tanggal', 'Tanggal');
      }
      return {
        title: `${actionLabel} Tarikan #${nomor}`,
        detail: null,
        amount: num(data.total_terkumpul),
        changes, actor, accent, actionLabel, tableLabel,
        penjelasan:
          row.action === 'INSERT' ? 'Jadwal tarikan baru dibuat (status terjadwal). Belum ada iuran sampai tarikan ditutup.'
          : row.action === 'DELETE' ? 'Tarikan dihapus beserta absensi, talangan, & kas masuk turunannya.'
          : 'Jadwal/tanggal tarikan diperbarui.',
      };
    }
    case 'warga': {
      const nama = str(data.nama);
      let penjelasan = 'Data anggota diperbarui.';
      if (row.action === 'INSERT') penjelasan = 'Anggota baru terdaftar. Mulai ikut perhitungan iuran pada tarikan berikutnya.';
      else if (row.action === 'DELETE') penjelasan = 'Anggota dihapus dari master anggota.';
      if (row.action === 'UPDATE') {
        diffText('nama', 'Nama');
        diffText('no_rumah', 'No. Rumah');
        diffText('no_hp', 'No. HP');
        diffText('role', 'Peran');
        const aktifOld = old.status_aktif === true ? 'Aktif' : 'Nonaktif';
        const aktifNew = baru.status_aktif === true ? 'Aktif' : 'Nonaktif';
        if (aktifOld !== aktifNew) {
          changes.push({ label: 'Status', from: aktifOld, to: aktifNew });
          penjelasan = aktifNew === 'Nonaktif'
            ? 'Anggota dinonaktifkan (mis. mengundurkan diri). Tidak lagi dihitung di tarikan berikutnya — jumlah pembayar & iuran ikut menyesuaikan.'
            : 'Anggota diaktifkan kembali. Kembali masuk perhitungan iuran tarikan berikutnya.';
        }
      }
      return {
        title: `${actionLabel} Anggota${nama ? `: ${nama}` : ''}`,
        detail: str(data.no_rumah) || null,
        amount: null,
        changes, actor, accent, actionLabel, tableLabel, penjelasan,
      };
    }
    case 'talangan': {
      const lunas = baru.status_lunas === true;
      return {
        title: lunas ? 'Tandai Talangan Lunas' : 'Batalkan Pelunasan Talangan',
        detail: null,
        amount: num(data.nominal),
        changes, actor,
        accent: lunas ? 'emerald' : 'amber',
        actionLabel, tableLabel,
        penjelasan: lunas
          ? 'Anggota melunasi talangan Rp50.000. Dana panitia yang sempat menalangi terganti — dicatat agar utang anggota nol.'
          : 'Pelunasan talangan dibatalkan. Status anggota kembali "belum lunas".',
      };
    }
    default:
      return {
        title: `${actionLabel} ${tableLabel}`,
        detail: null, amount: num(data.nominal),
        changes, actor, accent, actionLabel, tableLabel, penjelasan: null,
      };
  }
}

export async function fetchAktivitas(limit = 200): Promise<AktivitasLog[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AktivitasLog[]) ?? [];
}
