import { useEffect, useMemo, useState } from 'react';
import {
  Search, History, Plus, Pencil, Trash2,
  CheckCircle2, RotateCcw, ArrowRight, RefreshCw, Download,
  ChevronDown, Route, Lightbulb, Loader2 } from 'lucide-react';
import OverlayHeader, { OverlayAction } from '../components/layout/OverlayHeader';
import ClearButton from '../components/ClearButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import FilterChips from '../components/FilterChips';
import { useRealtime } from '../hooks/useRealtime';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useClosePhase } from '../hooks/useClosePhase';
import { fetchAktivitas, fetchKamus, formatAktivitas, formatWaktu, formatWaktuRelatif } from '../lib/aktivitas';
import type { KamusNama } from '../lib/aktivitas';
import { formatRupiahPlain, haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import { useAksiBerat } from '../lib/hooks';
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
  rose: 'text-neg dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
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
  /* Ekspor PDF = aksi berat (chunk diunduh saat diketuk). Lihat `useAksiBerat`. */
  const [pdfSibuk, jalankanPdf] = useAksiBerat();
  const [rows, setRows] = useState<AktivitasLog[]>([]);
  const [kamus, setKamus] = useState<KamusNama | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('semua');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setError(false);
    try {
      /* Kamus dimuat BERBARENGAN tapi kegagalannya ditelan sengaja, dan
         perbedaan itu penting: baris audit adalah ISI layar — gagal berarti
         layar gagal; kamus cuma memberi NAMA pada baris `talangan` yang
         datanya UUID. Kalau ia gagal, barisnya kembali seperti sebelum
         2 Sep 2026 (tanpa nama) sementara sisa riwayat tetap utuh. Menjatuhkan
         seluruh layar demi pelengkap = menukar kerugian kecil dgn besar. */
      const [data, k] = await Promise.all([
        fetchAktivitas(),
        fetchKamus().catch(() => null),
      ]);
      setRows(data);
      setKamus(k);
    } catch {
      setError(true);
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

  // Tombol Back HP menutup overlay (bukan keluar app). Semua jalur tutup
  // lewat requestClose → mundur ke kanan (page-out-right) baru unmount.
  const exit = useClosePhase(onClose, 160);
  useBackDismiss(open, exit.requestClose);
  const dlg = useDialog(open, { onClose: exit.requestClose, label: 'Riwayat aktivitas' });

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (filter !== 'semua' && r.table_name !== filter) return false;
      if (!q) return true;
      const v = formatAktivitas(r, kamus ?? undefined);
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
    /* `kamus` WAJIB ikut: ia dipakai di dalam saringan pencarian, dan datangnya
       bisa SESUDAH `rows` (dua request paralel). Tanpa dep ini, mencari
       "Saiful" tak menemukan baris talangan sampai filter/ketikan lain
       kebetulan memicu hitung ulang. */
  }, [rows, filter, search, kamus]);

  /* Sampai 20 Agu 2026 jalur ini TANPA `catch` sama sekali: chunk gagal (mis.
     chunk basi sesudah deploy, yang dibalas HTML 200 oleh rewrite Vercel) cuma
     meninggalkan unhandled rejection di konsol dan layar diam. `useAksiBerat`
     yang kini menerjemahkannya jadi toast + keadaan sibuk. */
  async function exportPDF() {
    haptic(12);
    const flat = grouped.flatMap((g) => g.items);
    if (flat.length === 0) { showToast('Tidak ada aktivitas untuk diekspor', 'info'); return; }
    const label = FILTERS.find((f) => f.id === filter)?.label ?? 'Semua';
    await jalankanPdf(async () => {
      const { generateAktivitasPDF } = await import('../lib/generateAktivitasPDF');
      generateAktivitasPDF(flat, label);
      showToast('PDF riwayat dibuat');
    }, { mulai: 'Menyiapkan PDF…', gagal: 'Gagal membuat PDF. Coba muat ulang aplikasi.' });
  }

  if (!open) return null;

  // overscroll-contain: overlay ini scroll sendiri & menutupi penuh layar — tanpa
  // ini scroll yang mentok di ujung daftar diteruskan ke halaman di belakangnya
  // (halaman induk ikut bergeser / pull-to-refresh terpicu). `.sheet-panel` sudah
  // punya ini; overlay full-screen tidak lewat kelas itu.
  return (
    <div ref={dlg.panelRef} {...dlg.panelProps} className={`fixed inset-0 z-overlay bg-sunken dark:bg-gray-950 ${exit.closing ? 'page-out-right' : 'page-in-right'} overflow-y-auto [overscroll-behavior:contain]`}>
      <OverlayHeader
        icon={History}
        title="Riwayat Aktivitas"
        onBack={exit.requestClose}
        actions={<>
          <OverlayAction icon={pdfSibuk ? Loader2 : Download} label="Ekspor PDF" onClick={exportPDF} spinning={pdfSibuk} />
          <OverlayAction icon={RefreshCw} label="Muat ulang" onClick={() => { setLoading(true); load(); }} spinning={loading} />
        </>}
      />

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            /* Menyebut KETIGA sumbu yang benar-benar disaring di `grouped`:
               nama (warga lewat detail, bendahara lewat actor), nomor tarikan,
               dan jenis aktivitas lewat judul. Yang lama, "Cari aktivitas /
               nama bendahara…", menyebut yang paling jarang dicari sambil
               menghilangkan dua yang paling mungkin diketik warga.

               PANJANGNYA TERIKAT: ruang teks kolom ini 248px @360px, dan yang
               lama 253px — terpotong 5px diam-diam. Placeholder tak memakai
               `truncate`, jadi ia dipangkas TANPA elipsis dan `audit:potong`
               (yang memburu `truncate`/`line-clamp`) buta terhadapnya. Yang ini
               223px. Kalau kata-katanya diubah lagi, UKUR ULANG. */
            placeholder="Cari nama, tarikan, aktivitas…"
            aria-label="Cari aktivitas"
            inputMode="search"
            enterKeyHint="search"
            className="field-search pr-11"
          />
          {search && <ClearButton onClick={() => setSearch('')} />}
        </div>

        {/* Filter chips */}
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

        {/* Hint: tiap baris bisa diketuk untuk penjelasan alur */}
        {!loading && rows.length > 0 && (
          <div className="flex items-center gap-2 text-micro text-ink-faint dark:text-gray-400">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Ketuk satu aktivitas untuk lihat penjelasan alur &amp; pencatatannya.</span>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift px-4 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded-lg w-3/5" />
                  <div className="h-3 skeleton rounded-lg w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift">
            <ErrorState onRetry={() => { setLoading(true); load(); }} retrying={loading} />
          </div>
        ) : grouped.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift">
            <EmptyState
              icon={History}
              title={rows.length === 0 ? 'Belum ada aktivitas' : 'Tidak ada hasil'}
              subtitle={rows.length === 0
                ? 'Setiap perubahan kas, tarikan, & talangan akan tercatat di sini secara otomatis.'
                : 'Coba ubah filter atau kata kunci pencarian.'}
              action={rows.length > 0
                ? { label: 'Reset filter', icon: RotateCcw, onClick: () => { setFilter('semua'); setSearch(''); } }
                : undefined}
            />
          </div>
        ) : (
          grouped.map((grp) => (
            <div key={grp.hari} className="space-y-2">
              <p className="text-micro font-semibold uppercase tracking-wider text-ink-faint dark:text-gray-400 pt-1">{grp.hari}</p>
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
                {grp.items.map((row, idx) => {
                  const v = formatAktivitas(row, kamus ?? undefined);
                  const Icon = iconFor(row);
                  const isOpen = expanded === row.id;
                  const hasMore = v.changes.length > 0;
                  const hasDetail = v.penjelasan != null || hasMore;
                  return (
                    <button
                      key={row.id}
                      onClick={() => { if (hasDetail) { haptic(); setExpanded(isOpen ? null : row.id); } }}
                      style={{ animationDelay: `${Math.min(idx, 8) * 0.03}s` }}
                      className={`rise w-full flex items-start gap-3 px-4 py-4 text-left [--di-l:4.25rem] [--di-r:1rem] ${hasDetail ? 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60' : 'cursor-default'} transition-colors ${idx < grp.items.length - 1 ? 'divide-inset' : ''}`}
                    >
                      <div className={`icon-tile w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0 mt-0.5 ${ACCENT_CLS[v.accent]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-semibold text-ink dark:text-gray-100 leading-snug break-words">{v.title}</p>
                        {v.detail && (
                          <p className="text-caption text-gray-500 dark:text-gray-400 mt-0.5 break-words">{v.detail}</p>
                        )}
                        <p className="text-micro text-ink-faint dark:text-gray-400 mt-1">
                          {v.actor} · {formatWaktuRelatif(row.created_at)}
                        </p>

                        {/* Expand: penjelasan alur + diff */}
                        {isOpen && hasDetail && (
                          <div className="reveal mt-2 space-y-2">
                            {v.penjelasan && (
                              <div className="flex items-start gap-2 bg-emerald-50/70 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-xl p-3">
                                <Route className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <p className="text-micro font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-0.5">Alur &amp; pencatatan</p>
                                  <p className="text-caption leading-relaxed text-gray-600 dark:text-gray-300">{v.penjelasan}</p>
                                </div>
                              </div>
                            )}
                            {hasMore && (
                              <div className="space-y-2 inset-soft rounded-xl p-3">
                                {v.changes.map((c, i) => (
                                  <div key={i} className="flex items-center gap-2 text-micro flex-wrap">
                                    <span className="text-ink-faint dark:text-gray-400 font-medium">{c.label}:</span>
                                    <span className="text-neg dark:text-rose-400 line-through">{c.from}</span>
                                    <ArrowRight className="w-3 h-3 text-gray-400" />
                                    <span className="text-pos dark:text-emerald-400 font-semibold">{c.to}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-micro text-ink-faint dark:text-gray-400 pl-0.5">{formatWaktu(row.created_at)}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {v.amount != null && v.amount !== 0 && (
                          <span className={`font-display text-amount font-semibold tabular-nums ${
                            v.accent === 'rose' ? 'text-neg dark:text-rose-400' : v.accent === 'emerald' ? 'text-pos dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {formatRupiahPlain(v.amount)}
                          </span>
                        )}
                        {/* `text-gray-400`, BUKAN `text-gray-300` (2 Sep 2026). Chevron ini
                            SATU-SATUNYA penanda bahwa baris bisa dibuka — jadi kontrol
                            non-teks yang dituntut 3:1 (§1.4.11), bukan hiasan. Nilai lama
                            terukur 1,47:1 di kartu putih & 2,04:1 di `gray-900`; halaman
                            sampai perlu kalimat bantu "Ketuk satu aktivitas…" untuk
                            menambalnya, dan kalimat itu gejalanya.

                            Ia juga menyimpang sendirian: dari 45 pemakaian `text-gray-300`,
                            44 adalah `dark:` — gray-300 itu tinta TERANG untuk permukaan
                            GELAP (10,37:1). Baris ini satu-satunya yang memakainya sbg tinta
                            terang di permukaan terang, sekaligus satu-satunya
                            `dark:text-gray-600` di app.

                            Varian `dark:` TIDAK dipasang: `html.dark .text-gray-400`
                            (index.css:557) sengaja ikut menangkap kelas POLOS, jadi satu
                            kelas sudah membawa #3E4F44 / #B4C9BB → 8,73 & 8,71:1.
                            `gray-400` adalah anak tangga TERTERANG yang lolos 3:1 — di sisi
                            terang tangga melompat 1,47 (300) → 8,73 (400), tak ada nilai di
                            rentang 3–5. Kalau kelak terasa terlalu tebal, obatnya token
                            affordance tersendiri, BUKAN kembali ke gray-300.

                            LOLOS `audit:kontras-nonteks` (676 sampel, 0 gagal) karena
                            populasinya membuang ikon yang kontrolnya punya label teks
                            (audit-kontras-nonteks.mjs:211) — sah untuk ikon yang MENGULANG
                            labelnya, meleset untuk chevron yang membawa info yang tak ada
                            di label mana pun. */}
                        {hasDetail && (
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-ketuk ${isOpen ? 'rotate-180' : ''}`} />
                        )}
                      </div>
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
