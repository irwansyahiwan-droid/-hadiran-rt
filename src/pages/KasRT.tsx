import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Landmark, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, FileText, Search, Download, Pencil, Plus, Trash2, Eye, EyeOff, Share2, RotateCcw, Loader2 } from 'lucide-react';
import { useCountUp, useHideAmount, toggleHideAmount, useSaving, useAksiBerat, useKembaliDariLatar, usePerTanggal} from '../lib/hooks';
import ClearButton from '../components/ClearButton';
import FilterChips from '../components/FilterChips';
import InfoTip from '../components/InfoTip';
import SectionTitle from '../components/SectionTitle';
import { supabase } from '../lib/supabase';
import { getPageCache, setPageCache } from '../lib/pageCache';
import { useAuthContext } from '../context/AuthContext';
import { formatRupiahPlain, formatTanggal, formatTanggalRingkas, haptic, maskRp, pesanError } from '../lib/utils';
import HeroSaldo, { HeroAction } from '../components/HeroSaldo';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ConfirmDestruktif from '../components/ConfirmDestruktif';
import Odometer from '../components/Odometer';
import SmartInsight from '../components/SmartInsight';
import CrossFade from '../components/CrossFade';
import Fab from '../components/Fab';
import ExportMenu from '../components/ExportMenu';
import { useDragDismiss } from '../hooks/useDragDismiss';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { showToast, showUndo } from '../lib/toast';
import MonthlyBars from '../components/charts/MonthlyBars';
import AreaTrend from '../components/charts/AreaTrend';
import TargetKasRT from '../components/TargetKasRT';
import { recomputeKasRTSaldo } from '../lib/kasRt';
import { kategoriOpsi, kategoriDefault, labelKategori, labelKategoriSingkat, KATEGORI_MASUK, KATEGORI_KELUAR } from '../lib/kategoriKasRt';
import type { ReceiptRow } from '../lib/shareReceipt';
import type { KasRT } from '../lib/types';

type Tipe = 'masuk' | 'keluar';

interface ModalProps {
  /** `null` = saldo TIDAK DIKETAHUI (pemuatan gagal) — bukan nol.
   *  Lihat catatan di pratinjau saldo di bawah. */
  saldoSekarang: number | null;
  initial?: KasRT | null;
  onSave: (data: { tipe: Tipe; nominal: number; keterangan: string; tanggal: string; kategori: string }) => Promise<void>;
  onClose: () => void;
}

