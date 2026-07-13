import { useEffect, useState } from 'react';
import { FileText, Search, X, Check, Coins, HandCoins, Users, CalendarDays, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getPageCache, setPageCache } from '../lib/pageCache';
import { formatTanggal, formatRupiahPlain, haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import type { AbsensiStatus, Tarikan, Warga } from '../lib/types';

interface JadwalWargaCache {
  lastTarikan: Tarikan | null;
  wargaList: Warga[];
  allTarikan: Tarikan[];
  absensiMap: Record<string, AbsensiStatus>;
  talanganLunas: string[]; // Set tak bisa di-JSON-kan → simpan sebagai array
}
import Tag from '../components/Tag';
import FilterChips from '../components/FilterChips';
import StatRow from '../components/StatRow';
import ClearButton from '../components/ClearButton';
import InfoTip from '../components/InfoTip';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import SectionTitle from '../components/SectionTitle';

type SubTab = 'anggota' | 'jadwal';

export default function JadwalWargaPage() {
  // SWR: render dari snapshot terakhir, revalidate diam-diam (lihat lib/pageCache).
  const [cached] = useState(() => getPageCache<JadwalWargaCache>('jadwal-warga'));
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('anggota');
  const [lastTarikan, setLastTarikan] = useState<Tarikan | null>(cached?.lastTarikan ?? null);
  const [wargaList, setWargaList] = useState<Warga[]>(cached?.wargaList ?? []);
  const [allTarikan, setAllTarikan] = useState<Tarikan[]>(cached?.allTarikan ?? []);
  const [absensiMap, setAbsensiMap] = useState<Record<string, AbsensiStatus>>(cached?.absensiMap ?? {});
  const [talanganLunasSet, setTalanganLunasSet] = useState<Set<string>>(() => new Set(cached?.talanganLunas ?? []));
  const [search, setSearch] = useState('');
  const [wargaFilter, setWargaFilter] = useState<'semua' | 'hadir' | 'titip' | 'tidak'>('semua');

  async function load() {
    // Sudah ada data tampil → revalidate diam-diam: tanpa skeleton, gagal = toast.
    const silent = allTarikan.length > 0 || wargaList.length > 0;
    if (!silent) setLoading(true);
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

      const aMap: Record<string, AbsensiStatus> = {};
      let lunasIds: string[] = [];
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

        // Default semua tidak hadir
        warga.forEach(w => { aMap[w.id] = 'tidak_hadir'; });
        (absensiRes.data ?? []).forEach((a: { warga_id: string; status: string }) => {
          aMap[a.warga_id] = a.status as AbsensiStatus;
        });
        setAbsensiMap(aMap);

        lunasIds = (talanganRes.data ?? []).map((t: { warga_id: string }) => t.warga_id);
        setTalanganLunasSet(new Set(lunasIds));
      }

      setPageCache<JadwalWargaCache>('jadwal-warga', {
        lastTarikan: last,
        wargaList: warga,
        allTarikan: tarikanAll,
        absensiMap: aMap,
        talanganLunas: lunasIds,
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
      <div className="space-y-7 pb-2">
        {/* Hero */}
        <div className="skeleton h-44 rounded-3xl" />
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
        {/* List */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex items-center gap-3 p-3.5 [--di-l:3.875rem] [--di-r:0.875rem] ${i < 4 ? 'divide-inset' : ''}`}>
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
    <div className="space-y-7 pb-2">
      {/* Hero Card — material/warna disamakan dengan hero Beranda (.hero-card) */}
      {lastTarikan ? (
        <div className="hero-card hero-noise">
          <div className="relative p-5 space-y-3">
            <p className="inline-flex items-center gap-1 text-emerald-100 text-micro font-bold uppercase tracking-widest">
              Tarikan Terakhir
              <InfoTip label="Tarikan" tone="onDark">
                Satu putaran arisan. Tiap tarikan ada satu Sohibul Bait (penerima) yang menerima total iuran anggota.
              </InfoTip>
            </p>
            <div>
              <p className="text-white text-lg font-bold leading-tight">
                Tarikan ke-{lastTarikan.nomor} · {formatTanggal(lastTarikan.tanggal)}
              </p>
              <p className="text-emerald-100 text-sm mt-0.5">
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
                  className="h-full w-full origin-left bg-white rounded-full transition-transform duration-700 ease-out"
                  style={{ transform: `scaleX(${Math.min(pctHadir, 100) / 100})` }}
                />
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-micro font-semibold">
                <Check className="w-3 h-3" strokeWidth={2.5} /> {hadirCount} Hadir
              </span>
              {titipCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-micro font-semibold">
                  <HandCoins className="w-3 h-3" /> {titipCount} Titip
                </span>
              )}
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
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          <EmptyState
            icon={CalendarDays}
            title="Belum ada tarikan selesai"
            subtitle="Ringkasan kehadiran akan muncul di sini setelah tarikan pertama selesai."
          />
        </div>
      )}

      {/* Sub-tab switcher */}
      <div className="flex gap-2">
        {([
          ['anggota', 'Daftar Anggota', Users],
          ['jadwal', 'Jadwal Hadiran', CalendarDays],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => { if (subTab !== id) haptic(); setSubTab(id); }}
            aria-pressed={subTab === id}
            className={`press flex-1 min-h-[44px] py-2.5 rounded-xl text-sm font-semibold border transition ${
              subTab === id
                ? 'bg-brand text-white border-transparent' /* fill brand DATAR (MATERIAL-FLAT) — gradient+glow pra-flat dihapus */
                : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-control dark:border-gray-700'
            } inline-flex items-center justify-center gap-1.5`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Sub-tab: Daftar Anggota */}
      {subTab === 'anggota' && (
        <div className="space-y-3">
          {/* Stat bar — StatRow bersama (satu kartu berkolom, sama dgn Beranda/Jadwal) */}
          <StatRow
            items={[
              { label: 'Selesai', value: selesaiAnggotaCount, tone: 'pos' },
              { label: 'Hadir', value: hadirCount, tone: 'pos' },
              { label: 'Titip', value: titipCount, tone: 'info' },
              { label: 'Tidak', value: tidakHadirCount, tone: 'neg' },
            ]}
          />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama warga…"
              aria-label="Cari nama warga"
              inputMode="search"
              enterKeyHint="search"
              className="field-search pr-11"
            />
            {search && <ClearButton onClick={() => setSearch('')} />}
          </div>

          {/* Filter status — hanya relevan bila sudah ada tarikan terakhir */}
          {lastTarikan && (
            <FilterChips
              options={[
                { id: 'semua', label: 'Semua' },
                { id: 'hadir', label: 'Hadir' },
                { id: 'titip', label: 'Titip' },
                { id: 'tidak', label: 'Tidak' },
              ] as const}
              value={wargaFilter}
              onChange={setWargaFilter}
            />
          )}

          {/* Warga list */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
            {filteredWarga.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Tidak ditemukan"
                subtitle="Coba kata kunci lain."
                action={{ label: 'Reset filter', icon: RotateCcw, onClick: () => { setSearch(''); setWargaFilter('semua'); } }}
              />
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
                    className={`flex items-center gap-3 p-3.5 [--di-l:5.625rem] [--di-r:0.875rem] ${
                      idx < filteredWarga.length - 1 ? 'divide-inset' : ''
                    }`}
                  >
                    {/* No */}
                    <span className="text-micro text-ink-faint dark:text-gray-400 font-medium w-5 shrink-0 text-right">
                      {idx + 1}
                    </span>
                    {/* Avatar */}
                    <div className={`icon-tile w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${ava}`}>
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
          <SectionTitle
            action={
              <button
                onClick={cetakJadwal}
                disabled={allTarikan.length === 0}
                className="press flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-white dark:bg-gray-800 border border-control dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF Jadwal
              </button>
            }
          >
            Semua Tarikan
          </SectionTitle>

          {/* Stat cards — StatRow bersama (dialek "N kartu terpisah" yang tersisa di sini) */}
          <StatRow
            items={[
              { label: 'Selesai', value: selesaiCount },
              { label: 'Terjadwal', value: terjadwalCount, tone: 'pos' },
              { label: 'Total', value: allTarikan.length },
            ]}
          />

          {/* List */}
          {allTarikan.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Belum ada jadwal" subtitle="Jadwal tarikan akan muncul di sini." />
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
              {allTarikan.map((t, idx) => {
                const isSelesai = t.status === 'selesai';
                const isLast = idx === allTarikan.length - 1;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 px-5 py-4 [--di-l:4.5rem] ${!isLast ? 'divide-inset' : ''}`}
                  >
                    {/* Badge nomor */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-sm ${
                      isSelesai ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300' : 'bg-brand-500 text-white'
                    }`}>
                      {t.nomor}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelesai ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
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
                        ? 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-control dark:border-gray-700'
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
