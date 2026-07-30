import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, type LucideIcon } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';
import { useClosePhase } from '../hooks/useClosePhase';
import { haptic } from '../lib/utils';

interface Props {
  open: boolean;
  /** Judul dialog, mis. "Batalkan hasil Tarikan #3?" */
  title: string;
  /** Penjelasan akibat tindakan — sebut data apa yang hilang & bisa/tidaknya diurungkan. */
  description: ReactNode;
  /** Label tombol merah, mis. "Batalkan" / "Hapus". */
  confirmLabel: string;
  /** Label saat proses berjalan, mis. "Membatalkan…". */
  loadingLabel?: string;
  icon?: LucideIcon;
  /**
   * Gerbang ketik-ulang — WAJIB untuk aksi yang tak bisa di-undo (mis. batalkan
   * tarikan). Tombol merah baru aktif setelah `value` diketik persis.
   * Untuk aksi yang punya undo toast, cukup kosongkan.
   */
  typeToConfirm?: { value: string; hint: ReactNode };
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Satu dialog pengaman untuk semua aksi merusak (batalkan tarikan, hapus
 * tarikan, hapus transaksi kas) — mencegah salah-pencet di HP (kasus 20 Jun
 * 2026: "Batalkan Hasil Tarikan" ke-tap tak sengaja → absensi/talangan/kas
 * terhapus, recovery manual dari kertas). Pola "tekan dua kali di tombol yang
 * sama" sengaja DIBUANG: di layar sentuh jempol sering mendarat dua kali di
 * titik yang sama.
 *
 * Dua tingkat pengaman:
 * - tanpa `typeToConfirm` → konfirmasi biasa (dipakai bila ada undo toast),
 * - dengan `typeToConfirm` → bendahara wajib mengetik ulang angkanya.
 */
export default function ConfirmDestruktif({
  open,
  title,
  description,
  confirmLabel,
  loadingLabel = 'Memproses…',
  icon: Icon,
  typeToConfirm,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const [ketik, setKetik] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Exit modal tengah: fade+scale di tempat (.pop → .pop-out) baru unmount —
  // bukan meluncur turun (itu bahasa bottom sheet).
  const { closing, requestClose } = useClosePhase(onClose, 150);
  const dlg = useDialog(open, { onClose: requestClose, label: title });

  // Reset isian tiap kali dibuka + fokus ke input.
  useEffect(() => {
    if (!open) return;
    setKetik('');
    if (!typeToConfirm) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, typeToConfirm]);

  if (!open) return null;
  const cocok = !typeToConfirm || ketik.trim() === typeToConfirm.value;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div aria-hidden="true" className={`sheet-backdrop absolute inset-0 bg-black/50 backdrop-blur-sm ${closing ? 'sheet-backdrop-out' : ''}`} onClick={loading ? undefined : requestClose} />
      <div
        ref={dlg.panelRef}
        {...dlg.panelProps}
        className={`${closing ? 'pop-out' : 'pop'} relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-5`}
      >
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </span>
          <div className="min-w-0">
            <h2 className="text-balance text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {title}
            </h2>
            <p className="text-pretty text-caption text-ink-sub dark:text-gray-400 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {typeToConfirm && (
          <>
            <label htmlFor={inputId} className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mt-4 mb-1.5">
              {typeToConfirm.hint}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              inputMode="numeric"
              name="konfirmasi-destruktif"
              autoComplete="off"
              value={ketik}
              onChange={(e) => setKetik(e.target.value)}
              placeholder={typeToConfirm.value}
              disabled={loading}
              className="field"
            />

            {/* Umumkan ke screen reader saat angka cocok → pengguna tunanetra tahu
                tombol merah sudah aktif (tanpa ini mereka tak punya petunjuk visual). */}
            <p aria-live="polite" className="sr-only">
              {cocok ? `Angka cocok. Tombol ${confirmLabel} sekarang aktif.` : ''}
            </p>
          </>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={requestClose} disabled={loading} className="btn-secondary flex-1 py-3 rounded-xl disabled:opacity-60">
            Batal
          </button>
          <button
            onClick={() => { haptic(20); onConfirm(); }}
            disabled={!cocok || loading}
            className="btn-danger press flex-1 py-3 font-semibold text-sm disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading
              ? <><RefreshCw className="w-4 h-4 animate-spin" />{loadingLabel}</>
              : <>{Icon && <Icon className="w-4 h-4" />}{confirmLabel}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
