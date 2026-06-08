import { useEffect, useState } from 'react';
import { FileText, RefreshCw, Search, X, Check, Coins, Users, CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatTanggal, formatRupiahPlain, haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import type { Tarikan, Warga } from '../lib/types';

type SubTab = 'anggota' | 'jadwal';

export default function JadwalWargaPage() {
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('anggota');
  const [lastTarikan, setLastTarikan] = useState<Tarikan | null>(null);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [allTarikan, setAllTarikan] = useState<Tarikan[]>([]);
  const [absensiMap, setAbsensiMap] = useState<Record<string, 'hadir' | 'tidak_hadir'>>({});
  const [talanganLunasSet, setTalanganLunasSet] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
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

      const tarikanAll = (tarRes.data as Tarikan[]) ?? [];
      const warga = (wargaRes.data as Warga[]) ?? [];

      setAllTarikan(tarikanAll);
      setWargaList(warga);

      // Cari tarikan selesai terakhir
      const selesaiList = tarikanAll.filter(t => t.status === 'selesai');
      const last = selesaiList.length > 0 ? selesaiList[selesaiList.length - 1] : null;
      setLastTarikan(last);

      if (last) {
        const [absensiRes, talanganRes] = await Promise.all([
          supabase
            .from('absensi')
            .select('warga_id, status')
            .eq('tarikan_id', last.id),
          supabase
            .from('talangan')
            .select('warga_id')
            .eq('tarikan_id', last.id)
            .eq('status_lunas', true),
        ]);

        const aMap: Record<string, 'hadir' | 'tidak_hadir'> = {};
        // Default semua tidak hadir
        warga.forEach(w => { aMap[w.id] = 'tidak_hadir'; });
        (absensiRes.data ?? []).forEach((a: { warga_id: string; status: string }) => {
          aMap[a.warga_id] = a.status as 'hadir' | 'tidak_hadir';
        });
        setAbsensiMap(aMap);

        const lunasSet = new Set<string>(
          (talanganRes.data ?? []).map((t: { warga_id: string }) => t.warga_id)
        );
        setTalanganLunasSet(lunasSet);
      }

      setLoading(false);
    }
    load();
    import('../lib/generateJadwalPDF').catch(() => {}); // preload: jaga gesture share di HP
  }, []);

  async function cetakJadwal() {
    haptic();
    try {
      const { generateJadwalPDF } = await import('../lib/generateJadwalPDF');
      generateJadwalPDF(allTarikan);
    } catch {
      showToast('Gagal membuat PDF. Coba muat ulang aplikasi.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const hadirCount = lastTarikan
    ? Object.values(absensiMap).filter(v => v === 'hadir').length
    : 0;
  const tidakHadirCount = lastTarikan ? (lastTarikan.total_warga - hadirCount) : 0;
  const pctHadir = lastTarikan && lastTarikan.total_warga > 0
    ? Math.round((hadirCount / lastTarikan.total_warga) * 100)
    : 0;
  const iuranTerkumpul = lastTarikan?.total_terkumpul ?? 0;

  const selesaiCount = allTarikan.filter(t => t.status === 'selesai').length;
  const terjadwalCount = allTarikan.filter(t => t.status === 'dijadwalkan' || t.status === 'berlangsung').length;

  // Stat "Selesai" di sub-tab anggota = hadir + talanganLunas (sudah menyelesaikan kewajiban)
  const selesaiAnggotaCount = wargaList.filter(w => {
    const statusAbsensi = absensiMap[w.id];
    return statusAbsensi === 'hadir' || talanganLunasSet.has(w.id);
  }).length;

  const filteredWarga = search
    ? wargaList.filter(w => w.nama.toLowerCase().includes(search.toLowerCase()))
    : wargaList;

  return (
    <div className="space-y-6 pb-2">
      {/* Hero Card — material/warna disamakan dengan hero Beranda (.hero-card) */}
      {lastTarikan ? (
        <div className="hero-card hero-noise">
          <div className="relative p-5 space-y-3">
            <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest">
              Tarikan Terakhir
            </p>
            <div>
              <p className="text-white text-lg font-black leading-tight">
                Tarikan ke-{lastTarikan.nomor} · {formatTanggal(lastTarikan.tanggal)}
              </p>
              <p className="text-emerald-200 text-sm mt-0.5">
                Sohibul Bait: {lastTarikan.sohibul_bait?.nama ?? '—'}
              </p>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-emerald-100 mb-1">
                <span>Kehadiran</span>
                <span className="font-bold">{hadirCount}/{lastTarikan.total_warga} ({pctHadir}%)</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${pctHadir}%` }}
                />
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-[11px] font-semibold">
                <Check className="w-3 h-3" strokeWidth={2.5} /> {hadirCount} Hadir
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-[11px] font-semibold">
                <X className="w-3 h-3" strokeWidth={2.5} /> {tidakHadirCount} Tidak Hadir
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-[11px] font-semibold">
                <Coins className="w-3 h-3" /> {formatRupiahPlain(iuranTerkumpul)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-3xl border border-white dark:border-gray-700 shadow-sm p-6 text-center">
          <p className="text-sm text-gray-400">Belum ada tarikan selesai</p>
        </div>
      )}

      {/* Sub-tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab('anggota')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
            subTab === 'anggota'
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-control dark:border-gray-700'
          } inline-flex items-center justify-center gap-1.5`}
        >
          <Users className="w-4 h-4" /> Daftar Anggota
        </button>
        <button
          onClick={() => setSubTab('jadwal')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
            subTab === 'jadwal'
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-control dark:border-gray-700'
          } inline-flex items-center justify-center gap-1.5`}
        >
          <CalendarDays className="w-4 h-4" /> Jadwal Hadiran
        </button>
      </div>

      {/* Sub-tab: Daftar Anggota */}
      {subTab === 'anggota' && (
        <div className="space-y-3">
          {/* Stat bar */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Selesai', value: selesaiAnggotaCount, color: 'text-emerald-600' },
              { label: 'Hadir', value: hadirCount, color: 'text-blue-600' },
              { label: 'Tidak', value: tidakHadirCount, color: 'text-red-500' },
              { label: 'Total', value: wargaList.length, color: 'text-gray-700 dark:text-gray-300' },
            ].map(s => (
              <div key={s.label} className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-white dark:border-gray-700 shadow-sm p-2.5 text-center">
                <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama warga..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-control dark:border-gray-700 text-sm dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Warga list */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-3xl border border-white dark:border-gray-700 shadow-sm overflow-hidden">
            {filteredWarga.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Tidak ditemukan</p>
            ) : (
              filteredWarga.map((w, idx) => {
                const isHadir = absensiMap[w.id] === 'hadir';
                return (
                  <div
                    key={w.id}
                    className={`flex items-center gap-3 p-3.5 ${
                      idx < filteredWarga.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''
                    }`}
                  >
                    {/* No */}
                    <span className="text-[11px] text-gray-400 font-medium w-5 shrink-0 text-right">
                      {idx + 1}
                    </span>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                      isHadir ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/25 text-red-400 dark:text-red-400'
                    }`}>
                      {w.nama.charAt(0)}
                    </div>
                    {/* Nama */}
                    <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{w.nama}</p>
                    {/* Badge */}
                    {lastTarikan ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                        isHadir
                          ? 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                          : 'bg-red-50 dark:bg-red-900/25 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50'
                      }`}>
                        {isHadir ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <X className="w-3 h-3" strokeWidth={2.5} />}
                        {isHadir ? 'Hadir' : 'Tidak'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-gray-50 dark:bg-gray-800 text-gray-400 border-control dark:border-gray-700 shrink-0">
                        —
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Sub-tab: Jadwal Hadiran */}
      {subTab === 'jadwal' && (
        <div className="space-y-3">
          {/* Header with PDF button */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Semua Tarikan</p>
            <button
              onClick={cetakJadwal}
              disabled={allTarikan.length === 0}
              className="press flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-control dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF Jadwal
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-white dark:border-gray-700 shadow-sm p-3 text-center">
              <p className="text-xl font-black text-gray-500">{selesaiCount}</p>
              <p className="text-[10px] text-gray-400 font-medium">Selesai</p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-white dark:border-gray-700 shadow-sm p-3 text-center">
              <p className="text-xl font-black text-emerald-600">{terjadwalCount}</p>
              <p className="text-[10px] text-gray-400 font-medium">Terjadwal</p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-white dark:border-gray-700 shadow-sm p-3 text-center">
              <p className="text-xl font-black text-gray-900 dark:text-gray-100">{allTarikan.length}</p>
              <p className="text-[10px] text-gray-400 font-medium">Total</p>
            </div>
          </div>

          {/* List */}
          {allTarikan.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-sm text-gray-400">Belum ada jadwal</p>
            </div>
          ) : (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-3xl border border-white dark:border-gray-700 shadow-sm overflow-hidden">
              {allTarikan.map((t, idx) => {
                const isSelesai = t.status === 'selesai';
                const isLast = idx === allTarikan.length - 1;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 p-4 ${!isLast ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}
                  >
                    {/* Badge nomor */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm ${
                      isSelesai ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                    }`}>
                      {t.nomor}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelesai ? 'text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                        {t.sohibul_bait?.nama ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatTanggal(t.tanggal)}
                        {t.sohibul_bait && t.sohibul_bait.status_aktif === false && (
                          <span className="text-rose-500 dark:text-rose-400 font-semibold"> · Sohibul nonaktif</span>
                        )}
                      </p>
                    </div>

                    {/* Status */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full border shrink-0 ${
                      isSelesai
                        ? 'text-gray-400 bg-gray-50 dark:bg-gray-800 border-control dark:border-gray-700'
                        : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/25 border-emerald-200 dark:border-emerald-800/50'
                    }`}>
                      {isSelesai ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                      {isSelesai ? 'Selesai' : 'Terjadwal'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
