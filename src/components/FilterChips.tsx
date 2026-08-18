import { useEffect, useState } from 'react';
import { ArrowDownUp, Check } from 'lucide-react';
import { haptic } from '../lib/utils';
import { useExitAnim } from '../lib/hooks';

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
  const sortMounted = useExitAnim(sortOpen);

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
    <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-2 ${className}`}>
      {options.map((f) => {
          const active = value === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => { if (!active) haptic(); onChange(f.id); }}
              aria-pressed={active}
              className={`press shrink-0 inline-flex items-center justify-center min-h-[44px] px-3.5 rounded-full text-caption font-semibold transition-colors ${
                active
                  ? 'bg-brand text-white' /* fill brand DATAR (MATERIAL-FLAT) — gradient+inset+glow era pra-flat dihapus, selaras filter absensi & pill nav */
                  /* dark:text-gray-400 (5.74:1 di fill gray-800) SENGAJA — bukan gray-300.
                     gray-300 (~10:1) pernah dicoba 18 Jul & DITOLAK: terang-di-atas-gelap
                     menimbulkan halation (silau) DAN membuat chip inaktif bersaing dgn chip
                     aktif → hierarki rancu. Simetri kontras light↔dark itu keliru: gelap-di-
                     atas-terang tak silau, kebalikannya silau. Audit akan lapor 4.06 utk chip
                     ini — itu FP sampel BORDER gray-700, bukan fill. Jangan "perbaiki" lagi. */
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-control dark:border-control-dark'
              }`}
            >
              {f.label}
            </button>
          );
      })}

      {sort && 'options' in sort && (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => { haptic(); setSortOpen((o) => !o); }}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            aria-label={`Urutkan: ${sortLabel}`}
            className="press inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full text-caption font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-control dark:border-control-dark"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            {sortLabel}
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
                className={`${sortOpen ? 'pop-menu' : 'pop-menu-out'} absolute right-0 top-full mt-2 z-overlay min-w-[10rem] py-1.5 rounded-2xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800 float origin-top-right`}
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
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-body text-left transition-colors ${
                        selected
                          ? 'font-semibold text-brand-link dark:text-brand-linkDark'
                          : 'font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800/60 dark:active:bg-gray-700'
                      }`}
                    >
                      {o.label}
                      {selected && <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} />}
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
          className="press shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full text-caption font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-control dark:border-control-dark"
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          {sort.label}
        </button>
      )}
    </div>
  );
}
