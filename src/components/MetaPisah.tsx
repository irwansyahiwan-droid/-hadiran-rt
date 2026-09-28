import type { ReactNode } from 'react';

/**
 * Baris meta berpemisah "·" ("28 Agu · Kas Hadiran", "Talangan · Tarikan #18")
 * yang boleh MELIPAT tanpa titik menggantung.
 *
 * Kenapa ada (28 Sep 2026): digabung jadi satu teks lewat `join(' · ')`, baris
 * seperti ini patah di SESUDAH titiknya — "Talangan ·" / "Tarikan #18" di
 * daftar transaksi Beranda @360px, dan hampir tiap baris mutasi Kas RT @320px
 * ("28 Agu ·" / "Kas Hadiran"). Satu titik yatim per baris, berulang ke bawah.
 *
 * Tiap bagian membawa pemisahnya di DEPAN (`::before`), dan barisnya digeser ke
 * kiri selebar satu pemisah di dalam wadah `overflow: hidden` — jadi pemisah
 * bagian PERTAMA di tiap baris (termasuk baris lipatan) selalu terpotong di
 * tepi kiri. Titik hanya tampil DI ANTARA dua bagian yang sebaris. Lihat
 * `.meta-pisah` di index.css.
 *
 * Pembaca layar & `innerText` mendengar/membaca " · " yang sama seperti dulu:
 * titik `::before` ber-teks-alternatif kosong, pemisah yang dibaca ada di
 * `.sr-only`.
 */
export default function MetaPisah({
  bagian,
  className = '',
  as: Tag = 'p',
}: {
  bagian: ReadonlyArray<ReactNode>;
  className?: string;
  as?: 'p' | 'span';
}) {
  const isi = bagian.filter((b) => b !== null && b !== undefined && b !== false && !(typeof b === 'string' && b.trim() === ''));
  return (
    <Tag className={`meta-pisah ${className}`}>
      <span>
        {isi.map((b, i) => (
          <span key={i}>
            {i > 0 && <span className="sr-only"> · </span>}
            {b}
          </span>
        ))}
      </span>
    </Tag>
  );
}