function TambahModal({ saldoSekarang, initial, onSave, onClose }: ModalProps) {
  const isEdit = !!initial;
  const [tipe, setTipe] = useState<Tipe>(initial?.tipe ?? 'masuk');
  const [nominal, setNominal] = useState(initial?.nominal ?? 0);
  const [keterangan, setKeterangan] = useState(initial?.keterangan ?? '');
  const [tanggal, setTanggal] = useState(() => (initial?.tanggal ?? new Date().toISOString()).split('T')[0]);
  const [kategori, setKategori] = useState<string>(initial?.kategori ?? kategoriDefault(initial?.tipe ?? 'masuk'));
  const [saving, setSaving, sedangSimpan] = useSaving();
  const drag = useDragDismiss(onClose);
  // Semua jalur tutup (backdrop, Batal, Escape, Back HP) lewat dismiss() →
  // sheet meluncur keluar, bukan lenyap. Back HP didaftarkan DI SINI (bukan
  // parent) agar ikut jalur luncur yang sama.
  useBackDismiss(true, drag.dismiss);
  const dlg = useDialog(true, { onClose: drag.dismiss, label: isEdit ? 'Edit transaksi Kas RT' : 'Tambah transaksi Kas RT' });

  // Ganti tipe → pastikan kategori tetap valid utk tipe baru (set default bila tidak).
  function pilihTipe(t: Tipe) {
    setTipe(t);
    setKategori((cur) => (kategoriOpsi(t).some((o) => o.key === cur) ? cur : kategoriDefault(t)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    /* `sedangSimpan()` = latch SINKRON, bukan `saving`. `disabled={saving}` baru
       berlaku SETELAH React me-render; dua ketukan di task yang sama masuk ke
       sini dua kali sebelum itu. Terukur 19 Agu: satu ketukan ganda mengirim
       DUA `POST kas_rt` — dua transaksi untuk satu niat. */
    if (!nominal || sedangSimpan()) return;
    setSaving(true);
    try {
      await onSave({ tipe, nominal, keterangan, tanggal, kategori });
    } finally {
      setSaving(false);
    }
  }

  /* `null` menular: saldo yang tak diketahui + nominal apa pun tetap TAK
     DIKETAHUI. Menghitungnya dari 0 akan menghasilkan angka yang terlihat sah
     dan salah jutaan (lihat catatan di pratinjaunya). */
  const saldoPreview = saldoSekarang === null
    ? null
    : tipe === 'masuk' ? saldoSekarang + nominal : saldoSekarang - nominal;

  return (
    <div className="fixed inset-0 z-overlay flex items-end" onClick={drag.dismiss}>
      <div className={`sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm ${drag.dismissing ? 'sheet-backdrop-out' : ''}`} />
      <div
        ref={dlg.panelRef}
        {...dlg.panelProps}
        className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10 space-y-4 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={drag.style}
      >
        <div className="-mt-2 mb-1 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...drag.handlers}>
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <h3 className="text-subtitle font-bold text-ink dark:text-gray-100">{isEdit ? 'Edit Transaksi Kas RT' : 'Tambah Transaksi Kas RT'}</h3>

        <form onSubmit={submit} className="space-y-3">
          {/* Tipe toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['masuk', 'keluar'] as Tipe[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => pilihTipe(t)}
                aria-pressed={tipe === t}
                className={`press inline-flex items-center justify-center gap-2 min-h-[44px] py-3 rounded-xl text-body font-semibold border transition ${
                  tipe === t
                    ? t === 'masuk'
                      ? 'bg-pos text-white border-pos'
                      : 'bg-neg text-white border-neg'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-control dark:border-control-dark'
                }`}
              >
                {/* Ikon lucide (bukan panah unicode) — rima dgn ikon tile mutasi */}
                {t === 'masuk'
                  ? <><ArrowDownLeft className="w-4 h-4" /> Pemasukan</>
                  : <><ArrowUpRight className="w-4 h-4" /> Pengeluaran</>}
              </button>
            ))}
          </div>

          {/* Kategori — untuk laporan pertanggungjawaban (opsi ikut tipe) */}
          <div>
            <label htmlFor="kasrt-kategori" className="label-field">Kategori</label>
            <select id="kasrt-kategori" name="kategori" value={kategori} onChange={(e) => setKategori(e.target.value)} required
              className="field">
              {kategoriOpsi(tipe).map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="kasrt-keterangan" className="label-field">Keterangan</label>
            <input
              id="kasrt-keterangan"
              name="keterangan"
              autoComplete="off"
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              required
              placeholder="Contoh: Iuran warga bulan Juni…"
              className="field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="kasrt-nominal" className="label-field">Nominal</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-body text-gray-500 dark:text-gray-400">Rp</span>
                <input
                  id="kasrt-nominal"
                  name="nominal"
                  autoComplete="off"
                  type="text"
                  inputMode="numeric"
                  value={nominal ? nominal.toLocaleString('id-ID') : ''}
                  onChange={(e) => setNominal(Number(e.target.value.replace(/\D/g, '')) || 0)}
                  required
                  className="field pl-9 pr-3"
                />
              </div>
            </div>
            <div>
              <label htmlFor="kasrt-tanggal" className="label-field">Tanggal</label>
              <input
                id="kasrt-tanggal"
                name="tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="field"
              />
            </div>
          </div>

          {nominal > 0 && (
            <div className={`rounded-xl px-4 py-3 border ${tipe === 'masuk' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/40'}`}>
              {/* Pratinjau saldo BERHENTI menyebut angka saat saldonya tak
                  diketahui (24 Agu 2026). Sebelumnya `saldoSekarang` selalu
                  `number`, dan saat pemuatan halaman GAGAL nilainya jatuh ke 0
                  (agregat dihitung dari `list` yang kosong) — jadi form ini
                  dengan tenang menyatakan "Saldo setelah transaksi: Rp500.000"
                  padahal kas sebenarnya Rp16.352.000. Terukur: meleset
                  Rp15,85 juta, di layar yang detik itu juga berbunyi "Gagal
                  memuat data", dan tepat saat bendahara memutuskan mencatat uang.

                  Halaman sudah benar menyembunyikan heronya saat gagal; form ini
                  membawa kembali angka yang app tak punya. Itu kanon yang sama —
                  "app kas DILARANG menyatakan nominal saat muat gagal" — dan
                  penjaganya sengaja ditaruh DI SINI, bukan cuma di FAB: FAB-nya
                  memang kini `disabled={error}`, tapi penjaga di satu titik
                  bertahan walau nanti ada jalan lain yang membuka form ini. */}
              <p className="text-caption text-gray-500 dark:text-gray-400">
                Saldo setelah transaksi:{' '}
                {saldoPreview === null ? (
                  <span className="font-display font-semibold text-ink-sub dark:text-gray-300">
                    — <span className="font-sans font-normal">(data belum termuat)</span>
                  </span>
                ) : (
                  <span className={`font-display font-semibold tabular-nums ${saldoPreview < 0 ? 'text-neg dark:text-rose-400' : tipe === 'masuk' ? 'text-pos dark:text-emerald-400' : 'text-ink-sub dark:text-gray-300'}`}>
                    {/* formatRupiahPlain pakai Math.abs → tanda minus ditambah sendiri */}
                    {(saldoPreview < 0 ? '-' : '') + formatRupiahPlain(saldoPreview)}
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={drag.dismiss}
              className="btn-secondary flex-1 py-3 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !nominal}
              className={`flex-1 py-3 text-white text-body font-semibold active:scale-[0.97] active:opacity-90 transition duration-ketuk flex items-center justify-center gap-2 ${
                tipe === 'masuk' ? 'btn-brand' : 'btn-danger'
              }`}
            >
              {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
              {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

// Tinggi dasar hero (px) — SATU sumber utk skeleton (height) & hero asli
// (min-height), pola HERO_MIN_H KasHadiran. Baris "Saldo Awal" kondisional
// menambah tinggi natural — itu data-driven, bukan drift.
const HERO_MIN_H = 218;

export default function KasRTPage() {
  const { isBendahara } = useAuthContext();
  // SWR: render dari snapshot terakhir, revalidate diam-diam (lihat lib/pageCache).
  const [cached] = useState(() => getPageCache<KasRT[]>('kas-rt'));
  const [list, setList] = useState<KasRT[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'semua' | 'masuk' | 'keluar'>('semua');
  const [sort, setSort] = useState<'terbaru' | 'terlama' | 'nominal'>('terbaru');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<KasRT | null>(null);
  const [selectedRow, setSelectedRow] = useState<KasRT | null>(null);
  const [hapusRow, setHapusRow] = useState<KasRT | null>(null);
  const [chartPeriod, setChartPeriod] = useState(6); // bulan terakhir di bar chart
  const rowDrag = useDragDismiss(() => setSelectedRow(null));
  // Back HP modal tambah/edit didaftarkan DI DALAM TambahModal (jalur dismiss meluncur).
  useBackDismiss(selectedRow !== null, rowDrag.dismiss);
  const rowDlg = useDialog(selectedRow !== null, { onClose: rowDrag.dismiss, label: 'Aksi transaksi' });

  async function load() {
    // Sudah ada data tampil → revalidate diam-diam: tanpa skeleton, gagal = toast.
    const silent = list.length > 0;
    if (!silent) setLoading(true);
    setError(false);
    try {
      const { data, error: eLoad } = await supabase
        .from('kas_rt')
        .select('*')
        .order('tanggal', { ascending: true })
        .order('created_at', { ascending: true });
      // Supabase tak melempar — tanpa cek ini fetch gagal jadi mutasi kosong
      // palsu + cache tertimpa.
      if (eLoad) throw eLoad;
      setList((data as KasRT[]) ?? []);
      setPageCache('kas-rt', (data as KasRT[]) ?? []);
    } catch {
      if (silent) showToast('Gagal memperbarui data. Coba lagi.', 'error');
      else setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    import('../lib/generateKasRTPDF').catch(() => {}); // preload: jaga gesture share di HP
  }, []);

  /* Ditinggal lama lalu dibuka lagi → ambil ulang diam-diam. Lihat
     `useKembaliDariLatar` di lib/hooks.ts: tanpa ini halaman memuat datanya
     SEKALI seumur tab. */
  useKembaliDariLatar(load);

  // Agregat ringkasan (saldo, total masuk/keluar, insight bulanan) — satu pass
  // atas list, hanya dihitung ulang saat list berubah (bukan tiap keystroke cari/filter).
  const { saldoAwalEntry, saldoAwal, totalMasuk, totalKeluar, masukBulanIni, masukBulanLalu, saldo } = useMemo(() => {
    const ymKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();
    const curYM = ymKey(new Date());
    const awalEntry = list.find((k) => k.keterangan === 'Saldo Awal Kas RT');
    const awal = awalEntry?.nominal ?? 0;
    let masuk = 0, keluar = 0, mIni = 0, mLalu = 0;
    for (const k of list) {
      const isSaldoAwal = k.keterangan === 'Saldo Awal Kas RT';
      if (k.tipe === 'keluar') { keluar += k.nominal; continue; }
      if (k.tipe === 'masuk' && !isSaldoAwal) {
        masuk += k.nominal;
        const back = curYM - ymKey(new Date(k.tanggal));
        if (back === 0) mIni += k.nominal;
        else if (back === 1) mLalu += k.nominal;
      }
    }
    return {
      saldoAwalEntry: awalEntry, saldoAwal: awal,
      totalMasuk: masuk, totalKeluar: keluar,
      masukBulanIni: mIni, masukBulanLalu: mLalu,
      saldo: awal + masuk - keluar,
    };
  }, [list]);
  const animatedSaldo = useCountUp(saldo);
  const hidden = useHideAmount();
  /* Ekspor & bagikan = aksi BERAT (chunk diunduh saat diketuk + berkas dirender
     di main thread). Lihat `useAksiBerat` di lib/hooks.ts: ia yang memasang
     keadaan sibuk, menahan ketukan ganda, dan memastikan kegagalan chunk
     berakhir sbg toast — bukan sbg layar diam. */
  const [eksporSibuk, jalankanEkspor] = useAksiBerat();
  const [bagiSibuk, jalankanBagi] = useAksiBerat();

  // Bagikan ringkasan Kas RT sbg kartu PNG bermerek → grup WA warga.
  async function handleShareReceipt() {
    haptic(12);
    // formatRupiahPlain pakai Math.abs → tambahkan tanda minus sendiri utk saldo negatif.
    const fmtSaldo = (saldo < 0 ? '-' : '') + formatRupiahPlain(saldo);
    await jalankanBagi(async () => {
      const { shareReceipt } = await import('../lib/shareReceipt');
      // Kartu warga dulu hanya memuat TOTAL (masuk/keluar/saldo) → pertanyaan
      // paling sering di grup WA, "uang RT dipakai untuk apa?", tak terjawab;
      // jawabannya cuma ada di PDF A4 yang justru payah dibaca di HP. Kini
      // rincian per kategori (taksonomi yang sama dgn rekap in-app & PDF)
      // ikut di kartu → transparansi tanpa memaksa warga membuka PDF.
      const rows: ReceiptRow[] = [
        { label: 'Saldo Awal', value: formatRupiahPlain(saldoAwal) },
        { label: 'Penerimaan', value: '+' + formatRupiahPlain(totalMasuk), kind: 'section', tone: 'pos' },
      ];
      for (const o of KATEGORI_MASUK) {
        const n = rekapKategori.masuk[o.key] ?? 0;
        if (n > 0) rows.push({ label: o.short, value: '+' + formatRupiahPlain(n), tone: 'pos' });
      }
      rows.push({ label: 'Pengeluaran', value: '-' + formatRupiahPlain(totalKeluar), kind: 'section', tone: 'neg' });
      for (const o of KATEGORI_KELUAR) {
        const n = rekapKategori.keluar[o.key] ?? 0;
        if (n > 0) rows.push({ label: o.short, value: '-' + formatRupiahPlain(n), tone: 'neg' });
      }
      rows.push({ label: 'Saldo Bersih', value: fmtSaldo, kind: 'total' });

      await shareReceipt({
        title: 'Ringkasan Kas Besar RT 004 / RW 006',
        amountLabel: 'Saldo Bersih Kas RT',
        amount: fmtSaldo,
        rows,
        shareText: `Ringkasan Kas RT 004/006\nSaldo bersih: ${fmtSaldo}\n— Hadiran RT`,
      });
    }, { mulai: 'Menyiapkan kartu…', gagal: 'Gagal membuat gambar. Coba lagi.' });
  }

  // Daftar tampil = list difilter (tipe) & diurutkan (sort). saldo_setelah per
  // baris tetap akurat karena dihitung saat insert.
  const displayList = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = [...list];
    if (sort === 'terbaru') arr.reverse();          // list dari DB urut menaik (terlama→terbaru)
    else if (sort === 'nominal') arr.sort((a, b) => b.nominal - a.nominal);
    // 'terlama' = biarkan urutan menaik apa adanya
    if (filter !== 'semua') arr = arr.filter((k) => k.tipe === filter);
    if (q) arr = arr.filter((k) => (k.keterangan ?? '').toLowerCase().includes(q));
    return arr;
  }, [list, filter, sort, search]);

  // Agregasi bulanan (masuk vs keluar) — 6 bulan terakhir.
  const monthly = useMemo(() => {
    const map = new Map<string, { masuk: number; keluar: number }>();
    list.forEach((k) => {
      if (k.keterangan === 'Saldo Awal Kas RT') return;
      const key = (k.tanggal ?? '').slice(0, 7);
      if (!key) return;
      const e = map.get(key) ?? { masuk: 0, keluar: 0 };
      if (k.tipe === 'masuk') e.masuk += k.nominal;
      else e.keluar += k.nominal;
      map.set(key, e);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-chartPeriod)
      .map(([key, v]) => ({
        label: new Date(`${key}-01`).toLocaleDateString('id-ID', { month: 'short' }),
        masuk: v.masuk,
        keluar: v.keluar,
      }));
  }, [list, chartPeriod]);

  // Seri saldo kronologis untuk area tren.
  const saldoSeries = useMemo(() => list.map((k) => k.saldo_setelah), [list]);

  /** Penanda ujung grafik tren (kiri = transaksi terlama, kanan = terbaru). */
  const trenUjung = (k?: KasRT) => ({
    label: k ? new Date(k.tanggal).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '',
    nilai: k ? (k.saldo_setelah < 0 ? '-' : '') + formatRupiahPlain(k.saldo_setelah) : '',
  });
  const trenAwal = trenUjung(list[0]);
  const trenAkhir = trenUjung(list[list.length - 1]);

  // Rekap per kategori (pertanggungjawaban) — Saldo Awal dikecualikan.
  const rekapKategori = useMemo(() => {
    const masuk: Record<string, number> = {};
    const keluar: Record<string, number> = {};
    for (const k of list) {
      if (k.keterangan === 'Saldo Awal Kas RT') continue;
      const bucket = k.tipe === 'masuk' ? masuk : keluar;
      const key = k.kategori ?? 'lainnya';
      bucket[key] = (bucket[key] ?? 0) + k.nominal;
    }
    return { masuk, keluar };
  }, [list]);


  const perTanggal = usePerTanggal(loading, error);

  async function handleSave(data: { tipe: Tipe; nominal: number; keterangan: string; tanggal: string; kategori: string }) {
    if (editing) {
      const { data: upd, error } = await supabase
        .from('kas_rt')
        .update({ tipe: data.tipe, nominal: data.nominal, keterangan: data.keterangan, tanggal: data.tanggal, kategori: data.kategori })
        .eq('id', editing.id)
        .select();
      if (error) { showToast(pesanError(error, 'Gagal mengubah transaksi. Cek koneksi lalu coba lagi — perubahannya belum tersimpan.'), 'error'); return; }
      if (!upd || upd.length === 0) { showToast('Aplikasi belum diizinkan mengubah transaksi. Kabari yang mengurus aplikasi.', 'error'); return; }
    } else {
      const { error } = await supabase.from('kas_rt').insert({
        tipe: data.tipe,
        nominal: data.nominal,
        keterangan: data.keterangan,
        tanggal: data.tanggal,
        kategori: data.kategori,
        saldo_setelah: 0, // sementara; dihitung ulang di bawah
      });
      if (error) { showToast(pesanError(error, 'Gagal menyimpan transaksi. Cek koneksi lalu coba lagi — transaksinya belum tercatat.'), 'error'); return; }
    }
    /* Transaksinya SUDAH tersimpan di titik ini; yang bisa gagal tinggal hitung
       ulang saldo berjalan. Karena itu jangan batalkan alurnya — tutup modal &
       muat ulang seperti biasa, tapi katakan apa adanya bahwa kolom "Saldo:"
       belum tentu mutakhir. Diam di sini = angka basi yang terlihat sah. */
    let saldoOk = true;
    try {
      await recomputeKasRTSaldo();
    } catch (e) {
      saldoOk = false;
      showToast(pesanError(e, 'Transaksi tersimpan, tapi saldo berjalan gagal dihitung ulang. Muat ulang halaman.'), 'error');
    }
    setShowModal(false);
    const wasEdit = !!editing;
    setEditing(null);
    await load();
    if (saldoOk) showToast(wasEdit ? 'Transaksi diperbarui' : data.tipe === 'masuk' ? 'Pemasukan tersimpan' : 'Pengeluaran tersimpan');
  }

  // Hapus transaksi Kas RT dengan pola undo (hapus permanen setelah 5 dtk bila tak diurungkan).
  function deleteRow(row: KasRT) {
    setSelectedRow(null);
    setHapusRow(null);
    setList(prev => prev.filter(x => x.id !== row.id)); // optimistik
    showUndo(
      `${labelKategoriSingkat(row.tipe, row.kategori)} ${formatRupiahPlain(row.nominal)} dihapus`,
      async () => {
        const { data: del, error } = await supabase.from('kas_rt').delete().eq('id', row.id).select();
        if (error) { showToast(pesanError(error, 'Gagal menghapus transaksi. Cek koneksi lalu coba lagi — transaksinya masih ada.'), 'error'); await load(); return; }
        if (!del || del.length === 0) { showToast('Aplikasi belum diizinkan menghapus transaksi. Kabari yang mengurus aplikasi.', 'error'); await load(); return; }
        // Baris sudah terhapus; sisa risikonya cuma saldo berjalan yang basi.
        try {
          await recomputeKasRTSaldo();
        } catch (e) {
          showToast(pesanError(e, 'Baris terhapus, tapi saldo berjalan gagal dihitung ulang. Muat ulang halaman.'), 'error');
        }
        await load();
      },
      { onUndo: () => load() },
    );
  }

  return (
    <>
      <div className="space-y-8 pb-2 page-enter">
        {/* Kepala halaman = PageHeader bersama (30 Jul). Tetap SATU baris di HP;
            tumpukan dua baris dulu menambah ±56px chrome sebelum hero. */}
        <PageHeader
          title="Kas RT"
          subtitle={perTanggal}
          info={
            <InfoTip label="Kas RT">
              Kas besar RT&nbsp;004/006. Sebagian iuran tiap tarikan (Rp5.000/anggota) disetor ke sini untuk kebutuhan RT — terpisah dari Kas Hadiran.
            </InfoTip>
          }
          actions={<>
            <button onClick={load} aria-label="Muat ulang" className="press w-11 h-11 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {/* Ekspor (PDF/Excel) disatukan ke satu menu → aksi utama "Tambah"
                tak tersaingi di toolbar; kini hadir sebagai FAB di zona jempol.
                align kiri: tombol berada di kiri toolbar (HP) → dropdown buka ke
                kanan agar tidak terpotong tepi layar. */}
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
                    const { generateKasRTPDF } = await import('../lib/generateKasRTPDF');
                    generateKasRTPDF(list, { saldo, totalMasuk, totalKeluar, saldoAwal });
                  }, { mulai: 'Menyiapkan PDF…', gagal: 'Gagal membuat PDF. Coba muat ulang aplikasi.' }),
                },
                {
                  label: 'Ekspor Excel',
                  icon: Download,
                  tone: 'text-emerald-600 dark:text-emerald-400',
                  /* Jalur TERBERAT di seluruh app: chunk-nya 941 kB (270 kB gzip)
                     → 6,2 dtk di 400 kbps, dan sampai 20 Agu 2026 ia satu-satunya
                     yang bahkan tak punya `catch`. */
                  onClick: () => jalankanEkspor(async () => {
                    const { generateKasRTExcel } = await import('../lib/generateKasRTExcel');
                    await generateKasRTExcel(displayList, { saldo, totalMasuk, totalKeluar, saldoAwal });
                  }, { mulai: 'Menyiapkan Excel…', gagal: 'Gagal membuat file Excel. Coba muat ulang aplikasi.' }),
                },
              ]}
            />
          </>}
        />

        {/* Saldo Card — always teal. Di dalam CrossFade: sebelum data siap
            saldo=0 → hero berkedip "Rp0" (angka salah sesaat). Guard error &&
            list kosong: load pertama tanpa cache yang GAGAL juga bikin saldo=0
            → tanpa guard hero mengklaim "Rp0" padahal data tak termuat. */}
        {!(error && list.length === 0) && (
        <CrossFade
          loading={loading}
          skeleton={
            /* Skeleton BERBENTUK hero (eyebrow + dua aksi + nominal + dua chip
               stat), pola KasHadiran — bukan blok abu polos. Permukaannya ikut
               permukaan hero (`hero-emerald`), bukan kartu putih: anatominya
               sudah cermin, warnanya yang dulu tidak, jadi CrossFade memudarkan
               putih → hijau tua di elemen terbesar layar. */
            <div style={{ height: HERO_MIN_H, boxShadow: 'var(--hero-shadow)' }} className="relative overflow-hidden rounded-3xl hero-emerald p-6">
              <div className="flex items-center justify-between">
                <div className="skeleton skeleton-hero h-3 w-36 rounded-full" />
                <div className="flex gap-2">
                  <div className="skeleton skeleton-hero h-9 w-9 rounded-full" />
                  <div className="skeleton skeleton-hero h-9 w-9 rounded-full" />
                </div>
              </div>
              <div className="skeleton skeleton-hero mt-3 h-8 w-1/2 rounded-xl" />
              {/* Kaki kolom bergaris (bukan lagi 2 kotak) — cermin HeroStats.
                  Garisnya ikut hero (`border-white/15`, sama dgn HeroSaldo),
                  bukan token `line` yang lahir untuk tepi kartu putih. */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-5">
                <div className="skeleton skeleton-hero h-8 rounded-xl" />
                <div className="skeleton skeleton-hero h-8 rounded-xl" />
              </div>
            </div>
          }
        >
        {/* Anatomi hero = komponen bersama HeroSaldo (30 Jul). Dua panel
            bg-black/10 diganti kaki kolom bergaris (HeroStats) — bentuk yang
            sama dgn hero Beranda; kotak-di-dalam-kotak adalah dialek kedua. */}
        <HeroSaldo
          icon={Landmark}
          label="Saldo Bersih Kas RT"
          minHeight={HERO_MIN_H}
          measure={`${saldo < 0 ? '-' : ''}Rp${Math.abs(saldo).toLocaleString('id-ID')}`}
          amount={hidden
            ? maskRp(`${saldo < 0 ? '-' : ''}Rp${Math.abs(animatedSaldo).toLocaleString('id-ID')}`, hidden, 7)
            : <Odometer value={animatedSaldo} />}
          /* The Saldo-Defisit Rule (selaras Beranda & KasHadiran): nominal TETAP
             putih premium; negatif ditandai chip KATA "Defisit". */
          status={saldo < 0 ? (
            <span className="mb-2 shrink-0 rounded-full bg-rose-700 px-2 py-0.5 text-micro font-bold uppercase tracking-[0.08em] text-white ring-1 ring-inset ring-white/20">
              Defisit
            </span>
          ) : undefined}
          caption={saldoAwal > 0 && saldoAwalEntry ? (
            <>
              Saldo Awal
              {' \u00b7 '}
              {new Date(saldoAwalEntry.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' \u00b7 '}
              <span className="font-display tabular-nums">{maskRp(formatRupiahPlain(saldoAwal), hidden, 4)}</span>
            </>
          ) : undefined}
          actions={
            <>
              {/* Urutan ikon seragam app-wide: mata (sembunyikan nominal) selalu pertama. */}
              <HeroAction
                icon={hidden ? EyeOff : Eye}
                label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
                onClick={() => { haptic(); toggleHideAmount(); }}
              />
              {/* Ikon ditukar jadi pemintal saat kartu PNG disiapkan (html2canvas 201 kB
                  + render) — ikon Share2 yang BERPUTAR terbaca sbg gangguan, bukan
                  sbg kerja. */}
              <HeroAction icon={bagiSibuk ? Loader2 : Share2} label="Bagikan ringkasan ke WhatsApp" onClick={handleShareReceipt} spin={bagiSibuk} />
            </>
          }
          stats={[
            { icon: TrendingUp, label: 'Total Masuk', value: maskRp(`+${formatRupiahPlain(totalMasuk)}`, hidden, 4) },
            { icon: TrendingDown, label: 'Total Keluar', value: maskRp(`-${formatRupiahPlain(totalKeluar)}`, hidden, 4) },
          ]}
        />
        </CrossFade>
        )}

        {/* Target & progres Kas RT */}
        <TargetKasRT saldo={saldo} />

        {/* Insight ringkas: kas masuk bulan ini vs bulan lalu.
            Syaratnya dihitung dari `list`, yang saat memuat masih kosong → dua
            nominalnya 0 → barisnya TAK dirender sama sekali, lalu muncul utuh
            65px begitu data datang. Bersama kartu Target (147px) inilah yang
            mendorong grafik & rekap turun ~175px di Kas RT — dua blok yang
            muncul dari NOL, bukan skeleton yang tingginya meleset.
            Skeletonnya meniru markup SmartInsight (px-4 py-3, tile 36px, dua
            baris caption) supaya tingginya ikut kalau anatominya berubah. */}
        {loading && (
          <div aria-hidden="true" className="flex items-center gap-3 rounded-3xl border border-line dark:border-gray-800/60 bg-white dark:bg-gray-900 lift px-4 py-3">
            <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="skeleton h-[15px] w-2/5 rounded-full" />
              <div className="skeleton h-[15px] w-3/5 rounded-full" />
            </div>
          </div>
        )}
        {!loading && (masukBulanIni > 0 || masukBulanLalu > 0) && (
          <SmartInsight label="Kas masuk bulan ini" current={masukBulanIni} previous={masukBulanLalu} />
        )}

        {/* Selama muat, dua blok di bawah (grafik & rekap) dulu bertinggi NOL lalu
            tiba-tiba ada — mendorong seluruh isi halaman 661px sekaligus (CLS
            terukur 0,479 di 400 kbps, "buruk" menurut ambang Google; layar lain
            0,02–0,15). Warga membaca sambil halaman melompat satu layar penuh.
            Hero & daftar mutasi sudah lama punya skeleton lewat CrossFade —
            kedua blok inilah yang tertinggal.

            Skeletonnya BERBENTUK isi aslinya (bukan slab abu setinggi tetap):
            tinggi tetap akan salah begitu `sm:` mengubah grid jadi 2 kolom.
            Dengan struktur yang sama, ia reflow persis seperti yang digantikan. */}
        {loading && (
          <div className="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-2" aria-hidden="true">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-5">
              <div className="skeleton h-4 w-24 rounded-lg mb-2" />
              {/* 84px = tinggi default AreaTrend */}
              <div className="skeleton rounded-xl" style={{ height: 84 }} />
              <div className="mt-2 flex justify-between gap-2">
                <div className="skeleton h-3 w-20 rounded-full" />
                <div className="skeleton h-3 w-20 rounded-full" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="skeleton h-4 w-28 rounded-lg" />
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => <div key={i} className="skeleton h-11 w-14 rounded-full" />)}
                </div>
              </div>
              <div className="skeleton h-3 w-32 rounded-full mb-2" />
              {/* 96px = tinggi area bar MonthlyBars */}
              <div className="skeleton rounded-xl" style={{ height: 96 }} />
            </div>
          </div>
        )}

        {/* Grafik tren saldo & masuk/keluar per bulan (periode 3/6/12) */}
        {!loading && list.length > 1 && (
          <div className="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-2">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-5">
              <p className="text-body font-bold text-ink dark:text-gray-100 mb-2">Tren Saldo</p>
              <AreaTrend points={saldoSeries} />
              {/* Kaki grafik — sebelumnya kartu ini cuma garis: tanpa sumbu, tanpa
                  periode, tanpa nilai, dan AreaTrend aria-hidden → pembaca layar
                  kehilangan kartunya utuh. Dua penanda ujung sudah cukup membuat
                  bentuk garis bisa dibaca sbg angka, tanpa membangun sumbu penuh. */}
              {/* `font-display tabular-nums` di WADAH, bukan per span: dua penanda
                  ujung ini satu-satunya nominal rupiah di seluruh app yang masih
                  dicetak dgn font body DAN tanpa angka tabular — dua aturan
                  sekaligus (wajah angka 100% Sora; angka selalu tabular). Ia
                  lolos bertahun-tahun karena bersembunyi sbg "caption grafik",
                  padahal isinya saldo awal & akhir periode. */}
              {/* Caption dua-ujung grafik tren (saldo awal & akhir periode).
                  `flex-wrap` sbg katup: di 200% kedua ujungnya butuh 162px
                  masing-masing dan mendorong halaman geser samping. */}
              <div className="flex flex-wrap items-baseline justify-between gap-2 mt-2 font-display text-micro font-medium angka-prosa text-ink-faint dark:text-gray-400">
                <span>{trenAwal.label} · {maskRp(trenAwal.nilai, hidden, 4)}</span>
                <span className="text-right">{trenAkhir.label} · {maskRp(trenAkhir.nilai, hidden, 4)}</span>
              </div>
            </div>
            {monthly.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-5">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <p className="text-body font-bold text-ink dark:text-gray-100">Masuk vs Keluar</p>
                  {/* `flex-wrap` di GRUP-nya, bukan cuma di induk: ketiga chip
                      `shrink-0`, jadi saat teks 200% grupnya sendiri melebar ke
                      369px (> viewport 360) dan induk yang sudah wrap tak bisa
                      menolong — yang perlu melipat adalah isi grup ini. */}
                  <div className="flex flex-wrap items-center gap-1">
                    {[3, 6, 12].map((p) => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        aria-pressed={chartPeriod === p}
                        aria-label={`${p} bulan terakhir`}
                        /* Kosakata chip KANONIK (sama FilterChips): rounded-full,
                           text-caption font-semibold, inaktif putih ber-border-control.
                           Dulu kontrol ini satu-satunya "pilih 1 dari N" yang
                           beda wajah — kotak rounded-lg ber-fill abu tanpa tepi,
                           padahal pekerjaannya sama: memfilter data. */
                        className={`press shrink-0 min-h-[44px] px-3 inline-flex items-center justify-center rounded-full text-caption font-semibold whitespace-nowrap transition-colors ${
                          chartPeriod === p
                            ? 'bg-brand text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-control dark:border-control-dark'
                        }`}
                      >
                        {/* "3 bln", bukan "3B" — singkatan sandi utk pembaca lansia;
                            aria-label sudah benar, label visualnya yang tertinggal. */}
                        {p} bln
                      </button>
                    ))}
                  </div>
                </div>
                {/* Dot legend sinkron warna bar MonthlyBars — kini token
                    `pos`/`neg` (+ pasangan gelapnya), sama persis dgn warna
                    nominal uang di kartu-kartu halaman ini. */}
                <div className="flex items-center gap-2 text-micro font-medium mb-2">
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400"><span data-grafik="legenda-masuk" className="w-2 h-2 rounded-full bg-pos dark:bg-pos-dark-fill" />Masuk</span>
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400"><span data-grafik="legenda-keluar" className="w-2 h-2 rounded-full bg-neg dark:bg-neg-dark-fill" />Keluar</span>
                </div>
                <MonthlyBars data={monthly} />
              </div>
            )}
          </div>
        )}

        {/* Rekap per kategori — skeleton sebentuk isinya (lihat alasan di atas). */}
        {loading && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-5 mt-4" aria-hidden="true">
            <div className="skeleton h-4 w-36 rounded-lg mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[0, 1].map((k) => (
                <div key={k} className="inset-soft rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="skeleton h-3 w-20 rounded-full" />
                    <div className="skeleton h-3 w-24 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="skeleton h-3 w-28 rounded-full" />
                        <div className="skeleton h-3 w-16 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rekap per kategori — untuk pertanggungjawaban */}
        {!loading && list.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-5 mt-4">
            <p className="text-body font-bold text-ink dark:text-gray-100 mb-3">Rekap per Kategori</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Penerimaan */}
              <div className="inset-soft rounded-xl p-3">
                {/* `flex-wrap`: katup pengaman yang hanya bekerja saat ruang
                    habis. Di 360px label + total muat berdampingan, jadi
                    tampilan normal tak bergerak. Saat teks dasar browser 200%
                    nominalnya (`shrink-0`) tak bisa mengalah dan meluber sampai
                    x=477 pada viewport 360 — terukur sbg penyumbang TUNGGAL
                    geser samping 117px halaman Kas RT. */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-micro font-semibold uppercase tracking-wide text-ink-faint dark:text-gray-400">Penerimaan</span>
                  <span className="text-caption font-display font-semibold text-pos dark:text-emerald-400 tabular-nums shrink-0">{maskRp(`+${formatRupiahPlain(totalMasuk)}`, hidden, 4)}</span>
                </div>
                {/* Label BOLEH membungkus (`min-w-0 flex-1`), nominalnya TIDAK ikut
                    turun. `flex-wrap` sempat dipasang di baris ini 17 Agu untuk
                    menutup geser samping @teks-200%, dan itu keliru: di 360px NORMAL
                    pun label panjang ("Iuran Warga (di luar anggota hadiran)") sudah
                    memicunya, sehingga nominalnya jatuh ke baris bawah dan berdiri
                    rata KIRI — kolom angka berhenti sejajar. Yang perlu mengalah
                    adalah LABEL-nya, bukan seluruh baris. */}
                <div className="space-y-2">
                  {KATEGORI_MASUK.filter((o) => (rekapKategori.masuk[o.key] ?? 0) > 0).map((o) => (
                    <div key={o.key} className="flex items-start justify-between gap-2 text-caption">
                      <span className="min-w-0 flex-1 angka-prosa text-ink-sub dark:text-gray-300 leading-snug">{o.label}</span>
                      <span className="font-display font-semibold text-ink dark:text-gray-100 tabular-nums shrink-0">{maskRp(`+${formatRupiahPlain(rekapKategori.masuk[o.key])}`, hidden, 4)}</span>
                    </div>
                  ))}
                  {totalMasuk === 0 && <p className="text-caption text-ink-faint dark:text-gray-400">Belum ada penerimaan.</p>}
                </div>
              </div>
              {/* Pengeluaran */}
              <div className="inset-soft rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-micro font-semibold uppercase tracking-wide text-ink-faint dark:text-gray-400">Pengeluaran</span>
                  <span className="text-caption font-display font-semibold text-neg dark:text-rose-400 tabular-nums shrink-0">{maskRp(`-${formatRupiahPlain(totalKeluar)}`, hidden, 4)}</span>
                </div>
                <div className="space-y-2">
                  {KATEGORI_KELUAR.filter((o) => (rekapKategori.keluar[o.key] ?? 0) > 0).map((o) => (
                    <div key={o.key} className="flex items-start justify-between gap-2 text-caption">
                      <span className="min-w-0 flex-1 angka-prosa text-ink-sub dark:text-gray-300 leading-snug">{o.label}</span>
                      <span className="font-display font-semibold text-ink dark:text-gray-100 tabular-nums shrink-0">{maskRp(`-${formatRupiahPlain(rekapKategori.keluar[o.key])}`, hidden, 4)}</span>
                    </div>
                  ))}
                  {totalKeluar === 0 && <p className="text-caption text-ink-faint dark:text-gray-400">Belum ada pengeluaran.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mutasi list — terbaru di atas (cross-fade skeleton → konten) */}
        <SectionTitle className="mt-6" count={list.length}>Mutasi Kas Besar RT</SectionTitle>

        <CrossFade loading={loading} skeleton={(
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex items-center gap-2 px-4 py-4 [--di-l:3.75rem]${i < 4 ? ' divide-inset' : ''}`}>
                <div className="w-9 h-9 rounded-xl skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded-lg w-3/4" />
                  <div className="h-3 skeleton rounded-lg w-1/3" />
                </div>
                <div className="text-right space-y-2">
                  <div className="h-4 w-20 skeleton rounded-lg" />
                  <div className="h-3 w-16 skeleton rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}>
          {error ? (
          <ErrorState onRetry={() => load()} retrying={loading} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Belum ada transaksi"
            subtitle={isBendahara
              ? 'Catat pemasukan atau pengeluaran pertama Kas RT di sini.'
              : 'Transaksi akan muncul setelah dicatat bendahara.'}
            action={isBendahara
              ? { label: 'Tambah transaksi', icon: Plus, onClick: () => { setEditing(null); setShowModal(true); } }
              : undefined}
          />
        ) : (
          <>
          {/* Cari + filter tipe + sort mutasi */}
          <div className="space-y-2 mb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="cari-mutasi"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari keterangan…"
              aria-label="Cari mutasi kas"
              inputMode="search"
              enterKeyHint="search"
              className="field-search pr-11"
            />
            {search && <ClearButton onClick={() => setSearch('')} />}
          </div>
          <FilterChips
            options={[
              { id: 'semua',  label: 'Semua' },
              { id: 'masuk',  label: 'Masuk' },
              { id: 'keluar', label: 'Keluar' },
            ] as const}
            value={filter}
            onChange={setFilter}
            sort={{
              value: sort,
              options: [
                { id: 'terbaru', label: 'Terbaru' },
                { id: 'terlama', label: 'Terlama' },
                { id: 'nominal', label: 'Nominal' },
              ] as const,
              onChange: setSort,
            }}
          />
          </div>

          {displayList.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="Tidak ada hasil"
              subtitle="Tidak ada transaksi pada filter ini."
              action={{ label: 'Reset filter', icon: RotateCcw, onClick: () => { setFilter('semua'); setSearch(''); } }}
            />
          ) : (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
            {displayList.map((k, idx) => {
              const isMasuk = k.tipe === 'masuk';
              const isLast  = idx === displayList.length - 1;
              const isSaldoAwal = k.keterangan === 'Saldo Awal Kas RT';
              const editable = isBendahara && !isSaldoAwal;
              /* Sheet detail kini dibuka SIAPA SAJA, bukan cuma bendahara: judul
                 baris dipotong 2 baris (lihat line-clamp di bawah), jadi warga
                 WAJIB tetap punya jalan membaca keterangan utuh — memotong teks
                 tanpa menyediakan jalan itu = menyembunyikan pertanggungjawaban.
                 Yang dibatasi ke bendahara adalah tombol Edit/Hapus DI DALAM sheet. */
              const bisaDetail = !isSaldoAwal;
              const Row: React.ElementType = bisaDetail ? 'button' : 'div';
              return (
                <Row
                  key={k.id}
                  type={bisaDetail ? 'button' : undefined}
                  onClick={bisaDetail ? () => { haptic(); setSelectedRow(k); } : undefined}
                  aria-label={bisaDetail ? `${editable ? 'Aksi' : 'Lihat detail'}: ${k.keterangan || (isMasuk ? 'Pemasukan' : 'Pengeluaran')}` : undefined}
                  style={{ animationDelay: `${Math.min(idx, 10) * 0.035}s` }}
                  /* `items-start`, BUKAN `items-center`: judul di sini
                     `line-clamp-2` jadi barisnya bisa dua, dan dgn perataan
                     tengah tile ikon & nominal mengambang di antara baris 1
                     dan 2 — tak sejajar dgn apa pun. Baris Beranda boleh tetap
                     `items-center` karena judulnya `truncate` (selalu satu
                     baris). Nominal & ikon kini bertumpu pada baris PERTAMA
                     judul, sama seperti kolom angka Rekap per Kategori. */
                  className={`rise w-full text-left flex items-start gap-2 px-4 py-4 [--di-l:3.75rem] [content-visibility:auto] [contain-intrinsic-block-size:auto_76px]${bisaDetail ? ' cursor-pointer hover:bg-gray-50/60 dark:hover:bg-gray-800/40 active:bg-gray-50/80 dark:active:bg-gray-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40' : ''} transition-colors duration-ketuk ${!isLast ? 'divide-inset' : ''}`}
                >
                  <div className={`icon-tile w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 ${isMasuk ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
                    {isMasuk
                      ? <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      : <ArrowUpRight  className="w-4 h-4 text-neg dark:text-rose-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Keterangan Kas RT = teks BEBAS yang panjangnya tak terbatas
                        (terukur di 360px: 35 dari 36 baris membungkus >=3 baris,
                        terburuk 10 baris / 288px — sepertiga layar untuk SATU
                        transaksi, sementara Beranda & Jadwal duduk di 68-97px).
                        Dipotong 2 baris supaya irama daftar Kas RT kembali ke
                        irama app; teks utuh ada di sheet detail (ketuk baris). */}
                    {/* `data-ringkas` = pernyataan bahwa teks ini RINGKASAN dan
                        ada jalan ke teks utuhnya (sheet detail di bawah merender
                        `keterangan` TANPA clamp). Dibaca `audit:jarak-teks`, yang
                        tak percaya begitu saja: penanda hanya berlaku kalau
                        elemennya duduk di dalam kontrol yang bisa diaktifkan —
                        jadi baris "Saldo Awal" yang bukan tombol TIDAK ikut
                        dimaafkan — dan sapuan itu ikut MENGUKUR sheet tujuannya. */}
                    <p data-ringkas className="text-body font-semibold text-ink dark:text-gray-100 leading-snug line-clamp-2">
                      {k.keterangan || (isMasuk ? 'Pemasukan' : 'Pengeluaran')}
                    </p>
                    {/* Meta = dialek baris KANONIK Beranda: satu <p>, bagian
                        digabung " · ", `truncate` (satu baris, tak pernah
                        membungkus). Sebelumnya di sini chip BERBINGKAI dalam
                        wadah flex-wrap — bingkai di dalam baris daftar adalah
                        dialek liar (bukan komponen Tag bersama), dan karena
                        tanggal+chip tak muat di kolom 120px ia selalu jatuh ke
                        baris kedua, membuat chip menggantung sendirian. */}
                    <p className="text-caption font-medium angka-prosa text-ink-faint dark:text-gray-400 mt-1 potong-lentur">
                      {[formatTanggalRingkas(k.tanggal), k.kategori && labelKategoriSingkat(k.tipe, k.kategori)].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  {/* Saldo berjalan TURUN ke sheet detail. Ia dulu duduk di sini
                      sebagai tingkat kedua dan justru dialah yang MENENTUKAN lebar
                      kolom kanan (terukur: "Saldo: Rp16.557.000" 129px lawan
                      nominal 106px) — menyisakan cuma 97px untuk judul, sehingga
                      konten utama baris kalah lebar dari angka pendampingnya.
                      Kolom kanan kini satu tingkat, sama seperti baris Beranda. */}
                  <div className="text-right shrink-0">
                    <p className={`font-display text-amount font-semibold tabular-nums ${isMasuk ? 'text-pos dark:text-emerald-400' : 'text-neg dark:text-rose-400'}`}>
                      {maskRp(`${isMasuk ? '+' : '-'}${formatRupiahPlain(k.nominal)}`, hidden, 4)}
                    </p>
                  </div>
                </Row>
              );
            })}
          </div>
          )}
          </>
        )}
        </CrossFade>
      </div>

      {/* `saldoSekarang` = `null`, BUKAN 0, saat pemuatan gagal: `saldo`
          diturunkan dari `list` yang kosong, jadi nol di sini berarti "tak
          tahu", bukan "kas kosong". */}
      {showModal && (
        <TambahModal
          saldoSekarang={error ? null : saldo}
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}

      {/* Aksi baris: detail + Edit + Hapus (bendahara) */}
      {selectedRow && (
        <div className="fixed inset-0 z-overlay flex items-end" onClick={rowDrag.dismiss}>
          <div className={`sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm ${rowDrag.dismissing ? 'sheet-backdrop-out' : ''}`} />
          <div
            ref={rowDlg.panelRef}
            {...rowDlg.panelProps}
            className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10"
            onClick={(e) => e.stopPropagation()}
            style={rowDrag.style}
          >
            <div className="-mt-2 mb-3 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...rowDrag.handlers}>
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <p className="text-subtitle font-bold text-ink dark:text-gray-100 leading-snug">{selectedRow.keterangan || (selectedRow.tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran')}</p>
            <p className="text-caption text-ink-faint dark:text-gray-400 mt-0.5">{formatTanggal(selectedRow.tanggal)}</p>
            <div className="inset-soft rounded-2xl p-4 space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-body text-ink-faint dark:text-gray-400">Tipe</span>
                <span className={`text-body font-semibold ${selectedRow.tipe === 'masuk' ? 'text-pos dark:text-emerald-400' : 'text-neg dark:text-rose-400'}`}>
                  {selectedRow.tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body text-ink-faint dark:text-gray-400">Nominal</span>
                {/* Wajah nominal KANONIK (`text-amount font-semibold`) — sama
                    persis dgn baris "Jumlah" di sheet detail Beranda: panel
                    `.inset-soft` yang sama, label `text-body` yang sama, pekerjaan
                    yang sama. Dulu di sini 16px/700, di sana 17px/600: satu
                    pekerjaan, dua kostum. */}
                <span className={`font-display text-amount font-semibold tabular-nums ${selectedRow.tipe === 'masuk' ? 'text-pos dark:text-emerald-400' : 'text-neg dark:text-rose-400'}`}>
                  {maskRp(`${selectedRow.tipe === 'masuk' ? '+' : '-'}${formatRupiahPlain(selectedRow.nominal)}`, hidden, 4)}
                </span>
              </div>
              {/* Kategori & saldo berjalan: keduanya TURUN dari baris daftar ke
                  sini (baris dulu memikul empat tingkat informasi sekaligus).
                  Label kategori di sini sengaja versi PENUH; baris daftar pakai
                  versi ringkas karena metanya di-`truncate` dalam ~120px. */}
              {selectedRow.kategori && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-body text-ink-faint dark:text-gray-400 shrink-0">Kategori</span>
                  <span className="text-body font-semibold text-ink dark:text-gray-100 text-right">
                    {labelKategori(selectedRow.tipe, selectedRow.kategori)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-body text-ink-faint dark:text-gray-400">Saldo setelah</span>
                <span className={`font-display text-body font-semibold tabular-nums ${selectedRow.saldo_setelah < 0 ? 'text-neg dark:text-rose-400' : 'text-ink dark:text-gray-100'}`}>
                  {maskRp(`${selectedRow.saldo_setelah < 0 ? '-' : ''}Rp${Math.abs(selectedRow.saldo_setelah).toLocaleString('id-ID')}`, hidden, 4)}
                </span>
              </div>
            </div>
            {/* Warga membuka sheet ini untuk MEMBACA (judul baris dipotong 2
                baris), jadi ia tak boleh berakhir buntu tanpa satu tombol pun. */}
            {isBendahara ? (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setEditing(selectedRow); setSelectedRow(null); setShowModal(true); }}
                  className="btn-brand flex-1 inline-flex items-center justify-center gap-2 py-3 text-body"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => setHapusRow(selectedRow)}
                  className="press flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-body font-semibold border bg-white dark:bg-gray-800 text-neg dark:text-rose-400 border-rose-200 dark:border-rose-900"
                >
                  <Trash2 className="w-4 h-4" /> Hapus
                </button>
              </div>
            ) : (
              <button onClick={rowDrag.dismiss} className="btn-secondary w-full py-3 mt-4 text-body">
                Tutup
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hapus transaksi = dialog konfirmasi, bukan tekan-dua-kali di tombol yang
          sama (jempol gampang mendarat dua kali). Tanpa gerbang ketik-ulang:
          penghapusan baru dieksekusi setelah jeda undo di notifikasi. */}
      <ConfirmDestruktif
        open={!!hapusRow}
        title="Hapus transaksi ini?"
        description={<>
          {hapusRow?.keterangan || (hapusRow?.tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran')} senilai{' '}
          <b className="font-display tabular-nums">{formatRupiahPlain(hapusRow?.nominal ?? 0)}</b> dihapus dari Kas RT dan saldo dihitung ulang.
          Ada jeda 5 detik untuk mengurungkan lewat tombol Urungkan di notifikasi.
        </>}
        confirmLabel="Hapus"
        loadingLabel="Menghapus…"
        icon={Trash2}
        onClose={() => setHapusRow(null)}
        onConfirm={() => { if (hapusRow) deleteRow(hapusRow); }}
      />

      {/* Aksi utama di zona jempol */}
      {isBendahara && (
        <Fab label="Tambah" ariaLabel="Tambah transaksi Kas RT" disabled={error} onClick={() => { setEditing(null); setShowModal(true); }} />
      )}
    </>
  );
}
