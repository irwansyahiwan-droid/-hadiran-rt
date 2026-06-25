import { useEffect, useMemo, useState } from 'react';
import { FileText, RefreshCw, RotateCcw, ArrowUpRight, Trash2, TrendingUp, AlertTriangle, Check, Coins, Download, ChevronRight, X, Wallet, Share2, Eye, EyeOff } from 'lucide-react';
import { useDragDismiss } from '../hooks/useDragDismiss';
import FilterChips from '../components/FilterChips';
import InfoTip from '../components/InfoTip';
import SectionTitle from '../components/SectionTitle';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useCountUp, useHideAmount, toggleHideAmount } from '../lib/hooks';
import AvatarPeci from '../components/AvatarPeci';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Odometer from '../components/Odometer';
import Tag from '../components/Tag';
import ConfirmBatalTarikan from '../components/ConfirmBatalTarikan';
import Fab from '../components/Fab';
import ExportMenu from '../components/ExportMenu';
import { showToast, showUndo } from '../lib/toast';
import { recomputeKasRTSaldo } from '../lib/kasRt';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatRupiahPlain, formatTanggal, haptic, maskRp } from '../lib/utils';
import type { AbsensiStatus, Tarikan, TransaksiKas, Warga } from '../lib/types';

// ── Setor Modal ────────────────────────────────────────────

interface SetorModalProps {
  saldoHadiran: number;
  onSave: (data: { nominal: number; keterangan: string; tanggal: string }) => Promise<void>;
  onClose: () => void;
}

