import { supabase } from './supabase';
import type { AbsensiStatus, Tarikan, Warga } from './types';
import { KAS_PER_PEMBAYAR, SOHIBUL_PER_PEMBAYAR } from './absensiHitung';

/**
 * Kartu Warga ("Status Saya") — ringkasan satu warga: kehadiran, talangan, dan
 * giliran Sohibul Bait. HANYA-BACA: semua yang dihitung di sini sudah terlihat
 * warga di Jadwal, Hadiran, dan Talangan; kartu ini cuma menyusunnya per orang.
 *
 * Perhitungan dipisah dari pengambilan data (`susunKartu` murni) supaya aturan
 * bisnisnya bisa diuji tanpa Supabase.
 */

export interface BarisAbsensi {
  tarikan_id: string;
  status: AbsensiStatus;
}

export interface BarisTalangan {
  tarikan_id: string;
  nominal: number;
  status_lunas: boolean;
  tanggal_lunas?: string | null;
}

export type TarikanRingkas = Pick<Tarikan, 'id' | 'nomor' | 'tanggal' | 'status' | 'sohibul_bait_id'> & Partial<Pick<Tarikan, 'total_terkumpul'>> & {
  /** Nama penarik (Sohibul Bait) lewat relasi — ikut terbawa walau wargaNYA
   *  sudah tak aktif (daftar nama kartu hanya memuat warga aktif). */
  sohibul_bait?: { nama: string } | null;
};

export interface TunggakanKartu {
  nomor: number;
  tanggal: string;
  nominal: number;
  /** Sohibul Bait tarikan itu — warga mengingat tarikan lewat siapa penariknya,
   *  bukan lewat nomornya (permintaan user, 15 Okt 2026). null = tak diketahui. */
  penarik: string | null;
}

/** Talangan yang SUDAH lunas — riwayat, bukan kewajiban. */
export interface TalanganLunasKartu extends TunggakanKartu {
  tanggalLunas: string | null;
}

/** Satu tarikan SELESAI di jejak kehadiran. `sohibul` = warga ini penerimanya
 *  (absensinya tercatat 'hadir', dikunci); `kosong` = tak ada catatan absen
 *  (mis. anggota susulan sebelum ia bergabung). */
export type StatusJejak = AbsensiStatus | 'sohibul' | 'kosong';
export interface JejakKartu {
  nomor: number;
  tanggal: string;
  status: StatusJejak;
}

export interface GiliranKartu {
  nomor: number;
  tanggal: string;
  /** Tarikan yang belum selesai SEBELUM giliran ini (0 = tarikan berikutnya). */
  sisaSebelum: number;
}

export interface KartuWarga {
  /** Hanya tarikan SELESAI yang punya catatan hadir untuk warga ini. */
  hadir: number;
  titip: number;
  tidakHadir: number;
  tunggakan: TunggakanKartu[];
  totalTunggakan: number;
  /** Tarikan selesai tempat warga ini jadi Sohibul Bait, terbaru di depan.
   *  `pendapatanKotor` diturunkan dari `total_terkumpul` (porsi kas, pembayar ×
   *  Rp5.000) → pembayar × Rp45.000 — rumus yang SAMA dgn "Pendapatan Kotor SB"
   *  di Jadwal & PDF Pendapatan. null = total tak tersedia (jangan karang angka). */
  sudahMenerima: { nomor: number; tanggal: string; pendapatanKotor: number | null }[];
  /** Talangan yang sudah lunas, terbaru di depan. */
  talanganLunas: TalanganLunasKartu[];
  /** Semua tarikan SELESAI, urut nomor — satu titik per tarikan di jejak. */
  jejak: JejakKartu[];
  /** Giliran terdekat yang belum selesai; null = tak ada jadwal. */
  giliran: GiliranKartu | null;
}

