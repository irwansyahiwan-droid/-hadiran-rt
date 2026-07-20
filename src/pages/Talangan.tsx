import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, RefreshCw, RotateCcw, Search, Trash2, MessageCircle, Eye, EyeOff } from 'lucide-react';
import ClearButton from '../components/ClearButton';
import { useCountUp, useHideAmount, toggleHideAmount } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { getPageCache, setPageCache } from '../lib/pageCache';
import { useAuthContext } from '../context/AuthContext';
import { formatTanggalShort, formatRupiahPlain, haptic, maskRp, pesanError } from '../lib/utils';
import FitAmount from '../components/FitAmount';
import { openWa, pesanTalangan } from '../lib/waReminder';
import AvatarPeci from '../components/AvatarPeci';
import SectionTitle from '../components/SectionTitle';
import InfoTip from '../components/InfoTip';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Tag from '../components/Tag';
import FilterChips from '../components/FilterChips';
import CrossFade from '../components/CrossFade';
import { showToast, showUndo } from '../lib/toast';
import type { Talangan } from '../lib/types';

interface WargaGroup {
  warga_id: string;
  nama: string;
  entries: Talangan[];
  totalBelum: number;
  countBelum: number;
}

// Tinggi dasar hero tunggakan (px) — SATU sumber utk skeleton (height) & hero
// asli (min-height) agar CrossFade bebas layout-jump (pola HERO_MIN_H
// KasHadiran). Kartu "Semua Talangan Lunas" sengaja TIDAK di-min-height —
// wujud pendek itu memang beda kartu, bukan drift.
const HERO_MIN_H = 208;

