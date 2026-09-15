import { describe, expect, it } from 'vitest';
import { durasiTampil, jumlahKata, DURASI_DASAR_MS, DURASI_GALAT_MS, DURASI_BACA_MAKS_MS } from './toast';

describe('jumlahKata', () => {
  it('tanda baca berdiri sendiri bukan kata', () => {
    expect(jumlahKata('Gagal menyimpan transaksi. Cek koneksi lalu coba lagi — transaksinya belum tercatat.')).toBe(11);
  });
  it('nominal & nomor dihitung sbg kata', () => {
    expect(jumlahKata('Kas +Rp50.000 · tarikan #12')).toBe(4);
  });
  it('kosong = nol', () => expect(jumlahKata('   ')).toBe(0));
});

describe('durasiTampil', () => {
  it('pesan pendek memakai lantai dasar', () => {
    expect(durasiTampil({ message: 'Pemasukan tersimpan', type: 'success' })).toBe(DURASI_DASAR_MS);
  });

  it('galat pendek memakai lantai galat yang lebih tinggi', () => {
    expect(durasiTampil({ message: 'Gagal memperbarui data. Coba lagi.', type: 'error' })).toBe(DURASI_GALAT_MS);
  });

  it('galat terpanjang app (14 kata; tanda pisah bukan kata) hidup cukup lama untuk dibaca pada 200 kpm', () => {
    const pesan = 'Gagal menyimpan revisi — jadwalnya sudah diubah di perangkat lain. Muat ulang lalu coba lagi.';
    expect(jumlahKata(pesan)).toBe(14);
    expect(durasiTampil({ message: pesan, type: 'error' })).toBe(500 + 14 * 300);
  });

  it('pesan SUKSES panjang juga dipanjangkan — lantai bukan hak galat saja', () => {
    const pesan = 'Budi ditambahkan · lunas 12 tarikan · Kas +Rp600.000 dari tunggakan lama';
    expect(durasiTampil({ message: pesan, type: 'success' })).toBe(500 + jumlahKata(pesan) * 300);
  });

  it('durasi eksplisit (jendela Urungkan) dihormati sbg minimum', () => {
    expect(durasiTampil({ message: 'Semua ditandai hadir', type: 'info', duration: 5000, actionLabel: 'Urungkan' })).toBe(5000);
  });

  it('label aksi ikut dibaca', () => {
    const tanpa = durasiTampil({ message: 'a b c d e f g h i j', type: 'info', duration: 0 });
    const dengan = durasiTampil({ message: 'a b c d e f g h i j', type: 'info', duration: 0, actionLabel: 'Urungkan' });
    expect(dengan - tanpa).toBe(300);
  });

  it('waktu baca dipagari, tapi durasi eksplisit yang lebih panjang tidak dipotong', () => {
    const panjang = Array.from({ length: 60 }, (_, i) => `kata${i}`).join(' ');
    expect(durasiTampil({ message: panjang, type: 'error' })).toBe(DURASI_BACA_MAKS_MS);
    expect(durasiTampil({ message: panjang, type: 'info', duration: 15_000 })).toBe(15_000);
  });
});
