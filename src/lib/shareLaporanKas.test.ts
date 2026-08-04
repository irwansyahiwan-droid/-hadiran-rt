import { describe, it, expect } from 'vitest';
import { rpBertanda, nominalHeroKartu } from './shareLaporanKas';

/**
 * Kartu laporan kas = artefak yang KELUAR dari app: bendahara membagikannya ke
 * grup WA tiap tutup buku / triwulan. Berkas ini sebelumnya tanpa uji sama
 * sekali, dan dua aturan di dalamnya bukan tata letak melainkan UANG — jadi
 * itulah yang dikunci di sini. Menggambar kanvasnya sendiri tak diuji (butuh
 * canvas nyata); yang diuji adalah keputusan yang menentukan ANGKA apa yang
 * tercetak dan dengan tanda apa.
 */

describe('nominalHeroKartu — angka utama kartu', () => {
  const dasar = { rtSaldoAkhir: 17_157_000 };

  it('memakai saldo Kas RT sebagai angka utama', () => {
    expect(nominalHeroKartu(dasar)).toBe(17_157_000);
  });

  /* Uji INTI berkas ini. Kas Hadiran yang belum disetor sudah tampil terpisah
     di panel; menjumlahkannya ke hero berarti menghitung uang yang sama dua
     kali di kartu yang dibaca puluhan warga. Kalau suatu saat ada yang
     "merapikan" hero jadi total gabungan, uji ini yang menahannya. */
  it('TIDAK menjumlahkan saldo Kas Hadiran yang belum disetor', () => {
    const hasil = nominalHeroKartu({ ...dasar, hadiranSaldoAkhir: 4_830_000 } as { rtSaldoAkhir: number });
    expect(hasil).toBe(17_157_000);
    expect(hasil).not.toBe(17_157_000 + 4_830_000);
  });

  it('saldo minus diteruskan apa adanya (kartu memang boleh defisit)', () => {
    expect(nominalHeroKartu({ rtSaldoAkhir: -390_000 })).toBe(-390_000);
  });
});

describe('rpBertanda — tanda minus tak boleh hilang', () => {
  it('negatif dapat satu minus di DEPAN "Rp", bukan di dalam angka', () => {
    expect(rpBertanda(-390_000)).toBe('-Rp390.000');
    expect(rpBertanda(-1_250_000)).toBe('-Rp1.250.000');
  });

  it('positif & nol tanpa tanda', () => {
    expect(rpBertanda(390_000)).toBe('Rp390.000');
    expect(rpBertanda(0)).toBe('Rp0');
  });

  /* `formatRupiahPlain` di baliknya memakai Math.abs — kalau seseorang melepas
     prefiks tanda di sini, minusnya lenyap TANPA error: kartu defisit tampil
     seperti surplus. Itu skenario kegagalan paling mahal di berkas ini. */
  it('minus tak pernah tertelan Math.abs', () => {
    expect(rpBertanda(-50_000)).not.toBe(rpBertanda(50_000));
    expect(rpBertanda(-50_000).startsWith('-')).toBe(true);
  });

  it('pemisah ribuan gaya Indonesia (titik), bukan koma', () => {
    expect(rpBertanda(1_000_000)).toBe('Rp1.000.000');
    expect(rpBertanda(-1_000_000)).toContain('.');
    expect(rpBertanda(1_000_000)).not.toContain(',');
  });
});
