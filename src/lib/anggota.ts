import { supabase } from './supabase';
import { ringkasAbsensi, KAS_PER_PEMBAYAR, TALANGAN_PER_ORANG } from './absensiHitung';
import type { AbsensiStatus, Warga } from './types';

/**
 * Logika kelola anggota (warga) + pencatatan "anggota susulan".
 *
 * Anggota susulan = warga yang baru bergabung tapi SUDAH melunasi iuran
 * tarikan-tarikan lama. Mereka ditandai HADIR di tarikan terdahulu lalu
 * keuangan tarikan itu dihitung ulang.
 *
 * Penting — recomputeTarikan() memakai RUMUS yang sama dengan tombol "Hitung
 * Ulang" manual di Jadwal (satu sumber `ringkasAbsensi`: titip bebas talangan,
 * Sohibul Bait di luar akuntansi). Yang berbeda hanya CARA kerjanya:
 *   - Sumber kehadiran = baris `absensi` yang SUDAH tersimpan di DB
 *     (bukan dari layar yang bisa ter-toggle tak sengaja).
 *   - Tidak menulis ulang absensi anggota lain.
 *   - Talangan diubah secara MINIMAL-DIFF: baris talangan yang sudah ada
 *     (termasuk status lunasnya) tidak disentuh bila tidak perlu berubah.
 * Sehingga history talangan asli warga yang memang menunggak tetap utuh.
 */

export interface AnggotaInput {
  nama: string;
  no_rumah: string;
  no_hp: string;
  role: 'bendahara' | 'warga';
}

// Nominal uang = SATU SUMBER dari absensiHitung.ts (jangan duplikat angka).
const IURAN_KAS = KAS_PER_PEMBAYAR;       // Rp5.000 → Kas Hadiran per pembayar
const TALANGAN_NOMINAL = TALANGAN_PER_ORANG; // Rp50.000 talangan per pembayar absen

