import { useEffect, useMemo, useState } from 'react';
import { FileText, RefreshCw, RotateCcw, ArrowUpRight, Trash2, TrendingUp, AlertTriangle, Check, Coins, Download, ChevronRight, X, Wallet, Share2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useDragDismiss } from '../hooks/useDragDismiss';
import FilterChips from '../components/FilterChips';
import InfoTip from '../components/InfoTip';
import SectionTitle from '../components/SectionTitle';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useCountUp, useHideAmount, toggleHideAmount, useSaving, useAksiBerat, useKembaliDariLatar } from '../lib/hooks';
import AvatarPeci from '../components/AvatarPeci';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Odometer from '../components/Odometer';
import Tag from '../components/Tag';
import ConfirmDestruktif from '../components/ConfirmDestruktif';
import Fab from '../components/Fab';
import ExportMenu from '../components/ExportMenu';
import { showToast, showUndo } from '../lib/toast';
import { recomputeKasRTSaldo } from '../lib/kasRt';
import { supabase } from '../lib/supabase';
import { getPageCache, setPageCache } from '../lib/pageCache';
import { useAuthContext } from '../context/AuthContext';
import { formatRupiahPlain, formatTanggal, haptic, hitungSaldoHadiran, maskRp } from '../lib/utils';
import CrossFade from '../components/CrossFade';
import HeroSaldo, { HeroAction } from '../components/HeroSaldo';
import PageHeader from '../components/layout/PageHeader';
import type { AbsensiStatus, Tarikan, TransaksiKas, Warga } from '../lib/types';

// ── Setor Modal ────────────────────────────────────────────

interface SetorModalProps {
  saldoHadiran: number;
  tarikanList: Tarikan[];
  onSave: (data: { nominal: number; keterangan: string; tanggal: string; tarikan_id: string | null }) => Promise<void>;
  onClose: () => void;
}

