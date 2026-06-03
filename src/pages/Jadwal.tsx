import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Calendar, CheckCircle2, RefreshCw,
  RotateCcw, Search, UserCheck, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatTanggal } from '../lib/utils';
import type { Tarikan, Warga } from '../lib/types';

type AbsensiMap = Record<string, 'hadir' | 'tidak_hadir'>;
type AbsensiFilter = 'semua' | 'hadir' | 'belum';

// ── Absensi View ────────────────────────────────────────────

interface AbsensiViewProps {
  tarikan: Tarikan;
  wargaList: Warga[];
  onBack: () => void;
  onSaved: () => void;
}

function AbsensiView({ tarikan, wargaList, onBack, onSaved }: AbsensiViewProps) {
  const [map, setMap] = useState<AbsensiMap>({});
  const [filter, setFilter] = useState<AbsensiFilter>('semua');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingAbsensi, setLoadingAbsensi] = useState(true);

  useEffect(() => {
    async function loadExisting() {
      if (tarikan.status === 'selesai') {
        const { data } = await supabase
          .from('absensi')
          .select('warga_id, status')
          .eq('tarikan_id', tarikan.id);
        const init: AbsensiMap = {};
        wargaList.forEach(w => { init[w.id] = 'tidak_hadir'; });
        (data ?? []).forEach((a: { warga_id: string; status: string }) => {
          init[a.warga_id] = a.status as 'hadir' | 'tidak_hadir';
        });
        setMap(init);
      } else {
        const init: AbsensiMap = {};
        wargaList.forEach(w => { init[w.id] = 'tidak_hadir'; });
        setMap(init);
      }
      setLoadingAbsensi(false);
    }
    loadExisting();
  }, [tarikan, wargaList]);

  const hadirCount = Object.values(map).filter(v => v === 'hadir').length;
  const tidakCount = wargaList.length - hadirCount;
  const kasTotal = hadirCount * 5000;
  const talanganTotal = tidakCount * 50000;

  function setAll(status: 'hadir' | 'tidak_hadir') {
    const next: AbsensiMap = {};
    wargaList.forEach(w => { next[w.id] = status; });
    setMap(next);
  }

  function toggle(id: string) {
    setMap(prev => ({ ...prev, [id]: prev[id] === 'hadir' ? 'tidak_hadir' : 'hadir' }));
  }

  const filtered = useMemo(() => {
    let list = wargaList;
    if (search) list = list.filter(w => w.nama.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'hadir')  list = list.filter(w => map[w.id] === 'hadir');
    if (filter === 'belum')  list = list.filter(w => map[w.id] === 'tidak_hadir');
    return list;
  }, [wargaList, search, filter, map]);

  async function simpan() {
    setSaving(true);
    const tarikanId = tarikan.id;
    const hadirIds  = wargaList.filter(w => map[w.id] === 'hadir').map(w => w.id);
    const tidakIds  = wargaList.filter(w => map[w.id] === 'tidak_hadir').map(w => w.id);

    // Simpan status lunas yang sudah ada sebelum menghapus (agar tidak ter-reset saat Hitung Ulang)
    const { data: existingLunas } = await supabase
      .from('talangan')
      .select('warga_id, tanggal_lunas')
      .eq('tarikan_id', tarikanId)
      .eq('status_lunas', true);
    const lunasMap = new Map<string, string | null>(
      (existingLunas ?? []).map(t => [t.warga_id, t.tanggal_lunas as string | null])
    );

    await supabase.from('absensi').delete().eq('tarikan_id', tarikanId);

    if (hadirIds.length)
      await supabase.from('absensi').insert(hadirIds.map(warga_id => ({ tarikan_id: tarikanId, warga_id, status: 'hadir' })));
    if (tidakIds.length)
      await supabase.from('absensi').insert(tidakIds.map(warga_id => ({ tarikan_id: tarikanId, warga_id, status: 'tidak_hadir' })));

    await supabase.from('talangan').delete().eq('tarikan_id', tarikanId);
    if (tidakIds.length)
      await supabase.from('talangan').insert(tidakIds.map(warga_id => ({
        tarikan_id: tarikanId,
        warga_id,
        nominal: 50000,
        status_lunas: lunasMap.has(warga_id),
        tanggal_lunas: lunasMap.get(warga_id) ?? null,
      })));

    await supabase.from('transaksi_kas').delete().eq('tarikan_id', tarikanId).eq('tipe', 'kas_masuk');
    if (hadirIds.length)
      await supabase.from('transaksi_kas').insert({
        tipe: 'kas_masuk',
        nominal: hadirIds.length * 5000,
        keterangan: `Kas hadiran tarikan #${tarikan.nomor} (${hadirIds.length} hadir × Rp5.000)`,
        tanggal: tarikan.tanggal,
        tarikan_id: tarikanId,
        saldo_setelah: 0,
      });

    await supabase.from('tarikan').update({
      status: 'selesai',
      total_hadir: hadirIds.length,
      total_terkumpul: hadirIds.length * 5000,
    }).eq('id', tarikanId);

    setSaving(false);
    onSaved();
  }

  if (loadingAbsensi) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      {/* Back header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <p className="text-base font-bold text-gray-900 dark:text-gray-100">
            Absensi Tarikan #{tarikan.nomor}
          </p>
          <p className="text-xs text-gray-400">{tarikan.sohibul_bait?.nama ?? '—'} · {formatTanggal(tarikan.tanggal)}</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Hadir', value: hadirCount, color: 'text-emerald-600' },
          { label: 'Tdk Hadir', value: tidakCount, color: 'text-red-500' },
          { label: 'Kas', value: `Rp${(kasTotal / 1000).toFixed(0)}k`, color: 'text-blue-600' },
          { label: 'Talangan', value: `Rp${(talanganTotal / 1000).toFixed(0)}k`, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-white dark:border-gray-700 shadow-sm p-2.5 text-center">
            <p className={`text-base font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Title + count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Daftar Hadir</p>
        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
          {wargaList.length}
        </span>
      </div>

      {/* Bulk actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setAll('hadir')}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Semua Hadir
        </button>
        <button
          onClick={() => setAll('hadir')}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Semua Titip
        </button>
        <button
          onClick={() => setAll('tidak_hadir')}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Filter tabs */}
      <div className="grid grid-cols-3 gap-1.5">
        {(['semua', 'hadir', 'belum'] as AbsensiFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filter === f
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700'
            }`}
          >
            {f === 'semua' ? 'Semua' : f === 'hadir' ? 'Sudah Hadir' : 'Belum Hadir'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Warga list */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-3xl border border-white dark:border-gray-700 shadow-sm overflow-hidden">
        {filtered.map((w, idx) => {
          const isHadir = map[w.id] === 'hadir';
          return (
            <button
              key={w.id}
              onClick={() => toggle(w.id)}
              className={`w-full flex items-center gap-3 p-3.5 text-left transition-colors ${
                idx < filtered.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''
              } ${isHadir ? 'hover:bg-emerald-50/50' : 'hover:bg-red-50/30'}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                isHadir ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-400'
              }`}>
                {w.nama.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{w.nama}</p>
                <p className={`text-xs ${isHadir ? 'text-emerald-600' : 'text-red-400'}`}>
                  {isHadir ? 'Hadir' : 'Tidak hadir → Talangan'}
                </p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isHadir ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {isHadir && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Sticky save button */}
      <div className="fixed bottom-16 left-0 right-0 px-4 z-30">
        <div className="max-w-lg mx-auto">
          <button
            onClick={simpan}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-200/50 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Menyimpan...' : 'Simpan & Hitung Iuran'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function JadwalPage() {
  const { isBendahara } = useAuthContext();
  const [tarikanList, setTarikanList] = useState<Tarikan[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTarikan, setSelectedTarikan] = useState<Tarikan | null>(null);

  async function load() {
    setLoading(true);
    const [tarRes, wargaRes] = await Promise.all([
      supabase
        .from('tarikan')
        .select('*, sohibul_bait:warga!sohibul_bait_id(*)')
        .order('nomor', { ascending: true }),
      supabase
        .from('warga')
        .select('*')
        .eq('status_aktif', true)
        .order('nama', { ascending: true }),
    ]);
    setTarikanList((tarRes.data as Tarikan[]) ?? []);
    setWargaList((wargaRes.data as Warga[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const selesaiCount    = tarikanList.filter(t => t.status === 'selesai').length;
  const dijadwalCount   = tarikanList.filter(t => t.status === 'dijadwalkan' || t.status === 'berlangsung').length;
  const nextDijadwal    = tarikanList.find(t => t.status === 'dijadwalkan');

  if (selectedTarikan) {
    return (
      <AbsensiView
        tarikan={selectedTarikan}
        wargaList={wargaList}
        onBack={() => setSelectedTarikan(null)}
        onSaved={() => { setSelectedTarikan(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-3 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Jadwal Tarikan</h1>
          <p className="text-xs text-gray-400 mt-0.5">{selesaiCount} selesai · {dijadwalCount} terjadwal</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 text-center">
          <p className="text-xl font-black text-gray-500">{selesaiCount}</p>
          <p className="text-[10px] text-gray-400 font-medium">Selesai</p>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 text-center">
          <p className="text-xl font-black text-emerald-600">{dijadwalCount}</p>
          <p className="text-[10px] text-gray-400 font-medium">Terjadwal</p>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 text-center">
          <p className="text-xl font-black text-gray-900 dark:text-gray-100">{tarikanList.length}</p>
          <p className="text-[10px] text-gray-400 font-medium">Total</p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin" />
        </div>
      ) : tarikanList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <Calendar className="w-10 h-10 text-gray-200" />
          <p className="text-sm text-gray-400">Belum ada jadwal</p>
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {tarikanList.map((t, idx) => {
            const isLast    = idx === tarikanList.length - 1;
            const isSelesai = t.status === 'selesai';
            const isNext    = t.id === nextDijadwal?.id;

            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 px-4 py-3 ${!isLast ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}
              >
                {/* Nomor badge */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 font-black text-base ${
                  isSelesai ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                }`}>
                  {t.nomor}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isSelesai ? 'text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                    {t.sohibul_bait?.nama ?? '—'}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{formatTanggal(t.tanggal)}</p>
                </div>

                {/* Action */}
                {isBendahara && isSelesai ? (
                  <button
                    onClick={() => setSelectedTarikan(t)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Hitung Ulang
                  </button>
                ) : isBendahara && isNext ? (
                  <button
                    onClick={() => setSelectedTarikan(t)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 active:scale-95 transition-all shrink-0 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Proses
                  </button>
                ) : (
                  <span className={`px-3 py-1.5 text-[10px] font-semibold rounded-full border shrink-0 ${
                    isSelesai
                      ? 'text-gray-400 border-gray-200 dark:border-gray-700'
                      : 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelesai ? 'Selesai' : 'Terjadwal'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
