import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatRupiah, formatRupiahPlain, maskRp, hitungSaldoHadiran, pesanError,
} from './utils';

/**
 * Formatter uang & penerjemah error — dipakai hampir di setiap layar, dan
 * sebelum berkas ini tak satu pun punya uji. Yang dikunci di sini bukan "apakah
 * fungsinya jalan", tapi KONVENSI yang gampang dilanggar tanpa terlihat:
 *
 *  - `formatRupiah` MEMBAWA tanda (+/−) — dipakai untuk mutasi.
 *  - `formatRupiahPlain` MEMBUANG tanda — dipakai untuk nominal netral.
 *    Kalau yang kedua dipakai di tempat yang butuh tanda, minus HILANG dan
 *    saldo −Rp400.000 terbaca sebagai Rp400.000. Itu bukan salah ketik yang
 *    kelihatan; itu angka yang tampak sah tapi terbalik artinya. Uji di bawah
 *    menuliskan perbedaan itu berdampingan supaya tak bisa dianggap sama.
 *  - `maskRp` wajib MEMPERTAHANKAN tanda saat menyensor — mode privasi tak
 *    boleh mengubah arah uang, hanya menyembunyikan besarnya.
 *  - `pesanError` tak boleh membocorkan pesan SQL mentah ke warga.
 */

describe('formatRupiah — tanda ikut, sesuai arah uang', () => {
  it('positif diberi +, negatif diberi −, nol tanpa tanda', () => {
    expect(formatRupiah(50_000)).toBe('+Rp50.000');
    expect(formatRupiah(-50_000)).toBe('-Rp50.000');
    expect(formatRupiah(0)).toBe('Rp0');
  });

  it('pemisah ribuan gaya Indonesia (titik, bukan koma)', () => {
    expect(formatRupiah(17_566_000)).toBe('+Rp17.566.000');
  });
});

describe('formatRupiahPlain — SENGAJA tanpa tanda', () => {
  it('nominal negatif keluar tanpa minus — inilah alasan ia tak boleh dipakai untuk saldo', () => {
    expect(formatRupiahPlain(-400_000)).toBe('Rp400.000');
    // pasangannya, untuk perbandingan langsung:
    expect(formatRupiah(-400_000)).toBe('-Rp400.000');
  });
});

describe('maskRp — sensor privasi tak boleh mengubah arah uang', () => {
  it('tanda dipertahankan, angka disensor', () => {
    expect(maskRp('-Rp400.000', true, 4)).toBe('-Rp••••');
    expect(maskRp('+Rp50.000', true, 4)).toBe('+Rp••••');
    expect(maskRp('Rp50.000', true, 4)).toBe('Rp••••');
  });

  it('saat tidak disembunyikan, teks asli utuh', () => {
    expect(maskRp('-Rp400.000', false)).toBe('-Rp400.000');
  });

  it('lebar sensor mengikuti argumen `dots`', () => {
    expect(maskRp('Rp1', true, 6)).toBe('Rp••••••');
  });
});

describe('hitungSaldoHadiran — satu sumber rumus saldo', () => {
  it('terkumpul − talangan belum lunas − setoran', () => {
    expect(hitungSaldoHadiran(5_000_000, 750_000, 1_000_000)).toBe(3_250_000);
  });

  it('boleh MINUS — talangan ditutup penuh dari kas, itu memang modelnya', () => {
    expect(hitungSaldoHadiran(100_000, 500_000, 0)).toBe(-400_000);
  });
});

describe('pesanError — kode SQL diterjemahkan, tak pernah bocor mentah', () => {
  afterEach(() => vi.restoreAllMocks());
  const bisu = () => vi.spyOn(console, 'error').mockImplementation(() => {});

  it('duplikat (23505) jadi kalimat manusia', () => {
    bisu();
    expect(pesanError({ code: '23505', message: 'duplicate key value violates...' }))
      .toBe('Data ini sudah ada — tidak bisa ditambah dua kali.');
  });

  it('RLS/izin (42501) mengarahkan ke peran Bendahara', () => {
    bisu();
    expect(pesanError({ code: '42501' })).toContain('Bendahara');
  });

  it('jaringan putus dibedakan dari server yang lama menjawab', () => {
    bisu();
    expect(pesanError({ message: 'Failed to fetch' })).toContain('Periksa internet');
    expect(pesanError({ name: 'TimeoutError' })).toBe('Server lama tak menjawab. Coba lagi.');
    expect(pesanError({ name: 'AbortError' })).toBe('Server lama tak menjawab. Coba lagi.');
  });

  it('error tak dikenal jatuh ke fallback, BUKAN ke pesan aslinya', () => {
    bisu();
    const pesan = pesanError({ message: 'ERROR: relation "tarikan" does not exist' }, 'Gagal menyimpan');
    expect(pesan).toBe('Gagal menyimpan');
    expect(pesan).not.toContain('relation');
  });

  it('detail mentah tetap dicatat ke console untuk diagnosa', () => {
    const spy = bisu();
    pesanError({ code: '23505' });
    expect(spy).toHaveBeenCalled();
  });
});
