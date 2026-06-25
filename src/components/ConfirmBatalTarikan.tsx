import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';
import { haptic } from '../lib/utils';

interface Props {
  open: boolean;
  nomor: number;          // nomor tarikan yg harus diketik ulang utk konfirmasi
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Pengaman batalkan tarikan — mencegah salah-pencet di HP (kasus 20 Jun 2026:
 * "Batalkan Hasil Tarikan" ke-tap tak sengaja → absensi/talangan/kas terhapus,
 * recovery harus manual dari kertas). Mengikuti pola Restore yang mewajibkan
 * ketik kata kunci: di sini bendahara WAJIB ketik nomor tarikan dulu, baru
 * tombol batal aktif. Satu jari mustahil menghapus tanpa sengaja.
 */
export default function ConfirmBatalTarikan({ open, nomor, loading = false, onClose, onConfirm }: Props) {
  const dlg = useDialog(open, { onClose, label: `Konfirmasi batalkan Tarikan #${nomor}` });
  const [ketik, setKetik] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset isian tiap kali dibuka + fokus ke input.
  useEffect(() => {
    if (!open) return;
    setKetik('');
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;
  const cocok = ketik.trim() === String(nomor);

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div className="sheet-backdrop absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div
        ref={dlg.panelRef}
        {...dlg.panelProps}
        className="pop relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-5"
      >
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
              Batalkan hasil Tarikan #{nomor}?
            </h2>
            <p className="text-caption text-ink-sub dark:text-gray-400 mt-1 leading-relaxed">
              Tindakan ini <b>menghapus absensi, talangan, &amp; kas masuk</b> tarikan #{nomor} dan
              <b> tidak bisa di-undo</b>. Pemulihan hanya bisa manual.
            </p>
          </div>
        </div>

        <label htmlFor="batal-tarikan-konfirmasi" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mt-4 mb-1.5">
          Ketik angka <span className="font-bold text-rose-600 dark:text-rose-400">{nomor}</span> untuk konfirmasi
        </label>
        <input
          id="batal-tarikan-konfirmasi"
          ref={inputRef}
          type="text"
          inputMode="numeric"
          name="konfirmasi-batal"
          autoComplete="off"
          value={ketik}
          onChange={(e) => setKetik(e.target.value)}
          placeholder={String(nomor)}
          disabled={loading}
          className="field"
        />

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} disabled={loading} className="btn-secondary flex-1 py-3 rounded-xl disabled:opacity-60">
            Batal
          </button>
          <button
            onClick={() => { haptic(20); onConfirm(); }}
            disabled={!cocok || loading}
            className="press flex-1 py-3 rounded-xl bg-rose-600 text-white font-semibold text-sm shadow-lg shadow-rose-300/40 dark:shadow-none hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Membatalkan…</>
              : <><RotateCcw className="w-4 h-4" />Batalkan</>}
          </button>
        </div>
      </div>
    </div>
  );
}
