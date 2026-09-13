import { useRef, useState } from 'react';

/**
 * Penjaga isian form yang belum tersimpan: tutup lewat jalur APA PUN (Back HP,
 * ketuk latar, seret turun, Escape, tombol Batal/X) memunculkan
 * `ConfirmDestruktif` kalau isiannya sudah berubah. Isian yang belum disentuh
 * tetap tertutup langsung — penjaga yang bertanya tiap kali akan dilatih untuk
 * diabaikan.
 *
 * Kenapa ada (13 Sep 2026, temuan audit Web Interface Guidelines): tujuh sheet
 * tulis & editor Absensi membuang isian tanpa tanya. Taruhan tertingginya
 * Absensi — Back HP di tengah menandai puluhan anggota membuang semuanya.
 *
 * ── Jebakan back-stack yang WAJIB dipahami sebelum menyentuh ini ──────────
 * Back HP memakan entri history SEBELUM `close()` lapisan dipanggil
 * (`stack.pop()` di `useBackDismiss`). Kalau sheet cuma bertanya lalu TETAP
 * terbuka, ia tak lagi terdaftar: Back berikutnya jatuh ke lapisan di bawahnya
 * (entri tab → pindah ke Beranda → halaman & form-nya ter-unmount) atau keluar
 * app. Karena itu `backAktif` dimatikan SELAMA dialog bertanya — pendaftaran
 * dilepas dgn rapi (atau sudah dilepas Back) — lalu dinyalakan lagi saat
 * "Lanjut mengisi", yang mendorong entri baru. React menjalankan semua cleanup
 * efek sebelum efek baru, dan antrean `pendingBack/opQueue` di useBackDismiss
 * menyerialkan back()→pushState, jadi urutan history tetap benar di ketiga
 * jalur (Back, latar, tombol). Dijaga `npm run audit:mundur`.
 *
 * Pemakaian:
 *   const jaga = useJagaIsian(berubah, () => drag.dismiss());
 *   const drag = useDragDismiss(onClose, { cegahTutup: jaga.cegahTutup });
 *   useBackDismiss(jaga.backAktif, jaga.mintaTutup);
 *   const dlg = useDialog(true, { onClose: jaga.mintaTutup, … });
 *   … latar/Batal/X → jaga.mintaTutup
 *   <ConfirmDestruktif open={jaga.tanya} onClose={jaga.lanjut} onConfirm={jaga.buang} batalLabel="Lanjut mengisi" … />
 */
export function useJagaIsian(berubah: boolean, tutup: () => void) {
  const [tanya, setTanya] = useState(false);
  const [membuang, setMembuang] = useState(false);
  const berubahRef = useRef(berubah);
  berubahRef.current = berubah;
  const tutupRef = useRef(tutup);
  tutupRef.current = tutup;
  /* Sinkron, bukan state: `buang()` memanggil `tutup()` di task yang sama, dan
     jalur tutup mana pun yang menyusul sebelum render berikutnya (Escape yang
     ikut ditangkap useDialog sheet) tak boleh membuka dialog lagi. */
  const membuangRef = useRef(false);

  const mintaTutup = () => {
    if (berubahRef.current && !membuangRef.current) { setTanya(true); return; }
    tutupRef.current();
  };

  /** Untuk `useDragDismiss`: true = seretan DITAHAN (panel kembali, dialog muncul). */
  const cegahTutup = () => {
    if (!berubahRef.current || membuangRef.current) return false;
    setTanya(true);
    return true;
  };

  const buang = () => {
    membuangRef.current = true;
    setMembuang(true);
    setTanya(false);
    tutupRef.current();
  };

  const lanjut = () => setTanya(false);

  return { tanya, mintaTutup, cegahTutup, buang, lanjut, backAktif: !tanya && !membuang };
}
