import { supabase } from './supabase';
import type { AbsensiStatus, Tarikan, Warga } from './types';

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
}

export type TarikanRingkas = Pick<Tarikan, 'id' | 'nomor' | 'tanggal' | 'status' | 'sohibul_bait_id'> & {
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
  /** Tarikan selesai tempat warga ini jadi Sohibul Bait, terbaru di depan. */
  sudahMenerima: { nomor: number; tanggal: string }[];
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
  for (const t of talangan) {
    if (t.status_lunas) continue;
    const tr = dataTarikan.get(t.tarikan_id);
    if (!tr) continue;
    tunggakan.push({ nomor: tr.nomor, tanggal: tr.tanggal, nominal: t.nominal, penarik: tr.sohibul_bait?.nama ?? null });
  }
  tunggakan.sort((a, b) => a.nomor - b.nomor);

  const milikSaya = tarikan.filter((t) => t.sohibul_bait_id === wargaId);
  const sudahMenerima = milikSaya
    .filter((t) => t.status === 'selesai')
    .sort((a, b) => b.nomor - a.nomor)
    .map((t) => ({ nomor: t.nomor, tanggal: t.tanggal }));

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
    giliran,
  };
}

/** Daftar nama + seluruh tarikan. Melempar saat gagal — jangan jadikan [] diam-diam. */
export async function ambilDaftarKartu(): Promise<{ warga: Warga[]; tarikan: TarikanRingkas[] }> {
  const [w, t] = await Promise.all([
    supabase.from('warga').select('*').eq('status_aktif', true).order('nama', { ascending: true }),
    supabase.from('tarikan').select('id, nomor, tanggal, status, sohibul_bait_id, sohibul_bait:warga!sohibul_bait_id(nama)').order('nomor', { ascending: true }),
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
    supabase.from('talangan').select('tarikan_id, nominal, status_lunas').eq('warga_id', wargaId),
  ]);
  if (a.error) throw a.error;
  if (t.error) throw t.error;
  return { absensi: (a.data as BarisAbsensi[]) ?? [], talangan: (t.data as BarisTalangan[]) ?? [] };
}
