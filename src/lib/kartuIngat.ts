/**
 * Ingatan Kartu Warga di HP ini: warga mana yang memilih "ini saya", plus
 * NAMANYA. Satu sumber untuk Kartu Warga (yang menulis) dan slide Kartu Warga
 * di carousel Beranda (yang membaca, untuk menyapa tanpa satu permintaan
 * jaringan pun di layar pertama).
 *
 * Tanpa akun & tanpa PIN (keputusan user): data kartu memang sudah terbuka
 * untuk semua warga. Storage bisa diblokir — semua akses dibungkus try/catch
 * dan app tetap jalan tanpa ingatan. Kunci `hadiran-kartu-warga` dipakai
 * sapuan (`audit:keadaan` "Kartu-Warga-diingat"): JANGAN diganti nama.
 */
const KUNCI = 'hadiran-kartu-warga';
const KUNCI_NAMA = 'hadiran-kartu-nama';

export function bacaPilihan(): string | null {
  try { return localStorage.getItem(KUNCI); } catch { return null; }
}

/** Nama warga yang diingat — HANYA untuk sapaan. Bisa basi (nama diubah
 *  bendahara); Kartu Warga sendiri selalu membaca nama dari DB. */
export function bacaNamaKartu(): string | null {
  try { return bacaPilihan() ? localStorage.getItem(KUNCI_NAMA) : null; } catch { return null; }
}

export function simpanPilihan(id: string | null, nama?: string) {
  try {
    if (id) {
      localStorage.setItem(KUNCI, id);
      if (nama) localStorage.setItem(KUNCI_NAMA, nama);
    } else {
      localStorage.removeItem(KUNCI);
      localStorage.removeItem(KUNCI_NAMA);
    }
  } catch { /* abaikan (storage diblokir) */ }
}