export function susunKartu(
  wargaId: string,
  tarikan: TarikanRingkas[],
  absensi: BarisAbsensi[],
  talangan: BarisTalangan[],
): KartuWarga {
  const selesai = new Set(tarikan.filter((t) => t.status === 'selesai').map((t) => t.id));
  const dataTarikan = new Map(tarikan.map((t) => [t.id, t]));

  let hadir = 0;
  let titip = 0;
  let tidakHadir = 0;
  for (const a of absensi) {
    if (!selesai.has(a.tarikan_id)) continue;   // absensi tarikan yang belum final tak dihitung
    if (a.status === 'hadir') hadir++;
    else if (a.status === 'titip') titip++;
    else tidakHadir++;
  }

  const tunggakan: TunggakanKartu[] = [];
  const talanganLunas: TalanganLunasKartu[] = [];
  for (const t of talangan) {
    const tr = dataTarikan.get(t.tarikan_id);
    if (!tr) continue;
    const baris = { nomor: tr.nomor, tanggal: tr.tanggal, nominal: t.nominal, penarik: tr.sohibul_bait?.nama ?? null };
    if (t.status_lunas) talanganLunas.push({ ...baris, tanggalLunas: t.tanggal_lunas ?? null });
    else tunggakan.push(baris);
  }
  tunggakan.sort((a, b) => a.nomor - b.nomor);
  talanganLunas.sort((a, b) => b.nomor - a.nomor);

  const statusPer = new Map(absensi.map((a) => [a.tarikan_id, a.status]));
  const jejak: JejakKartu[] = tarikan
    .filter((t) => t.status === 'selesai')
    .sort((a, b) => a.nomor - b.nomor)
    .map((t) => ({
      nomor: t.nomor,
      tanggal: t.tanggal,
      status: t.sohibul_bait_id === wargaId ? 'sohibul' : (statusPer.get(t.id) ?? 'kosong'),
    }));

  const milikSaya = tarikan.filter((t) => t.sohibul_bait_id === wargaId);
  const sudahMenerima = milikSaya
    .filter((t) => t.status === 'selesai')
    .sort((a, b) => b.nomor - a.nomor)
    .map((t) => ({
      nomor: t.nomor,
      tanggal: t.tanggal,
      pendapatanKotor: typeof t.total_terkumpul === 'number' && t.total_terkumpul > 0
        ? Math.round(t.total_terkumpul / KAS_PER_PEMBAYAR) * SOHIBUL_PER_PEMBAYAR
        : null,
    }));

  const berikut = milikSaya
    .filter((t) => t.status !== 'selesai')
    .sort((a, b) => a.nomor - b.nomor)[0];
  const giliran: GiliranKartu | null = berikut
    ? {
        nomor: berikut.nomor,
        tanggal: berikut.tanggal,
        sisaSebelum: tarikan.filter((t) => t.status !== 'selesai' && t.nomor < berikut.nomor).length,
      }
    : null;

  return {
    hadir,
    titip,
    tidakHadir,
    tunggakan,
    totalTunggakan: tunggakan.reduce((n, t) => n + t.nominal, 0),
    sudahMenerima,
    talanganLunas,
    jejak,
    giliran,
  };
}

/** Daftar nama + seluruh tarikan. Melempar saat gagal — jangan jadikan [] diam-diam. */
export async function ambilDaftarKartu(): Promise<{ warga: Warga[]; tarikan: TarikanRingkas[] }> {
  const [w, t] = await Promise.all([
    supabase.from('warga').select('*').eq('status_aktif', true).order('nama', { ascending: true }),
    supabase.from('tarikan').select('id, nomor, tanggal, status, sohibul_bait_id, total_terkumpul, sohibul_bait:warga!sohibul_bait_id(nama)').order('nomor', { ascending: true }),
  ]);
  if (w.error) throw w.error;
  if (t.error) throw t.error;
  /* `as unknown`: supabase-js mengetik relasi `sohibul_bait` sbg ARRAY, padahal
     relasi banyak-ke-satu (FK `sohibul_bait_id`) dijawab PostgREST sbg OBJEK —
     terukur lawan DB hidup 15 Okt 2026 (#21 → {nama: "Carduki"}). */
  return { warga: (w.data as Warga[]) ?? [], tarikan: (t.data as unknown as TarikanRingkas[]) ?? [] };
}

/** Absensi + talangan satu warga. Melempar saat gagal. */
export async function ambilDataWarga(wargaId: string): Promise<{ absensi: BarisAbsensi[]; talangan: BarisTalangan[] }> {
  const [a, t] = await Promise.all([
    supabase.from('absensi').select('tarikan_id, status').eq('warga_id', wargaId),
    supabase.from('talangan').select('tarikan_id, nominal, status_lunas, tanggal_lunas').eq('warga_id', wargaId),
  ]);
  if (a.error) throw a.error;
  if (t.error) throw t.error;
  return { absensi: (a.data as BarisAbsensi[]) ?? [], talangan: (t.data as BarisTalangan[]) ?? [] };
}
