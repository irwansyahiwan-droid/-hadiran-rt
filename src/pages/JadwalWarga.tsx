import { useEffect, useState } from 'react';
import { FileText, Search, X, Check, Coins, Users, CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatTanggal, formatRupiahPlain, haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import type { AbsensiStatus, Tarikan, Warga } from '../lib/types';
import Tag from '../components/Tag';
import ClearButton from '../components/ClearButton';
import InfoTip from '../components/InfoTip';
import ErrorState from '../components/ErrorState';

type SubTab = 'anggota' | 'jadwal';

export default function JadwalWargaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('anggota');
  const [lastTarikan, setLastTarikan] = useState<Tarikan | null>(null);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [allTarikan, setAllTarikan] = useState<Tarikan[]>([]);
  const [absensiMap, setAbsensiMap] = useState<Record<string, AbsensiStatus>>({});
  const [talanganLunasSet, setTalanganLunasSet] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [wargaFilter, setWargaFilter] = useState<'semua' | 'hadir' | 'titip' | 'tidak'>('semua');

  async function load() {
    setLoading(true);
    setError(false);
    try {

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

        const aMap: Record<string, AbsensiStatus> = {};
        // Default semua tidak hadir
        warga.forEach(w => { aMap[w.id] = 'tidak_hadir'; });
        (absensiRes.data ?? []).forEach((a: { warga_id: string; status: string }) => {
          aMap[a.warga_id] = a.status as AbsensiStatus;
        });
        setAbsensiMap(aMap);

        const lunasSet = new Set<string>(
          (talanganRes.data ?? []).map((t: { warga_id: string }) => t.warga_id)
        );
        setTalanganLunasSet(lunasSet);
      }

    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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
      <div className="space-y-6 pb-2">
        {/* Hero */}
        <div className="skeleton h-44 rounded-3xl" />
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
        {/* List */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex items-center gap-3 p-3.5 ${i < 4 ? 'border-b border-line dark:border-gray-800' : ''}`}>
              <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-1/2 rounded-full" />
                <div className="skeleton h-2.5 w-1/3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-10">
        <ErrorState onRetry={() => load()} retrying={loading} />
      </div>
    );
  }

  const hadirCount = lastTarikan
    ? Object.values(absensiMap).filter(v => v === 'hadir').length
    : 0;
  const titipCount = lastTarikan
    ? Object.values(absensiMap).filter(v => v === 'titip').length
    : 0;
  const tidakHadirCount = lastTarikan
    ? Object.values(absensiMap).filter(v => v === 'tidak_hadir').length
    : 0;
  const pctHadir = lastTarikan && lastTarikan.total_warga > 0
    ? Math.round((hadirCount / lastTarikan.total_warga) * 100)
    : 0;
  const iuranTerkumpul = lastTarikan?.total_terkumpul ?? 0;

  const selesaiCount = allTarikan.filter(t => t.status === 'selesai').length;
  const terjadwalCount = allTarikan.filter(t => t.status === 'dijadwalkan' || t.status === 'berlangsung').length;

  // Stat "Selesai" di sub-tab anggota = hadir + titip + talanganLunas (sudah menyelesaikan kewajiban)
  const selesaiAnggotaCount = wargaList.filter(w => {
    const statusAbsensi = absensiMap[w.id];
    return statusAbsensi === 'hadir' || statusAbsensi === 'titip' || talanganLunasSet.has(w.id);
  }).length;

  const filteredWarga = wargaList.filter(w => {
    if (search && !w.nama.toLowerCase().includes(search.toLowerCase())) return false;
    if (wargaFilter === 'semua') return true;
    const st = absensiMap[w.id];
    if (wargaFilter === 'hadir') return st === 'hadir';
    if (wargaFilter === 'titip') return st === 'titip';
    return st === 'tidak_hadir'; // 'tidak'
  });

  return (
    <div className="space-y-6 pb-2">
      {/* Hero Card — material/warna disamakan dengan hero Beranda (.hero-card) */}
      {lastTarikan ? (
        <div className="hero-card hero-noise">
          <div className="relative p-5 space-y-3">
            <p className="inline-flex items-center gap-1 text-emerald-200 text-micro font-bold uppercase tracking-widest">
              Tarikan Terakhir
              <InfoTip label="Tarikan" tone="onDark">
                Satu putaran arisan. Tiap tarikan ada satu Sohibul Bait (penerima) yang menerima total iuran anggota.
              </InfoTip>
            </p>
            <div>
              <p className="text-white text-lg font-bold leading-tight">
                Tarikan ke-{lastTarikan.nomor} · {formatTanggal(lastTarikan.tanggal)}
              </p>
              <p className="text-emerald-200 text-sm mt-0.5">
                Sohibul Bait
                <InfoTip label="Sohibul Bait" tone="onDark" className="mx-1">
                  Anggota yang menerima seluruh hasil tarikan pada giliran ini (penerima arisan).
                </InfoTip>
                : {lastTarikan.sohibul_bait?.nama ?? '—'}
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
                  className="h-full bg-white rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${pctHadir}%` }}
                />
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-micro font-semibold">
                <Check className="w-3 h-3" strokeWidth={2.5} /> {hadirCount} Hadir
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-micro font-semibold">
                <X className="w-3 h-3" strokeWidth={2.5} /> {tidakHadirCount} Tidak Hadir
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-micro font-semibold">
                <Coins className="w-3 h-3" /> {formatRupiahPlain(iuranTerkumpul)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-6 text-center">
          <p className="text-sm text-ink-faint dark:text-gray-400">Belum ada tarikan selesai</p>
        </div>
      )}

      {/* Sub-tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab('anggota')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
            subTab === 'anggota'
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-control dark:border-gray-700'
          } inline-flex items-center justify-center gap-1.5`}
        >
          <Users className="w-4 h-4" /> Daftar Anggota
        </button>
        <button
          onClick={() => setSubTab('jadwal')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
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
              { label: 'Selesai', value: selesaiAnggotaCount, color: 'text-emerald-700 dark:text-emerald-400' },
              { label: 'Hadir', value: hadirCount, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Titip', value: titipCount, color: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'Tidak', value: tidakHadirCount, color: 'text-rose-600 dark:text-rose-400' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-2.5 text-center">
                <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                <p className="text-micro text-ink-faint dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama warga…"
              className="field-search pr-11"
            />
            {search && <ClearButton onClick={() => setSearch('')} />}
          </div>

          {/* Filter status — hanya relevan bila sudah ada tarikan terakhir */}
          {lastTarikan && (
            <div className="grid grid-cols-4 gap-1.5">
              {([
                ['semua', 'Semua'], ['hadir', 'Hadir'], ['titip', 'Titip'], ['tidak', 'Tidak'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setWargaFilter(id)}
                  aria-pressed={wargaFilter === id}
                  className={`py-1.5 rounded-xl text-xs font-semibold border transition ${
                    wargaFilter === id
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-control dark:border-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Warga list */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
            {filteredWarga.length === 0 ? (
              <p className="text-sm text-ink-faint dark:text-gray-400 text-center py-8">Tidak ditemukan</p>
            ) : (
              filteredWarga.map((w, idx) => {
                const st = absensiMap[w.id];
                const ava =
                  st === 'hadir' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : st === 'titip' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-rose-50 dark:bg-rose-900/25 text-rose-600 dark:text-rose-400';
                return (
                  <div
                    key={w.id}
                    className={`flex items-center gap-3 p-3.5 ${
                      idx < filteredWarga.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''
                    }`}
                  >
                    {/* No */}
                    <span className="text-micro text-ink-faint dark:text-gray-400 font-medium w-5 shrink-0 text-right">
                      {idx + 1}
                    </span>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${ava}`}>
                      {w.nama.charAt(0)}
                    </div>
                    {/* Nama */}
                    <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{w.nama}</p>
                    {/* Badge — hadir / titip (iuran masuk) / tidak hadir */}
                    {!lastTarikan ? (
                      <Tag tone="neutral" className="shrink-0">—</Tag>
                    ) : st === 'hadir' ? (
                      <Tag tone="success" className="shrink-0"><Check className="w-3 h-3" strokeWidth={2.5} />Hadir</Tag>
                    ) : st === 'titip' ? (
                      <Tag tone="info" className="shrink-0"><Coins className="w-3 h-3" />Titip</Tag>
                    ) : (
                      <Tag tone="danger" className="shrink-0"><X className="w-3 h-3" strokeWidth={2.5} />Tidak</Tag>
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-3 text-center">
              <p className="text-xl font-bold text-gray-500">{selesaiCount}</p>
              <p className="text-micro text-ink-faint dark:text-gray-400 font-medium">Selesai</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-3 text-center">
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{terjadwalCount}</p>
              <p className="text-micro text-ink-faint dark:text-gray-400 font-medium">Terjadwal</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-3 text-center">
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{allTarikan.length}</p>
              <p className="text-micro text-ink-faint dark:text-gray-400 font-medium">Total</p>
            </div>
          </div>

          {/* List */}
          {allTarikan.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-sm text-ink-faint dark:text-gray-400">Belum ada jadwal</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
              {allTarikan.map((t, idx) => {
                const isSelesai = t.status === 'selesai';
                const isLast = idx === allTarikan.length - 1;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 p-4 ${!isLast ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}
                  >
                    {/* Badge nomor */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-sm ${
                      isSelesai ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                    }`}>
                      {t.nomor}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelesai ? 'text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                        {t.sohibul_bait?.nama ?? '—'}
                      </p>
                      <p className="text-xs text-ink-faint dark:text-gray-400 mt-0.5">
                        {formatTanggal(t.tanggal)}
                        {t.sohibul_bait && t.sohibul_bait.status_aktif === false && (
                          <span className="text-rose-500 dark:text-rose-400 font-semibold"> · Sohibul nonaktif</span>
                        )}
                      </p>
                    </div>

                    {/* Status */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-micro font-semibold rounded-full border shrink-0 ${
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
