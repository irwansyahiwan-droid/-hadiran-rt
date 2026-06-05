import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw, Search, Trash2, X, ArrowDownUp, MessageCircle } from 'lucide-react';
import { useCountUp } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatTanggalShort, formatRupiahPlain, haptic } from '../lib/utils';
import { openWa, pesanTalangan } from '../lib/waReminder';
import AvatarPeci from '../components/AvatarPeci';
import EmptyState from '../components/EmptyState';
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

export default function TalanganPage({ onBack }: { onBack?: () => void }) {
  const { isBendahara } = useAuthContext();
  const [list, setList] = useState<Talangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'semua' | 'belum' | 'lunas'>('semua');
  const [talSort, setTalSort] = useState<'tunggakan' | 'nama'>('tunggakan');

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('talangan')
      .select('*, warga(*), tarikan(*)')
      .order('created_at', { ascending: true });
    setList((data as Talangan[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function bayar(t: Talangan) {
    setProcessingId(t.id);
    setConfirmId(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('talangan')
        .update({ status_lunas: true, tanggal_lunas: today })
        .eq('id', t.id);
      await supabase.from('transaksi_kas').insert({
        tipe: 'talangan_masuk',
        nominal: t.nominal,
        keterangan: `Talangan lunas — ${t.warga?.nama ?? ''} (Tarikan #${t.tarikan?.nomor ?? ''})`,
        tanggal: today,
        warga_id: t.warga_id,
        tarikan_id: t.tarikan_id,
        saldo_setelah: 0,
      });
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
      await supabase
        .from('talangan')
        .update({ status_lunas: false, tanggal_lunas: null })
        .eq('id', t.id);
      await supabase
        .from('transaksi_kas')
        .delete()
        .eq('tipe', 'talangan_masuk')
        .eq('warga_id', t.warga_id)
        .eq('tarikan_id', t.tarikan_id);
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
            className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 active:bg-gray-50 dark:active:bg-gray-800/60 transition-colors text-left cursor-pointer"
          >
            <AvatarPeci nama={g.nama} className="w-9 h-9 rounded-xl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[15px] font-semibold text-[#111111] dark:text-gray-100 truncate flex-1">{g.nama}</p>
                {g.countBelum > 0 && (
                  <span className="text-[11px] text-amber-700 font-medium shrink-0">
                    {g.countBelum}× @ Rp50.000
                  </span>
                )}
              </div>
              {g.countBelum > 0 && (
                <p className="text-xs text-amber-600 mt-0.5">
                  {g.countBelum} belum lunas · total {formatRupiahPlain(g.totalBelum)}
                </p>
              )}
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
          <div className="border-t border-[#F0F0F0] divide-y divide-[#F0F0F0] dark:divide-gray-800">
            {(showAll ? [...belumEntries, ...lunasEntries] : belumEntries).map(t => (
              <div key={t.id} className="flex items-center gap-2 px-4 py-3">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0 text-xs font-bold text-gray-500">
                  #{t.tarikan?.nomor}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 truncate">Tarikan #{t.tarikan?.nomor}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {t.tarikan?.tanggal ? formatTanggalShort(t.tarikan.tanggal) : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatRupiahPlain(t.nominal)}</span>
                  {t.status_lunas && (
                    <span className="px-[8px] py-[2px] text-[10px] font-medium rounded-[6px] whitespace-nowrap" style={{ background: 'rgba(52,199,89,0.12)', color: '#166534' }}>
                      LUNAS
                    </span>
                  )}
                </div>
                {isBendahara && !t.status_lunas && (
                  <button
                    onClick={() => handleBayarClick(t)}
                    disabled={processingId === t.id}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-semibold active:scale-[0.97] active:opacity-90 transition-all duration-150 disabled:opacity-70 shrink-0 whitespace-nowrap ${
                      confirmId === t.id ? 'bg-rose-600' : 'bg-[#0F6039]'
                    }`}
                  >
                    {processingId === t.id ? (
                      <><RefreshCw className="w-3 h-3 animate-spin" />Memproses...</>
                    ) : confirmId === t.id ? 'Yakin?' : 'Bayar'}
                  </button>
                )}
                {isBendahara && t.status_lunas && (
                  <button
                    onClick={() => handleBatalClick(t)}
                    disabled={processingId === t.id}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold active:scale-[0.97] active:opacity-90 transition-all duration-150 disabled:opacity-70 shrink-0 whitespace-nowrap ${
                      cancelConfirmId === t.id
                        ? 'bg-rose-600 text-white'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {processingId === t.id ? (
                      <><RefreshCw className="w-3 h-3 animate-spin" />Memproses...</>
                    ) : cancelConfirmId === t.id ? 'Yakin batal?' : 'Batalkan'}
                  </button>
                )}
                {isBendahara && (
                  <button
                    onClick={() => handleHapusClick(t)}
                    disabled={processingId === t.id}
                    title="Hapus data talangan"
                    aria-label="Hapus data talangan"
                    className={`inline-flex items-center justify-center gap-1 h-7 px-2 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-70 shrink-0 ${
                      deleteConfirmId === t.id
                        ? 'bg-red-600 text-white'
                        : 'text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
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
    <div className="space-y-4 pb-2 page-enter">
      {/* Back header — hanya muncul saat dibuka dari Beranda (mode warga) */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 -ml-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 active:opacity-70 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali
        </button>
      )}

      {/* Header card */}
      {totalBelumLunas > 0 ? (
        <div className="relative rounded-2xl overflow-hidden shadow-sm bg-gradient-to-br from-[#0F4C2E] via-[#145D39] to-[#1B7249]">

          <div className="relative p-5">
            <p className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest mb-1">
              Total Talangan Belum Lunas
            </p>
            <p className="text-white text-5xl font-black tracking-tighter mb-1">
              Rp {animatedTotal.toLocaleString('id-ID')}
            </p>
            <p className="text-emerald-300 text-xs">
              {countBelum} belum lunas · {countLunas} sudah lunas
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-3xl border border-white dark:border-gray-700 shadow-sm p-5 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Semua Talangan Lunas</p>
          <p className="text-xs text-gray-400">{countLunas} talangan tercatat</p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama warga..."
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-green-600/10 focus:border-green-600 transition-all duration-200"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Filter status (semua/belum/lunas) + sort */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          {([
            { id: 'semua', label: 'Semua' },
            { id: 'belum', label: 'Belum Lunas' },
            { id: 'lunas', label: 'Lunas' },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`press px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === f.id
                  ? 'bg-[#0F4C2E] text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setTalSort((s) => (s === 'tunggakan' ? 'nama' : 'tunggakan'))}
          className="press ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
          aria-label={`Urutkan: ${talSortLabel}`}
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          {talSortLabel}
        </button>
      </div>

      <CrossFade loading={loading} skeleton={(
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/60 lift overflow-hidden divide-y divide-[#F0F0F0] dark:divide-gray-800">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl skeleton shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 skeleton rounded-lg w-2/3" />
                <div className="h-3 skeleton rounded-lg w-1/2" />
              </div>
              <div className="h-5 w-20 skeleton rounded-[6px] shrink-0" />
            </div>
          ))}
        </div>
      )}>
        <>
          {/* Berganda warning */}
          {showBelum && berganda.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                  Warga dengan Tunggakan Berganda
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/60 lift overflow-hidden divide-y divide-[#F0F0F0] dark:divide-gray-800">
                {berganda.map(g => renderGroup(g))}
              </div>
            </div>
          )}

          {/* Single belum lunas */}
          {showBelum && single.length > 0 && (
            <div>
              <p className="text-base font-extrabold text-[#111111] dark:text-gray-100 mt-6 mb-3">Daftar Talangan</p>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/60 lift overflow-hidden divide-y divide-[#F0F0F0] dark:divide-gray-800">
                {single.map(g => renderGroup(g))}
              </div>
            </div>
          )}

          {/* Lunas */}
          {showLunas && lunas.length > 0 && (
            <div>
              <p className="text-base font-extrabold text-[#555555] dark:text-gray-400 mt-6 mb-3">Sudah Lunas</p>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/60 lift overflow-hidden divide-y divide-[#F0F0F0] dark:divide-gray-800 opacity-60">
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
            />
          )}
        </>
      </CrossFade>
    </div>
  );
}