export default function TalanganPage({ onBack }: { onBack?: () => void }) {
  const { isBendahara } = useAuthContext();
  // SWR: render dari snapshot terakhir, revalidate diam-diam (lihat lib/pageCache).
  const [cached] = useState(() => getPageCache<Talangan[]>('talangan'));
  const [list, setList] = useState<Talangan[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'semua' | 'belum' | 'lunas'>('semua');
  const [talSort, setTalSort] = useState<'tunggakan' | 'nama'>('tunggakan');

  async function load() {
    // Sudah ada data tampil → revalidate diam-diam: tanpa skeleton, gagal = toast.
    const silent = list.length > 0;
    if (!silent) setLoading(true);
    setError(false);
    try {
      const { data, error: eLoad } = await supabase
        .from('talangan')
        .select('*, warga(*), tarikan(*)')
        .order('created_at', { ascending: true });
      // Supabase tak melempar — tanpa cek ini fetch gagal jadi "Semua Talangan
      // Lunas" / daftar kosong palsu + cache tertimpa.
      if (eLoad) throw eLoad;
      setList((data as Talangan[]) ?? []);
      setPageCache('talangan', (data as Talangan[]) ?? []);
    } catch {
      if (silent) showToast('Gagal memperbarui data. Coba lagi.', 'error');
      else setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function bayar(t: Talangan) {
    setProcessingId(t.id);
    setConfirmId(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      // Supabase TIDAK melempar saat gagal — tanpa cek error, koneksi putus
      // tetap toast "Ditandai lunas" padahal data tak berubah (toast bohong).
      const { error: eUpd } = await supabase
        .from('talangan')
        .update({ status_lunas: true, tanggal_lunas: today })
        .eq('id', t.id);
      if (eUpd) {
        showToast(pesanError(eUpd, 'Gagal menandai lunas. Cek koneksi lalu coba lagi.'), 'error');
        return;
      }
      const { error: eTx } = await supabase.from('transaksi_kas').insert({
        tipe: 'talangan_masuk',
        nominal: t.nominal,
        keterangan: `Talangan lunas — ${t.warga?.nama ?? ''} (Tarikan #${t.tarikan?.nomor ?? ''})`,
        tanggal: today,
        warga_id: t.warga_id,
        tarikan_id: t.tarikan_id,
        saldo_setelah: 0,
      });
      if (eTx) {
        // Status lunas sudah tersimpan tapi catatan kas gagal — muat ulang agar
        // layar jujur menampilkan keadaan sebenarnya, jangan klaim sukses.
        showToast(pesanError(eTx, 'Lunas tercatat, tapi catatan kas gagal. Coba ulangi.'), 'error');
        load();
        return;
      }
      load();
      showToast('Ditandai lunas');
    } finally {
      setProcessingId(null);
    }
  }

  function handleBayarClick(t: Talangan) {
    if (confirmId === t.id) {
      bayar(t);
    } else {
      setConfirmId(t.id);
      setTimeout(() => setConfirmId(prev => prev === t.id ? null : prev), 3000);
    }
  }

  // Batalkan pembayaran talangan — kembalikan ke "belum lunas" & hapus transaksi kasnya
  async function batalkanBayar(t: Talangan) {
    setProcessingId(t.id);
    setCancelConfirmId(null);
    try {
      // Cek error tiap langkah (Supabase tak melempar) — jangan toast sukses palsu.
      const { error: eUpd } = await supabase
        .from('talangan')
        .update({ status_lunas: false, tanggal_lunas: null })
        .eq('id', t.id);
      if (eUpd) {
        showToast(pesanError(eUpd, 'Gagal membatalkan pelunasan. Cek koneksi lalu coba lagi.'), 'error');
        return;
      }
      const { error: eDel } = await supabase
        .from('transaksi_kas')
        .delete()
        .eq('tipe', 'talangan_masuk')
        .eq('warga_id', t.warga_id)
        .eq('tarikan_id', t.tarikan_id);
      if (eDel) {
        showToast(pesanError(eDel, 'Status dibatalkan, tapi catatan kas gagal dihapus. Coba ulangi.'), 'error');
        load();
        return;
      }
      load();
      showToast('Pelunasan dibatalkan', 'info');
    } finally {
      setProcessingId(null);
    }
  }

  function handleBatalClick(t: Talangan) {
    if (cancelConfirmId === t.id) {
      batalkanBayar(t);
    } else {
      setCancelConfirmId(t.id);
      setTimeout(() => setCancelConfirmId(prev => prev === t.id ? null : prev), 3000);
    }
  }

  // Hapus data talangan (beserta transaksi kas pembayarannya bila ada).
  // Pakai pola undo: sembunyikan dulu, hapus permanen setelah 5 dtk bila tak diurungkan.
  function hapusTalangan(t: Talangan) {
    setDeleteConfirmId(null);
    setList(prev => prev.filter(x => x.id !== t.id)); // optimistik
    showUndo(
      'Talangan dihapus',
      async () => {
        const { error: eTx } = await supabase
          .from('transaksi_kas')
          .delete()
          .eq('tipe', 'talangan_masuk')
          .eq('warga_id', t.warga_id)
          .eq('tarikan_id', t.tarikan_id);
        const { error: eTal } = await supabase.from('talangan').delete().eq('id', t.id);
        if (eTx || eTal) showToast('Gagal menghapus talangan', 'error');
        await load();
      },
      { onUndo: () => load() },
    );
  }

  function handleHapusClick(t: Talangan) {
    setConfirmId(null);
    setCancelConfirmId(null);
    if (deleteConfirmId === t.id) {
      hapusTalangan(t);
    } else {
      setDeleteConfirmId(t.id);
      setTimeout(() => setDeleteConfirmId(prev => prev === t.id ? null : prev), 3000);
    }
  }

  // Group by warga
  const groups: WargaGroup[] = [];
  const seen = new Map<string, WargaGroup>();

  list.forEach(t => {
    if (!t.warga) return;
    const id = t.warga_id;
    if (!seen.has(id)) {
      const g: WargaGroup = {
        warga_id: id,
        nama: t.warga.nama,
        entries: [],
        totalBelum: 0,
        countBelum: 0,
      };
      seen.set(id, g);
      groups.push(g);
    }
    const g = seen.get(id);
    if (!g) return;
    g.entries.push(t);
    if (!t.status_lunas) {
      g.totalBelum += t.nominal;
      g.countBelum += 1;
    }
  });

  const filtered = search
    ? groups.filter(g => g.nama.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const sortGroups = (arr: WargaGroup[]) =>
    talSort === 'nama'
      ? [...arr].sort((a, b) => a.nama.localeCompare(b.nama))
      : [...arr].sort((a, b) => b.totalBelum - a.totalBelum);

  const berganda = sortGroups(filtered.filter(g => g.countBelum > 1));
  const single   = sortGroups(filtered.filter(g => g.countBelum === 1));
  const lunas    = [...filtered.filter(g => g.countBelum === 0 && g.entries.some(e => e.status_lunas))]
    .sort((a, b) => a.nama.localeCompare(b.nama));

  const showBelum = statusFilter !== 'lunas';
  const showLunas = statusFilter !== 'belum';
  const visibleCount =
    (showBelum ? berganda.length + single.length : 0) + (showLunas ? lunas.length : 0);
  const talSortLabel = talSort === 'tunggakan' ? 'Tunggakan' : 'Nama';

  const totalBelumLunas = list.filter(t => !t.status_lunas).reduce((s, t) => s + t.nominal, 0);
  const countBelum = list.filter(t => !t.status_lunas).length;
  const countLunas = list.filter(t => t.status_lunas).length;
  const animatedTotal = useCountUp(totalBelumLunas);
  const hidden = useHideAmount();

  // Kirim pengingat talangan ke warga via WhatsApp (semua tunggakan belum lunas)
  function ingatkan(g: WargaGroup) {
    haptic();
    const belum = g.entries.filter(e => !e.status_lunas);
    const items = belum.map(e => ({ nomor: e.tarikan?.nomor, nominal: e.nominal }));
    const noHp = g.entries[0]?.warga?.no_hp;
    const ok = openWa(noHp, pesanTalangan(g.nama, items, g.totalBelum));
    if (!ok) showToast('Nomor HP belum tersimpan — pilih kontak manual di WhatsApp', 'info');
  }

  function renderGroup(g: WargaGroup, showAll = false) {
    const isExpanded = expandedId === g.warga_id;
    const belumEntries = g.entries.filter(e => !e.status_lunas).sort((a, b) => (a.tarikan?.nomor ?? 0) - (b.tarikan?.nomor ?? 0));
    const lunasEntries = g.entries.filter(e => e.status_lunas).sort((a, b) => (a.tarikan?.nomor ?? 0) - (b.tarikan?.nomor ?? 0));

    return (
      <div key={g.warga_id}>
        {/* Group header */}
        <div className="flex items-center">
          <button
            onClick={() => setExpandedId(isExpanded ? null : g.warga_id)}
            aria-expanded={isExpanded}
            className="flex-1 min-w-0 flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 active:bg-gray-50 dark:active:bg-gray-800/60 transition-colors text-left cursor-pointer"
          >
            <AvatarPeci nama={g.nama} className="w-11 h-11 rounded-2xl" />
            <div className="flex-1 min-w-0">
              {/* line-clamp-2 (bukan truncate): nama warga panjang melipat ke baris 2,
                  tidak terpotong — kolom kanan (nominal+chevron+WA) memang lebar. */}
              <p className="text-body font-semibold text-ink dark:text-gray-100 line-clamp-2 leading-snug break-words">{g.nama}</p>
              {g.countBelum > 0 ? (
                /* Cukup jumlahnya — "N× Rp50.000" mengulang total di kolom kanan
                   (dan membocorkan nominal saat mode sembunyi-angka aktif).
                   Frasa pendek: kolom teks tinggal ~93px saat tombol WA tampil. */
                <p className="text-caption text-ink-faint dark:text-gray-400 mt-0.5 truncate">
                  {g.countBelum} belum lunas
                </p>
              ) : (
                <p className="text-caption text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">Lunas semua</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {g.countBelum > 0 && (
                <span className="font-display text-amount font-semibold tabular-nums text-warn dark:text-amber-400 whitespace-nowrap">
                  {maskRp(formatRupiahPlain(g.totalBelum), hidden, 4)}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} strokeWidth={2.25} />
            </div>
          </button>
          {isBendahara && g.countBelum > 0 && (
            <button
              onClick={() => ingatkan(g)}
              title="Ingatkan via WhatsApp"
              aria-label={`Ingatkan ${g.nama} via WhatsApp`}
              className="press shrink-0 w-11 h-11 mr-1.5 inline-flex items-center justify-center rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              <MessageCircle className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        {/* Detail entries */}
        {isExpanded && (
          <div className="border-t border-line dark:border-gray-800 list-inset [--di-l:3.75rem] [--di-r:1rem]">
            {(showAll ? [...belumEntries, ...lunasEntries] : belumEntries).map(t => (
              <div key={t.id} className="flex items-center gap-2 px-4 py-3">
                <div className={`icon-tile w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  t.status_lunas
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                }`}>
                  #{t.tarikan?.nomor}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-ink dark:text-gray-100 truncate">Tarikan #{t.tarikan?.nomor}</p>
                  <p className="text-xs text-ink-faint dark:text-gray-400 truncate">
                    {t.tarikan?.tanggal ? formatTanggalShort(t.tarikan.tanggal) : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold tabular-nums text-ink-sub dark:text-gray-300 whitespace-nowrap">{maskRp(formatRupiahPlain(t.nominal), hidden, 4)}</span>
                  {t.status_lunas && (
                    <Tag tone="success">LUNAS</Tag>
                  )}
                </div>
                {isBendahara && !t.status_lunas && (
                  <button
                    onClick={() => handleBayarClick(t)}
                    disabled={processingId === t.id}
                    className={`inline-flex items-center justify-center gap-1 min-h-[44px] px-3.5 rounded-xl text-white text-xs font-semibold active:scale-[0.97] active:opacity-90 transition duration-150 disabled:opacity-70 shrink-0 whitespace-nowrap ${
                      confirmId === t.id ? 'bg-brand' : 'btn-brand'
                    }`}
                  >
                    {processingId === t.id ? (
                      <><RefreshCw className="w-3 h-3 animate-spin" />Memproses…</>
                    ) : confirmId === t.id ? 'Yakin?' : 'Bayar'}
                  </button>
                )}
                {isBendahara && t.status_lunas && (
                  <button
                    onClick={() => handleBatalClick(t)}
                    disabled={processingId === t.id}
                    className={`inline-flex items-center justify-center gap-1 min-h-[44px] px-3.5 rounded-xl text-xs font-semibold active:scale-[0.97] active:opacity-90 transition duration-150 disabled:opacity-70 shrink-0 whitespace-nowrap ${
                      cancelConfirmId === t.id
                        ? 'bg-rose-600 text-white'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {processingId === t.id ? (
                      <><RefreshCw className="w-3 h-3 animate-spin" />Memproses…</>
                    ) : cancelConfirmId === t.id ? 'Yakin batal?' : 'Batalkan'}
                  </button>
                )}
                {isBendahara && (
                  <button
                    onClick={() => handleHapusClick(t)}
                    disabled={processingId === t.id}
                    title="Hapus data talangan"
                    aria-label="Hapus data talangan"
                    className={`inline-flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] px-2.5 rounded-lg text-micro font-bold transition-colors disabled:opacity-70 shrink-0 ${
                      deleteConfirmId === t.id
                        ? 'bg-rose-600 text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                    }`}
                  >
                    {deleteConfirmId === t.id ? 'Hapus?' : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-2 page-enter">
      {/* Back header — hanya muncul saat dibuka dari Beranda (mode warga) */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 -ml-1 min-h-[44px] text-sm font-medium text-ink-sub dark:text-gray-300 hover:text-ink dark:hover:text-gray-100 active:opacity-70 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali
        </button>
      )}

      {/* Header card — di dalam CrossFade: sebelum data siap, totalBelumLunas=0
          membuat kartu "Semua Talangan Lunas" berkedip (pesan SALAH saat loading).
          Guard error && list kosong: load pertama tanpa cache yang GAGAL juga
          bikin totalBelumLunas=0 → tanpa guard, hero mengklaim "Semua Talangan
          Lunas" padahal data tak termuat (ErrorState tampil di bawah). */}
      {!(error && list.length === 0) && (
      <CrossFade
        loading={loading}
        skeleton={
          /* Skeleton BERBENTUK hero (eyebrow + mata + nominal + dua chip stat),
             seragam pola KasHadiran — bukan blok abu polos. Tinggi via HERO_MIN_H. */
          <div style={{ height: HERO_MIN_H }} className="rounded-3xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800/60 lift p-5">
            <div className="flex items-center justify-between">
              <div className="skeleton h-3 w-44 rounded-full" />
              <div className="skeleton h-9 w-9 rounded-full" />
            </div>
            <div className="skeleton mt-3 h-8 w-1/2 rounded-xl" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="skeleton h-[62px] rounded-xl" />
              <div className="skeleton h-[62px] rounded-xl" />
            </div>
          </div>
        }
      >
      {totalBelumLunas > 0 ? (
        /* rounded-3xl: ikut --hero-radius 24px, seragam keluarga hero (KasHadiran) */
        <div className="relative rounded-3xl overflow-hidden hero-emerald" style={{ boxShadow: 'var(--hero-shadow)', minHeight: HERO_MIN_H }}>
          <div className="hero-sheen pointer-events-none absolute inset-0" />

          <div className="relative p-5">
            <div className="flex items-center justify-between gap-2 mb-1">
              {/* Paritas keluarga hero (KasRT/LaporanTriwulan): label & ikon putih
                  ber-opacity — emerald-300 di atas gradien vibran kontrasnya lemah. */}
              <p className="inline-flex items-center gap-1 text-white text-micro font-bold uppercase tracking-widest">
                Total Talangan Belum Lunas
                <InfoTip label="Talangan" tone="onDark">
                  Dana talang yang ditanggung kas untuk anggota yang tidak hadir di tarikan. Harus dilunasi sebelum tarikan berikutnya.
                </InfoTip>
              </p>
              <button
                onClick={() => { haptic(); toggleHideAmount(); }}
                className="press w-11 h-11 flex items-center justify-center -mr-2 -mt-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
              >
                {hidden
                  ? <EyeOff className="w-4 h-4 text-white/80" />
                  : <Eye className="w-4 h-4 text-white/80" />}
              </button>
            </div>
            <FitAmount
              measure={`Rp ${totalBelumLunas.toLocaleString('id-ID')}`}
              maxPx={48}
              minPx={30}
              className="font-display text-white font-extrabold tracking-tighter tabular-nums mb-3"
            >
              {maskRp(`Rp ${animatedTotal.toLocaleString('id-ID')}`, hidden, 7)}
            </FitAmount>
            {/* Dua chip stat ala hero KasRT — struktur > caption polos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                  <p className="text-white/90 text-micro font-semibold uppercase tracking-wide">Belum Lunas</p>
                </div>
                <p className="text-sm font-bold text-white tabular-nums">{countBelum} talangan</p>
              </div>
              <div className="bg-black/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <p className="text-white/90 text-micro font-semibold uppercase tracking-wide">Sudah Lunas</p>
                </div>
                <p className="text-sm font-bold text-white tabular-nums">{countLunas} talangan</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-5 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-ink-sub dark:text-gray-300">Semua Talangan Lunas</p>
          <p className="text-xs text-ink-faint dark:text-gray-400">{countLunas} talangan tercatat</p>
        </div>
      )}
      </CrossFade>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama warga…"
          aria-label="Cari nama warga"
          inputMode="search"
          enterKeyHint="search"
          className="field-search pr-11"
        />
        {search && (
          <ClearButton onClick={() => setSearch('')} />
        )}
      </div>

      {/* Filter status (semua/belum/lunas) + sort */}
      <FilterChips
        options={[
          { id: 'semua', label: 'Semua' },
          { id: 'belum', label: 'Belum Lunas' },
          { id: 'lunas', label: 'Lunas' },
        ] as const}
        value={statusFilter}
        onChange={setStatusFilter}
        sort={{ label: talSortLabel, onCycle: () => setTalSort((s) => (s === 'tunggakan' ? 'nama' : 'tunggakan')) }}
      />

      <CrossFade loading={loading} skeleton={(
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden list-inset">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <div className="w-11 h-11 rounded-2xl skeleton shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 skeleton rounded-lg w-2/3" />
                <div className="h-3 skeleton rounded-lg w-1/2" />
              </div>
              <div className="h-5 w-20 skeleton rounded-md shrink-0" />
            </div>
          ))}
        </div>
      )}>
        {error ? (
        <ErrorState onRetry={() => load()} retrying={loading} />
        ) : (
        <>
          {/* Berganda warning */}
          {showBelum && berganda.length > 0 && (
            <div>
              <SectionTitle tone="warn" count={berganda.length}>
                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                Tunggakan Berganda
              </SectionTitle>
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden list-inset">
                {berganda.map(g => renderGroup(g))}
              </div>
            </div>
          )}

          {/* Single belum lunas */}
          {showBelum && single.length > 0 && (
            <div>
              <SectionTitle className="mt-6" count={single.length}>Daftar Talangan</SectionTitle>
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden list-inset">
                {single.map(g => renderGroup(g))}
              </div>
            </div>
          )}

          {/* Lunas */}
          {showLunas && lunas.length > 0 && (
            <div>
              <SectionTitle className="mt-6" tone="muted" count={lunas.length}>Sudah Lunas</SectionTitle>
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden list-inset">
                {lunas.map(g => renderGroup(g, true))}
              </div>
            </div>
          )}

          {visibleCount === 0 && (
            <EmptyState
              icon={search ? Search : CheckCircle2}
              title={search ? 'Data tidak ditemukan' : statusFilter !== 'semua' ? 'Tidak ada hasil' : 'Belum ada talangan'}
              subtitle={search
                ? 'Silakan periksa kembali kata kunci atau ejaan nama warga.'
                : statusFilter === 'lunas'
                  ? 'Belum ada talangan yang lunas.'
                  : statusFilter === 'belum'
                    ? 'Tidak ada talangan yang belum lunas.'
                    : 'Semua warga sudah memenuhi kehadiran.'}
              action={search || statusFilter !== 'semua'
                ? { label: 'Reset filter', icon: RotateCcw, onClick: () => { setSearch(''); setStatusFilter('semua'); } }
                : undefined}
            />
          )}
        </>
        )}
      </CrossFade>
    </div>
  );
}
