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
