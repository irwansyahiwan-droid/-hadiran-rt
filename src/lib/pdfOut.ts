import type jsPDF from 'jspdf';

/**
 * Mengeluarkan PDF dengan cara yang andal di HP.
 *
 * `doc.save()` bawaan jsPDF sering gagal diam-diam di mobile (iOS / PWA
 * standalone): file dibuat tapi unduhan tak muncul. Di sini:
 *  1) HP (pointer kasar) → Web Share API: file PDF bisa disimpan ke Files
 *     atau langsung dibagikan ke WhatsApp/Drive.
 *  2) Desktop / bila share tak tersedia → unduh langsung via <a download>.
 *
 * Catatan: agar Web Share diizinkan (butuh "user activation"), modul generator
 * sebaiknya di-preload sehingga `await import(...)` saat klik hanya microtask.
 */
export async function outputPdf(doc: jsPDF, filename: string): Promise<void> {
  const blob = doc.output('blob');
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

  if (coarse && typeof navigator !== 'undefined' && 'canShare' in navigator) {
    try {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        // HANYA files — tanpa title/text. WhatsApp menolak share yang campur
        // file + title/text ("mental balik" dari WA tanpa lampiran); share
        // files-only diterima. Nama file sudah deskriptif sebagai pengganti.
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) {
      // User membatalkan share → jangan fallback ke unduh
      if ((e as Error)?.name === 'AbortError') return;
      // Error lain → lanjut ke fallback unduh
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
