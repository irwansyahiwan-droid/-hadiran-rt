import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatTanggal } from '../lib/utils';
import type { Tarikan } from '../lib/types';

type FilterStatus = 'dijadwalkan' | 'selesai' | 'semua';

const STATUS_STYLE: Record<string, string> = {
  dijadwalkan: 'text-emerald-700 bg-emerald-100 border-emerald-200',
  berlangsung: 'text-blue-700 bg-blue-100 border-blue-200',
  selesai:     'text-gray-500 bg-gray-100 border-gray-200',
};

const STATUS_LABEL: Record<string, string> = {
  dijadwalkan: 'Terjadwal',
  berlangsung: 'Berlangsung',
  selesai:     'Selesai',
};

export default function JadwalPage() {
  const { isBendahara } = useAuthContext();
  const [list, setList] = useState<Tarikan[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('dijadwalkan');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('tarikan')
      .select('*, sohibul_bait:warga!sohibul_bait_id(*)')
      .order('nomor', { ascending: true });
    setList((data as Tarikan[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const counts = {
    dijadwalkan: list.filter((t) => t.status === 'dijadwalkan' || t.status === 'berlangsung').length,
    selesai:     list.filter((t) => t.status === 'selesai').length,
    semua:       list.length,
  };

  const filtered = filter === 'semua'
    ? list
    : filter === 'dijadwalkan'
    ? list.filter((t) => t.status === 'dijadwalkan' || t.status === 'berlangsung')
    : list.filter((t) => t.status === 'selesai');

  async function tandaiSelesai(t: Tarikan) {
    setUpdating(t.id);
    await supabase.from('tarikan').update({ status: 'selesai' }).eq('id', t.id);
    setExpandedId(null);
    setUpdating(null);
    load();
  }

  async function aktifkanKembali(t: Tarikan) {
    setUpdating(t.id);
    await supabase.from('tarikan').update({ status: 'dijadwalkan' }).eq('id', t.id);
    setExpandedId(null);
    setUpdating(null);
    load();
  }

  const FILTERS: { id: FilterStatus; label: string }[] = [
    { id: 'dijadwalkan', label: 'Terjadwal' },
    { id: 'selesai',     label: 'Selesai' },
    { id: 'semua',       label: 'Semua' },
  ];

  return (
    <div className="space-y-4 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Jadwal Tarikan</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {counts.selesai} selesai · {counts.dijadwalkan} terjadwal
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/70 rounded-2xl border border-white shadow-sm p-3 text-center">
          <p className="text-xl font-black text-gray-500">{counts.selesai}</p>
          <p className="text-[10px] text-gray-400 font-medium">Selesai</p>
        </div>
        <div className="bg-white/70 rounded-2xl border border-white shadow-sm p-3 text-center">
          <p className="text-xl font-black text-emerald-600">{counts.dijadwalkan}</p>
          <p className="text-[10px] text-gray-400 font-medium">Terjadwal</p>
        </div>
        <div className="bg-white/70 rounded-2xl border border-white shadow-sm p-3 text-center">
          <p className="text-xl font-black text-gray-900">{counts.semua}</p>
          <p className="text-[10px] text-gray-400 font-medium">Total</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold border transition-all ${
              filter === f.id
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            {f.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              filter === f.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <Calendar className="w-10 h-10 text-gray-200" />
          <p className="text-sm text-gray-400">Tidak ada jadwal</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white shadow-sm overflow-hidden">
          {filtered.map((t, idx) => {
            const isExpanded = expandedId === t.id;
            const isLast = idx === filtered.length - 1;
            const isUpdating = updating === t.id;

            return (
              <div key={t.id} className={!isLast ? 'border-b border-gray-50' : ''}>
                <button
                  onClick={() => isBendahara && setExpandedId(isExpanded ? null : t.id)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                    isBendahara ? 'hover:bg-gray-50/80 active:bg-gray-100/80' : ''
                  }`}
                >
                  {/* Nomor badge */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm shadow-sm ${
                    t.status === 'selesai'
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-emerald-500 text-white shadow-emerald-200'
                  }`}>
                    {t.nomor}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${
                      t.status === 'selesai' ? 'text-gray-400' : 'text-gray-900'
                    }`}>
                      {t.sohibul_bait?.nama ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatTanggal(t.tanggal)}</p>
                  </div>

                  {/* Status + chevron */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full border ${STATUS_STYLE[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                    {isBendahara && (
                      isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                        : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Action row — bendahara only */}
                {isBendahara && isExpanded && (
                  <div className="flex items-center gap-2 px-4 pb-3">
                    {t.status !== 'selesai' ? (
                      <button
                        onClick={() => tandaiSelesai(t)}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 transition-colors disabled:opacity-60"
                      >
                        {isUpdating
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Tandai Selesai
                      </button>
                    ) : (
                      <button
                        onClick={() => aktifkanKembali(t)}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60"
                      >
                        {isUpdating
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Calendar className="w-3.5 h-3.5" />}
                        Aktifkan Kembali
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
