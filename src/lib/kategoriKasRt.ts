// Kategori pertanggungjawaban Kas RT — sumber kebenaran tunggal (fixed taxonomy).
// Disimpan di kolom kas_rt.kategori (text). NULL = Saldo Awal / belum dikategorikan.
export type KasRtTipe = 'masuk' | 'keluar';

export interface KategoriOpsi { key: string; label: string; short: string; }

// Urutan array = urutan tampil di rekap & PDF. `short` = label ringkas utk chip baris.
export const KATEGORI_MASUK: KategoriOpsi[] = [
  { key: 'hadiran',     label: 'Dari Kas Hadiran',                        short: 'Kas Hadiran' },
  { key: 'iuran_warga', label: 'Iuran Warga (di luar anggota hadiran)',  short: 'Iuran Warga' },
  { key: 'lainnya',     label: 'Lainnya',                                 short: 'Lainnya' },
];

export const KATEGORI_KELUAR: KategoriOpsi[] = [
  { key: 'donasi_rawat_inap', label: 'Donasi Rawat Inap',                short: 'Rawat Inap' },
  { key: 'pemeliharaan',      label: 'Pemeliharaan Fasilitas Lingkungan', short: 'Pemeliharaan' },
  { key: 'sosial',            label: 'Sosial',                            short: 'Sosial' },
  /* Setoran RUTIN bulanan ke kas musholah (5 Agu 2026). Disisipkan SEBELUM
     'lainnya', bukan di puncak: urutan array ini = urutan seksi di rekap
     in-app & PDF, jadi menaruhnya di puncak akan menggeser tiga seksi yang
     sudah ada di tiap laporan lama tanpa alasan. 'lainnya' tetap paling
     bawah — ia penampung, dan penampung selalu di ekor.
     `key` tak boleh berubah setelah dipakai: ia tersimpan apa adanya di
     kolom `kas_rt.kategori` (teks bebas, tanpa CHECK constraint), jadi
     mengganti namanya membuat transaksi lama jatuh ke "Belum dikategorikan". */
  { key: 'musholah_al_jihad', label: 'Setor Kas Musholah Al Jihad',       short: 'Musholah' },
  { key: 'lainnya',           label: 'Lain-lain',                         short: 'Lain-lain' },
];

export function kategoriOpsi(tipe: KasRtTipe): KategoriOpsi[] {
  return tipe === 'masuk' ? KATEGORI_MASUK : KATEGORI_KELUAR;
}

// Kategori default saat form dibuka / ganti tipe (paling sering dipakai manual).
export function kategoriDefault(tipe: KasRtTipe): string {
  return tipe === 'masuk' ? 'iuran_warga' : 'lainnya';
}

// Label tampil. NULL/tak dikenal → "Belum dikategorikan" (mis. Saldo Awal).
export function labelKategori(tipe: KasRtTipe, key: string | null | undefined): string {
  if (!key) return 'Belum dikategorikan';
  return kategoriOpsi(tipe).find((o) => o.key === key)?.label ?? 'Belum dikategorikan';
}

// Label ringkas utk chip baris.
export function labelKategoriSingkat(tipe: KasRtTipe, key: string | null | undefined): string {
  if (!key) return 'Tak terkategori';
  return kategoriOpsi(tipe).find((o) => o.key === key)?.short ?? 'Tak terkategori';
}
