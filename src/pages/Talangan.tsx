import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Search, X } from 'lucide-react';
import { useCountUp } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatTanggalShort, formatRupiahPlain } from '../lib/utils';
import AvatarPeci from '../components/AvatarPeci';
import type { Talangan } from '../lib/types';

interface WargaGroup {
  warga_id: string;
  nama: string;
  entries: Talangan[];
  totalBelum: number;
  countBelum: number;
}

export default function TalanganPage() {
  const { isBendahara } = useAuthContext();
  const [list, setList] = useState<Talangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    } finally {
      setProcessingId(null);
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

  const berganda = filtered.filter(g => g.countBelum > 1);
  const single   = filtered.filter(g => g.countBelum === 1);
  const lunas    = filtered.filter(g => g.countBelum === 0 && g.entries.some(e => e.status_lunas));

  const totalBelumLunas = list.filter(t => !t.status_lunas).reduce((s, t) => s + t.nominal, 0);
  const countBelum = list.filter(t => !t.status_lunas).length;
  const countLunas = list.filter(t => t.status_lunas).length;
  const animatedTotal = useCountUp(totalBelumLunas);

  function renderGroup(g: WargaGroup, showAll = false) {
    const isExpanded = expandedId === g.warga_id;
    const belumEntries = g.entries.filter(e => !e.status_lunas).sort((a, b) => (a.tarikan?.nomor ?? 0) - (b.tarikan?.nomor ?? 0));
    const lunasEntries = g.entries.filter(e => e.status_lunas).sort((a, b) => (a.tarikan?.nomor ?? 0) - (b.tarikan?.nomor ?? 0));

    return (
      <div key={g.warga_id}>
        {/* Group header */}
        <button
          onClick={() => setExpandedId(isExpanded ? null : g.warga_id)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-50 transition-colors text-left cursor-pointer"
        >
          <AvatarPeci nama={g.nama} className="w-9 h-9 rounded-xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[15px] font-semibold text-[#111111] truncate flex-1">{g.nama}</p>
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

        {/* Detail entries */}
        {isExpanded && (
          <div className="border-t border-[#F0F0F0] divide-y divide-[#F0F0F0]">
            {(showAll ? [...belumEntries, ...lunasEntries] : belumEntries).map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0 text-xs font-bold text-gray-500">
                  #{t.tarikan?.nomor}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100 truncate">{g.nama}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Tarikan #{t.tarikan?.nomor} · {t.tarikan?.tanggal ? formatTanggalShort(t.tarikan.tanggal) : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{formatRupiahPlain(t.nominal)}</span>
                  {t.status_lunas ? (
                    <span className="px-[8px] py-[2px] text-[10px] font-medium rounded-[6px]" style={{ background: 'rgba(52,199,89,0.12)', color: '#166534' }}>
                      LUNAS
                    </span>
                  ) : (
                    <span className="px-[8px] py-[2px] text-[10px] font-medium rounded-[6px]" style={{ background: 'rgba(255,59,48,0.10)', color: '#9F1239' }}>
                      BELUM
                    </span>
                  )}
                </div>
                {isBendahara && !t.status_lunas && (
                  <button
                    onClick={() => bayar(t)}
                    disabled={processingId === t.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-70 shrink-0"
                  >
                    {processingId === t.id ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Memproses...
                      </>
                    ) : 'Bayar'}
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
      {/* Header card */}
      {totalBelumLunas > 0 ? (
        <div className="relative rounded-2xl overflow-hidden shadow-sm bg-gradient-to-b from-[#0A5C4A] via-[#0D6B5E] to-[#1DB88A]">

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
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Berganda warning */}
          {berganda.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                  Warga dengan Tunggakan Berganda
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-[#F0F0F0]">
                {berganda.map(g => renderGroup(g))}
              </div>
            </div>
          )}

          {/* Single belum lunas */}
          {single.length > 0 && (
            <div>
              <p className="text-base font-extrabold text-[#111111] mt-6 mb-3">Daftar Talangan</p>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-[#F0F0F0]">
                {single.map(g => renderGroup(g))}
              </div>
            </div>
          )}

          {/* Lunas */}
          {lunas.length > 0 && (
            <div>
              <p className="text-base font-extrabold text-[#555555] mt-6 mb-3">Sudah Lunas</p>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-[#F0F0F0] opacity-60">
                {lunas.map(g => renderGroup(g, true))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              {search ? 'Tidak ditemukan' : 'Belum ada talangan'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
