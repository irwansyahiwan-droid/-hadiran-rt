import { useEffect, useState } from 'react';
import { FileText, Download, RefreshCw, ArrowDownLeft, ArrowUpRight, Share2, CalendarCheck, Loader2 } from 'lucide-react';
import OverlayHeader, { OverlayAction } from '../components/layout/OverlayHeader';
import EmptyState from '../components/EmptyState';
import Tag from '../components/Tag';
import ErrorState from '../components/ErrorState';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useClosePhase } from '../hooks/useClosePhase';
import { fetchRekapTriwulan, fetchSnapshotKas } from '../lib/laporan';
import { formatRupiahPlain, haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import { useAksiBerat } from '../lib/hooks';
import { shareLaporanKas } from '../lib/shareLaporanKas';
import type { LaporanKasCard } from '../lib/shareLaporanKas';
import type { RekapTriwulan, SnapshotKas } from '../lib/laporan';

interface Props {
  open: boolean;
  onClose: () => void;
}

function Ledger({ judul, masuk, keluar, saldo }: { judul: string; masuk: number; keluar: number; saldo: number }) {
  return (
    <div className="rounded-2xl inset-soft p-3">
      <p className="text-micro font-bold uppercase tracking-wide text-ink-faint dark:text-gray-400 mb-2">{judul}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-caption">
          <span className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
            {/* Ikon = token yang SAMA dgn nominal di kanannya (5 Agu 2026).
                Sama persis dgn panel "Alur Kas Hadiran" kemarin: emerald-500 &
                rose-500 jauh lebih terang dari `pos`/`neg` di baris yang sama,
                jadi satu panel membawa dua hijau + dua merah — dilarang
                DESIGN.stitch §7. Berkas ini terlewat waktu sweep kemarin. */}
            <ArrowDownLeft className="w-3.5 h-3.5 text-pos dark:text-pos-dark" /> Masuk
          </span>
          <span className="font-display font-semibold text-pos dark:text-emerald-400 tabular-nums">{formatRupiahPlain(masuk)}</span>
        </div>
        <div className="flex items-center justify-between text-caption">
          <span className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <ArrowUpRight className="w-3.5 h-3.5 text-neg dark:text-neg-dark" /> Keluar
          </span>
          <span className="font-display font-semibold text-neg dark:text-rose-400 tabular-nums">{formatRupiahPlain(keluar)}</span>
        </div>
        <div className="flex items-center justify-between text-caption pt-2 border-t border-control dark:border-control-dark">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Saldo akhir</span>
          <span className={`font-display font-bold tabular-nums ${saldo < 0 ? 'text-neg dark:text-rose-400' : 'text-gray-900 dark:text-gray-100'}`}>
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
  const [error, setError] = useState(false);
  const [sharingKey, setSharingKey] = useState<string | null>(null);
  const [cetakKey, setCetakKey] = useState<string | null>(null);
  const [cetakSibuk, jalankanCetak] = useAksiBerat();
  const [, jalankanBagi] = useAksiBerat();

  async function load() {
    setError(false);
    try {
      const [rekap, snapshot] = await Promise.all([fetchRekapTriwulan(), fetchSnapshotKas()]);
      setRows(rekap);
      setSnap(snapshot);
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
      import('../lib/generateLaporanTriwulanPDF').catch(() => {}); // preload (gesture share HP)
    }
  }, [open]);

  // Tombol Back HP menutup overlay. Semua jalur tutup lewat requestClose →
  // mundur ke kanan (page-out-right) baru unmount.
  const exit = useClosePhase(onClose, 160);
  useBackDismiss(open, exit.requestClose);
  const dlg = useDialog(open, { onClose: exit.requestClose, label: 'Tutup buku triwulan' });

  /* Chunk PDF triwulan 399 kB — jalur terberat kedua sesudah Excel. Kuncinya
     per-BARIS (`cetakKey`) supaya yang mengaku sibuk cuma triwulan yang diketuk;
     latch di `useAksiBerat` yang menahan ketukan kedua sebelum React render. */
  async function cetak(r: RekapTriwulan) {
    haptic(12);
    setCetakKey(r.key);
    await jalankanCetak(async () => {
      // Lazy-load: jsPDF tidak ikut ke bundle utama
      const { generateLaporanTriwulanPDF } = await import('../lib/generateLaporanTriwulanPDF');
      generateLaporanTriwulanPDF(r);
      showToast(`Laporan ${r.label} dibuat`);
    }, { mulai: 'Menyiapkan laporan…', gagal: 'Gagal membuat laporan' });
    setCetakKey(null);
  }

  // Bagikan kartu PNG ke WhatsApp (anti-kepotong: kanvas auto-tinggi)
  /* `if (sharingKey) return` yang dulu berdiri sendiri di sini cuma membaca
     STATE: dua ketukan di task yang SAMA sama-sama melihat `null` dan dua-duanya
     lolos. Latch sinkron `useAksiBerat` yang benar-benar menahannya; `sharingKey`
     tinggal menandai baris MANA yang sedang sibuk. */
  async function bagikan(key: string, card: LaporanKasCard) {
    haptic(12);
    setSharingKey(key);
    await jalankanBagi(async () => {
      await shareLaporanKas(card);
    }, { mulai: 'Menyiapkan kartu…', gagal: 'Gagal membuat gambar' });
    setSharingKey(null);
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
    <div ref={dlg.panelRef} {...dlg.panelProps} className={`fixed inset-0 z-overlay bg-sunken dark:bg-gray-950 ${exit.closing ? 'page-out-right' : 'page-in-right'} overflow-y-auto`}>
      <OverlayHeader
        icon={FileText}
        title="Tutup Buku Triwulan"
        onBack={exit.requestClose}
        actions={<OverlayAction icon={RefreshCw} label="Muat ulang" onClick={() => { setLoading(true); load(); }} spinning={loading} />}
      />

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
        <p className="text-pretty text-caption text-gray-500 dark:text-gray-400">
          Tutup buku <span className="font-semibold">sekarang</span> untuk posisi kas terkini, atau pilih per triwulan. Bagikan sebagai gambar (PNG) langsung ke grup WhatsApp, atau unduh PDF.
        </p>

        {/* Tutup Buku Sekarang — snapshot posisi kas s/d hari ini */}
        {!loading && snap && (snap.jumlahTransaksi > 0 || snap.tarikanSelesai > 0) && (
          <div className="rise hero-card hero-noise" style={{ padding: '18px 20px 16px' }}>
            <div className="relative flex items-center gap-2 mb-3">
              <CalendarCheck className="w-4 h-4 text-emerald-200" strokeWidth={2.2} />
              <p className="text-micro font-bold uppercase text-white" style={{ letterSpacing: '0.14em' }}>
                Tutup Buku Sekarang
              </p>
            </div>
            <p className="relative text-micro text-white mb-1">Total Kas RT · {snap.tanggal}</p>
            <span className="relative block font-display text-white text-[clamp(1.625rem,8.4vw,2.375rem)] font-extrabold tracking-tighter leading-none tabular-nums mb-3">
              {`${snap.rtSaldoAkhir < 0 ? '-' : ''}${formatRupiahPlain(snap.rtSaldoAkhir)}`}
            </span>

            <div className="relative grid grid-cols-2 gap-2 mb-4">
              {/* Panel di ATAS gradient harus RECESSED (black/10), bukan diterangkan
                  (white/10): white/10 menaikkan latar ke #2C8758 → putih SOLID pun cuma
                  4.46:1. black/10 = #136E3E → label white/90 aman di 5.43:1. */}
              <div className="rounded-2xl bg-black/10 px-3 py-2">
                <p className="text-micro text-white uppercase tracking-wide">Kas RT (final)</p>
                <p className="text-caption font-display font-bold text-white tabular-nums">{formatRupiahPlain(snap.rtSaldoAkhir)}</p>
              </div>
              <div className="rounded-2xl bg-black/10 px-3 py-2">
                <p className="text-micro text-white uppercase tracking-wide">Hadiran · belum disetor</p>
                <p className="text-caption font-display font-bold text-white tabular-nums">{formatRupiahPlain(snap.hadiranSaldoAkhir)}</p>
              </div>
            </div>

            <button
              onClick={() => bagikan('snap', snapToCard(snap))}
              disabled={sharingKey !== null}
              className="press relative w-full min-h-[44px] py-3 rounded-2xl bg-white text-brand font-bold text-body hover:bg-emerald-50 transition flex items-center justify-center gap-2 disabled:opacity-60"
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
        ) : error ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift">
            <ErrorState onRetry={() => { setLoading(true); load(); }} retrying={loading} />
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
                  <p className="text-caption text-ink-faint dark:text-gray-400 mt-0.5">{r.rentang}</p>
                </div>
                {idx === 0 && (
                  <Tag tone="success">Terbaru</Tag>
                )}
              </div>

              {/* 1 kolom di HP (bukan 2): di 360px panel cuma 120px dalam, nominal
                  7 digit + label "Keluar" tak muat → angka terpotong. Pola sama
                  "Rekap per Kategori" Kas RT: grid-cols-1 sm:grid-cols-2. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Ledger judul="Kas Hadiran" masuk={r.hadiranMasuk} keluar={r.hadiranKeluar} saldo={r.hadiranSaldoAkhir} />
                <Ledger judul="Kas RT" masuk={r.rtMasuk} keluar={r.rtKeluar} saldo={r.rtSaldoAkhir} />
              </div>

              <div className="flex items-center gap-2 text-micro text-gray-500 dark:text-gray-400">
                <span className="px-2 py-1 rounded-lg inset-soft">{r.tarikanSelesai} tarikan</span>
                <span className="px-2 py-1 rounded-lg inset-soft">{r.talanganLunas} talangan lunas</span>
                <span className="px-2 py-1 rounded-lg inset-soft">{r.jumlahTransaksi} transaksi</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => bagikan(r.key, triwulanToCard(r))}
                  disabled={sharingKey !== null}
                  className="press btn-brand flex-1 min-h-[44px] py-3 text-white font-semibold text-body flex items-center justify-center gap-2"
                >
                  {sharingKey === r.key ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Menyiapkan…</>
                  ) : (
                    <><Share2 className="w-4 h-4" /> Bagikan PNG</>
                  )}
                </button>
                <button
                  onClick={() => cetak(r)}
                  className="btn-secondary press min-h-[44px] px-4 py-3 rounded-2xl flex items-center justify-center gap-2"
                  aria-label={`Unduh PDF ${r.label}`}
                  aria-busy={(cetakSibuk && cetakKey === r.key) || undefined}
                >
                  {cetakSibuk && cetakKey === r.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
