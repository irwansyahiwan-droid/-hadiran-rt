import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDownUp, Check } from 'lucide-react';
import { haptic, sisiPopover } from '../lib/utils';
import { useExitAnim } from '../lib/hooks';
import { useBackDismiss } from '../hooks/useBackDismiss';

interface ChipOption<T extends string> {
  id: T;
  label: string;
}

/**
 * Sort opsional di kanan. Dua bentuk:
 *  - `onCycle`  : tombol siklus (cocok utk 2 state — kedua state terlihat 1 tap).
 *  - `options`  : popover daftar (WAJIB utk 3+ state — state tak boleh tersembunyi
 *                 di balik tombol siklus yg harus ditebak/diketuk berulang).
 */
type SortProp<S extends string> =
  | { label: string; onCycle: () => void }
  | { value: S; options: readonly ChipOption<S>[]; onChange: (id: S) => void };

interface FilterChipsProps<T extends string, S extends string> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Tombol sort opsional, menempel di belakang chip. */
  sort?: SortProp<S>;
  className?: string;
}

/**
 * Baris filter chip seragam untuk seluruh halaman (Beranda, Kas RT, Kas Hadiran,
 * Talangan, Riwayat). Touch target 44px (WCAG 2.5.5 / Apple HIG), warna brand
 * terpusat, haptic per tap. SATU sumber kebenaran — jangan salin markup chip lagi.
 */
