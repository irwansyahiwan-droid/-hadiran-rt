import type { ChangeEvent } from 'react';

/**
 * Kolom NOMINAL ber-pemisah ribuan ("1.500.000") — satu pemilik untuk ketiga
 * kolom uang bendahara (transaksi Kas RT, setor Kas Hadiran, target Kas RT).
 *
 * Kenapa ada: kolomnya diformat ulang TIAP ketikan, dan nilai yang diganti
 * dari kode melempar kursor ke UJUNG. Terukur 26 Sep 2026 di form Kas RT:
 * kursor sesudah "1" di "1.500.000", Backspace, ketik 2 → "5.000.002" (bukan
 * "2.500.000"); menyisipkan 0 dua kali di tengah "150.000" → "15.000.000".
 * Angka yang salah seperti itu terbaca sah dan bisa tersimpan.
 *
 * Obatnya menghitung kursor dalam DIGIT, bukan karakter: berapa digit di kiri
 * kursor sebelum diformat = berapa digit di kirinya sesudah diformat.
 */

export const formatNominal = (n: number): string => (n ? n.toLocaleString('id-ID') : '');

const digit = (s: string) => s.replace(/\D/g, '');

/**
 * Terapkan satu suntingan pada teks kolom. `teks`/`kursor` = keadaan DOM
 * sesudah suntingan, `teksLama` = teks terformat sebelumnya, `jenis` =
 * `InputEvent.inputType`. Mengembalikan nilai angka baru & jumlah digit di
 * kiri kursor.
 */
export function suntingNominal(
  teks: string,
  kursor: number,
  teksLama: string,
  jenis = '',
): { nilai: number; digitSebelum: number } {
  /* Menghapus PEMISAH tak mengubah angka — tanpa ini Backspace di
     "1.|500.000" tak berbuat apa-apa. Hapus digit tetangganya, searah tombol. */
  if (teks.length === teksLama.length - 1 && teksLama[kursor] === '.' && digit(teks) === digit(teksLama)) {
    if (jenis === 'deleteContentBackward' && kursor > 0) {
      teks = teks.slice(0, kursor - 1) + teks.slice(kursor);
      kursor -= 1;
    } else if (jenis === 'deleteContentForward') {
      teks = teks.slice(0, kursor) + teks.slice(kursor + 1);
    }
  }
  const angka = digit(teks);
  const sebelum = digit(teks.slice(0, kursor)).length;
  // Nol di depan dibuang `Number` — kursor ikut mundur sebanyak yang terbuang.
  const nol = angka.length - angka.replace(/^0+/, '').length;
  return { nilai: Number(angka) || 0, digitSebelum: sebelum - Math.min(nol, sebelum) };
}

/** Posisi karakter tepat SESUDAH digit ke-`digitSebelum` di teks terformat. */
export function posisiKursor(teksFormat: string, digitSebelum: number): number {
  if (digitSebelum <= 0) return 0;
  let n = 0;
  for (let i = 0; i < teksFormat.length; i++) {
    if (teksFormat[i] >= '0' && teksFormat[i] <= '9' && ++n === digitSebelum) return i + 1;
  }
  return teksFormat.length;
}

/**
 * `value` & `onChange` untuk `<input inputMode="numeric">` nominal. Kursor
 * dipulihkan di frame berikutnya — sesudah React merender teks terformat, dan
 * juga saat angka TAK berubah (huruf diketik): React mengembalikan nilai
 * kolom tanpa render, dan itu pun melempar kursor ke ujung.
 */
export function useKolomNominal(nilai: number, setNilai: (n: number) => void) {
  const value = formatNominal(nilai);
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const { nilai: baru, digitSebelum } = suntingNominal(
      el.value,
      el.selectionStart ?? el.value.length,
      value,
      (e.nativeEvent as InputEvent).inputType,
    );
    setNilai(baru);
    requestAnimationFrame(() => {
      if (document.activeElement !== el) return;
      const p = posisiKursor(el.value, digitSebelum);
      el.setSelectionRange(p, p);
    });
  };
  return { value, onChange };
}
