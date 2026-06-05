import { supabase } from './supabase';

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

// Urutan AMAN untuk INSERT (induk dulu). Hapus = kebalikannya (anak dulu).
const TABLES = ['warga', 'tarikan', 'absensi', 'talangan', 'transaksi_kas', 'kas_rt', 'pengaturan'] as const;
type TableName = (typeof TABLES)[number];

export interface BackupFile {
  app: 'hadiran-rt';
  version: 1;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

export async function fetchBackup(): Promise<BackupFile> {
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) throw new Error(`Gagal membaca ${t}: ${error.message}`);
    tables[t] = (data as Record<string, unknown>[]) ?? [];
  }
  return { app: 'hadiran-rt', version: 1, exportedAt: new Date().toISOString(), tables };
}

export function downloadBackup(backup: BackupFile) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const tgl = backup.exportedAt.slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hadiran-rt-backup-${tgl}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ringkasBackup(b: BackupFile): { table: string; count: number }[] {
  return TABLES.map((t) => ({ table: t, count: b.tables[t]?.length ?? 0 }));
}

/** Validasi bentuk file backup. Lempar error bila tidak valid. */
export function validasiBackup(raw: unknown): BackupFile {
  const b = raw as BackupFile;
  if (!b || b.app !== 'hadiran-rt' || !b.tables || typeof b.tables !== 'object') {
    throw new Error('File bukan backup Hadiran RT yang valid.');
  }
  return b;
}

async function deleteAll(t: TableName) {
  const key = t === 'pengaturan' ? 'key' : 'id';
  const { error } = await supabase.from(t).delete().not(key, 'is', null);
  if (error) throw new Error(`Gagal mengosongkan ${t}: ${error.message}`);
}

async function insertChunked(t: TableName, rows: Record<string, unknown>[]) {
  const SIZE = 500;
  for (let i = 0; i < rows.length; i += SIZE) {
    const chunk = rows.slice(i, i + SIZE);
    const { error } = await supabase.from(t).insert(chunk);
    if (error) throw new Error(`Gagal menulis ${t}: ${error.message}`);
  }
}

/**
 * Ganti TOTAL data dengan isi backup. Menghapus semua data lama lalu memasukkan
 * data backup. Mengembalikan ringkasan jumlah baris yang dipulihkan per tabel.
 */
export async function restoreBackup(b: BackupFile): Promise<{ table: string; count: number }[]> {
  // 1) Hapus anak → induk (kebalikan urutan insert) agar tidak melanggar FK.
  for (const t of [...TABLES].reverse()) {
    await deleteAll(t);
  }
  // 2) Masukkan induk → anak.
  const hasil: { table: string; count: number }[] = [];
  for (const t of TABLES) {
    const rows = b.tables[t] ?? [];
    if (rows.length) await insertChunked(t, rows);
    hasil.push({ table: t, count: rows.length });
  }
  return hasil;
}
