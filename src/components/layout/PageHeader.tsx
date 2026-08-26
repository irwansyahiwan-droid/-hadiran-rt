import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { haptic } from '../../lib/utils';

/**
 * Kepala halaman DI DALAM cangkang app (punya Header + bottom-nav) — Kas Hadiran,
 * Kas RT, Jadwal, Talangan.
 *
 * Sebelum 30 Jul 2026 ada empat dialek untuk pekerjaan yang sama: Kas Hadiran &
 * Kas RT punya judul + tanggal + toolbar, Jadwal warga TAK punya judul sama
 * sekali (langsung hero), dan Talangan cuma menampilkan baris "← Kembali" tanpa
 * nama halaman. Warga yang membuka lewat pintasan Beranda jadi mendarat di layar
 * tanpa identitas. Sekarang satu anatomi: [kembali] judul (+info) / subjudul,
 * aksi menempel kanan.
 *
 * BUKAN pengganti `OverlayHeader` — itu untuk halaman overlay layar-penuh yang
 * menggantikan cangkang app (sticky, punya safe-area sendiri). Yang ini mengalir
 * biasa di dalam kolom konten.
 *
 * SATU sumber kebenaran — jangan salin markup kepala halaman lagi.
 */
export default function PageHeader({
  title,
  subtitle,
  info,
  onBack,
  actions,
}: {
  title: string;
  /** Baris kecil di bawah judul, mis. "Per 30 Juli 2026". */
  subtitle?: ReactNode;
  /** Slot setelah judul — biasanya `<InfoTip>`. */
  info?: ReactNode;
  /** Bila ada, panah kembali muncul di kiri judul. */
  onBack?: () => void;
  /** Tombol/menu di kanan (muat-ulang, Ekspor, dsb). */
  actions?: ReactNode;
}) {
  return (
    /* gap-2, bukan gap-3: kepala Jadwal bendahara memuat judul + TIGA aksi
         (muat ulang, PDF, "+ Jadwal") dan di 360px sisa ruang judul pas-pasan —
         tiap 4px jarak di sini langsung memakan huruf terakhir judul. */
    /* `flex-wrap` = katup pengaman. Judul sudah `min-w-0 truncate`, tapi grup
       aksinya `shrink-0` — jadi saat teks dasar browser 200% grup itu sendiri
       melebar melampaui viewport (terukur 335px di layar 360px) dan tak ada
       yang bisa mengalah lagi. Di lebar normal keduanya muat sebaris, jadi
       tampilan tak bergerak. */
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {onBack && (
          <button
            onClick={() => { haptic(); onBack(); }}
            aria-label="Kembali"
            className="press -ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0">
          {/* Judul halaman MENGALIR antara dua anak tangga nyata: lantai `subtitle`
              (18px), langit-langit `title` (22px). Bukan nilai karangan — keduanya
              peran yang ada di tangga.

              Kenapa tak dipaku 22px: header Jadwal membawa TIGA aksi (muat ulang,
              PDF, + Jadwal). Terukur `audit:potong` @390px, judul 22px kurang
              2,4px dan berakhir "Jadwal Tarika…". Komentar di berkas ini sudah
              pernah memperingatkannya untuk 18px; menaikkan ukurannya begitu saja
              mengulang cacat yang sama.

              Jadi tabrakan judul-halaman vs judul-seksi diselesaikan DI MANA ADA
              RUANG, dan mengalah dengan anggun di mana tidak. Yang membatasi
              bukan tipografinya — melainkan tiga tombol itu. */}
          <h1 className="flex min-w-0 items-center gap-1 text-[clamp(1.125rem,4.9vw,1.375rem)] leading-[1.25] tracking-[-0.015em] font-bold text-ink dark:text-gray-100">
            {/* truncate DI SPAN, bukan di h1: h1 juga wadah InfoTip — kalau
                truncate dipasang di sana, tombol info ikut terpotong. */}
            <span className="potong-lentur">{title}</span>
            {info}
          </h1>
          {subtitle && <p className="mt-0.5 text-caption angka-prosa text-ink-faint dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {/* `flex-wrap` + `justify-end` di GRUP aksinya sendiri: `shrink-0` menjaga
          aksi tak tergencet oleh judul (itu memang niatnya), tapi ia juga
          berarti grup ini tak pernah mengalah — dan saat teks 200% grup berisi
          dua aksi melebar ke 335px sedangkan ruang isi halaman cuma 296px.
          Melipat ISI grup mengecilkan lebar naturalnya tanpa mengorbankan
          prioritas judul; `justify-end` menjaga aksi tetap rata kanan. */}
      {actions && <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}
