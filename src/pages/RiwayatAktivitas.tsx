import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Search, X, History, Plus, Pencil, Trash2,
  CheckCircle2, RotateCcw, ArrowRight, RefreshCw, Download,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import FilterChips from '../components/FilterChips';
import { useRealtime } from '../hooks/useRealtime';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { fetchAktivitas, formatAktivitas, formatWaktu, formatWaktuRelatif } from '../lib/aktivitas';
import { formatRupiahPlain, haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import type { AktivitasLog } from '../lib/types';
import type { Accent } from '../lib/aktivitas';

interface Props {
  open: boolean;
  onClose: () => void;
}

const FILTERS = [
  { id: 'semua', label: 'Semua' },
  { id: 'transaksi_kas', label: 'Kas Hadiran' },
  { id: 'kas_rt', label: 'Kas RT' },
  { id: 'tarikan', label: 'Tarikan' },
  { id: 'talangan', label: 'Talangan' },
] as const;

const ACCENT_CLS: Record<Accent, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
  rose: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
};

function iconFor(row: AktivitasLog) {
  if (row.table_name === 'talangan') {
    return row.new_data?.status_lunas === true ? CheckCircle2 : RotateCcw;
  }
  if (row.action === 'INSERT') return Plus;
  if (row.action === 'DELETE') return Trash2;
  return Pencil;
}

/** Label grup tanggal: Hari ini / Kemarin / tanggal lengkap. */
function labelHari(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const beda = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (beda === 0) return 'Hari ini';
  if (beda === 1) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function RiwayatAktivitas({ open, onClose }: Props) {
  const [rows, setRows] = useState<AktivitasLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('semua');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    try {
      const data = await fetchAktivitas();
      setRows(data);
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
      import('../lib/generateAktivitasPDF').catch(() => {}); // preload (gesture share HP)
    }
  }, [open]);

  // Live: muat ulang saat ada aktivitas baru tercatat
  useRealtime(open ? ['audit_log'] : [], () => { if (open) load(); });

  // Tombol Back HP menutup overlay (bukan keluar app)
  useBackDismiss(open, onClose);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (filter !== 'semua' && r.table_name !== filter) return false;
      if (!q) return true;
      const v = formatAktivitas(r);
      return (
        v.title.toLowerCase().includes(q) ||
        (v.detail ?? '').toLowerCase().includes(q) ||
        v.actor.toLowerCase().includes(q)
      );
    });
    const out: { hari: string; items: AktivitasLog[] }[] = [];
    for (const r of filtered) {
      const hari = labelHari(r.created_at);
      const last = out[out.length - 1];
      if (last && last.hari === hari) last.items.push(r);
      else out.push({ hari, items: [r] });
    }
    return out;
  }, [rows, filter, search]);

  async function exportPDF() {
    haptic(12);
    const flat = grouped.flatMap((g) => g.items);
    if (flat.length === 0) { showToast('Tidak ada aktivitas untuk diekspor', 'info'); return; }
    const label = FILTERS.find((f) => f.id === filter)?.label ?? 'Semua';
    const { generateAktivitasPDF } = await import('../lib/generateAktivitasPDF');
    generateAktivitasPDF(flat, label);
    showToast('PDF riwayat dibuat');
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#EEF0F4] dark:bg-gray-950 page-in-right overflow-y-auto">
      {/* Header */}
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
            <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">Riwayat Aktivitas</h1>
          </div>
          <button
            onClick={exportPDF}
            className="press p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Ekspor PDF"
            aria-label="Ekspor PDF"
          >
            <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
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
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aktivitas / nama bendahara..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-control dark:border-gray-700 text-sm dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Bersihkan">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} wrap />

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 px-4 py-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded-lg w-3/5" />
                  <div className="h-3 skeleton rounded-lg w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift">
            <EmptyState
              icon={History}
              title={rows.length === 0 ? 'Belum ada aktivitas' : 'Tidak ada hasil'}
              subtitle={rows.length === 0
                ? 'Setiap perubahan kas, tarikan, & talangan akan tercatat di sini secara otomatis.'
                : 'Coba ubah filter atau kata kunci pencarian.'}
            />
          </div>
        ) : (
          grouped.map((grp) => (
            <div key={grp.hari} className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1 pt-1">{grp.hari}</p>
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
                {grp.items.map((row, idx) => {
                  const v = formatAktivitas(row);
                  const Icon = iconFor(row);
                  const isOpen = expanded === row.id;
                  const hasMore = v.changes.length > 0;
                  return (
                    <button
                      key={row.id}
                      onClick={() => { if (hasMore) { haptic(); setExpanded(isOpen ? null : row.id); } }}
                      style={{ animationDelay: `${Math.min(idx, 8) * 0.03}s` }}
                      className={`rise w-full flex items-start gap-3 px-4 py-3.5 text-left ${hasMore ? 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60' : 'cursor-default'} transition-colors ${idx < grp.items.length - 1 ? 'border-b border-line dark:border-gray-800' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0 mt-0.5 ${ACCENT_CLS[v.accent]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-ink dark:text-gray-100 leading-snug break-words">{v.title}</p>
                        {v.detail && (
                          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 break-words">{v.detail}</p>
                        )}
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                          {v.actor} · {formatWaktuRelatif(row.created_at)}
                        </p>

                        {/* Diff (expand) */}
                        {isOpen && hasMore && (
                          <div className="mt-2 space-y-1.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-2.5">
                            {v.changes.map((c, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[11px] flex-wrap">
                                <span className="text-gray-400 dark:text-gray-500 font-medium">{c.label}:</span>
                                <span className="text-rose-500 dark:text-rose-400 line-through">{c.from}</span>
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{c.to}</span>
                              </div>
                            ))}
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-0.5">{formatWaktu(row.created_at)}</p>
                          </div>
                        )}
                      </div>
                      {v.amount != null && v.amount !== 0 && (
                        <span className={`text-[15px] font-bold shrink-0 ${
                          v.accent === 'rose' ? 'text-neg' : v.accent === 'emerald' ? 'text-pos' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {formatRupiahPlain(v.amount)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
