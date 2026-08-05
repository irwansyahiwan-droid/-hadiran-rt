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

});

describe('Kegiatan Perayaan HUT RI 17 Agustusan', () => {
  const KEY = 'hut_ri';

  it('terdaftar sebagai kategori KELUAR, bukan masuk', () => {
    expect(KATEGORI_KELUAR.map((o) => o.key)).toContain(KEY);
    expect(KATEGORI_MASUK.map((o) => o.key)).not.toContain(KEY);
  });

  it('labelnya utuh di rekap & PDF', () => {
    expect(labelKategori('keluar', KEY)).toBe('Kegiatan Perayaan HUT RI 17 Agustusan');
    expect(labelKategoriSingkat('keluar', KEY)).toBe('HUT RI');
  });

  it('key-nya terkunci — mengganti nama key membuat transaksi lama tak terkategori', () => {
    expect(KATEGORI_KELUAR.some((o) => o.key === KEY)).toBe(true);
    expect(labelKategori('keluar', 'hut_ri_17')).toBe('Belum dikategorikan');
  });
});

/* Uji ini dulu menyamakan seluruh daftar dgn satu array literal, jadi ia PECAH
   tiap kali kategori baru ditambah — padahal yang mau dijaga bukan "daftarnya
   tak berubah" (ia memang tumbuh), melainkan "kategori LAMA tak bergeser
   relatif satu sama lain". Kini yang diperiksa urutan RELATIF, sehingga
   penambahan berikutnya tak perlu menyunting uji ini lagi. */
describe('penambahan kategori tak menggeser urutan kategori lama', () => {
  const urutanRelatif = (semua: string[], sebagian: string[]) =>
    semua.filter((k) => sebagian.includes(k));

  it('keluar: rawat inap → pemeliharaan → sosial, dan lainnya paling akhir', () => {
    const keys = KATEGORI_KELUAR.map((o) => o.key);
    expect(urutanRelatif(keys, ['donasi_rawat_inap', 'pemeliharaan', 'sosial']))
      .toEqual(['donasi_rawat_inap', 'pemeliharaan', 'sosial']);
    expect(keys[keys.length - 1]).toBe('lainnya');
  });

  it('masuk: hadiran → iuran_warga, dan lainnya paling akhir', () => {
    const keys = KATEGORI_MASUK.map((o) => o.key);
    expect(urutanRelatif(keys, ['hadiran', 'iuran_warga'])).toEqual(['hadiran', 'iuran_warga']);
    expect(keys[keys.length - 1]).toBe('lainnya');
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
