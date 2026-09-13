import { useState } from 'react';

/**
 * Satu galat kolom per form: pesan di bawah kolom kosong PERTAMA, fokus pindah
 * ke kolom itu, `aria-invalid` + `aria-describedby` terpasang. Pasangan
 * `GalatKolom`. Kunci = `id` kolom isiannya, jadi fokus tak butuh ref.
 *
 * Form pemakainya WAJIB `noValidate`: `required` bawaan peramban memunculkan
 * gelembung berbahasa INGGRIS ("Please fill out this field.") dan menahan
 * submit SEBELUM handler app jalan — galat inline tak pernah sempat tampil.
 */
export function useGalatKolom() {
  const [galat, setGalat] = useState<{ kolom: string; pesan: string } | null>(null);

  const tampilkan = (kolom: string, pesan: string) => {
    setGalat({ kolom, pesan });
    document.getElementById(kolom)?.focus();
  };

  /** Dipanggil dari `onChange` kolomnya — galat hilang begitu kolom disentuh. */
  const hapus = (kolom: string) => setGalat((g) => (g?.kolom === kolom ? null : g));

  const pesan = (kolom: string) => (galat?.kolom === kolom ? galat.pesan : null);

  const aria = (kolom: string) => (galat?.kolom === kolom
    ? { 'aria-invalid': true as const, 'aria-describedby': `${kolom}-galat` }
    : {});

  return { tampilkan, hapus, pesan, aria };
}
