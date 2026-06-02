import { useEffect, useState } from 'react';
import {
  Plus, RefreshCw, Users, ChevronDown, ChevronUp,
  Search, UserCheck, UserX, ClipboardList,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatTanggal, formatRupiahPlain } from '../lib/utils';
import type { Tarikan, Talangan, Warga } from '../lib/types';

// ── Buat Tarikan Modal ─────────────────────────────────────────────────────────

interface BuatTarikanModalProps {
  wargaList: Warga[];
  nextNomor: number;
  currentSaldo: number;
  onSave: (data: {
    tanggal: string;
    jumlah_per_orang: number;
    absenIds: string[];
    nomor: number;
  }) => Promise<void>;
  onClose: () => void;
}

function BuatTarikanModal({ wargaList, nextNomor, currentSaldo, onSave, onClose }: BuatTarikanModalProps) {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [jumlahPerOrang, setJumlahPerOrang] = useState(50000);
  const [absenIds, setAbsenIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = wargaList.filter((w) =>
    w.nama.toLowerCase().includes(search.toLowerCase()) ||
    w.no_rumah.includes(search)
  );

  function toggleAbsen(id: string) {
    setAbsenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const jumlahHadir = wargaList.length - absenIds.size;
  const kasTotal = jumlahHadir * jumlahPerOrang;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({ tanggal, jumlah_per_orang: jumlahPerOrang, absenIds: Array.from(absenIds), nomor: nextNomor });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex-shrink-0 pt-3 pb-2 px-5">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Buat Tarikan #{nextNomor}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Tandai warga yang tidak hadir</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Kas terkumpul</p>
              <p className="text-sm font-bold text-emerald-600">{formatRupiahPlain(kasTotal)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Tanggal + Nominal */}
          <div className="flex-shrink-0 px-5 pb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Iuran/orang</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">Rp</span>
                <input
                  type="number"
                  value={jumlahPerOrang}
                  onChange={(e) => setJumlahPerOrang(Number(e.target.value))}
                  required
                  min={0}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                />
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex-shrink-0 mx-5 mb-3 flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 flex-1">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-gray-600">Hadir: <strong className="text-emerald-600">{jumlahHadir}</strong></span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1.5 flex-1">
              <UserX className="w-4 h-4 text-red-400" />
              <span className="text-xs text-gray-600">Absen: <strong className="text-red-500">{absenIds.size}</strong></span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex-1 text-right">
              <span className="text-xs text-gray-500">Total warga: <strong>{wargaList.length}</strong></span>
            </div>
          </div>

          {/* Search */}
          <div className="flex-shrink-0 px-5 mb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama warga..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
              />
            </div>
          </div>

          {/* Warga list */}
          <div className="flex-1 overflow-y-auto px-5 pb-2">
            <div className="space-y-1">
              {filtered.map((w) => {
                const isAbsen = absenIds.has(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleAbsen(w.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      isAbsen
                        ? 'bg-red-50 border-red-200'
                        : 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      isAbsen ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {w.nama.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isAbsen ? 'text-red-600' : 'text-gray-900'}`}>
                        {w.nama}
                      </p>
                      <p className="text-xs text-gray-400">No. {w.no_rumah}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isAbsen ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isAbsen ? 'Absen' : 'Hadir'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-5 pt-3 pb-6 border-t border-gray-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : `Simpan Tarikan #${nextNomor}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Absensi Detail (absent list per tarikan) ───────────────────────────────────

interface TarikanDetailProps {
  tarikanId: string;
}

function TarikanDetail({ tarikanId }: TarikanDetailProps) {
  const [list, setList] = useState<Talangan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('talangan')
      .select('*, warga(*)')
      .eq('tarikan_id', tarikanId)
      .then(({ data }) => {
        setList((data as Talangan[]) ?? []);
        setLoading(false);
      });
  }, [tarikanId]);

  if (loading) {
    return (
      <div className="px-4 pb-3 flex justify-center">
        <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="px-4 pb-3">
        <p className="text-xs text-gray-400 text-center py-2">Semua warga hadir</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-3 space-y-1.5">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {list.length} warga tidak hadir
      </p>
      {list.map((t) => (
        <div key={t.id} className="flex items-center gap-2.5 bg-red-50/70 rounded-xl p-2.5 border border-red-100">
          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-red-600">
            {t.warga?.nama?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{t.warga?.nama ?? '-'}</p>
            <p className="text-[10px] text-gray-400">No. {t.warga?.no_rumah}</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            t.status_lunas
              ? 'text-blue-600 bg-blue-50 border-blue-200'
              : 'text-amber-600 bg-amber-50 border-amber-200'
          }`}>
            {t.status_lunas ? 'Lunas' : 'Belum lunas'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AbsensiPage() {
  const { isBendahara } = useAuthContext();
  const [tarikanList, setTarikanList] = useState<Tarikan[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentSaldo, setCurrentSaldo] = useState(0);

  async function load() {
    setLoading(true);
    const [tarikanRes, wargaRes, transaksiRes] = await Promise.all([
      supabase.from('tarikan').select('*').order('nomor', { ascending: false }),
      supabase.from('warga').select('*').eq('status_aktif', true).order('nama', { ascending: true }),
      supabase.from('transaksi_kas').select('tipe, nominal'),
    ]);

    setTarikanList((tarikanRes.data as Tarikan[]) ?? []);
    setWargaList((wargaRes.data as Warga[]) ?? []);

    const tx = transaksiRes.data ?? [];
    const saldo =
      tx.filter((t) => t.tipe === 'kas_masuk').reduce((s: number, t: { nominal: number }) => s + t.nominal, 0) +
      tx.filter((t) => t.tipe === 'talangan_masuk').reduce((s: number, t: { nominal: number }) => s + t.nominal, 0) -
      tx.filter((t) => t.tipe === 'setor_kas_rt').reduce((s: number, t: { nominal: number }) => s + t.nominal, 0) -
      tx.filter((t) => t.tipe === 'kas_keluar').reduce((s: number, t: { nominal: number }) => s + t.nominal, 0);
    setCurrentSaldo(saldo);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const nextNomor = (tarikanList[0]?.nomor ?? 0) + 1;

  async function handleBuatTarikan(data: {
    tanggal: string;
    jumlah_per_orang: number;
    absenIds: string[];
    nomor: number;
  }) {
    const jumlahHadir = wargaList.length - data.absenIds.length;
    const kasMasuk = jumlahHadir * data.jumlah_per_orang;

    // 1. Insert tarikan
    const { data: tarikanData } = await supabase
      .from('tarikan')
      .insert({
        nomor: data.nomor,
        tanggal: data.tanggal,
        jumlah_per_orang: data.jumlah_per_orang,
        total_hadir: jumlahHadir,
        total_warga: wargaList.length,
      })
      .select()
      .single();

    if (!tarikanData) return;
    const tarikanId = tarikanData.id;

    // 2. Insert talangan for each absent warga
    if (data.absenIds.length > 0) {
      await supabase.from('talangan').insert(
        data.absenIds.map((warga_id) => ({
          warga_id,
          tarikan_id: tarikanId,
          nominal: data.jumlah_per_orang,
          status_lunas: false,
        }))
      );
    }

    // 3. Insert kas_masuk transaction
    await supabase.from('transaksi_kas').insert({
      tipe: 'kas_masuk',
      nominal: kasMasuk,
      keterangan: `Kas hadiran tarikan #${data.nomor} (${jumlahHadir} hadir)`,
      tanggal: data.tanggal,
      tarikan_id: tarikanId,
      warga_id: null,
      saldo_setelah: currentSaldo + kasMasuk,
    });

    setShowModal(false);
    load();
  }

  return (
    <>
      <div className="space-y-4 pb-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Absensi Tarikan</h1>
            <p className="text-xs text-gray-400 mt-0.5">{tarikanList.length} tarikan tercatat</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load()}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {isBendahara && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-emerald-600 active:scale-95 transition-all shadow-md shadow-emerald-200"
              >
                <Plus className="w-4 h-4" />
                Buat Tarikan
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin" />
          </div>
        ) : tarikanList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <ClipboardList className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-400">Belum ada tarikan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tarikanList.map((t) => {
              const isExpanded = expandedId === t.id;
              const absen = t.total_warga - t.total_hadir;
              const kasTerkumpul = t.total_hadir * t.jumlah_per_orang;

              return (
                <div key={t.id} className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white shadow-sm overflow-hidden">
                  {/* Card Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50/80 transition-colors"
                  >
                    {/* Nomor badge */}
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-200">
                      <span className="text-white text-sm font-black">#{t.nomor}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{formatTanggal(t.tanggal)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="w-3 h-3" />
                          {t.total_hadir}/{t.total_warga} hadir
                        </span>
                        {absen > 0 && (
                          <span className="text-xs text-red-500 font-medium">{absen} absen</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-600">{formatRupiahPlain(kasTerkumpul)}</p>
                      <p className="text-[10px] text-gray-400">{formatRupiahPlain(t.jumlah_per_orang)}/orang</p>
                    </div>

                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400 ml-1 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 ml-1 flex-shrink-0" />
                    }
                  </button>

                  {/* Expanded: absent detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-50">
                      <TarikanDetail tarikanId={t.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <BuatTarikanModal
          wargaList={wargaList}
          nextNomor={nextNomor}
          currentSaldo={currentSaldo}
          onSave={handleBuatTarikan}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
