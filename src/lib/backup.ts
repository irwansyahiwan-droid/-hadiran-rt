import { supabase } from './supabase';
import { bacaSemua } from './bacaSemua';
import { tanggalHariIni, tanggalUtuh } from './utils';

/**
 * Backup & Restore data Hadiran RT.
 *
 * Backup  : unduh seluruh data operasional sebagai satu file JSON.
 * Restore : ganti TOTAL data dengan isi file backup (hapus lalu masukkan ulang
 *           sesuai urutan dependensi). Operasi destruktif — pakai konfirmasi kuat.
 *
 * audit_log sengaja TIDAK dibackup/restore (append-only via trigger, hanya bisa
 * dibaca). Restore tetap akan tercatat ringkas di Riwayat Aktivitas.
 */

/** Tabel yang di-backup, urut induk → anak.
 *
 *  Daftar ini WAJIB sama persis (isi & urutan) dgn `v_tables` di
 *  supabase/migrations/20260804000000_restore_atomik.sql — di sanalah urutan
 *  hapus/tulis benar-benar dijalankan. Di sini ia dipakai untuk MEMBACA
 *  (fetchBackup) dan mencacah (ringkasBackup) saja. Ada uji yang mengunci
 *  urutan ini supaya menambah tabel di salah satu tempat langsung terlihat. */
export const TABEL_BACKUP = ['warga', 'tarikan', 'absensi', 'talangan', 'transaksi_kas', 'kas_rt', 'pengaturan'] as const;
const TABLES = TABEL_BACKUP;

/** Nama tabel untuk MATA bendahara — chip jumlah di halaman Backup & Restore.
 *  Dulu chip mencetak nama tabel mentah ("transaksi_kas: 341", "kas_rt: 120");
 *  disetujui user 23 Okt 2026. `Record` atas `TABEL_BACKUP` membuat tabel baru
 *  tanpa nama gagal typecheck, bukan tampil mentah diam-diam. */
const NAMA_TABEL: Record<(typeof TABEL_BACKUP)[number], string> = {
  warga: 'Warga', tarikan: 'Tarikan', absensi: 'Absensi', talangan: 'Talangan',
  transaksi_kas: 'Kas Hadiran', kas_rt: 'Kas RT', pengaturan: 'Pengaturan',
};

export interface BackupFile {
  app: 'hadiran-rt';
  version: 1;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

export async function fetchBackup(): Promise<BackupFile> {
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const t of TABLES) {
    /* BERHALAMAN & KETAT (19 Okt 2026). `select('*')` polos dipotong Supabase
       di 1000 baris tanpa galat: backup hari itu memuat 1000 dari 1680 baris
       absensi, dan Restore ("ganti TOTAL") akan menghapus 680 catatan
       kehadiran. `ketat` menolak file yang jumlah barisnya tak sama dgn
       hitungan server — backup separuh lebih buruk daripada backup gagal. */
    tables[t] = await bacaSemua<Record<string, unknown>>(t, '*', { ketat: true, urut: t === 'pengaturan' ? 'key' : 'id' });
  }
  return { app: 'hadiran-rt', version: 1, exportedAt: new Date().toISOString(), tables };
}

export function downloadBackup(backup: BackupFile) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const tgl = tanggalHariIni(); // zona perangkat — `exportedAt` (ISO) itu UTC: backup dini hari bertanggal kemarin
  const a = document.createElement('a');
  a.href = url;
  a.download = `hadiran-rt-backup-${tgl}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ringkasBackup(b: BackupFile): { table: string; nama: string; count: number }[] {
  return TABLES.map((t) => ({ table: t, nama: NAMA_TABEL[t], count: b.tables[t]?.length ?? 0 }));
}

/** "23 Okt 2026" — tanggal LOKAL berkas cadangan dibuat. `exportedAt` itu ISO
 *  UTC: memotong 10 karakter pertamanya (cara lama, 23 Okt 2026) memberi tanggal
 *  KEMARIN untuk cadangan 00.00–07.00 WIB, dan "2026-10-22" patah di tanda
 *  hubung pada 320px. Tanggal rusak → kosong, bukan "Invalid Date". */
export function tanggalCadangan(exportedAt: string): string {
  const d = new Date(exportedAt);
  if (Number.isNaN(d.getTime())) return '';
  return tanggalUtuh(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }));
}

/** Validasi bentuk file backup. Lempar error bila tidak valid. */
export function validasiBackup(raw: unknown): BackupFile {
  const b = raw as BackupFile;
  if (!b || b.app !== 'hadiran-rt' || !b.tables || typeof b.tables !== 'object') {
    throw new Error('File bukan backup Hadiran RT yang valid.');
  }
  return b;
}

/**
 * Ganti TOTAL data dengan isi backup. Mengembalikan ringkasan jumlah baris yang
 * dipulihkan per tabel.
 *
 * SATU panggilan RPC, dan itu memang intinya — bukan gaya penulisan. Versi lama
 * menjalankan 7 DELETE lalu 7 INSERT sebagai request TERPISAH dari klien: tak
 * ada transaksi yang membungkusnya, jadi koneksi putus di tengah (hal biasa buat
 * bendahara dgn sinyal seadanya) meninggalkan database dgn **data lama sudah
 * terhapus dan data backup baru masuk separuh** — dan restore justru satu-
 * satunya jalan pulih saat ada insiden, jadi ia gagal tepat di saat paling
 * dibutuhkan. Badan plpgsql `pulihkan_backup()` = satu transaksi: gagal di baris
 * mana pun berarti batal semua, data lama utuh seperti tak pernah disentuh.
 * Fungsi itu juga mengarsipkan keadaan SEBELUM restore ke audit_log
 * (`backup_snapshot`) — atomik saja tak menolong kalau yang dipulihkan file
 * yang SALAH. Lihat supabase/migrations/20260804000000_restore_atomik.sql.
 *
 * JANGAN kembalikan urutan hapus/tulis ke klien "supaya bisa progress bar".
 * Urutan tabel & pemotongan baris kini tinggal di SQL; menduplikasinya di sini
 * berarti dua sumber kebenaran yang bisa berbeda diam-diam.
 */
export async function restoreBackup(b: BackupFile): Promise<{ table: string; count: number }[]> {
  const { data, error } = await supabase.rpc('pulihkan_backup', { p_backup: b });
  if (error) throw new Error(`Gagal memulihkan data: ${error.message}`);
  // `.rpc()` ikut jebakan yang sama dgn `.select()`: gagal TIDAK melempar. Hasil
  // yang bukan daftar = fungsi tak mengembalikan ringkasan yang dijanjikan;
  // melaporkannya sebagai sukses berarti bilang "pulih" tanpa tahu apa pun.
  if (!Array.isArray(data)) {
    throw new Error('Pemulihan tidak mengembalikan ringkasan — periksa data sebelum melanjutkan.');
  }
  return data as { table: string; count: number }[];
}
