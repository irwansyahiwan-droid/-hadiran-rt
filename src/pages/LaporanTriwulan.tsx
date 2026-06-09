import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Download, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { fetchRekapTriwulan } from '../lib/laporan';
import { formatRupiahPlain, haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import type { RekapTriwulan } from '../lib/laporan';

interface Props {
  open: boolean;
  onClose: () => void;
}

function Ledger({ judul, masuk, keluar, saldo }: { judul: string; masuk: number; keluar: number; saldo: number }) {
  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint dark:text-gray-500 mb-2">{judul}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[13px]">
          <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" /> Masuk
          </span>
          <span className="font-semibold text-pos dark:text-emerald-400 tabular-nums">{formatRupiahPlain(masuk)}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" /> Keluar
          </span>
          <span className="font-semibold text-neg tabular-nums">{formatRupiahPlain(keluar)}</span>
        </div>
        <div className="flex items-center justify-between text-[13px] pt-1.5 border-t border-control dark:border-gray-700">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Saldo akhir</span>
          <span className={`font-bold tabular-nums ${saldo < 0 ? 'text-neg' : 'text-gray-900 dark:text-gray-100'}`}>
            {saldo < 0 ? '-' : ''}{formatRupiahPlain(saldo)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LaporanTriwulan({ open, onClose }: Props) {
  const [rows, setRows] = useState<RekapTriwulan[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setRows(await fetchRekapTriwulan());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      setLoading(true);
      load();
      import('../lib/generateLaporanTriwulanPDF').catch(() => {}); // preload (gesture share HP)
    }
  }, [open]);

  // Tombol Back HP menutup overlay
  useBackDismiss(open, onClose);

  async function cetak(r: RekapTriwulan) {
    haptic(12);
    try {
      // Lazy-load: jsPDF tidak ikut ke bundle utama
      const { generateLaporanTriwulanPDF } = await import('../lib/generateLaporanTriwulanPDF');
      generateLaporanTriwulanPDF(r);
      showToast(`Laporan ${r.label} dibuat`);
    } catch {
      showToast('Gagal membuat laporan', 'error');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#EEF0F4] dark:bg-gray-950 page-in-right overflow-y-auto">
      <header
        className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-line dark:border-gray-800"
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
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">Tutup Buku Triwulan</h1>
          </div>
          <button
            onClick={() => { haptic(); setLoading(true); load(); }}
            className="press p-2 -mr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Muat ulang"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
        <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
          Laporan keuangan otomatis dirangkum per 3 bulan (triwulan) dari seluruh transaksi. Tap <span className="font-semibold">Buat Laporan PDF</span> untuk mengunduh & cetak.
        </p>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-4">
                <div className="h-5 w-40 skeleton rounded-lg mb-3" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-28 skeleton rounded-2xl" />
                  <div className="h-28 skeleton rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift">
            <EmptyState
              icon={FileText}
              title="Belum ada data"
              subtitle="Laporan triwulan akan muncul setelah ada transaksi kas tercatat."
            />
          </div>
        ) : (
          rows.map((r, idx) => (
            <div
              key={r.key}
              style={{ animationDelay: `${Math.min(idx, 6) * 0.05}s` }}
              className="rise bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-4 space-y-3"
            >
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[15px] font-bold text-gray-900 dark:text-gray-100">{r.label}</p>
                  <p className="text-xs text-ink-faint dark:text-gray-500 mt-0.5">{r.rentang}</p>
                </div>
                {idx === 0 && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Terbaru
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Ledger judul="Kas Hadiran" masuk={r.hadiranMasuk} keluar={r.hadiranKeluar} saldo={r.hadiranSaldoAkhir} />
                <Ledger judul="Kas RT" masuk={r.rtMasuk} keluar={r.rtKeluar} saldo={r.rtSaldoAkhir} />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">{r.tarikanSelesai} tarikan</span>
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">{r.talanganLunas} talangan lunas</span>
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">{r.jumlahTransaksi} transaksi</span>
              </div>

              <button
                onClick={() => cetak(r)}
                className="press w-full min-h-[44px] py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-300/40 hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Buat Laporan PDF
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
