import { describe, it, expect } from 'vitest';
import {
  KATEGORI_MASUK, KATEGORI_KELUAR,
  kategoriOpsi, kategoriDefault, labelKategori, labelKategoriSingkat,
} from './kategoriKasRt';

/**
 * Taksonomi ini menentukan PENGELOMPOKAN UANG di rekap in-app maupun PDF
 * pertanggungjawaban, tapi sampai 5 Agu 2026 tak punya uji sama sekali —
 * ketahuan saat menambah kategori "Setor Kas Musholah Al Jihad".
 *
 * Yang dikunci di sini bukan daftar isinya (itu memang akan tumbuh), melainkan
 * INVARIAN yang kalau rusak tak melempar error apa pun — cuma diam-diam salah
 * mengelompokkan uang di laporan yang sudah dibagikan ke warga.
 */

describe('invarian taksonomi', () => {
  for (const [nama, list] of [['masuk', KATEGORI_MASUK], ['keluar', KATEGORI_KELUAR]] as const) {
    it(`${nama}: key unik — key kembar membuat satu seksi menelan seksi lain`, () => {
      const keys = list.map((o) => o.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it(`${nama}: 'lainnya' ada dan PALING BAWAH (penampung selalu di ekor)`, () => {
      expect(keys(list)).toContain('lainnya');
      expect(list[list.length - 1].key).toBe('lainnya');
    });

    it(`${nama}: tiap opsi punya label & short yang terisi`, () => {
      for (const o of list) {
        expect(o.label.trim().length).toBeGreaterThan(0);
        expect(o.short.trim().length).toBeGreaterThan(0);
      }
    });

    it(`${nama}: default-nya benar-benar ada di daftar`, () => {
      expect(keys(list)).toContain(kategoriDefault(nama));
    });
  }

  const keys = (l: readonly { key: string }[]) => l.map((o) => o.key);

  it('kategoriOpsi memilih daftar sesuai tipe', () => {
    expect(kategoriOpsi('masuk')).toBe(KATEGORI_MASUK);
    expect(kategoriOpsi('keluar')).toBe(KATEGORI_KELUAR);
  });
});

describe('Setor Kas Musholah Al Jihad (pengeluaran rutin bulanan)', () => {
  const KEY = 'musholah_al_jihad';

  it('terdaftar sebagai kategori KELUAR, bukan masuk', () => {
    expect(KATEGORI_KELUAR.map((o) => o.key)).toContain(KEY);
    expect(KATEGORI_MASUK.map((o) => o.key)).not.toContain(KEY);
  });

  it('labelnya utuh di rekap & PDF', () => {
    expect(labelKategori('keluar', KEY)).toBe('Setor Kas Musholah Al Jihad');
    expect(labelKategoriSingkat('keluar', KEY)).toBe('Musholah');
  });

  /* `key` tersimpan apa adanya di kolom `kas_rt.kategori` (teks bebas, tanpa
     CHECK constraint di DB). Kalau seseorang mengganti namanya, transaksi lama
     tak error — ia cuma jatuh diam-diam ke "Belum dikategorikan" dan hilang
     dari seksi rekapnya. Uji ini menahan penggantian nama yang tak disengaja. */
  it('key-nya terkunci — mengganti nama key membuat transaksi lama tak terkategori', () => {
    expect(KATEGORI_KELUAR.some((o) => o.key === KEY)).toBe(true);
    expect(labelKategori('keluar', 'musholah')).toBe('Belum dikategorikan');
  });

  it('tidak menggeser urutan kategori lama', () => {
    const sebelum = KATEGORI_KELUAR.map((o) => o.key).filter((k) => k !== KEY);
    expect(sebelum).toEqual(['donasi_rawat_inap', 'pemeliharaan', 'sosial', 'lainnya']);
  });
});

describe('labelKategori — jalur tak dikenal', () => {
  it('null / undefined / key asing → "Belum dikategorikan" (mis. Saldo Awal)', () => {
    expect(labelKategori('masuk', null)).toBe('Belum dikategorikan');
    expect(labelKategori('masuk', undefined)).toBe('Belum dikategorikan');
    expect(labelKategori('keluar', 'entah_apa')).toBe('Belum dikategorikan');
  });

  it('versi singkatnya memakai kata yang berbeda ("Tak terkategori")', () => {
    expect(labelKategoriSingkat('keluar', null)).toBe('Tak terkategori');
  });

  /* Kategori MASUK & KELUAR punya ruang key sendiri: 'lainnya' sah di
     keduanya, tapi tak boleh saling meminjam label. */
  it('key kategori keluar tak terbaca sebagai kategori masuk', () => {
    expect(labelKategori('masuk', 'musholah_al_jihad')).toBe('Belum dikategorikan');
    expect(labelKategori('masuk', 'lainnya')).toBe('Lainnya');
    expect(labelKategori('keluar', 'lainnya')).toBe('Lain-lain');
  });
});
