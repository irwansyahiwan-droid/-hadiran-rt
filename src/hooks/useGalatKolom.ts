import { useEffect, useState } from 'react';
import { umumkanSaja } from '../lib/toast';

/**
 * Satu galat kolom per form: pesan di bawah kolom kosong PERTAMA, fokus pindah
 * ke kolom itu, `aria-invalid` + `aria-describedby` terpasang. Pasangan
 * `GalatKolom`. Kunci = `id` kolom isiannya, jadi fokus tak butuh ref.
 *
 * Form pemakainya WAJIB `noValidate`: `required` bawaan peramban memunculkan
 * gelembung berbahasa INGGRIS ("Please fill out this field.") dan menahan
 * submit SEBELUM handler app jalan — galat inline tak pernah sempat tampil.
 *
 * ── Kenapa fokus pindah di EFEK, bukan di `tampilkan` (14 Sep 2026) ────────
 * Versi pertama memanggil `focus()` langsung sesudah `setGalat`, di task yang
 * sama — jadi fokus MENDARAT sebelum React merender `aria-describedby` &
 * `aria-invalid`. Terukur lewat `focusin`: saat fokus tiba kolomnya
 * `describedby: null, invalid: null`. Pembaca layar membaca kolom PADA
 * peristiwa fokus, jadi pesannya tak pernah dibacakan (`audit:jaga-isian` B5).
 *
 * Dan kalau kolomnya SUDAH difokus (Enter di kolom kosong di dalam <form>),
 * `focus()` tak menghasilkan peristiwa apa pun: galatnya tampil, hening total
 * (B6). Kasus itu diumumkan lewat region live `polite` Toaster. Menutup lalu
 * memfokus ulang kolom SENGAJA tidak dipakai: di HP itu menutup & membuka
 * papan ketik di depan mata bendahara.
 *
 * `seq` membuat galat yang SAMA dua kali (Simpan diketuk lagi) tetap memicu
 * efeknya — objek baru, pengumuman baru.
 */
export function useGalatKolom() {
  const [galat, setGalat] = useState<{ kolom: string; pesan: string; seq: number } | null>(null);

  useEffect(() => {
    if (!galat) return;
    const el = document.getElementById(galat.kolom);
    if (!el) return;
    if (document.activeElement === el) umumkanSaja(galat.pesan);
    else el.focus();
  }, [galat]);

  const tampilkan = (kolom: string, pesan: string) =>
    setGalat((g) => ({ kolom, pesan, seq: (g?.seq ?? 0) + 1 }));

  /** Dipanggil dari `onChange` kolomnya — galat hilang begitu kolom disentuh. */
  const hapus = (kolom: string) => setGalat((g) => (g?.kolom === kolom ? null : g));

  const pesan = (kolom: string) => (galat?.kolom === kolom ? galat.pesan : null);

  const aria = (kolom: string) => (galat?.kolom === kolom
    ? { 'aria-invalid': true as const, 'aria-describedby': `${kolom}-galat` }
    : {});

  return { tampilkan, hapus, pesan, aria };
}
