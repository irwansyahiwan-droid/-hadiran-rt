import { useRef, useState } from 'react';
import {
  ArrowLeft, DatabaseBackup, Download, Upload, AlertTriangle, RefreshCw, CheckCircle2,
} from 'lucide-react';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import {
  fetchBackup, downloadBackup, ringkasBackup, validasiBackup, restoreBackup, type BackupFile,
} from '../lib/backup';

interface Props {
  open: boolean;
  onClose: () => void;
}

const KATA_KONFIRMASI = 'PULIHKAN';

export default function BackupRestore({ open, onClose }: Props) {
  useBackDismiss(open, onClose);
  const fileRef = useRef<HTMLInputElement>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState<{ table: string; count: number }[] | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [konfirmasi, setKonfirmasi] = useState('');
  const [restoring, setRestoring] = useState(false);

  async function handleBackup() {
    haptic(12);
    setBackingUp(true);
    try {
      const b = await fetchBackup();
      downloadBackup(b);
      setLastBackup(ringkasBackup(b));
      showToast('Backup berhasil diunduh');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal membuat backup', 'error');
    } finally {
      setBackingUp(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // izinkan pilih file sama lagi
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const b = validasiBackup(raw);
      setPending(b);
      setKonfirmasi('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'File tidak bisa dibaca', 'error');
    }
  }

  async function handleRestore() {
    if (!pending || konfirmasi.trim().toUpperCase() !== KATA_KONFIRMASI) return;
    haptic(20);
    setRestoring(true);
    try {
      await restoreBackup(pending);
      showToast('Data berhasil dipulihkan');
      setPending(null);
      setTimeout(() => window.location.reload(), 1200); // muat ulang dengan data baru
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memulihkan data', 'error');
      setRestoring(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#D7DFEA] dark:bg-gray-950 page-in-right overflow-y-auto">
      <header
        className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-2 max-w-lg mx-auto px-4 py-3">
          <button
            onClick={() => { haptic(); onClose(); }}
            className="press p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <DatabaseBackup className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h1 className="text-base font-extrabold text-gray-900 dark:text-gray-100 truncate">Backup &amp; Restore</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
        {/* Backup */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800/60 lift p-5">
          <div className="flex items-center gap-2 mb-1">
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Backup Data</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Unduh seluruh data (anggota, tarikan, absensi, talangan, kas) sebagai satu file JSON. Simpan baik-baik sebagai cadangan.
          </p>
          <button
            onClick={handleBackup}
            disabled={backingUp}
            className="press w-full min-h-[44px] py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-300/40 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            {backingUp ? <><RefreshCw className="w-4 h-4 animate-spin" /> Menyiapkan...</> : <><Download className="w-4 h-4" /> Unduh Backup Sekarang</>}
          </button>
          {lastBackup && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lastBackup.map((r) => (
                <span key={r.table} className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {r.table}: {r.count}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Restore */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-rose-200/70 dark:border-rose-900/40 lift p-5">
          <div className="flex items-center gap-2 mb-1">
            <Upload className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Pulihkan (Restore)</h2>
          </div>
          <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-800/40 rounded-xl p-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              Memulihkan akan <b>mengganti seluruh data saat ini</b> dengan isi file backup. Tindakan ini tidak bisa dibatalkan — pastikan kamu sudah membuat backup terbaru lebih dulu.
            </p>
          </div>

          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />

          {!pending ? (
            <button
              onClick={() => { haptic(); fileRef.current?.click(); }}
              className="press w-full min-h-[44px] py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" /> Pilih File Backup
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> File backup terbaca {pending.exportedAt ? `(${pending.exportedAt.slice(0, 10)})` : ''}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ringkasBackup(pending).map((r) => (
                  <span key={r.table} className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {r.table}: {r.count}
                  </span>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Ketik <span className="font-bold text-rose-600">{KATA_KONFIRMASI}</span> untuk konfirmasi
                </label>
                <input
                  type="text"
                  value={konfirmasi}
                  onChange={(e) => setKonfirmasi(e.target.value)}
                  placeholder={KATA_KONFIRMASI}
                  autoCapitalize="characters"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPending(null); setKonfirmasi(''); }}
                  disabled={restoring}
                  className="press px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  onClick={handleRestore}
                  disabled={restoring || konfirmasi.trim().toUpperCase() !== KATA_KONFIRMASI}
                  className="press flex-1 min-h-[44px] py-3 rounded-xl bg-rose-600 text-white font-semibold text-sm shadow-lg shadow-rose-300/40 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {restoring ? <><RefreshCw className="w-4 h-4 animate-spin" /> Memulihkan...</> : 'Pulihkan Sekarang'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