function SetorModal({ saldoHadiran, onSave, onClose }: SetorModalProps) {
  const [nominal, setNominal] = useState(0);
  const [keterangan, setKeterangan] = useState('');
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const drag = useDragDismiss(onClose);
  useBackDismiss(true, onClose);
  const dlg = useDialog(true, { onClose, label: 'Setor ke Kas Besar RT' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nominal) return;
    setSaving(true);
    try {
      await onSave({ nominal, keterangan, tanggal });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div ref={dlg.panelRef} {...dlg.panelProps} className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={drag.style}>
        <div className="-mt-2 mb-1 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...drag.handlers}>
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Setor ke Kas Besar RT</h3>
          <p className="text-xs text-ink-faint dark:text-gray-400 mt-0.5">
            Saldo hadiran: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatRupiahPlain(saldoHadiran)}</span>
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="kashadiran-keterangan" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Keterangan</label>
            <input id="kashadiran-keterangan" name="keterangan" autoComplete="off" type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)} required
              placeholder="Setoran bulan Mei 2026"
              className="field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="kashadiran-nominal" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nominal</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                <input id="kashadiran-nominal" name="nominal" autoComplete="off" type="text" inputMode="numeric" value={nominal ? nominal.toLocaleString('id-ID') : ''}
                  onChange={e => setNominal(Number(e.target.value.replace(/\D/g, '')) || 0)} required
                  className="field pl-9 pr-3" />
              </div>
            </div>
            <div>
              <label htmlFor="kashadiran-tanggal" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Tanggal</label>
              <input id="kashadiran-tanggal" name="tanggal" type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} required
                className="field" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="btn-secondary flex-1 py-3 rounded-xl">Batal</button>
            <button type="submit" disabled={saving || !nominal}
              className="btn-brand flex-1 py-3 text-sm font-semibold disabled:opacity-70 active:scale-[0.97] transition flex items-center justify-center gap-2">
              {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
              {saving ? 'Menyimpan…' : 'Setor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function KasHadiranPage() {
  const { isBendahara } = useAuthContext();
  const [transaksi, setTransaksi] = useState<TransaksiKas[]>([]);
  const [tarikanSelesai, setTarikanSelesai] = useState<Tarikan[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [totalTalanganBelum, setTotalTalanganBelum] = useState(0);
  const [talanganMap, setTalanganMap] = useState<Record<string, { count: number; total: number }>>({});
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batalTarikan, setBatalTarikan] = useState<Tarikan | null>(null);
  const [confirmHapusId, setConfirmHapusId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hadiranFilter, setHadiranFilter] = useState<'semua' | 'talangan' | 'lunas'>('semua');
  const [hadiranSort, setHadiranSort] = useState<'terbaru' | 'terlama' | 'kas'>('terbaru');
  const [detailTarikan, setDetailTarikan] = useState<Tarikan | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailHadir, setDetailHadir] = useState<{ id: string; nama: string }[]>([]);
  const [detailTitip, setDetailTitip] = useState<{ id: string; nama: string }[]>([]);
  const [detailTidak, setDetailTidak] = useState<{ id: string; nama: string; lunas: boolean }[]>([]);
  const detailDrag = useDragDismiss(() => setDetailTarikan(null));
  useBackDismiss(detailTarikan !== null, () => setDetailTarikan(null));
  const detailDlg = useDialog(detailTarikan !== null, { onClose: () => setDetailTarikan(null), label: 'Detail tarikan' });

  async function load() {
    setLoading(true);
    setError(false);
    try {
    const [txRes, tarRes, talRes, wargaRes] = await Promise.all([
      supabase.from('transaksi_kas').select('*').order('tanggal', { ascending: true }),
      supabase
        .from('tarikan')
        .select('*, sohibul_bait:warga!sohibul_bait_id(*)')
        .eq('status', 'selesai')
        .order('nomor', { ascending: true }),
      supabase.from('talangan').select('tarikan_id, nominal').eq('status_lunas', false),
      supabase.from('warga').select('*').eq('status_aktif', true).order('nama', { ascending: true }),
    ]);
    setTransaksi((txRes.data as TransaksiKas[]) ?? []);
    setTarikanSelesai((tarRes.data as Tarikan[]) ?? []);
    setWargaList((wargaRes.data as Warga[]) ?? []);

    const talData = (talRes.data ?? []) as { tarikan_id: string; nominal: number }[];
    const total = talData.reduce((s, t) => s + t.nominal, 0);
    setTotalTalanganBelum(total);

    const map = talData.reduce<Record<string, { count: number; total: number }>>((acc, t) => {
      if (!acc[t.tarikan_id]) acc[t.tarikan_id] = { count: 0, total: 0 };
      acc[t.tarikan_id].count += 1;
      acc[t.tarikan_id].total += t.nominal;
      return acc;
    }, {});
    setTalanganMap(map);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // preload generator PDF agar gesture share tetap valid di HP (klik pertama)
    import('../lib/generatePendapatanPDF').catch(() => {});
    import('../lib/generateKasHadiranPDF').catch(() => {});
    import('../lib/generateAbsensiPDF').catch(() => {});
  }, []);

  const totalSetor = transaksi.filter(t => t.tipe === 'setor_kas_rt').reduce((s, t) => s + t.nominal, 0);
  const totalKasTerkumpul = tarikanSelesai.reduce((s, t) => s + (t.total_terkumpul ?? 0), 0);
  const saldo = totalKasTerkumpul - totalTalanganBelum - totalSetor;
  const animatedSaldo = useCountUp(saldo);

  // Bagikan ringkasan Kas Hadiran sbg kartu PNG bermerek → grup WA warga.
  async function handleShareReceipt() {
    haptic(12);
    // formatRupiahPlain pakai Math.abs → tambahkan tanda minus sendiri utk saldo negatif.
    const fmtSaldo = (saldo < 0 ? '-' : '') + formatRupiahPlain(saldo);
    try {
      const { shareReceipt } = await import('../lib/shareReceipt');
      await shareReceipt({
        title: 'Ringkasan Kas Hadiran RT 004 / RW 006',
        amountLabel: 'Saldo Kas Hadiran',
        amount: fmtSaldo,
        rows: [
          { label: 'Kas Terkumpul', value: '+' + formatRupiahPlain(totalKasTerkumpul) },
          { label: 'Talangan Belum Lunas', value: '-' + formatRupiahPlain(totalTalanganBelum) },
          { label: 'Setor ke Kas RT', value: '-' + formatRupiahPlain(totalSetor) },
          { label: 'Saldo Bersih', value: fmtSaldo },
        ],
        shareText: `Ringkasan Kas Hadiran RT 004/006\nSaldo: ${fmtSaldo} · ${tarikanSelesai.length} tarikan\n— Hadiran RT`,
      });
    } catch {
      showToast('Gagal membuat gambar. Coba lagi.', 'error');
    }
  }

  // Rekap per tarikan difilter (status talangan) & diurutkan.
  const displayTarikan = useMemo(() => {
    let arr = [...tarikanSelesai];
    if (hadiranSort === 'terbaru')      arr.sort((a, b) => (b.nomor ?? 0) - (a.nomor ?? 0));
    else if (hadiranSort === 'terlama') arr.sort((a, b) => (a.nomor ?? 0) - (b.nomor ?? 0));
    else if (hadiranSort === 'kas')     arr.sort((a, b) => (b.total_terkumpul ?? 0) - (a.total_terkumpul ?? 0));
    if (hadiranFilter === 'talangan')   arr = arr.filter((t) => (talanganMap[t.id]?.count ?? 0) > 0);
    else if (hadiranFilter === 'lunas') arr = arr.filter((t) => (talanganMap[t.id]?.count ?? 0) === 0);
    return arr;
  }, [tarikanSelesai, talanganMap, hadiranFilter, hadiranSort]);


  // Setor per tarikan — untuk kolom SETOR di PDF (hanya berubah saat transaksi berubah)
  const setorMap = useMemo(() => transaksi
    .filter(t => t.tipe === 'setor_kas_rt' && t.tarikan_id)
    .reduce<Record<string, number>>((acc, t) => {
      if (t.tarikan_id) acc[t.tarikan_id] = (acc[t.tarikan_id] ?? 0) + t.nominal;
      return acc;
    }, {}), [transaksi]);

  async function handlePendapatanPDF(tarikan: Tarikan) {
    setPdfLoading(tarikan.id);
    try {
      const [absensiRes, talanganRes] = await Promise.all([
        supabase.from('absensi').select('warga_id, status').eq('tarikan_id', tarikan.id),
        supabase.from('talangan').select('warga_id').eq('tarikan_id', tarikan.id).eq('status_lunas', true),
      ]);
      const absensiMap: Record<string, AbsensiStatus> = {};
      (absensiRes.data as { warga_id: string; status: AbsensiStatus }[] ?? [])
        .forEach(a => { absensiMap[a.warga_id] = a.status; });
      const lunasSet = new Set(
        (talanganRes.data as { warga_id: string }[] ?? []).map(t => t.warga_id),
      );
      const { generatePendapatanPDF } = await import('../lib/generatePendapatanPDF');
      generatePendapatanPDF(tarikan, wargaList, absensiMap, lunasSet);
    } catch {
      showToast('Gagal membuat PDF. Coba muat ulang aplikasi.', 'error');
    } finally {
      setPdfLoading(null);
    }
  }

  // Cetak daftar hadir (absensi) tarikan yang sedang dibuka → PDF.
  async function handleAbsensiPDF() {
    if (!detailTarikan) return;
    haptic(12);
    try {
      const { generateAbsensiPDF } = await import('../lib/generateAbsensiPDF');
      generateAbsensiPDF(detailTarikan, detailHadir, detailTidak, detailTitip);
    } catch {
      showToast('Gagal membuat PDF. Coba muat ulang aplikasi.', 'error');
    }
  }

  // Buka sheet detail tarikan: daftar hadir & tidak hadir (+ status bayar talangan).
  async function openDetail(t: Tarikan) {
    setDetailTarikan(t);
    setDetailLoading(true);
    setDetailHadir([]);
    setDetailTitip([]);
    setDetailTidak([]);
    const [absRes, talRes] = await Promise.all([
      supabase.from('absensi').select('warga_id, status').eq('tarikan_id', t.id),
      supabase.from('talangan').select('warga_id, status_lunas').eq('tarikan_id', t.id),
    ]);
    const namaMap = new Map(wargaList.map((w) => [w.id, w.nama]));
    const lunasMap = new Map(
      (talRes.data as { warga_id: string; status_lunas: boolean }[] ?? []).map((x) => [x.warga_id, x.status_lunas]),
    );
    const hadir: { id: string; nama: string }[] = [];
    const titip: { id: string; nama: string }[] = [];
    const tidak: { id: string; nama: string; lunas: boolean }[] = [];
    (absRes.data as { warga_id: string; status: AbsensiStatus }[] ?? []).forEach((a) => {
      const nama = namaMap.get(a.warga_id) ?? '—';
      if (a.status === 'hadir') hadir.push({ id: a.warga_id, nama });
      else if (a.status === 'titip') titip.push({ id: a.warga_id, nama });
      else tidak.push({ id: a.warga_id, nama, lunas: lunasMap.get(a.warga_id) ?? false });
    });
    hadir.sort((a, b) => a.nama.localeCompare(b.nama));
    titip.sort((a, b) => a.nama.localeCompare(b.nama));
    tidak.sort((a, b) => Number(a.lunas) - Number(b.lunas) || a.nama.localeCompare(b.nama)); // belum bayar di atas
    setDetailHadir(hadir);
    setDetailTitip(titip);
    setDetailTidak(tidak);
    setDetailLoading(false);
  }

  // Batalkan "Simpan & Hitung" — kembalikan tarikan ke status terjadwal
  // dan hapus data turunannya (absensi, talangan, transaksi kas tarikan ini).
  async function batalkanTarikan(t: Tarikan) {
    setProcessingId(t.id);
    try {
      await supabase.from('absensi').delete().eq('tarikan_id', t.id);
      await supabase.from('talangan').delete().eq('tarikan_id', t.id);
      await supabase.from('transaksi_kas').delete().eq('tarikan_id', t.id);
      await supabase.from('tarikan').update({
        status: 'dijadwalkan', total_hadir: 0, total_terkumpul: 0,
      }).eq('id', t.id);
      await load();
      setBatalTarikan(null); // tutup dialog pengaman
      showToast(`Tarikan #${t.nomor} dibatalkan`, 'info');
    } finally {
      setProcessingId(null);
    }
  }

  // Buka dialog pengaman (wajib ketik nomor tarikan) — cegah salah-pencet.
  function handleBatalkanClick(t: Tarikan) {
    setConfirmHapusId(null);
    setBatalTarikan(t);
  }

  // Hapus tarikan sepenuhnya (semua data turunan). Pola undo: hapus permanen
  // baru dijalankan 5 dtk kemudian bila tak diurungkan.
  function hapusTarikan(t: Tarikan) {
    setConfirmHapusId(null);
    setTarikanSelesai(prev => prev.filter(x => x.id !== t.id)); // optimistik
    showUndo(
      `Tarikan #${t.nomor} dihapus`,
      async () => {
        await supabase.from('absensi').delete().eq('tarikan_id', t.id);
        await supabase.from('talangan').delete().eq('tarikan_id', t.id);
        await supabase.from('transaksi_kas').delete().eq('tarikan_id', t.id);
        await supabase.from('tarikan').delete().eq('id', t.id);
        await load();
      },
      { onUndo: () => load() },
    );
  }

  function handleHapusClick(t: Tarikan) {
    setBatalTarikan(null);
    if (confirmHapusId === t.id) {
      hapusTarikan(t);
    } else {
      setConfirmHapusId(t.id);
      setTimeout(() => setConfirmHapusId(prev => (prev === t.id ? null : prev)), 3500);
    }
  }

  // Setor dari Kas Hadiran → Kas RT (catat di dua tabel) + recompute saldo kas_rt.
  async function handleSetor(data: { nominal: number; keterangan: string; tanggal: string }) {
    const saldoBaru = saldo - data.nominal;
    const ket = data.keterangan || 'Setoran dari Kas Hadiran';
    const [tx, kr] = await Promise.all([
      supabase.from('transaksi_kas').insert({
        tipe: 'setor_kas_rt',
        nominal: data.nominal,
        keterangan: ket,
        tanggal: data.tanggal,
        saldo_setelah: saldoBaru,
      }),
      supabase.from('kas_rt').insert({
        tipe: 'masuk',
        nominal: data.nominal,
        keterangan: ket,
        tanggal: data.tanggal,
        saldo_setelah: 0, // dihitung ulang di bawah
      }),
    ]);
    if (tx.error || kr.error) {
      showToast('Gagal menyetor: ' + (tx.error?.message ?? kr.error?.message ?? ''), 'error');
      return;
    }
    await recomputeKasRTSaldo();
    setShowModal(false);
    load();
    showToast('Setoran ke Kas RT tersimpan');
  }

  const hidden = useHideAmount();

  // Rincian pendapatan tarikan yang sedang dibuka — rumus WAJIB sinkron dgn
  // generatePendapatanPDF.ts (Rp45.000/pembayar → Sohibul, potongan admin Rp60.000;
  // pembayar = semua anggota kecuali Sohibul Bait, termasuk talangan belum lunas).
  const SOHIBUL_PER = 45000;
  const POTONGAN_ADMIN = 60000;
  const payingCount = detailTarikan
    ? wargaList.filter((w) => w.id !== (detailTarikan.sohibul_bait_id ?? '')).length
    : 0;
  const pendapatanKotor = payingCount * SOHIBUL_PER;
  const pendapatanBersih = pendapatanKotor - POTONGAN_ADMIN;

  const sudahSetor = totalSetor > 0;
  const heroGradient = sudahSetor
    ? 'from-setor via-setor-600 to-setor-500'
    : saldo < 0
      ? 'from-slate-800 via-slate-700 to-slate-500'
      : 'from-brand via-brand-600 to-brand-500';

  return (
    <>
      <div className="space-y-6 pb-2 overflow-x-hidden">
        {/* Header Card */}
        <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${heroGradient}`} style={{ boxShadow: 'var(--hero-shadow)' }}>
          <div className="hero-sheen pointer-events-none absolute inset-0" />

          <div className="relative p-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-white/70" />
                <p className="text-white/75 text-micro font-bold uppercase tracking-widest">Saldo Kas Hadiran</p>
              </div>
              <div className="flex items-center -mr-2">
                <button
                  onClick={() => { haptic(); toggleHideAmount(); }}
                  className="press w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                  aria-label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
                >
                  {hidden
                    ? <EyeOff className="w-4 h-4 text-white/70" />
                    : <Eye className="w-4 h-4 text-white/70" />}
                </button>
                <button
                  onClick={handleShareReceipt}
                  className="press w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Bagikan ringkasan ke WhatsApp"
                >
                  <Share2 className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>
            <p className={`font-display text-5xl font-extrabold tracking-tighter tabular-nums mb-1 ${saldo < 0 ? 'text-rose-200' : 'text-white'}`}>
              {hidden
                ? maskRp(`${saldo < 0 ? '-' : ''}Rp${Math.abs(animatedSaldo).toLocaleString('id-ID')}`, hidden, 7)
                : <Odometer value={animatedSaldo} />}
            </p>
            <p className="text-white/75 text-xs">{tarikanSelesai.length} tarikan terlaksana</p>
            {saldo <= 0 && totalSetor > 0 && (
              <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-emerald-400/20 border border-emerald-300/30 rounded-full text-emerald-100 text-xs font-semibold">
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Sudah disetor ke Kas RT
              </span>
            )}
          </div>
        </div>

        {/* Ekspor (PDF/Excel) disatukan ke satu menu; aksi utama "Setor Kas RT"
            kini hadir sebagai FAB di zona jempol. */}
        <div className="flex gap-2">
          <ExportMenu
            align="left"
            items={[
              {
                label: 'Cetak PDF',
                icon: FileText,
                onClick: async () => {
                  try {
                    const { generateKasHadiranPDF } = await import('../lib/generateKasHadiranPDF');
                    generateKasHadiranPDF(tarikanSelesai, talanganMap, setorMap, { totalKasTerkumpul, totalTalanganBelum, totalSetor, saldoAktif: saldo });
                  } catch {
                    showToast('Gagal membuat PDF. Coba muat ulang aplikasi.', 'error');
                  }
                },
              },
              {
                label: 'Ekspor Excel',
                icon: Download,
                tone: 'text-emerald-600 dark:text-emerald-400',
                onClick: async () => {
                  const { generateKasHadiranExcel } = await import('../lib/generateKasHadiranExcel');
                  await generateKasHadiranExcel(displayTarikan, talanganMap, { totalKasTerkumpul, totalTalanganBelum, totalSetor, saldo });
                },
              },
            ]}
          />
        </div>

        {/* Alur Kas */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <p className="inline-flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-gray-100">
              Alur Kas Hadiran
              <InfoTip label="Iuran">
                Tiap anggota bayar Rp50.000/tarikan: Rp45.000 untuk Sohibul Bait (penerima) + Rp5.000 masuk kas. Yang tidak hadir ditalangi dulu.
              </InfoTip>
            </p>
            <span
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 rounded-full text-white text-micro font-bold"
              aria-label={`${tarikanSelesai.length} tarikan selesai`}
            >
              {tarikanSelesai.length}
              <span className="font-medium opacity-90">tarikan</span>
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Kas Hadiran Terkumpul</span>
              </div>
              <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{maskRp(`+${formatRupiahPlain(totalKasTerkumpul)}`, hidden, 4)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Talangan Belum Lunas</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-warn dark:text-amber-400">{maskRp(`-${formatRupiahPlain(totalTalanganBelum)}`, hidden, 4)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Setoran ke Kas Besar</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">{maskRp(`-${formatRupiahPlain(totalSetor)}`, hidden, 4)}</span>
            </div>
            <div className={`flex items-center justify-between rounded-2xl p-3 mt-1 ${saldo < 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Total Bersih</p>
              <span className={`text-base font-bold tabular-nums ${saldo < 0 ? 'text-gray-700 dark:text-gray-300' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {maskRp(`${saldo < 0 ? '-' : ''}Rp${Math.abs(saldo).toLocaleString('id-ID')}`, hidden, 4)}
              </span>
            </div>
          </div>
        </div>

        {/* Rekap Per Tarikan */}
        {tarikanSelesai.length > 0 && (
          <div>
            <SectionTitle className="mt-6" count={tarikanSelesai.length}>Rekap Per Tarikan</SectionTitle>

            {/* Filter (status talangan) & sort */}
            {!loading && (
              <FilterChips
                className="mb-3"
                options={[
                  { id: 'semua',    label: 'Semua' },
                  { id: 'talangan', label: 'Ada Talangan' },
                  { id: 'lunas',    label: 'Lunas' },
                ] as const}
                value={hadiranFilter}
                onChange={setHadiranFilter}
                sort={{
                  value: hadiranSort,
                  options: [
                    { id: 'terbaru', label: 'Terbaru' },
                    { id: 'terlama', label: 'Terlama' },
                    { id: 'kas', label: 'Kas' },
                  ] as const,
                  onChange: setHadiranSort,
                }}
              />
            )}

            <div className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="skeleton w-12 h-12 rounded-2xl" />
                        <div className="flex-1 space-y-2">
                          <div className="skeleton h-3.5 w-2/5 rounded-full" />
                          <div className="skeleton h-2.5 w-1/4 rounded-full" />
                        </div>
                        <div className="skeleton h-4 w-20 rounded-full" />
                      </div>
                      <div className="skeleton h-1.5 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <ErrorState onRetry={() => load()} retrying={loading} />
              ) : displayTarikan.length === 0 ? (
                /* Hasil filter kosong */
                <EmptyState icon={TrendingUp} title="Tidak ada hasil" subtitle="Tidak ada tarikan pada filter ini." />
              ) : (
                displayTarikan.map((t, idx) => {
                  const kasHadiran = t.total_terkumpul ?? 0;
                  // Sohibul Bait = 45.000 per pembayar; kas = 5.000 per pembayar → sohibul = kas × 9
                  const sohibulTerima = kasHadiran * 9;
                  const talanganInfo = talanganMap[t.id] ?? { count: 0, total: 0 };
                  const pctHadir = Math.round((t.total_hadir / t.total_warga) * 100);

                  return (
                    <div
                      key={t.id}
                      className="rise lift bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 overflow-hidden"
                      style={{ animationDelay: `${Math.min(idx, 10) * 0.05}s`, ...(talanganInfo.count === 0 ? { borderLeft: '3px solid #10B981' } : {}) }}
                    >

                      {/* ── Timeline mini-header ─────────────────────── */}
                      <div className="flex items-center justify-between px-4 pt-4 pb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            talanganInfo.count === 0
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}>
                            {t.nomor}
                          </div>
                          <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                          <span className="text-micro text-ink-faint dark:text-gray-400">{formatTanggal(t.tanggal)}</span>
                        </div>
                        {talanganInfo.count > 0 ? (
                          <Tag tone="danger">{talanganInfo.count} belum bayar</Tag>
                        ) : (
                          <Tag tone="success"><Check className="w-3 h-3" strokeWidth={2.5} /> Lunas semua</Tag>
                        )}
                      </div>

                      {/* ── Focal row: penerima + amount (ketuk → detail) ─ */}
                      <button
                        onClick={() => openDetail(t)}
                        className="w-full flex items-center gap-3 px-4 pb-4 text-left cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors"
                      >
                        <AvatarPeci nama={t.sohibul_bait?.nama ?? '?'} className="w-12 h-12 rounded-2xl" />
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                            {t.sohibul_bait?.nama ?? '—'}
                          </p>
                          <span className="inline-flex items-center gap-1 mt-1 text-micro font-medium text-ink-faint dark:text-gray-400">
                            Lihat detail
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-amount font-semibold tabular-nums text-pos dark:text-emerald-400">
                            +{formatRupiahPlain(sohibulTerima)}
                          </p>
                          <span className="inline-block mt-0.5 px-2 py-0.5 text-micro font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-full">
                            Dapat Arisan
                          </span>
                        </div>
                      </button>

                      {/* ── Progress bar + kas info ───────────────────── */}
                      <div className="px-4 pb-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span>
                            Kas Hadiran{' '}
                            <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">{formatRupiahPlain(kasHadiran)}</span>
                          </span>
                          <span className="font-semibold">{t.total_hadir}/{t.total_warga} hadir</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full transition-[width] duration-700 ease-out"
                            style={{ width: `${pctHadir}%` }}
                          />
                        </div>
                      </div>

                      {/* ── Actions ──────────────────────────────────
                          PDF pendapatan tersedia untuk semua (termasuk warga);
                          Absensi, Batalkan & Hapus khusus bendahara. */}
                      <div className="flex items-center gap-x-4 px-4 pb-3 pt-3 border-t border-line dark:border-gray-800">
                        <button
                          onClick={() => handlePendapatanPDF(t)}
                          disabled={pdfLoading === t.id}
                          className="flex items-center gap-1.5 min-h-[44px] text-xs text-ink-sub dark:text-gray-400 font-medium hover:text-emerald-600 transition-colors disabled:opacity-50"
                        >
                          <FileText className={`w-3.5 h-3.5 ${pdfLoading === t.id ? 'animate-pulse' : ''}`} />
                          {pdfLoading === t.id ? 'Memuat…' : 'PDF Pendapatan'}
                        </button>
                        {isBendahara && (
                          <button
                            onClick={() => handleBatalkanClick(t)}
                            disabled={processingId === t.id}
                            className="flex items-center gap-1.5 min-h-[44px] text-xs font-medium transition-colors disabled:opacity-50 text-ink-sub dark:text-gray-400 hover:text-amber-600"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${processingId === t.id ? 'animate-spin' : ''}`} />
                            Batalkan
                          </button>
                        )}
                        {isBendahara && (
                          <button
                            onClick={() => handleHapusClick(t)}
                            disabled={processingId === t.id}
                            aria-label="Hapus tarikan"
                            className={`flex items-center gap-1 min-h-[44px] text-xs font-medium ml-auto transition-colors disabled:opacity-50 ${
                              confirmHapusId === t.id ? 'text-rose-600' : 'text-ink-faint dark:text-gray-500 hover:text-rose-500'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {confirmHapusId === t.id && 'Yakin hapus?'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <SetorModal
          saldoHadiran={saldo}
          onSave={handleSetor}
          onClose={() => setShowModal(false)}
        />
      )}

      <ConfirmBatalTarikan
        open={!!batalTarikan}
        nomor={batalTarikan?.nomor ?? 0}
        loading={!!batalTarikan && processingId === batalTarikan.id}
        onClose={() => setBatalTarikan(null)}
        onConfirm={() => { if (batalTarikan) batalkanTarikan(batalTarikan); }}
      />

      {/* Sheet detail tarikan: hadir & tidak hadir + status bayar talangan */}
      {detailTarikan && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setDetailTarikan(null)}>
          <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            ref={detailDlg.panelRef}
            {...detailDlg.panelProps}
            className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl flex flex-col max-h-[82vh]"
            onClick={(e) => e.stopPropagation()}
            style={detailDrag.style}
          >
            <div className="pt-3 pb-2 flex justify-center touch-none cursor-grab active:cursor-grabbing shrink-0" {...detailDrag.handlers}>
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 shrink-0 border-b border-line dark:border-gray-800">
              <div className="flex items-center gap-3">
                <AvatarPeci nama={detailTarikan.sohibul_bait?.nama ?? '?'} className="w-11 h-11 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">Tarikan #{detailTarikan.nomor}</p>
                  <p className="text-xs text-ink-faint dark:text-gray-400 truncate">{formatTanggal(detailTarikan.tanggal)} · {detailTarikan.sohibul_bait?.nama ?? '—'}</p>
                </div>
                {isBendahara && !detailLoading && (
                  <button
                    onClick={handleAbsensiPDF}
                    aria-label="Cetak daftar hadir PDF"
                    className="press shrink-0 inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-control dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold px-3 py-2 rounded-xl shadow-sm"
                  >
                    <FileText className="w-4 h-4" /> PDF Absensi
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Tag tone="success">Hadir {detailHadir.length}</Tag>
                {detailTitip.length > 0 && <Tag tone="info">Titip {detailTitip.length}</Tag>}
                <Tag tone="danger">Belum bayar {detailTidak.filter((x) => !x.lunas).length}</Tag>
                <Tag tone="neutral">Lunas {detailTidak.filter((x) => x.lunas).length}</Tag>
              </div>
            </div>

            {/* Lists (scrollable) */}
            <div className="flex-1 overflow-y-auto px-5 py-4 pb-10 space-y-6">
              {detailLoading ? (
                <>
                  {/* Skeleton kartu rincian pendapatan */}
                  <div className="rounded-2xl border border-line dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 px-4 py-3.5 space-y-2.5">
                    <div className="skeleton h-2.5 w-40 rounded-full" />
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="skeleton h-3 w-2/5 rounded-full" />
                        <div className="skeleton h-3 w-20 rounded-full" />
                      </div>
                    ))}
                  </div>
                  {/* Skeleton baris nama */}
                  <div className="space-y-1">
                    <div className="skeleton h-2.5 w-32 rounded-full mb-2.5" />
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-2.5 py-1">
                        <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
                        <div className="skeleton h-3.5 flex-1 rounded-full" />
                        <div className="skeleton h-5 w-16 rounded-full shrink-0" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Rincian pendapatan real-time — angka sama dgn PDF Pendapatan */}
                  {(detailHadir.length > 0 || detailTitip.length > 0 || detailTidak.length > 0) && (
                    <div className="rounded-2xl border border-line dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 px-4 py-3.5">
                      <p className="text-micro font-bold uppercase tracking-wide text-ink-faint dark:text-gray-400 mb-2.5">Pendapatan Sohibul Bait</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink-sub dark:text-gray-400">Kotor · {payingCount} pembayar × {formatRupiahPlain(SOHIBUL_PER)}</span>
                          <span className="font-semibold tabular-nums text-ink dark:text-gray-100 whitespace-nowrap">{maskRp(formatRupiahPlain(pendapatanKotor), hidden, 4)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink-sub dark:text-gray-400">Potongan admin</span>
                          <span className="font-semibold tabular-nums text-neg dark:text-rose-400 whitespace-nowrap">{maskRp(`-${formatRupiahPlain(POTONGAN_ADMIN)}`, hidden, 4)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-line dark:border-gray-800">
                          <span className="font-bold text-ink dark:text-gray-100">Bersih diterima SB</span>
                          <span className="font-bold tabular-nums text-pos dark:text-emerald-400 whitespace-nowrap">{maskRp(formatRupiahPlain(pendapatanBersih), hidden, 4)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink-sub dark:text-gray-400">Kas Hadiran tarikan ini</span>
                          <span className="font-semibold tabular-nums text-warn dark:text-amber-400 whitespace-nowrap">{maskRp(formatRupiahPlain(detailTarikan.total_terkumpul ?? 0), hidden, 4)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {detailTitip.length > 0 && (
                    <div>
                      <p className="text-micro font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-2.5">Titip · iuran masuk ({detailTitip.length})</p>
                      <div className="space-y-1">
                        {detailTitip.map((p) => (
                          <div key={p.id} className="flex items-center gap-2.5 py-1">
                            <AvatarPeci nama={p.nama} className="w-8 h-8 rounded-lg" />
                            <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.nama}</span>
                            <Tag tone="info"><Coins className="w-3 h-3" />Titip</Tag>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {detailTidak.length > 0 && (
                    <div>
                      <p className="text-micro font-bold uppercase tracking-wide text-ink-faint dark:text-gray-400 mb-2.5">Tidak Hadir / Talangan</p>
                      <div className="space-y-1">
                        {detailTidak.map((p) => (
                          <div key={p.id} className="flex items-center gap-2.5 py-1">
                            <AvatarPeci nama={p.nama} className="w-8 h-8 rounded-lg" />
                            <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.nama}</span>
                            {p.lunas ? (
                              <Tag tone="success"><Check className="w-3 h-3" strokeWidth={2.5} />Lunas</Tag>
                            ) : (
                              <Tag tone="danger"><AlertTriangle className="w-3 h-3" />Belum bayar</Tag>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {detailHadir.length > 0 && (
                    <div>
                      <p className="text-micro font-bold uppercase tracking-wide text-ink-faint dark:text-gray-400 mb-2.5">Hadir ({detailHadir.length})</p>
                      <div className="space-y-1">
                        {detailHadir.map((p) => (
                          <div key={p.id} className="flex items-center gap-2.5 py-1">
                            <AvatarPeci nama={p.nama} className="w-8 h-8 rounded-lg" />
                            <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.nama}</span>
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {detailHadir.length === 0 && detailTitip.length === 0 && detailTidak.length === 0 && (
                    <p className="text-center text-sm text-ink-faint dark:text-gray-400 py-8">Belum ada data absensi untuk tarikan ini.</p>
                  )}
                </>
              )}
            </div>

            <button
              onClick={() => setDetailTarikan(null)}
              className="press absolute top-3 right-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Aksi utama di zona jempol */}
      {isBendahara && (
        <Fab label="Setor" icon={ArrowUpRight} ariaLabel="Setor ke Kas RT" onClick={() => setShowModal(true)} />
      )}
    </>
  );
}