function SetorModal({ saldoHadiran, tarikanList, onSave, onClose }: SetorModalProps) {
  // Tarikan terbaru dulu — setoran umumnya dari tarikan terakhir.
  const tarikanOpsi = useMemo(() => [...tarikanList].sort((a, b) => b.nomor - a.nomor), [tarikanList]);
  const [nominal, setNominal] = useState(0);
  const [keterangan, setKeterangan] = useState('');
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().split('T')[0]);
  // Default = tarikan paling baru. WAJIB diisi → setoran selalu ter-link ke tarikan
  // (kalau tidak, kolom SETOR di PDF alur kas kosong & total tak rekonsiliasi).
  const [tarikanId, setTarikanId] = useState<string>(() => tarikanOpsi[0]?.id ?? '');
  const [saving, setSaving, sedangSimpan] = useSaving();
  const drag = useDragDismiss(onClose);
  // Semua jalur tutup (backdrop, Batal, Escape, Back HP) lewat dismiss() → meluncur.
  useBackDismiss(true, drag.dismiss);
  const dlg = useDialog(true, { onClose: drag.dismiss, label: 'Setor ke Kas Besar RT' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nominal || sedangSimpan()) return;   // latch sinkron — lihat useSaving()
    setSaving(true);
    try {
      await onSave({ nominal, keterangan, tanggal, tarikan_id: tarikanId || null });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-overlay flex items-end" onClick={drag.dismiss}>
      <div className={`sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm ${drag.dismissing ? 'sheet-backdrop-out' : ''}`} />
      <div ref={dlg.panelRef} {...dlg.panelProps} className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10 space-y-4 max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()} style={drag.style}>
        <div className="-mt-2 mb-1 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...drag.handlers}>
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div>
          <h3 className="text-balance text-subtitle font-bold text-ink dark:text-gray-100">Setor ke Kas Besar RT</h3>
          <p className="text-caption text-ink-faint dark:text-gray-400 mt-0.5">
            Saldo hadiran: <span className="font-display font-semibold tabular-nums text-pos dark:text-pos-dark">{formatRupiahPlain(saldoHadiran)}</span>
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="kashadiran-tarikan" className="label-field">Dari tarikan</label>
            <select id="kashadiran-tarikan" name="tarikan" value={tarikanId} onChange={e => setTarikanId(e.target.value)} required
              className="field">
              {tarikanOpsi.length === 0 && <option value="">— belum ada tarikan selesai —</option>}
              {tarikanOpsi.map(t => (
                <option key={t.id} value={t.id}>
                  #{t.nomor} · {t.sohibul_bait?.nama ?? '—'} · {new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="kashadiran-keterangan" className="label-field">Keterangan</label>
            <input id="kashadiran-keterangan" name="keterangan" autoComplete="off" type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)} required
              placeholder="Contoh: Setoran bulan Mei 2026…"
              className="field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="kashadiran-nominal" className="label-field">Nominal</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-body text-gray-500 dark:text-gray-400">Rp</span>
                <input id="kashadiran-nominal" name="nominal" autoComplete="off" type="text" inputMode="numeric" value={nominal ? nominal.toLocaleString('id-ID') : ''}
                  onChange={e => setNominal(Number(e.target.value.replace(/\D/g, '')) || 0)} required
                  className="field pl-9 pr-3" />
              </div>
            </div>
            <div>
              <label htmlFor="kashadiran-tanggal" className="label-field">Tanggal</label>
              <input id="kashadiran-tanggal" name="tanggal" type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} required
                className="field" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={drag.dismiss}
              className="btn-secondary flex-1 py-3 rounded-xl">Batal</button>
            <button type="submit" disabled={saving || !nominal}
              className="btn-brand flex-1 py-3 text-body font-semibold active:scale-[0.97] transition flex items-center justify-center gap-2">
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

// Tinggi dasar hero (px) — SATU sumber utk skeleton (height) & hero asli
// (min-height) agar CrossFade bebas layout-jump. FitAmount bisa menyusut
// (30–48px) → tinggi natural hero bervariasi ~146–166px; min-height menahan
// lantai sama dgn skeleton. Ubah di sini bila anatomi hero berubah.
const HERO_MIN_H = 164;

interface KasHadiranCache {
  transaksi: TransaksiKas[];
  tarikanSelesai: Tarikan[];
  wargaList: Warga[];
  totalTalanganBelum: number;
  talanganMap: Record<string, { count: number; total: number }>;
}

export default function KasHadiranPage() {
  const { isBendahara } = useAuthContext();
  // SWR: render dari snapshot terakhir, revalidate diam-diam (lihat lib/pageCache).
  const [cached] = useState(() => getPageCache<KasHadiranCache>('kas-hadiran'));
  const [transaksi, setTransaksi] = useState<TransaksiKas[]>(cached?.transaksi ?? []);
  const [tarikanSelesai, setTarikanSelesai] = useState<Tarikan[]>(cached?.tarikanSelesai ?? []);
  const [wargaList, setWargaList] = useState<Warga[]>(cached?.wargaList ?? []);
  const [totalTalanganBelum, setTotalTalanganBelum] = useState(cached?.totalTalanganBelum ?? 0);
  const [talanganMap, setTalanganMap] = useState<Record<string, { count: number; total: number }>>(cached?.talanganMap ?? {});
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batalTarikan, setBatalTarikan] = useState<Tarikan | null>(null);
  const [hapusTarget, setHapusTarget] = useState<Tarikan | null>(null);
  const [loading, setLoading] = useState(!cached);
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
  useBackDismiss(detailTarikan !== null, detailDrag.dismiss);
  const detailDlg = useDialog(detailTarikan !== null, { onClose: detailDrag.dismiss, label: 'Detail tarikan' });

  async function load() {
    // Sudah ada data tampil → revalidate diam-diam: tanpa skeleton, gagal = toast.
    const silent = transaksi.length > 0 || tarikanSelesai.length > 0;
    if (!silent) setLoading(true);
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
    // Supabase tak melempar — cek error per hasil; tanpa ini fetch gagal jadi
    // rekap kosong palsu + cache tertimpa.
    const resErr = txRes.error ?? tarRes.error ?? talRes.error ?? wargaRes.error;
    if (resErr) throw resErr;
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
    setPageCache<KasHadiranCache>('kas-hadiran', {
      transaksi: (txRes.data as TransaksiKas[]) ?? [],
      tarikanSelesai: (tarRes.data as Tarikan[]) ?? [],
      wargaList: (wargaRes.data as Warga[]) ?? [],
      totalTalanganBelum: total,
      talanganMap: map,
    });
    } catch {
      if (silent) showToast('Gagal memperbarui data. Coba lagi.', 'error');
      else setError(true);
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

  /* Ditinggal lama lalu dibuka lagi → ambil ulang diam-diam. Lihat
     `useKembaliDariLatar` di lib/hooks.ts: tanpa ini halaman memuat datanya
     SEKALI seumur tab. */
  useKembaliDariLatar(load);

  const totalSetor = transaksi.filter(t => t.tipe === 'setor_kas_rt').reduce((s, t) => s + t.nominal, 0);
  const totalKasTerkumpul = tarikanSelesai.reduce((s, t) => s + (t.total_terkumpul ?? 0), 0);
  const saldo = hitungSaldoHadiran(totalKasTerkumpul, totalTalanganBelum, totalSetor);
  const animatedSaldo = useCountUp(saldo);
  /* Aksi BERAT (chunk diunduh saat diketuk + berkas dirender di main thread).
     Satu instans per TOMBOL, bukan satu untuk halaman: latch-nya per instans,
     jadi menyatukannya membuat "Bagikan" ikut terkunci saat PDF disiapkan. */
  const [eksporSibuk, jalankanEkspor] = useAksiBerat();
  const [bagiSibuk, jalankanBagi] = useAksiBerat();
  const [absensiSibuk, jalankanAbsensi] = useAksiBerat();
  const [, jalankanPendapatan] = useAksiBerat();

  // Muat gagal DAN tak ada apa pun yang bisa ditampilkan (tanpa cache) — satu
  // sumber untuk dua gerbang di bawah supaya ErrorState tak tampil dua kali.
  const gagalTotal = error && transaksi.length === 0 && tarikanSelesai.length === 0;

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Bagikan ringkasan Kas Hadiran sbg kartu PNG bermerek → grup WA warga.
  async function handleShareReceipt() {
    haptic(12);
    // formatRupiahPlain pakai Math.abs → tambahkan tanda minus sendiri utk saldo negatif.
    const fmtSaldo = (saldo < 0 ? '-' : '') + formatRupiahPlain(saldo);
    await jalankanBagi(async () => {
      const { shareReceipt } = await import('../lib/shareReceipt');
      await shareReceipt({
        title: 'Ringkasan Kas Hadiran RT 004 / RW 006',
        amountLabel: 'Saldo Kas Hadiran',
        amount: fmtSaldo,
        /* `tone` mengikuti panel "Alur Kas Hadiran" di layar — empat baris yang
           SAMA persis. Sampai 4 Agu 2026 tak satu pun baris membawa tone, jadi
           kartu yang beredar di WA menampilkan keempatnya dalam ink polos
           sementara layarnya berwarna: warga melihat dua versi fakta yang sama.
           "Setor ke Kas RT" sengaja TETAP netral — di layar pun begitu (biru
           `setor` tak boleh menyentuh nilai uang, lihat catatan di panel). */
        rows: [
          { label: 'Kas Terkumpul', value: '+' + formatRupiahPlain(totalKasTerkumpul), tone: 'pos' as const },
          { label: 'Talangan Belum Lunas', value: '-' + formatRupiahPlain(totalTalanganBelum), tone: 'warn' as const },
          { label: 'Setor ke Kas RT', value: '-' + formatRupiahPlain(totalSetor) },
          { label: 'Saldo Bersih', value: fmtSaldo, tone: saldo < 0 ? ('neg' as const) : ('pos' as const) },
        ],
        shareText: `Ringkasan Kas Hadiran RT 004/006\nSaldo: ${fmtSaldo} · ${tarikanSelesai.length} tarikan\n— Hadiran RT`,
      });
    }, { mulai: 'Menyiapkan kartu…', gagal: 'Gagal membuat gambar. Coba lagi.' });
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

  /* Keadaan sibuknya PER BARIS (`pdfLoading`) supaya yang berputar cuma baris
     yang diketuk; dari `useAksiBerat` yang dipinjam latch sinkron + penerjemah
     galatnya. `jalankan` tak pernah melempar, jadi `setPdfLoading(null)` di
     bawah selalu tercapai — tanpa `finally` bersarang. */
  async function handlePendapatanPDF(tarikan: Tarikan) {
    setPdfLoading(tarikan.id);
    await jalankanPendapatan(async () => {
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
    }, { mulai: 'Menyiapkan PDF…', gagal: 'Gagal membuat PDF. Coba muat ulang aplikasi.' });
    setPdfLoading(null);
  }

  // Cetak daftar hadir (absensi) tarikan yang sedang dibuka → PDF.
  async function handleAbsensiPDF() {
    if (!detailTarikan) return;
    haptic(12);
    await jalankanAbsensi(async () => {
      const { generateAbsensiPDF } = await import('../lib/generateAbsensiPDF');
      generateAbsensiPDF(detailTarikan, detailHadir, detailTidak, detailTitip);
    }, { mulai: 'Menyiapkan PDF…', gagal: 'Gagal membuat PDF. Coba muat ulang aplikasi.' });
  }

  // Buka sheet detail tarikan: daftar hadir & tidak hadir (+ status bayar talangan).
  async function openDetail(t: Tarikan) {
    haptic();
    setDetailTarikan(t);
    setDetailLoading(true);
    setDetailHadir([]);
    setDetailTitip([]);
    setDetailTidak([]);
    try {
      const [absRes, talRes] = await Promise.all([
        supabase.from('absensi').select('warga_id, status').eq('tarikan_id', t.id),
        supabase.from('talangan').select('warga_id, status_lunas').eq('tarikan_id', t.id),
      ]);
      if (absRes.error || talRes.error) throw absRes.error ?? talRes.error;
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
    } catch {
      // Fetch gagal → tutup sheet + beri tahu; tanpa ini skeleton macet selamanya.
      setDetailTarikan(null);
      showToast('Gagal memuat detail. Cek koneksi lalu coba lagi.', 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  // Batalkan "Simpan & Hitung" — kembalikan tarikan ke status terjadwal dan
  // hapus data turunannya. Lewat RPC atomik: server mengarsipkan snapshot
  // pemulihan (absensi + talangan + nama warga) ke audit_log DULU, baru
  // menghapus — satu transaksi, tak bisa setengah jalan.
  async function batalkanTarikan(t: Tarikan) {
    setProcessingId(t.id);
    try {
      const { error } = await supabase.rpc('batalkan_tarikan', {
        p_tarikan_id: t.id,
        p_hapus: false,
      });
      if (error) throw error;
      await load();
      setBatalTarikan(null); // tutup dialog pengaman
      showToast(`Tarikan #${t.nomor} dibatalkan`, 'info');
    } catch {
      showToast('Gagal membatalkan. Cek koneksi lalu coba lagi — tidak ada data yang terhapus.', 'error');
    } finally {
      setProcessingId(null);
    }
  }

  // Buka dialog pengaman (wajib ketik nomor tarikan) — cegah salah-pencet.
  function handleBatalkanClick(t: Tarikan) {
    setHapusTarget(null);
    setBatalTarikan(t);
  }

  // Hapus tarikan sepenuhnya (semua data turunan). Pola undo: hapus permanen
  // baru dijalankan 5 dtk kemudian bila tak diurungkan. RPC atomik yang sama
  // dgn batalkan (p_hapus) → snapshot pemulihan terarsip dulu di audit_log.
  function hapusTarikan(t: Tarikan) {
    setHapusTarget(null);
    setTarikanSelesai(prev => prev.filter(x => x.id !== t.id)); // optimistik
    showUndo(
      `Tarikan #${t.nomor} dihapus`,
      async () => {
        const { error } = await supabase.rpc('batalkan_tarikan', {
          p_tarikan_id: t.id,
          p_hapus: true,
        });
        if (error) {
          showToast('Gagal menghapus. Cek koneksi — tidak ada data yang terhapus.', 'error');
        }
        await load();
      },
      { onUndo: () => load() },
    );
  }

  function handleHapusClick(t: Tarikan) {
    setBatalTarikan(null);
    setHapusTarget(t);
  }

  // Setor dari Kas Hadiran → Kas RT (catat di dua tabel) + recompute saldo kas_rt.
  async function handleSetor(data: { nominal: number; keterangan: string; tanggal: string; tarikan_id: string | null }) {
    const saldoBaru = saldo - data.nominal;
    const ket = data.keterangan || 'Setoran dari Kas Hadiran';
    const [tx, kr] = await Promise.all([
      supabase.from('transaksi_kas').insert({
        tipe: 'setor_kas_rt',
        nominal: data.nominal,
        keterangan: ket,
        tanggal: data.tanggal,
        tarikan_id: data.tarikan_id,   // link ke tarikan → muncul di kolom SETOR PDF alur kas
        saldo_setelah: saldoBaru,
      }),
      supabase.from('kas_rt').insert({
        tipe: 'masuk',
        nominal: data.nominal,
        keterangan: ket,
        tanggal: data.tanggal,
        kategori: 'hadiran',   // penerimaan Kas RT dari Kas Hadiran → otomatis terkategori
        saldo_setelah: 0, // dihitung ulang di bawah
      }),
    ]);
    if (tx.error || kr.error) {
      showToast('Gagal menyetor: ' + (tx.error?.message ?? kr.error?.message ?? ''), 'error');
      return;
    }
    // Setoran SUDAH tercatat di dua ledger; sisa risikonya saldo berjalan Kas RT
    // yang basi — itu harus dikatakan, bukan ditelan diam-diam.
    let saldoOk = true;
    try {
      await recomputeKasRTSaldo();
    } catch (e) {
      saldoOk = false;
      showToast('Setoran tersimpan, tapi saldo berjalan Kas RT gagal dihitung ulang. Muat ulang halaman. ' + (e instanceof Error ? e.message : ''), 'error');
    }
    setShowModal(false);
    load();
    if (saldoOk) showToast('Setoran ke Kas RT tersimpan');
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

  return (
    <>
      <div className="space-y-7 pb-2 overflow-x-hidden">
        {/* Kepala halaman = PageHeader bersama (30 Jul). Tetap SATU baris di HP:
            judul + toolbar (ikon 44px + Ekspor ±130px) muat di 358px; tumpukan
            dua baris dulu menambah ±56px chrome di atas hero. */}
        <PageHeader
          title="Kas Hadiran"
          subtitle={`Per ${today}`}
          actions={<>
            <button onClick={load} aria-label="Muat ulang" className="press w-11 h-11 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <ExportMenu
              /* Muat gagal → ekspor dimatikan. Halaman memang sudah
                 menampilkan ErrorState tanpa angka, tapi tombol ini duduk
                 di PageHeader (di LUAR cabang error) sehingga tetap hidup —
                 dan PDF-nya keluar dgn Rp0 + tanggal cetak + kolom tanda
                 tangan, tampak sah untuk diarsipkan. */
              disabled={error}
              disabledReason="Data gagal dimuat — muat ulang dulu sebelum mengekspor."
              busy={eksporSibuk}
              align="left"
              items={[
                {
                  label: 'Cetak PDF',
                  icon: FileText,
                  onClick: () => jalankanEkspor(async () => {
                    const { generateKasHadiranPDF } = await import('../lib/generateKasHadiranPDF');
                    generateKasHadiranPDF(tarikanSelesai, talanganMap, setorMap, { totalKasTerkumpul, totalTalanganBelum, totalSetor, saldoAktif: saldo });
                  }, { mulai: 'Menyiapkan PDF…', gagal: 'Gagal membuat PDF. Coba muat ulang aplikasi.' }),
                },
                {
                  label: 'Ekspor Excel',
                  icon: Download,
                  tone: 'text-emerald-600 dark:text-emerald-400',
                  onClick: () => jalankanEkspor(async () => {
                    const { generateKasHadiranExcel } = await import('../lib/generateKasHadiranExcel');
                    await generateKasHadiranExcel(displayTarikan, talanganMap, { totalKasTerkumpul, totalTalanganBelum, totalSetor, saldo });
                  }, { mulai: 'Menyiapkan Excel…', gagal: 'Gagal membuat file Excel. Coba muat ulang aplikasi.' }),
                },
              ]}
            />
          </>}
        />

        {/* Muat GAGAL & belum ada data sama sekali → JANGAN render hero + Alur Kas.
            Tanpa gerbang ini halaman menyatakan "Rp0", "0 tarikan terlaksana",
            dan neraca "Total Bersih Rp0" berwarna hijau sehat — pernyataan
            keliru tentang UANG, jenis kesalahan terburuk untuk app kas. Warga
            bersinyal jelek melihatnya sebagai fakta. ErrorState-nya dulu ada,
            tapi jauh di bawah layar (di seksi Rekap). Gerbang ini pola yang
            sama dgn Kas RT baris ~499. */}
        {gagalTotal ? (
          <ErrorState onRetry={() => load()} retrying={loading} />
        ) : (
        <>
        {/* Header Card — di dalam CrossFade: sebelum data siap saldo=0 → hero
            berkedip "Rp0" (angka salah sesaat, bikin kaget). */}
        {/* Skeleton BERBENTUK hero (eyebrow + ikon aksi + nominal + chip) — bukan
            blok gray polos. Saat load, sisa halaman (Alur, Rekap) render duluan
            dgn nilai Rp0; blok kosong di posisi hero terbaca "rusak/nyangkut".
            Permukaannya = permukaan hero yang SEDANG dimuat (`hero-emerald` +
            --hero-shadow), bukan kartu putih. Anatominya sudah dicermin persis
            sejak lama — eyebrow, dua aksi, nominal, dan HERO_MIN_H yang menahan
            layout jump — yang tak ikut cuma WARNANYA, jadi CrossFade memudarkan
            kartu PUTIH menjadi hijau tua: satu-satunya kedipan ganti-permukaan
            yang tersisa di app, tepat di elemen terbesar & terpenting layar.
            Bar isian pakai `.skeleton-hero` (putih beralpha) — `.skeleton` abu
            lahir untuk kartu putih. Tinggi & radius tetap sinkron via
            HERO_MIN_H → tak ada layout jump saat CrossFade. */}
        <CrossFade
          loading={loading}
          skeleton={
            <div style={{ height: HERO_MIN_H, boxShadow: 'var(--hero-shadow)' }} className="relative overflow-hidden rounded-3xl hero-emerald p-6">
              <div className="flex items-center justify-between">
                <div className="skeleton skeleton-hero h-3 w-28 rounded-full" />
                <div className="flex gap-2">
                  <div className="skeleton skeleton-hero h-9 w-9 rounded-full" />
                  <div className="skeleton skeleton-hero h-9 w-9 rounded-full" />
                </div>
              </div>
              <div className="skeleton skeleton-hero mt-3 h-8 w-1/2 rounded-xl" />
              <div className="skeleton skeleton-hero mt-3 h-6 w-40 rounded-full" />
            </div>
          }
        >
        {/* Anatomi hero = komponen bersama HeroSaldo (30 Jul). SENGAJA tanpa kaki
            statistik: kartu "Alur Kas Hadiran" persis di bawahnya sudah memuat
            Terkumpul/Talangan/Setoran — satu fakta satu suara. */}
        <HeroSaldo
          icon={Wallet}
          label="Saldo Kas Hadiran"
          minHeight={HERO_MIN_H}
          measure={`${saldo < 0 ? '-' : ''}Rp${Math.abs(saldo).toLocaleString('id-ID')}`}
          amount={hidden
            ? maskRp(`${saldo < 0 ? '-' : ''}Rp${Math.abs(animatedSaldo).toLocaleString('id-ID')}`, hidden, 7)
            : <Odometer value={animatedSaldo} />}
          /* Saldo minus disengaja (talangan ditutup penuh dari kas). Nominal TETAP
             putih premium; negatif ditandai chip KATA "Defisit" — rona salmon
             (text-rose-200) dulu = sinyal lemah utk mata yg sulit bedakan warna. */
          status={saldo < 0 ? (
            <span className="mb-[6px] shrink-0 rounded-full bg-rose-700 px-2 py-[3px] text-micro font-bold uppercase tracking-[0.08em] text-white ring-1 ring-inset ring-white/20">
              Defisit
            </span>
          ) : undefined}
          caption={`${tarikanSelesai.length} tarikan terlaksana`}
          actions={
            <>
              <HeroAction
                icon={hidden ? EyeOff : Eye}
                label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
                onClick={() => { haptic(); toggleHideAmount(); }}
              />
              <HeroAction icon={bagiSibuk ? Loader2 : Share2} label="Bagikan ringkasan ke WhatsApp" onClick={handleShareReceipt} spin={bagiSibuk} />
            </>
          }
        >
          {/* Chip ini kini SATU-SATUNYA pembawa kabar "sudah setor" (dulu hero
              ikut jadi biru). Panel di atas hero pakai bg-black/25 — aturan
              kontras 13 Jul: panel di hero gelapkan, jangan terangkan. */}
          {sudahSetor && (
            <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-black/25 border border-white/20 rounded-full text-white text-caption font-semibold">
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Sudah disetor ke Kas RT
            </span>
          )}
        </HeroSaldo>
        </CrossFade>

        {/* Alur Kas */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <p className="inline-flex items-center gap-1 text-body font-bold text-ink dark:text-gray-100">
              Alur Kas Hadiran
              <InfoTip label="Iuran">
                Tiap anggota bayar Rp50.000/tarikan: Rp45.000 untuk Sohibul Bait (penerima) + Rp5.000 masuk kas. Yang tidak hadir ditalangi dulu.
              </InfoTip>
            </p>
            <span
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700 rounded-full text-white text-micro font-bold"
              aria-label={`${tarikanSelesai.length} tarikan selesai`}
            >
              {tarikanSelesai.length}
              <span className="font-medium opacity-90">tarikan</span>
            </span>
          </div>
          <div className="space-y-2">
            {/* --di-r:0 — default 1.25rem dipakai utk baris list yg kontainernya
                TANPA padding; di sini kartu sudah p-5, jadi inset kanan ganda
                bikin hairline berhenti ±20px sebelum nominal (kelihatan salah).
                --di-l:1.25rem — rumusnya "padding + lebar ikon + gap", dan di
                baris ini padding = 0 (kartunya yang p-5), ikon `w-3.5` = 14px,
                `gap-1.5` = 6px → 20px. Nilai lama 2.5rem disalin dari daftar
                ber-ikon 44px, jadi hairline-nya mulai 20px SETELAH huruf
                pertama label — tepi kanan sudah sejajar nominal sejak dulu,
                tepi kirinya yang tak pernah ikut diukur. */}
            <div className="divide-inset [--di-l:1.25rem] [--di-r:0px] flex items-center justify-between py-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Ikon baris = token yang SAMA dgn nominalnya (4 Agu 2026).
                    Dulu ketiganya `-500` mentah: emerald-500/amber-500/blue-500
                    jauh lebih terang & jenuh daripada angka di sebelah kanannya,
                    sehingga panel uang ini terbaca sebagai deretan chip
                    warna-warni. Tak pernah terukur sapuan mana pun — ikon yang
                    kontrolnya sudah punya label teks dihitung dekoratif
                    (§1.4.11 memang tak menuntutnya), persis blind-spot yang
                    juga menyembunyikan warna grafik. Ikon + label + nominal
                    kini satu pernyataan, bukan tiga suara. */}
                <TrendingUp className="w-3.5 h-3.5 text-pos dark:text-pos-dark" />
                <span className="text-body text-ink-sub dark:text-gray-400">Kas Hadiran Terkumpul</span>
              </div>
              <span className="text-body font-display font-semibold tabular-nums text-pos dark:text-pos-dark">{maskRp(`+${formatRupiahPlain(totalKasTerkumpul)}`, hidden, 4)}</span>
            </div>
            <div className="divide-inset [--di-l:1.25rem] [--di-r:0px] flex items-center justify-between py-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-warn dark:text-warn-dark" />
                <span className="text-body text-ink-sub dark:text-gray-400">Talangan Belum Lunas</span>
              </div>
              <span className="text-body font-display font-semibold tabular-nums text-warn dark:text-amber-400">{maskRp(`-${formatRupiahPlain(totalTalanganBelum)}`, hidden, 4)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Biru DIPERTAHANKAN sbg penanda kategori "transfer" (lihat
                    catatan nominal di bawah — Setor Blue tak boleh menyentuh
                    NILAI uang, tapi ikon kategori sah). Yang berubah cuma
                    terangnya: blue-500 → blue-700 di terang (nilai yang sudah
                    dipakai pil "WARGA") + pasangan blue-400 di gelap, supaya ia
                    tak lagi jadi titik paling menyala di panel. */}
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span className="text-body text-ink-sub dark:text-gray-400">Setoran ke Kas Besar</span>
              </div>
              {/* Nominal NETRAL, bukan biru: DESIGN.stitch §2 mengunci Setor Blue
                  sebagai sinyal STATUS (hero Kas Hadiran) — biru tak boleh
                  menyentuh nilai uang, kalau tidak panel ini punya 4 keluarga
                  warna (hijau/amber/biru/rose) dan biru diam-diam jadi aksen
                  kedua. Ikon biru dipertahankan sbg penanda kategori "transfer". */}
              <span className="text-body font-display font-semibold tabular-nums text-ink dark:text-gray-100">{maskRp(`-${formatRupiahPlain(totalSetor)}`, hidden, 4)}</span>
            </div>
            <div className={`flex items-center justify-between rounded-2xl p-3 mt-1 ${saldo < 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
              <p className="text-body font-bold text-gray-800 dark:text-gray-200">Total Bersih</p>
              <span className={`text-amount font-display font-bold tabular-nums ${saldo < 0 ? 'text-neg dark:text-rose-400' : 'text-pos dark:text-pos-dark'}`}>
                {maskRp(`${saldo < 0 ? '-' : ''}Rp${Math.abs(saldo).toLocaleString('id-ID')}`, hidden, 4)}
              </span>
            </div>
          </div>
        </div>

        </>
        )}

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
                <EmptyState
                  icon={TrendingUp}
                  title="Tidak ada hasil"
                  subtitle="Tidak ada tarikan pada filter ini."
                  action={{ label: 'Reset filter', icon: RotateCcw, onClick: () => setHadiranFilter('semua') }}
                />
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
                      className="rise lift bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 overflow-hidden"
                      style={{ animationDelay: `${Math.min(idx, 10) * 0.05}s` }}
                    >

                      {/* ── Timeline mini-header ─────────────────────── */}
                      <div className="flex items-center justify-between px-5 pt-4 pb-2">
                        <div className="flex items-center gap-2">
                          {/* Nomor tarikan = IDENTITAS, bukan status. Dulu ia
                              diwarnai emerald/amber menurut ada-tidaknya talangan
                              — padahal chip di ujung baris yang sama sudah
                              mengatakannya dengan KATA ("11 belum bayar" /
                              "Lunas semua"). Satu fakta dua sandi: warna jadi
                              tebakan, dan ambernya bukan token `warn` mana pun.
                              Kini netral (abu = penanda, sesuai sistem warna). */}
                          <div className="icon-tile w-7 h-7 rounded-lg flex items-center justify-center text-caption font-bold shrink-0 bg-gray-100 dark:bg-gray-800 text-ink-sub dark:text-gray-300">
                            {t.nomor}
                          </div>
                          <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                          <span className="text-micro angka-prosa text-ink-faint dark:text-gray-400">{formatTanggal(t.tanggal)}</span>
                        </div>
                        {talanganInfo.count > 0 ? (
                          <Tag tone="danger" className="angka-prosa">{talanganInfo.count} belum bayar</Tag>
                        ) : (
                          <Tag tone="success"><Check className="w-3 h-3" strokeWidth={2.5} /> Lunas semua</Tag>
                        )}
                      </div>

                      {/* ── Focal row: penerima + amount (ketuk → detail) ─ */}
                      <button
                        onClick={() => openDetail(t)}
                        className="w-full flex items-start gap-2.5 px-4 pb-4 text-left cursor-pointer hover:bg-gray-50/60 dark:hover:bg-gray-800/40 active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors"
                      >
                        <AvatarPeci nama={t.sohibul_bait?.nama ?? '?'} className="w-11 h-11 rounded-2xl shrink-0" />
                        <div className="flex-1 min-w-0">
                          {/* items-start + clamp 2 baris: nama panjang ("Saman Suryadi
                              (Mono)") dulu membungkus 2 baris sementara blok nominal
                              tetap center → nominal nyangkut di tengah nama & "Lihat
                              detail" terdorong keluar ritme. Sekarang nama & nominal
                              rata ATAS, apa pun panjang namanya. */}
                          {/* break-words: nama ber-nickname ("Saman Suryadi ( Mono )")
                              pecah per-token panjang di kolom ~115px sehingga butuh
                              3 baris lalu kena clamp — nickname-nya hilang padahal
                              itu yang dikenal warga. */}
                          <p className="text-subtitle font-bold text-ink dark:text-gray-100 leading-tight line-clamp-2 break-words">
                            {t.sohibul_bait?.nama ?? '—'}
                          </p>
                          <span className="inline-flex items-center gap-1 mt-1 text-micro font-medium text-ink-faint dark:text-gray-400">
                            Lihat detail
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          {/* Netral (bukan pos/+): uang ini KELUAR ke Sohibul, bukan kas masuk */}
                          <p className="font-display text-amount font-semibold tabular-nums text-ink dark:text-gray-100">
                            {formatRupiahPlain(sohibulTerima)}
                          </p>
                          <span className="block mt-0.5 text-micro font-medium text-ink-faint dark:text-gray-400">
                            Dapat Arisan
                          </span>
                        </div>
                      </button>

                      {/* ── Progress bar + kas info ───────────────────── */}
                      <div className="px-5 pb-4">
                        <div className="flex items-center justify-between text-body text-ink-sub dark:text-gray-400 mb-2">
                          <span>
                            Kas Hadiran{' '}
                            <span className="font-display font-semibold tabular-nums text-gray-800 dark:text-gray-200">{formatRupiahPlain(kasHadiran)}</span>
                          </span>
                          <span className="font-semibold angka-prosa">{t.total_hadir}/{t.total_warga} hadir</span>
                        </div>
                        <div
                          className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={Math.round(Math.min(pctHadir, 100))}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Kehadiran tarikan #${t.nomor}`}
                        >
                          {/* emerald-600: fill informatif (role=progressbar) wajib ≥3:1
                              vs track gray-100 (WCAG 1.4.11) — emerald-400 cuma 1,8:1 */}
                          <div
                            className="h-full w-full origin-left bg-emerald-600 dark:bg-emerald-500 rounded-full transition-transform duration-700 ease-out"
                            style={{ transform: `scaleX(${Math.min(pctHadir, 100) / 100})` }}
                          />
                        </div>
                      </div>

                      {/* ── Actions ──────────────────────────────────
                          PDF pendapatan tersedia untuk semua (termasuk warga);
                          Absensi, Batalkan & Hapus khusus bendahara. */}
                      {/* Aksi kartu dulu tak punya WAJAH tombol: `text-caption`
                          `text-ink-sub` `font-medium` + ikon 14px = seberat teks
                          caption, tanpa `.press`, tanpa haptic. Padahal ini
                          berulang di 13 kartu, jadi tiap kartu berakhir dgn
                          strip yang terbaca sebagai label, bukan aksi. Kini:
                          aksi bersama (PDF, dipakai warga juga) memakai kosakata
                          tautan app — `text-brand-link font-semibold`, sama dgn
                          footer "Lihat semua" Beranda; aksi bendahara tetap
                          netral (hierarki) tapi ikut dapat .press + ukuran ramp
                          `text-caption` biar terbaca warga lansia. */}
                      {/* Ketiga label WAJIB `whitespace-nowrap`. Terukur di 360px:
                          strip ini butuh 324px sedangkan ruang isinya cuma 286px
                          (lebar kartu 326 − padding px-5), jadi flexbox menyusutkan
                          tombol sampai labelnya PECAH DUA BARIS ("PDF /
                          Pendapatan"). Cacat itu tak pernah terlihat dari ukuran
                          karena `min-h-[44px]` menahan tinggi tombol tetap 44px —
                          hanya screenshot elemen yang sezaman dgn rect yang
                          menunjukkannya. Label dipendekkan ke "PDF" (ikon dokumen +
                          konteks kartu tarikan sudah membawa sisa maknanya; kalimat
                          penuh pindah ke aria-label supaya pembaca layar tak ikut
                          kehilangan) → butuh turun ke 245px: muat, sisa 41px. */}
                      {/* Pita aksi dirapatkan pt/pb 12px→6px (18 Agu 2026). Diukur di tab WARGA:
                          pita 341×69px hanya berisi satu tombol 59×44px — 83% kosong,
                          dan memakan 27% tinggi kartu, sehingga daftar terbaca belum
                          selesai. Pita ini SENGAJA TIDAK dihapus meski sempat diusulkan:
                          kosongnya cuma terjadi pada warga. Di bendahara pita yang sama
                          memuat TIGA tombol (PDF, Batalkan, Hapus), dan `handlePendapatanPDF`
                          hanya punya SATU call-site — di sini. Layar detail memang punya
                          tombol PDF, tapi itu PDF absensi, dokumen yang berbeda. Menghapus
                          pita = menghapus PDF pendapatan sekaligus dua kontrol aksi merusak
                          milik bendahara; itu regresi fungsi, bukan pemolesan.
                          Tinggi tombol tetap 44px (§2.5.8) — yang menyusut hanya napasnya. */}
                      <div className="flex items-center gap-x-3 px-5 pb-1.5 pt-1.5 border-t border-line dark:border-gray-800">
                        <button
                          onClick={() => { haptic(); handlePendapatanPDF(t); }}
                          disabled={pdfLoading === t.id}
                          aria-label={`Unduh PDF pendapatan tarikan #${t.nomor}`}
                          className="press flex items-center gap-1.5 min-h-[44px] -mx-1.5 px-1.5 rounded-lg text-caption font-semibold whitespace-nowrap text-brand-link dark:text-brand-linkDark hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors mati-teks"
                        >
                          <FileText className={`w-4 h-4 ${pdfLoading === t.id ? 'animate-pulse' : ''}`} />
                          {pdfLoading === t.id ? 'Memuat…' : 'PDF'}
                        </button>
                        {isBendahara && (
                          <button
                            onClick={() => { haptic(); handleBatalkanClick(t); }}
                            disabled={processingId === t.id}
                            className="press flex items-center gap-1.5 min-h-[44px] px-1.5 rounded-lg text-caption font-semibold whitespace-nowrap transition-colors mati-teks text-ink-sub dark:text-gray-400 hover:bg-gray-50 hover:text-warn dark:hover:bg-gray-800/60"
                          >
                            <RotateCcw className={`w-4 h-4 ${processingId === t.id ? 'animate-spin' : ''}`} />
                            Batalkan
                          </button>
                        )}
                        {isBendahara && (
                          <button
                            onClick={() => handleHapusClick(t)}
                            disabled={processingId === t.id}
                            aria-label={`Hapus tarikan #${t.nomor}`}
                            /* dark:text-gray-400, BUKAN gray-500: gray-500 di atas
                               gray-900 cuma 3,67:1 — ketangkap audit kontras deep
                               sbg satu-satunya cacat fill nyata dari 1842 sampel. */
                            className="press flex items-center gap-1.5 min-h-[44px] -mr-1.5 px-1.5 rounded-lg text-caption font-semibold whitespace-nowrap ml-auto transition-colors mati-teks text-ink-faint dark:text-gray-400 hover:bg-gray-50 hover:text-neg dark:hover:bg-gray-800/60"
                          >
                            <Trash2 className="w-4 h-4" />
                            Hapus
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

        {/* Belum ada tarikan sama sekali → tanpa blok ini section Rekap lenyap
            tanpa penjelasan (layar terbaca "kosong/rusak" di awal periode).
            Error load pertama (tanpa cache) juga tertangkap di sini — cabang
            ErrorState di atas hanya hidup bila sudah ada tarikan tampil. */}
        {!loading && !gagalTotal && tarikanSelesai.length === 0 && (
          error ? (
            <ErrorState onRetry={() => load()} retrying={loading} />
          ) : (
            <EmptyState
              icon={Coins}
              title="Belum ada tarikan selesai"
              subtitle="Rekap per tarikan muncul setelah tarikan pertama dihitung di halaman Absensi."
            />
          )
        )}
      </div>

      {showModal && (
        <SetorModal
          saldoHadiran={saldo}
          tarikanList={tarikanSelesai}
          onSave={handleSetor}
          onClose={() => setShowModal(false)}
        />
      )}

      <ConfirmDestruktif
        open={!!batalTarikan}
        title={`Batalkan hasil Tarikan #${batalTarikan?.nomor ?? 0}?`}
        description={<>
          Tindakan ini <b>menghapus absensi, talangan, &amp; kas masuk</b> tarikan #{batalTarikan?.nomor ?? 0} dan
          <b> tidak bisa di-undo</b>. Pemulihan hanya bisa manual.
        </>}
        typeToConfirm={{
          value: String(batalTarikan?.nomor ?? 0),
          hint: <>Ketik angka <span className="font-bold text-neg dark:text-rose-400">{batalTarikan?.nomor ?? 0}</span> untuk konfirmasi</>,
        }}
        confirmLabel="Batalkan"
        loadingLabel="Membatalkan…"
        icon={RotateCcw}
        loading={!!batalTarikan && processingId === batalTarikan.id}
        onClose={() => setBatalTarikan(null)}
        onConfirm={() => { if (batalTarikan) batalkanTarikan(batalTarikan); }}
      />

      {/* Hapus tarikan = lebih merusak daripada Batalkan (baris jadwalnya ikut
          hilang), jadi pengamannya minimal setara: dialog + ketik ulang nomor. */}
      <ConfirmDestruktif
        open={!!hapusTarget}
        title={`Hapus Tarikan #${hapusTarget?.nomor ?? 0}?`}
        description={<>
          Tarikan #{hapusTarget?.nomor ?? 0} dihapus dari jadwal beserta <b>absensi, talangan, &amp; kas masuknya</b>.
          Ada jeda 5 detik untuk mengurungkan lewat tombol Urungkan di notifikasi.
        </>}
        typeToConfirm={{
          value: String(hapusTarget?.nomor ?? 0),
          hint: <>Ketik angka <span className="font-bold text-neg dark:text-rose-400">{hapusTarget?.nomor ?? 0}</span> untuk konfirmasi</>,
        }}
        confirmLabel="Hapus"
        loadingLabel="Menghapus…"
        icon={Trash2}
        onClose={() => setHapusTarget(null)}
        onConfirm={() => { if (hapusTarget) hapusTarikan(hapusTarget); }}
      />

      {/* Sheet detail tarikan: hadir & tidak hadir + status bayar talangan */}
      {detailTarikan && (
        <div className="fixed inset-0 z-overlay flex items-end" onClick={detailDrag.dismiss}>
          <div className={`sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm ${detailDrag.dismissing ? 'sheet-backdrop-out' : ''}`} />
          <div
            ref={detailDlg.panelRef}
            {...detailDlg.panelProps}
            className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl flex flex-col max-h-[82dvh]"
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
                  <p className="text-subtitle font-bold text-ink dark:text-gray-100 leading-tight">Tarikan #{detailTarikan.nomor}</p>
                  <p className="text-caption text-ink-faint dark:text-gray-400 truncate">{formatTanggal(detailTarikan.tanggal)} · {detailTarikan.sohibul_bait?.nama ?? '—'}</p>
                </div>
                {isBendahara && !detailLoading && (
                  <button
                    onClick={handleAbsensiPDF}
                    aria-label="Cetak daftar hadir PDF"
                    /* Ikon → pemintal saat berkas disiapkan; LABELNYA tetap supaya
                       lebar tombol tak berubah di tengah sheet (`audit:potong`). */
                    aria-busy={absensiSibuk || undefined}
                    className="press shrink-0 inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-control dark:border-control-dark text-ink-sub dark:text-gray-300 text-caption font-semibold px-3 py-2 rounded-xl shadow-sm"
                  >
                    {absensiSibuk ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF Absensi
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
            <div className="flex-1 overflow-y-auto [overscroll-behavior:contain] px-5 py-4 pb-10 space-y-6">
              {detailLoading ? (
                <>
                  {/* Skeleton kartu rincian pendapatan */}
                  <div className="inset-soft rounded-2xl px-4 py-3.5 space-y-2.5">
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
                      <div key={i} className="flex items-center gap-2.5 py-2">
                        <div className="skeleton h-3 w-5 rounded-full shrink-0" />
                        <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
                        <div className="skeleton h-3.5 flex-1 rounded-full" />
                        <div className="skeleton h-5 w-16 rounded-full shrink-0" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Rincian pendapatan real-time — angka sama dgn PDF pendapatan
                      yang diunduh dari tombol "PDF" di strip aksi kartu tarikan */}
                  {(detailHadir.length > 0 || detailTitip.length > 0 || detailTidak.length > 0) && (
                    <div className="inset-soft rounded-2xl px-4 py-3.5">
                      <p className="text-micro font-bold uppercase tracking-wide text-ink-faint dark:text-gray-400 mb-2.5">Pendapatan Sohibul Bait</p>
                      <div className="space-y-1.5 text-body">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink-sub dark:text-gray-400">Kotor · {payingCount} pembayar × <span className="font-display tabular-nums">{formatRupiahPlain(SOHIBUL_PER)}</span></span>
                          <span className="font-display font-semibold tabular-nums text-ink dark:text-gray-100 whitespace-nowrap">{maskRp(formatRupiahPlain(pendapatanKotor), hidden, 4)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink-sub dark:text-gray-400">Potongan admin</span>
                          <span className="font-display font-semibold tabular-nums text-neg dark:text-rose-400 whitespace-nowrap">{maskRp(`-${formatRupiahPlain(POTONGAN_ADMIN)}`, hidden, 4)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-line dark:border-gray-800">
                          <span className="font-bold text-ink dark:text-gray-100">Bersih diterima SB</span>
                          <span className="font-display font-bold tabular-nums text-pos dark:text-emerald-400 whitespace-nowrap">{maskRp(formatRupiahPlain(pendapatanBersih), hidden, 4)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink-sub dark:text-gray-400">Kas Hadiran tarikan ini</span>
                          <span className="font-display font-semibold tabular-nums text-warn dark:text-amber-400 whitespace-nowrap">{maskRp(formatRupiahPlain(detailTarikan.total_terkumpul ?? 0), hidden, 4)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {detailTitip.length > 0 && (
                    <div>
                      <p className="text-micro font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1.5">Titip · iuran masuk ({detailTitip.length})</p>
                      <div className="list-inset [--di-l:4.5rem] [--di-r:0rem]">
                        {detailTitip.map((p, i) => (
                          <div key={p.id} className="flex items-center gap-2.5 py-2">
                            <span className="w-5 text-right text-micro font-semibold tabular-nums text-ink-faint dark:text-gray-400 shrink-0">{i + 1}</span>
                            <AvatarPeci nama={p.nama} className="w-8 h-8 rounded-lg" />
                            <span className="flex-1 text-body font-medium text-gray-800 dark:text-gray-200 truncate">{p.nama}</span>
                            <Tag tone="info"><Coins className="w-3 h-3" />Titip</Tag>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {detailTidak.length > 0 && (
                    <div>
                      <p className="text-micro font-bold uppercase tracking-wide text-ink-faint dark:text-gray-400 mb-1.5">Tidak Hadir / Talangan ({detailTidak.length})</p>
                      <div className="list-inset [--di-l:4.5rem] [--di-r:0rem]">
                        {detailTidak.map((p, i) => (
                          <div key={p.id} className="flex items-center gap-2.5 py-2">
                            <span className="w-5 text-right text-micro font-semibold tabular-nums text-ink-faint dark:text-gray-400 shrink-0">{i + 1}</span>
                            <AvatarPeci nama={p.nama} className="w-8 h-8 rounded-lg" />
                            <span className="flex-1 text-body font-medium text-gray-800 dark:text-gray-200 truncate">{p.nama}</span>
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
                      <p className="text-micro font-bold uppercase tracking-wide text-ink-faint dark:text-gray-400 mb-1.5">Hadir ({detailHadir.length})</p>
                      <div className="list-inset [--di-l:4.5rem] [--di-r:0rem]">
                        {detailHadir.map((p, i) => (
                          <div key={p.id} className="flex items-center gap-2.5 py-2">
                            <span className="w-5 text-right text-micro font-semibold tabular-nums text-ink-faint dark:text-gray-400 shrink-0">{i + 1}</span>
                            <AvatarPeci nama={p.nama} className="w-8 h-8 rounded-lg" />
                            <span className="flex-1 text-body font-medium text-gray-800 dark:text-gray-200 truncate">{p.nama}</span>
                            {/* emerald-500 di atas putih cuma 2,50:1. Ia lolos
                                sapuan karena barisnya sudah berlabel teks
                                ("Hadir (N)" + nama) sehingga centang ini
                                dihitung dekoratif — tapi "tak wajib" bukan
                                "boleh nyaris tak terlihat" buat warga lansia. */}
                            <Check className="w-4 h-4 text-pos dark:text-pos-dark shrink-0" strokeWidth={2.5} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {detailHadir.length === 0 && detailTitip.length === 0 && detailTidak.length === 0 && (
                    <p className="text-center text-body text-ink-faint dark:text-gray-400 py-8">Belum ada data absensi untuk tarikan ini.</p>
                  )}
                </>
              )}
            </div>

            <button
              onClick={detailDrag.dismiss}
              className="press absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Aksi utama di zona jempol */}
      {isBendahara && (
        <Fab label="Setor" icon={ArrowUpRight} ariaLabel="Setor ke Kas RT" disabled={error} onClick={() => setShowModal(true)} />
      )}
    </>
  );
}