/** Tambah anggota baru. Mengembalikan baris warga yang baru dibuat. */
export async function tambahAnggota(input: AnggotaInput): Promise<Warga> {
  const { data, error } = await supabase
    .from('warga')
    .insert({
      nama: input.nama.trim(),
      no_rumah: input.no_rumah.trim(),
      no_hp: input.no_hp.trim(),
      role: input.role,
      status_aktif: true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Warga;
}

/** Ubah data anggota (nama / no rumah / no hp / role / status aktif). */
export async function updateAnggota(
  id: string,
  patch: Partial<AnggotaInput> & { status_aktif?: boolean }
): Promise<void> {
  const clean: Record<string, unknown> = {};
  if (patch.nama !== undefined) clean.nama = patch.nama.trim();
  if (patch.no_rumah !== undefined) clean.no_rumah = patch.no_rumah.trim();
  if (patch.no_hp !== undefined) clean.no_hp = patch.no_hp.trim();
  if (patch.role !== undefined) clean.role = patch.role;
  if (patch.status_aktif !== undefined) clean.status_aktif = patch.status_aktif;
  const { error } = await supabase.from('warga').update(clean).eq('id', id);
  if (error) throw error;
}

export interface RecomputeResult {
  nomor: number;
  pembayarCount: number;
  kasTerkumpul: number;
  hadirCount: number;
  talanganCount: number;
}

/**
 * Hitung ulang keuangan SATU tarikan dari data absensi yang tersimpan di DB.
 * Tidak menyentuh baris absensi mana pun. Talangan diubah minimal-diff
 * (hanya tambah/hapus yang benar-benar berubah; status lunas dipertahankan).
 */
export async function recomputeTarikan(tarikanId: string): Promise<RecomputeResult> {
  // 1) Data tarikan (untuk Sohibul Bait, nomor, tanggal)
  const { data: tarikan, error: tErr } = await supabase
    .from('tarikan')
    .select('id, nomor, tanggal, sohibul_bait_id')
    .eq('id', tarikanId)
    .single();
  if (tErr || !tarikan) throw tErr ?? new Error('Tarikan tidak ditemukan');
  const sohibulId = tarikan.sohibul_bait_id ?? '';

  // 2) Anggota aktif
  const { data: wargaRows } = await supabase
    .from('warga')
    .select('id')
    .eq('status_aktif', true);
  const activeIds = (wargaRows ?? []).map((w) => w.id as string);

  // 3) Kehadiran (sumber kebenaran = absensi tersimpan di DB)
  const { data: absRows } = await supabase
    .from('absensi')
    .select('warga_id, status')
    .eq('tarikan_id', tarikanId);
  const statusMap: Record<string, AbsensiStatus> = {};
  (absRows ?? []).forEach((a) => {
    statusMap[a.warga_id as string] = a.status as AbsensiStatus;
  });

  // Hitung lewat SATU SUMBER (ringkasAbsensi) — sama persis dgn alur "Proses"
  // di Jadwal: HANYA 'tidak_hadir' kena talangan (titip BEBAS talangan), Sohibul
  // Bait di luar akuntansi (uang & kehadiran). ringkasAbsensi hanya butuh id.
  const wargaLite = activeIds.map((id) => ({ id }) as Warga);
  const r = ringkasAbsensi(wargaLite, statusMap, sohibulId);
  const pembayarCount = r.pembayarCount;
  const kasTerkumpul = r.kasTotal;
  const hadirCount = r.hadirCount;
  const talanganIds = r.talanganIds;
  const talanganSet = new Set(talanganIds);

  // 4) Talangan — MINIMAL DIFF (jaga history & status lunas yang asli)
  const { data: existingTal } = await supabase
    .from('talangan')
    .select('id, warga_id')
    .eq('tarikan_id', tarikanId);
  const existingWarga = new Set((existingTal ?? []).map((t) => t.warga_id as string));

  // Hapus talangan warga yang kini hadir / bukan pembayar lagi
  const toRemove = (existingTal ?? [])
    .filter((t) => !talanganSet.has(t.warga_id as string))
    .map((t) => t.id as string);
  if (toRemove.length) await supabase.from('talangan').delete().in('id', toRemove);

  // Tambah talangan untuk pembayar absen yang belum punya baris
  const toAdd = talanganIds.filter((id) => !existingWarga.has(id));
  if (toAdd.length)
    await supabase.from('talangan').insert(
      toAdd.map((warga_id) => ({
        tarikan_id: tarikanId,
        warga_id,
        nominal: TALANGAN_NOMINAL,
        status_lunas: false,
        tanggal_lunas: null,
      }))
    );

  // 5) Kas Hadiran masuk — UPDATE bila ada (audit lebih bersih: nominal lama → baru)
  const keterangan = `Kas hadiran tarikan #${tarikan.nomor} (${pembayarCount} pembayar × Rp5.000)`;
  const { data: kasRow } = await supabase
    .from('transaksi_kas')
    .select('id')
    .eq('tarikan_id', tarikanId)
    .eq('tipe', 'kas_masuk')
    .maybeSingle();
  if (kasRow) {
    await supabase
      .from('transaksi_kas')
      .update({ nominal: kasTerkumpul, keterangan })
      .eq('id', kasRow.id);
  } else if (pembayarCount) {
    await supabase.from('transaksi_kas').insert({
      tipe: 'kas_masuk',
      nominal: kasTerkumpul,
      keterangan,
      tanggal: tarikan.tanggal,
      tarikan_id: tarikanId,
      saldo_setelah: 0,
    });
  }

  // 6) Update ringkasan tarikan
  await supabase
    .from('tarikan')
    .update({ status: 'selesai', total_hadir: hadirCount, total_terkumpul: kasTerkumpul })
    .eq('id', tarikanId);

  return {
    nomor: tarikan.nomor as number,
    pembayarCount,
    kasTerkumpul,
    hadirCount,
    talanganCount: talanganIds.length,
  };
}

export interface SusulanResult {
  tarikanCount: number;
  kasNaik: number; // total kenaikan Kas Hadiran (jumlah tarikan × Rp5.000)
}

/**
 * Tandai anggota (susulan) HADIR di tarikan-tarikan terpilih lalu hitung ulang.
 * Hanya menambah satu baris absensi 'hadir' per tarikan untuk anggota ini —
 * absensi & talangan warga lain tidak diutak-atik.
 */
export async function backfillAnggotaSusulan(
  wargaId: string,
  tarikanIds: string[]
): Promise<SusulanResult> {
  let kasNaik = 0;
  for (const tarikanId of tarikanIds) {
    await supabase
      .from('absensi')
      .upsert(
        { tarikan_id: tarikanId, warga_id: wargaId, status: 'hadir' },
        { onConflict: 'tarikan_id,warga_id' }
      );
    await recomputeTarikan(tarikanId);
    kasNaik += IURAN_KAS;
  }
  return { tarikanCount: tarikanIds.length, kasNaik };
}

/** Ambil daftar anggota (aktif & nonaktif) untuk halaman Kelola Anggota. */
export async function fetchAnggota(): Promise<Warga[]> {
  const { data, error } = await supabase
    .from('warga')
    .select('*')
    .order('status_aktif', { ascending: false })
    .order('nama', { ascending: true });
  if (error) throw error;
  return (data as Warga[]) ?? [];
}
