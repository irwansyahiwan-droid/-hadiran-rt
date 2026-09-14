import { showToast } from './toast';

/**
 * Bagikan tautan HALAMAN (tab) yang sedang dibuka — item "Bagikan halaman ini"
 * di Menu. Kata-kata disetujui user 14 Sep 2026.
 *
 * Yang dikirim: TEKS + URL, bukan berkas. (Kebalikan dari `pdfOut.ts`, yang
 * WAJIB files-only karena WA mental tanpa lampiran bila title/text ikut —
 * aturan itu milik BERKAS; tautan justru butuh teks supaya pesannya terbaca.)
 * `title` sengaja tak dipakai: sebagian target menempelkan title DAN text
 * sehingga judulnya dobel di chat.
 *
 * Tanpa lembar bagikan (laptop bendahara, peramban lama) → salin ke papan klip.
 * Membatalkan lembar bagikan (`AbortError`) BUKAN kegagalan: warga menutupnya
 * dgn sengaja, jadi tak ada toast dan tak ada salinan diam-diam.
 *
 * Latch modul: ketukan ganda memanggil `navigator.share` kedua saat lembar
 * pertama masih terbuka → ditolak `InvalidStateError` → jatuh ke jalur salin
 * dan memunculkan toast "disalin" untuk ketukan yang tak diminta.
 */
let sedangBagikan = false;

export async function bagikanHalaman(label: string, path: string): Promise<void> {
  if (sedangBagikan) return;
  sedangBagikan = true;
  try {
    const url = new URL(path, window.location.origin).href;
    const teks = `${label} · Hadiran RT 004/006`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: teks, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        // lembar bagikan tak tersedia di konteks ini → salin
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast(`Tautan halaman ${label} disalin — tempel di WhatsApp.`);
    } catch {
      showToast('Tautan belum tersalin. Salin dari kolom alamat di atas.', 'error');
    }
  } finally {
    sedangBagikan = false;
  }
}
