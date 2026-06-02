import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2, ArrowLeftRight, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatTanggalShort, formatRupiahPlain } from '../lib/utils';
import type { Talangan } from '../lib/types';

type Filter = 'belum_lunas' | 'lunas' | 'semua';

function getSaldo(tx: { tipe: string; nominal: number }[]) {
  return (
    tx.filter((t) => t.tipe === 'kas_masuk').reduce((s, t) => s + t.nominal, 0) +
    tx.filter((t) => t.tipe === 'talangan_masuk').reduce((s, t) => s + t.nominal, 0) -
    tx.filter((t) => t.tipe === 'setor_kas_rt').reduce((s, t) => s + t.nominal, 0) -
    tx.filter((t) => t.tipe === 'kas_keluar').reduce((s, t) => s + t.nominal, 0)
  );
}

export default function TalanganPage() {
  const { isBendahara } = useAuthContext();
  const [list, setList] = useState<Talangan[]>([]);
  const [filter, setFilter] = useState<Filter>('belum_lunas');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentSaldo, setCurrentSaldo] = useState(0);

  async function load() {
    setLoading(true);
    const [talanganRes, transaksiRes] = await Promise.all([
      supabase
        .from('talangan')
        .select('*, warga(*), tarikan(*)')
        .order('created_at', { ascending: false }),
      supabase.from('transaksi_kas').select('tipe, nominal'),
    ]);
    setList((talanganRes.data as Talangan[]) ?? []);
    setCurrentSaldo(getSaldo(transaksiRes.data ?? []));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function tandaiLunas(t: Talangan) {
    setProcessingId(t.id);
    const today = new Date().toISOString().split('T')[0];

    await supabase
      .from('talangan')
      .update({ status_lunas: true, tanggal_lunas: today })
      .eq('id', t.id);

    await supabase.from('transaksi_kas').insert({
      tipe: 'talangan_masuk',
      nominal: t.nominal,
      keterangan: `Pelunasan talangan — ${t.warga?.nama ?? ''} (Tarikan #${t.tarikan?.nomor ?? ''})`,
      tanggal: today,
      warga_id: t.warga_id,
      tarikan_id: t.tarikan_id,
      saldo_setelah: currentSaldo + t.nominal,
    });

    setProcessingId(null);
    load();
  }

  const totalBelumLunas = list
    .filter((t) => !t.status_lunas)
    .reduce((s, t) => s + t.nominal, 0);

  const counts = {
    belum_lunas: list.filter((t) => !t.status_lunas).length,
    lunas: list.filter((t) => t.status_lunas).length,
    semua: list.length,
  };

  const baseFiltered = filter === 'semua'
    ? list
    : filter === 'lunas'
    ? list.filter((t) => t.status_lunas)
    : list.filter((t) => !t.status_lunas);

  const filtered = search.trim()
    ? baseFiltered.filter((t) =>
        t.warga?.nama?.toLowerCase().includes(search.toLowerCase()) ||
        t.warga?.no_rumah?.includes(search)
      )
    : baseFiltered;

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'belum_lunas', label: 'Belum Lunas' },
    { id: 'lunas', label: 'Lunas' },
    { id: 'semua', label: 'Semua' },
  ];

  return (
    <div className="space-y-4 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Talangan</h1>
          <p className="text-xs text-gray-400 mt-0.5">{counts.belum_lunas} tunggakan aktif</p>
        </div>
        <button
          onClick={() => load()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Card */}
      {totalBelumLunas > 0 && (
        <div className="relative rounded-3xl overflow-hidden shadow-lg"
          style={{ background: 'linear-gradient(135deg, #92400e 0%, #d97706 60%, #fbbf24 100%)' }}>
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full" />
          <div className="relative p-5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-200" />
              <p className="text-amber-100 text-xs font-semibold tracking-wide uppercase">Total Tunggakan</p>
            </div>
            <p className="text-white text-3xl font-black tracking-tight mb-1">
              -{formatRupiahPlain(totalBelumLunas)}
            </p>
            <p className="text-amber-200 text-xs">
              dari {counts.belum_lunas} catatan belum lunas
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold border transition-all ${
              filter === f.id
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama warga..."
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition shadow-sm"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <ArrowLeftRight className="w-10 h-10 text-gray-200" />
          <p className="text-sm text-gray-400">
            {search ? 'Warga tidak ditemukan' : 'Tidak ada talangan'}
          </p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white shadow-sm overflow-hidden">
          {filtered.map((t, idx) => {
            const isLast = idx === filtered.length - 1;
            const isProcessing = processingId === t.id;

            return (
              <div
                key={t.id}
                className={`p-4 ${!isLast ? 'border-b border-gray-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    t.status_lunas
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {t.warga?.nama?.charAt(0) ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {t.warga?.nama ?? '-'}
                      </p>
                      <span className={`text-xs font-bold flex-shrink-0 ${
                        t.status_lunas ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        {formatRupiahPlain(t.nominal)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">
                        No. {t.warga?.no_rumah} · Tarikan #{t.tarikan?.nomor ?? '-'}
                      </p>
                      {t.tarikan?.tanggal && (
                        <span className="text-xs text-gray-300">·</span>
                      )}
                      {t.tarikan?.tanggal && (
                        <p className="text-xs text-gray-400">{formatTanggalShort(t.tarikan.tanggal)}</p>
                      )}
                    </div>

                    {/* Status row */}
                    <div className="flex items-center justify-between mt-2">
                      {t.status_lunas ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs text-blue-600 font-medium">
                            Lunas {t.tanggal_lunas ? formatTanggalShort(t.tanggal_lunas) : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                          Belum lunas
                        </span>
                      )}

                      {/* Tandai Lunas button */}
                      {isBendahara && !t.status_lunas && (
                        <button
                          onClick={() => tandaiLunas(t)}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-60 shadow-sm shadow-emerald-200"
                        >
                          {isProcessing ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Tandai Lunas
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
