import { formatRupiahPlain, formatTanggal } from './utils';

/**
 * Pengingat via WhatsApp menggunakan deep-link wa.me — tanpa backend.
 * Bendahara klik tombol → WhatsApp terbuka dengan nomor & pesan terisi,
 * tinggal tekan kirim. Untuk broadcast (tanpa nomor) WhatsApp menampilkan
 * pemilih kontak/grup.
 */

/** Normalisasi nomor HP Indonesia ke format wa.me: 62xxxxxxxxxx (tanpa + / 0 / spasi). */
export function normalizeWa(noHp: string | null | undefined): string | null {
  if (!noHp) return null;
  const d = noHp.replace(/\D/g, '');
  if (d.length < 8) return null;
  if (d.startsWith('62')) return d;
  if (d.startsWith('0')) return '62' + d.slice(1);
  if (d.startsWith('8')) return '62' + d;
  return d;
}

/**
 * Buka WhatsApp dengan pesan terisi. Bila `noHp` valid → langsung ke nomor itu;
 * bila tidak → broadcast (pemilih kontak). Mengembalikan true jika memakai nomor
 * spesifik, false jika broadcast (berguna untuk memberi tahu nomor HP kosong).
 */
export function openWa(noHp: string | null | undefined, message: string): boolean {
  const num = normalizeWa(noHp);
  const base = num ? `https://wa.me/${num}` : 'https://wa.me/';
  window.open(`${base}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  return !!num;
}

export interface TalanganItem {
  nomor: number | null | undefined;
  nominal: number;
}

/** Pesan tagihan talangan untuk satu warga (bisa beberapa tarikan sekaligus). */
export function pesanTalangan(nama: string, items: TalanganItem[], total: number): string {
  const rincian = items
    .map((i) => `• Tarikan #${i.nomor ?? '-'}: ${formatRupiahPlain(i.nominal)}`)
    .join('\n');
  return (
    `Assalamu'alaikum, Bapak/Ibu *${nama}* 🙏\n\n` +
    `Pengingat talangan arisan *Hadiran RT 004/006* yang belum lunas:\n` +
    `${rincian}\n\n` +
    `Total: *${formatRupiahPlain(total)}*\n\n` +
    `Mohon dapat segera diselesaikan. Terima kasih banyak. 🙏`
  );
}

/** Pesan pengingat jadwal tarikan (untuk dibagikan ke grup RT). */
export function pesanTarikan(nomor: number, tanggal: string, sohibul: string, iuran?: number): string {
  const baris = [
    `🔔 *Pengingat Arisan Hadiran RT 004/006*\n`,
    `Tarikan ke-*${nomor}*`,
    `🗓️ ${formatTanggal(tanggal)}`,
    `🏠 Sohibul Bait: *${sohibul}*`,
  ];
  if (iuran && iuran > 0) baris.push(`💵 Iuran: *${formatRupiahPlain(iuran)}* / orang`);
  baris.push(`\nMohon kehadiran & kesiapannya ya. Yang berhalangan hadir dikenakan talangan. Terima kasih 🙏`);
  return baris.join('\n');
}
