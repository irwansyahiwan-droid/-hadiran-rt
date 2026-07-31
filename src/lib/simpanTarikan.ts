import { supabase } from './supabase';
import { ringkasAbsensi } from './absensiHitung';
import { TALANGAN_PER_ORANG } from './absensiHitung';
import type { AbsensiStatus, Tarikan, Warga } from './types';

/** Hasil hitung yang dipakai kartu rincian pasca-simpan (ResultCard). */
export interface HasilSimpanTarikan {
  tarikanNomor: number;
  hadirCount: number;
  titipCount: number;
  /** Yang KENA talangan (tidak_hadir) — bukan sekadar "tidak hadir". */
  tidakCount: number;
  kasTotal: number;
  talanganTotal: number;
  sohibulBaitTerima: number;
  /** Nama pembayar 'tidak_hadir' — untuk kontrol cek-fisik bendahara. */
  tidakHadirNama: string[];
}

/**
 * Simpan absensi & tutup satu tarikan — jalur TULIS paling menentukan di app.
 *
 * Sebelumnya seluruh rantai ini hidup sebagai fungsi lokal di dalam komponen
 * `AbsensiView` (Jadwal.tsx), jadi tak bisa diuji tanpa merender React: yang
 * paling menentukan uang justru satu-satunya yang hanya terjaga lewat pembacaan
 * kode. Dipindah ke sini apa adanya — perilakunya tidak diubah — supaya bisa
 * dikunci `simpanTarikan.test.ts`.
 *
 * Empat tabel ditulis berurutan (absensi, talangan, transaksi_kas, tarikan).
 * Supabase TIDAK melempar saat gagal, jadi TIAP langkah wajib cek `error` lalu
 * throw; tanpa itu koneksi putus di tengah = data setengah tertulis dengan layar
 * yang mengaku sukses. Perbaikan penuh = RPC atomik seperti `batalkan_tarikan()`.
 *
 * ATURAN YANG PALING MAHAL BILA RUSAK: status lunas talangan dibaca DULU sebelum
 * baris talangan dihapus, lalu dipasang kembali. Tanpa itu, "Hitung Ulang" pada
 * tarikan lama akan me-reset warga yang SUDAH membayar jadi belum lunas — dan
 * mereka ditagih dua kali.
 */
export async function simpanTarikanSelesai(
  tarikan: Pick<Tarikan, 'id' | 'nomor' | 'tanggal'>,
  wargaList: Warga[],
  map: Record<string, AbsensiStatus>,
  sohibulId: string,
): Promise<HasilSimpanTarikan> {
  const tarikanId = tarikan.id;
  const pembayarList = wargaList.filter((w) => w.id !== sohibulId);
  // total_hadir = pembayar hadir (Sohibul Bait di luar akuntansi).
  const hadirIds = pembayarList.filter((w) => map[w.id] === 'hadir').map((w) => w.id);

  // Semua hitungan uang & talangan dari satu sumber teruji (absensiHitung) →
  // layar, PDF, dan data tersimpan tak pernah beda rumus.
  const r = ringkasAbsensi(wargaList, map, sohibulId);
  const { pembayarCount, kasTotal: kasTerkumpul, talanganIds } = r;

  // 1) Status lunas yang SUDAH ada — dibaca sebelum penghapusan (lihat catatan
  //    di atas: ini yang menjaga warga tak ditagih dua kali).
  const { data: existingLunas, error: eLunas } = await supabase
    .from('talangan')
    .select('warga_id, tanggal_lunas')
    .eq('tarikan_id', tarikanId)
    .eq('status_lunas', true);
  if (eLunas) throw eLunas;
  const lunasMap = new Map<string, string | null>(
    (existingLunas ?? []).map((t) => [t.warga_id as string, (t.tanggal_lunas as string | null) ?? null]),
  );

  // 2) Absensi — tulis ulang apa adanya untuk SEMUA anggota (termasuk Sohibul).
  const eDelAbs = (await supabase.from('absensi').delete().eq('tarikan_id', tarikanId)).error;
  if (eDelAbs) throw eDelAbs;
  const absensiRows = wargaList.map((w) => ({
    tarikan_id: tarikanId,
    warga_id: w.id,
    status: map[w.id] ?? 'tidak_hadir',
  }));
  if (absensiRows.length) {
    const { error } = await supabase.from('absensi').insert(absensiRows);
    if (error) throw error;
  }

  // 3) Talangan — hanya pembayar 'tidak_hadir'; status lunas lama dikembalikan.
  const eDelTal = (await supabase.from('talangan').delete().eq('tarikan_id', tarikanId)).error;
  if (eDelTal) throw eDelTal;
  if (talanganIds.length) {
    const { error } = await supabase.from('talangan').insert(
      talanganIds.map((warga_id) => ({
        tarikan_id: tarikanId,
        warga_id,
        nominal: TALANGAN_PER_ORANG,
        status_lunas: lunasMap.has(warga_id),
        tanggal_lunas: lunasMap.get(warga_id) ?? null,
      })),
    );
    if (error) throw error;
  }

  // 4) Kas masuk — dihapus dulu supaya Hitung Ulang tak menggandakan.
  const eDelTx = (await supabase.from('transaksi_kas').delete().eq('tarikan_id', tarikanId).eq('tipe', 'kas_masuk')).error;
  if (eDelTx) throw eDelTx;
  if (pembayarCount) {
    const { error } = await supabase.from('transaksi_kas').insert({
      tipe: 'kas_masuk',
      nominal: kasTerkumpul,
      keterangan: `Kas hadiran tarikan #${tarikan.nomor} (${pembayarCount} pembayar × Rp5.000)`,
      tanggal: tarikan.tanggal,
      tarikan_id: tarikanId,
      saldo_setelah: 0,
    });
    if (error) throw error;
  }

  // 5) Ringkasan tarikan.
  const eUpd = (await supabase.from('tarikan').update({
    status: 'selesai',
    total_hadir: hadirIds.length,
    total_terkumpul: kasTerkumpul,
  }).eq('id', tarikanId)).error;
  if (eUpd) throw eUpd;

  return {
    tarikanNomor: tarikan.nomor,
    hadirCount: r.hadirCount,
    titipCount: r.titipCount,
    tidakCount: r.talanganCount,
    kasTotal: r.kasTotal,
    talanganTotal: r.talanganTotal,
    sohibulBaitTerima: r.sohibulBaitTerima,
    tidakHadirNama: r.tidakHadirNama,
  };
}
