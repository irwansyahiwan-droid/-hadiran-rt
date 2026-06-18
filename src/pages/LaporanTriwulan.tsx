import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Download, RefreshCw, ArrowDownLeft, ArrowUpRight, Share2, CalendarCheck } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { fetchRekapTriwulan, fetchSnapshotKas } from '../lib/laporan';
import { formatRupiahPlain, haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import { shareLaporanKas } from '../lib/shareLaporanKas';
import type { LaporanKasCard } from '../lib/shareLaporanKas';
import type { RekapTriwulan, SnapshotKas } from '../lib/laporan';

interface Props {
  open: boolean;
  onClose: () => void;
}

function Ledger({ judul, masuk, keluar, saldo }: { judul: string; masuk: number; keluar: number; saldo: number }) {
  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-3">
      <p className="text-micro font-bold uppercase tracking-wide text-ink-faint dark:text-gray-400 mb-2">{judul}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-caption">
          <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" /> Masuk
          </span>
          <span className="font-semibold text-pos dark:text-emerald-400 tabular-nums">{formatRupiahPlain(masuk)}</span>
        </div>
        <div className="flex items-center justify-between text-caption">
          <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" /> Keluar
          </span>
          <span className="font-semibold text-neg dark:text-rose-400 tabular-nums">{formatRupiahPlain(keluar)}</span>
        </div>
        <div className="flex items-center justify-between text-caption pt-1.5 border-t border-control dark:border-gray-700">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Saldo akhir</span>
          <span className={`font-bold tabular-nums ${saldo < 0 ? 'text-neg dark:text-rose-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {saldo < 0 ? '-' : ''}{formatRupiahPlain(saldo)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LaporanTriwulan({ open, onClose }: Props) {
  const [rows, setRows] = useState<RekapTriwulan[]>([]);
  const [snap, setSnap] = useState<SnapshotKas | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharingKey, setSharingKey] = useState<string | null>(null);

  async function load() {
    try {
      const [rekap, snapshot] = await Promise.all([fetchRekapTriwulan(), fetchSnapshotKas()]);
      setRows(rekap);
      setSnap(snapshot);
    } catch {
      setRows([]);
      setSnap(null);
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

  // Bagikan kartu PNG ke WhatsApp (anti-kepotong: kanvas auto-tinggi)
  async function bagikan(key: string, card: LaporanKasCard) {
    if (sharingKey) return;
    haptic(12);
    setSharingKey(key);
    try {
      await shareLaporanKas(card);
    } catch {
      showToast('Gagal membuat gambar', 'error');
    } finally {
      setSharingKey(null);
    }
  }

  function triwulanToCard(r: RekapTriwulan): LaporanKasCard {
    return {
      title: 'Total Kas RT',
      periodeLabel: r.label,
      rentang: r.rentang,
      hadiranMasuk: r.hadiranMasuk, hadiranKeluar: r.hadiranKeluar, hadiranSaldoAkhir: r.hadiranSaldoAkhir,
      rtMasuk: r.rtMasuk, rtKeluar: r.rtKeluar, rtSaldoAkhir: r.rtSaldoAkhir,
      tarikanSelesai: r.tarikanSelesai, talanganLunas: r.talanganLunas, jumlahTransaksi: r.jumlahTransaksi,
      shareText: `*Tutup Buku ${r.label}* (${r.rentang})\n*Total Kas RT: ${formatRupiahPlain(r.rtSaldoAkhir)}*\nKas Hadiran (belum disetor): ${formatRupiahPlain(r.hadiranSaldoAkhir)}\n— Hadiran RT 004/006`,
    };
  }

  function snapToCard(s: SnapshotKas): LaporanKasCard {
    return {
      title: 'Total Kas RT',
      periodeLabel: `Per ${s.tanggal}`,
      rentang: s.rentang,
      hadiranMasuk: s.hadiranMasuk, hadiranKeluar: s.hadiranKeluar, hadiranSaldoAkhir: s.hadiranSaldoAkhir,
      rtMasuk: s.rtMasuk, rtKeluar: s.rtKeluar, rtSaldoAkhir: s.rtSaldoAkhir,
      tarikanSelesai: s.tarikanSelesai, talanganLunas: s.talanganLunas, jumlahTransaksi: s.jumlahTransaksi,
      shareText: `*Tutup Buku — Kas RT 004/006*\n${s.tanggal}\n*Total Kas RT: ${formatRupiahPlain(s.rtSaldoAkhir)}*\nKas Hadiran (belum disetor): ${formatRupiahPlain(s.hadiranSaldoAkhir)}\n— Hadiran RT`,
    };
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-sunken dark:bg-gray-950 page-in-right overflow-y-auto">
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
          Tutup buku <span className="font-semibold">sekarang</span> untuk posisi kas terkini, atau pilih per triwulan. Bagikan sebagai gambar (PNG) langsung ke grup WhatsApp, atau unduh PDF.
        </p>

        {/* Tutup Buku Sekarang — snapshot posisi kas s/d hari ini */}
        {!loading && snap && (snap.jumlahTransaksi > 0 || snap.tarikanSelesai > 0) && (
          <div className="rise hero-card hero-noise" style={{ padding: '18px 20px 16px' }}>
            <div className="relative flex items-center gap-2 mb-2.5">
              <CalendarCheck className="w-4 h-4 text-emerald-200" strokeWidth={2.2} />
              <p className="text-micro font-bold uppercase text-white/85" style={{ letterSpacing: '0.14em' }}>
                Tutup Buku Sekarang
              </p>
            </div>
            <p className="relative text-micro text-white/65 mb-1">Total Kas RT · {snap.tanggal}</p>
            <span className="relative block font-display text-white text-4xl font-extrabold tracking-tighter leading-none tabular-nums mb-3">
              {`${snap.rtSaldoAkhir < 0 ? '-' : ''}${formatRupiahPlain(snap.rtSaldoAkhir)}`}
            </span>

            <div className="relative grid grid-cols-2 gap-2 mb-3.5">
              <div className="rounded-2xl bg-white/10 px-3 py-2">
                <p className="text-micro text-white/60 uppercase tracking-wide">Kas RT (final)</p>
                <p className="text-body font-bold text-white tabular-nums">{formatRupiahPlain(snap.rtSaldoAkhir)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2">
                <p className="text-micro text-white/60 uppercase tracking-wide">Hadiran · belum disetor</p>
                <p className="text-body font-bold text-white/90 tabular-nums">{formatRupiahPlain(snap.hadiranSaldoAkhir)}</p>
              </div>
            </div>

            <button
              onClick={() => bagikan('snap', snapToCard(snap))}
              disabled={sharingKey !== null}
              className="press relative w-full min-h-[44px] py-3 rounded-2xl bg-white text-emerald-700 font-bold text-sm shadow-lg shadow-black/10 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {sharingKey === 'snap' ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Menyiapkan gambar…</>
              ) : (
                <><Share2 className="w-4 h-4" /> Bagikan ke WhatsApp (PNG)</>
              )}
            </button>
          </div>
        )}

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
                  <p className="text-body font-bold text-gray-900 dark:text-gray-100">{r.label}</p>
                  <p className="text-xs text-ink-faint dark:text-gray-400 mt-0.5">{r.rentang}</p>
                </div>
                {idx === 0 && (
                  <span className="text-micro font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Terbaru
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Ledger judul="Kas Hadiran" masuk={r.hadiranMasuk} keluar={r.hadiranKeluar} saldo={r.hadiranSaldoAkhir} />
                <Ledger judul="Kas RT" masuk={r.rtMasuk} keluar={r.rtKeluar} saldo={r.rtSaldoAkhir} />
              </div>

              <div className="flex items-center gap-2 text-micro text-gray-500 dark:text-gray-400">
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">{r.tarikanSelesai} tarikan</span>
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">{r.talanganLunas} talangan lunas</span>
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">{r.jumlahTransaksi} transaksi</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => bagikan(r.key, triwulanToCard(r))}
                  disabled={sharingKey !== null}
                  className="press btn-brand flex-1 min-h-[44px] py-3 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {sharingKey === r.key ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Menyiapkan…</>
                  ) : (
                    <><Share2 className="w-4 h-4" /> Bagikan PNG</>
                  )}
                </button>
                <button
                  onClick={() => cetak(r)}
                  className="press min-h-[44px] px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5"
                  aria-label={`Unduh PDF ${r.label}`}
                >
                  <Download className="w-4 h-4" /> PDF
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