export default function FilterChips<T extends string, S extends string = string>({
  options,
  value,
  onChange,
  sort,
  className = '',
}: FilterChipsProps<T, S>) {
  const [sortOpen, setSortOpen] = useState(false);
  /* Sisi buka popover urutan dihitung saat dibuka (`sisiPopover`). Dulu dipaku
     rata KANAN — benar selama tombolnya di ujung kanan baris, tapi di 320/360px
     tombol itu turun ke KIRI baris kedua dan popover keluar 38px dari layar. */
  const [sisiSort, setSisiSort] = useState<'kiri' | 'kanan'>('kanan');
  const sortRef = useRef<HTMLDivElement>(null);
  const sortMounted = useExitAnim(sortOpen);

  /* Back HP menutup popover urutan (paritas dgn Escape di bawah). */
  useBackDismiss(sortOpen, () => setSortOpen(false));

  // Escape menutup popover urutan (keyboard).
  useEffect(() => {
    if (!sortOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSortOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sortOpen]);
  const sortLabel = sort
    ? 'options' in sort
      ? (sort.options.find((o) => o.id === sort.value)?.label ?? sort.options[0]?.label ?? '')
      : sort.label
    : '';

  /* SORT RINGKAS — ikon saja, HANYA saat tombol berlabel akan jatuh SENDIRIAN
     ke baris kedua (26 Sep 2026). Terukur: di 390px Kas Hadiran ("Terbaru")
     & Talangan ("Tunggakan"), dan di 360px Kas RT, ketiga chip muat sebaris
     tapi tombol urutan tidak — ia turun ke baris kedua dan berdiri sendirian,
     52px tinggi untuk satu kontrol sekunder. Dua obat lama sudah dibuang di
     atas (geser-mendatar menyembunyikan chip; `ml-auto` terbaca jebol).
     Yang ini tak menyembunyikan satu chip pun: yang mengalah hanya LABEL
     urutan, dan labelnya tetap ada di `aria-label` + di popover (dgn tanda
     centang) begitu diketuk. Karena itu ringkas HANYA berlaku untuk bentuk
     `options` — tombol SIKLUS yang kehilangan labelnya menyembunyikan
     keadaannya sama sekali.

     Diukur, bukan ditebak lewat breakpoint: lebar label bergantung KATA
     ("Terbaru" 106px, "Tunggakan" 127px), jadi keputusannya lahir dari lebar
     nyata chip + label urutan (`measureText` dgn huruf chip itu sendiri —
     tanpa elemen pengukur tersembunyi yang bisa ikut terpungut sapuan).
     Kalau chip sendiri sudah melipat, urutan memang menyambung di baris
     kedua (bukan yatim) → tetap berlabel. */
  const wadahRef = useRef<HTMLDivElement>(null);
  const [ringkas, setRingkas] = useState(false);
  const bisaRingkas = !!sort && 'options' in sort;
  const kunciChip = options.map((o) => o.label).join('|');
  useLayoutEffect(() => {
    const wadah = wadahRef.current;
    if (!bisaRingkas || !wadah) { setRingkas(false); return; }
    const kanvas = document.createElement('canvas').getContext('2d');
    const hitung = () => {
      const chips = [...wadah.querySelectorAll<HTMLElement>('[data-chip]')];
      if (!chips.length || !kanvas) return;
      const gap = parseFloat(getComputedStyle(wadah).columnGap) || 0;
      const lebar = wadah.clientWidth;
      const lebarChip = chips.reduce((a, c) => a + c.getBoundingClientRect().width, 0) + gap * (chips.length - 1);
      const gaya = getComputedStyle(chips[0]);
      kanvas.font = gaya.font;
      /* Setelan jarak teks pengguna (§1.4.12) melebarkan huruf; tanpa ini
         label diukur terlalu sempit dan urutan kembali jatuh sendirian. */
      if ('letterSpacing' in kanvas) (kanvas as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = gaya.letterSpacing === 'normal' ? '0px' : gaya.letterSpacing;
      /* Anatomi tombol berlabel: px-4 ×2 + ikon 14 + gap-2 + border 1 ×2. */
      const penuh = kanvas.measureText(sortLabel).width + 32 + 14 + 8 + 2;
      const IKON = 44;
      const yatim = lebarChip <= lebar && lebarChip + gap + penuh > lebar;
      setRingkas(yatim && lebarChip + gap + IKON <= lebar);
    };
    hitung();
    const ro = new ResizeObserver(hitung);
    ro.observe(wadah);
    wadah.querySelectorAll('[data-chip]').forEach((c) => ro.observe(c));
    /* Font web tiba sesudah ukur pertama → lebar chip berubah. */
    document.fonts?.ready.then(hitung).catch(() => {});
    return () => ro.disconnect();
  }, [bisaRingkas, sortLabel, kunciChip]);

  return (
    /* SATU baris flex yang MEMBUNGKUS — chip & tombol urutan bersaudara langsung
       (30 Jul). Dua perubahan sekaligus, dan keduanya saling bergantung:
       (1) varian geser-mendatar + fade tepi dibuang. Di 360–390px fade itu
           menelan chip ketiga ("Lunas" di Talangan & Kas Hadiran) sampai separuh
           → terbaca seperti kontrol rusak; filter yang tak terlihat = tak ada.
       (2) grup chip TIDAK lagi dibungkus div sendiri. Waktu grupnya terpisah,
           chip membungkus di dalam kotaknya sementara tombol sort tetap
           menggantung di kanan baris pertama → lubang menganga berbentuk L.
       Sekarang semua ikut satu aliran: chip mengisi kiri, sort menempel di
       belakangnya.

       (18 Agu 2026) `ml-auto` pada sort DIBUANG. Saat keempat kontrol tak muat
       satu baris (Kas Hadiran di 390px), sort turun ke baris kedua LALU didorong
       rata kanan — berdiri sendirian di seberang ruang kosong, terbaca seperti
       tata letak yang jebol, bukan pilihan. Tanpa `ml-auto` ia duduk tepat di
       belakang chip terakhir, jadi barisan kedua terbaca sebagai sambungan.
       Yang TIDAK dipakai: kembali ke geser-mendatar. Itu justru pola yang dibuang
       30 Jul di atas, dan menghidupkannya berarti menyembunyikan chip lagi. */
    <div ref={wadahRef} className={`flex flex-wrap items-center gap-x-2 gap-y-2 ${className}`}>
      {options.map((f) => {
          const active = value === f.id;
          return (
            <button
              key={f.id}
              type="button"
              data-chip
              onClick={() => { if (!active) haptic(); onChange(f.id); }}
              aria-pressed={active}
              className={`press shrink-0 inline-flex items-center justify-center min-h-[44px] px-4 rounded-full text-caption font-semibold transition-colors ${
                active
                  ? 'bg-brand text-white pilihan-isi-hover' /* fill brand DATAR (MATERIAL-FLAT) — gradient+inset+glow era pra-flat dihapus, selaras filter absensi & pill nav */
                  /* dark:text-gray-400 (5.74:1 di fill gray-800) SENGAJA — bukan gray-300.
                     gray-300 (~10:1) pernah dicoba 18 Jul & DITOLAK: terang-di-atas-gelap
                     menimbulkan halation (silau) DAN membuat chip inaktif bersaing dgn chip
                     aktif → hierarki rancu. Simetri kontras light↔dark itu keliru: gelap-di-
                     atas-terang tak silau, kebalikannya silau. Audit akan lapor 4.06 utk chip
                     ini — itu FP sampel BORDER gray-700, bukan fill. Jangan "perbaiki" lagi. */
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-control dark:border-control-dark pilihan-hover'
              }`}
            >
              {f.label}
            </button>
          );
      })}

      {sort && 'options' in sort && (
        <div ref={sortRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              haptic();
              const r = sortRef.current?.getBoundingClientRect();
              if (r && !sortOpen) setSisiSort(sisiPopover(r, 160 /* min-w-[10rem] */, window.innerWidth));
              setSortOpen((o) => !o);
            }}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            aria-label={`Urutkan: ${sortLabel}`}
            title={ringkas ? `Urutkan: ${sortLabel}` : undefined}
            className={`press inline-flex items-center justify-center gap-2 min-h-[44px] rounded-full text-caption font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-control dark:border-control-dark pilihan-hover transition-colors ${ringkas ? 'w-11' : 'px-4'}`}
          >
            {/* Dua cabang statis, bukan kelas bersyarat — `audit:ikon` membaca
                ukuran dari kelas LITERAL. Ringkas = ikon mandiri 16px
                (tangga ikon), berlabel = 14px pasangan `text-caption`. */}
            {ringkas ? <ArrowDownUp className="w-4 h-4" /> : <ArrowDownUp className="w-3.5 h-3.5" />}
            {!ringkas && sortLabel}
          </button>

          {sortOpen && (
            /* Penangkap klik di luar → tutup. `z-scrim` (42), BUKAN `z-40`:
               z-40 sama persis dgn bar nav, jadi penangkap ini kalah dan
               ketukan di bar nav MEMINDAHKAN TAB alih-alih menutup menu
               (diuji, lihat catatan sama di ExportMenu). */
            <div className="fixed inset-0 z-scrim" aria-hidden="true" onClick={() => setSortOpen(false)} />
          )}
          {sortMounted && (
            <>
              <div
                role="listbox"
                aria-label="Pilihan urutan"
                className={`${sortOpen ? 'pop-menu' : 'pop-menu-out'} absolute ${sisiSort === 'kanan' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'} top-full mt-2 z-overlay min-w-[10rem] py-2 rounded-2xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800 float`}
              >
                {sort.options.map((o) => {
                  const selected = o.id === sort.value;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => { if (!selected) haptic(); sort.onChange(o.id); setSortOpen(false); }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-body text-left transition-colors ${
                        selected
                          ? 'font-semibold text-brand-link dark:text-brand-linkDark'
                          : 'font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800/60 dark:active:bg-gray-700'
                      }`}
                    >
                      {o.label}
                      {selected && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {sort && !('options' in sort) && (
        <button
          type="button"
          onClick={() => { haptic(); sort.onCycle(); }}
          aria-label={`Urutkan: ${sort.label}`}
          className="press shrink-0 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full text-caption font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-control dark:border-control-dark pilihan-hover transition-colors"
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          {sort.label}
        </button>
      )}
    </div>
  );
}
