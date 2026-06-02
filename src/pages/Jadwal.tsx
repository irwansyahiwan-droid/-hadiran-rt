import { useEffect, useState } from 'react';
import { Plus, Calendar, CheckCircle2, XCircle, RotateCcw, Pencil, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatTanggal, formatRupiahPlain } from '../lib/utils';
import type { Jadwal, Warga } from '../lib/types';

type FilterStatus = 'semua' | 'terjadwal' | 'selesai' | 'dibatalkan';

const STATUS_LABEL: Record<string, string> = {
  terjadwal: 'Terjadwal',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

const STATUS_STYLE: Record<string, string> = {
  terjadwal: 'text-emerald-700 bg-emerald-100 border-emerald-200',
  selesai: 'text-blue-700 bg-blue-100 border-blue-200',
  dibatalkan: 'text-gray-500 bg-gray-100 border-gray-200',
};

// ── Modal ──────────────────────────────────────────────────────────────────────

interface ModalProps {
  jadwal: Partial<Jadwal> | null;
  wargaList: Warga[];
  onSave: (data: Partial<Jadwal>) => Promise<void>;
  onClose: () => void;
}

function JadwalModal({ jadwal, wargaList, onSave, onClose }: ModalProps) {
  const [form, setForm] = useState({
    warga_id: jadwal?.warga_id ?? '',
    tanggal: jadwal?.tanggal ?? '',
    nominal: jadwal?.nominal ?? 50000,
    keterangan: jadwal?.keterangan ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl p-5 pb-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <h3 className="text-base font-bold text-gray-900">
          {jadwal?.id ? 'Edit Jadwal' : 'Tambah Jadwal'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Warga */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sohibul Bait</label>
            <div className="relative">
              <select
                value={form.warga_id}
                onChange={(e) => setForm({ ...form, warga_id: e.target.value })}
                required
                className="w-full px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              >
                <option value="">Pilih warga...</option>
                {wargaList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nama} — No. {w.no_rumah}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tanggal</label>
            <input
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              required
              className="w-full px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
            />
          </div>

          {/* Nominal */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nominal</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">Rp</span>
              <input
                type="number"
                value={form.nominal}
                onChange={(e) => setForm({ ...form, nominal: Number(e.target.value) })}
                required
                min={0}
                className="w-full pl-9 pr-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Keterangan</label>
            <input
              type="text"
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder="Opsional"
              className="w-full px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
            />
          </div>

          <div className="flex gap-3 pt-1">
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
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function JadwalPage() {
  const { isBendahara } = useAuthContext();
  const [list, setList] = useState<Jadwal[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('terjadwal');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalData, setModalData] = useState<Partial<Jadwal> | null>(null);

  async function load() {
    setLoading(true);
    const [jadwalRes, wargaRes] = await Promise.all([
      supabase
        .from('jadwal')
        .select('*, warga(*)')
        .order('tanggal', { ascending: true }),
      supabase
        .from('warga')
        .select('*')
        .eq('status_aktif', true)
        .order('nama', { ascending: true }),
    ]);
    setList((jadwalRes.data as Jadwal[]) ?? []);
    setWargaList((wargaRes.data as Warga[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = filter === 'semua' ? list : list.filter((j) => j.status === filter);

  const counts = {
    semua: list.length,
    terjadwal: list.filter((j) => j.status === 'terjadwal').length,
    selesai: list.filter((j) => j.status === 'selesai').length,
    dibatalkan: list.filter((j) => j.status === 'dibatalkan').length,
  };

  async function handleSave(data: Partial<Jadwal>) {
    if (modalData?.id) {
      await supabase.from('jadwal').update(data).eq('id', modalData.id);
    } else {
      await supabase.from('jadwal').insert({ ...data, status: 'terjadwal' });
    }
    setModalData(null);
    load();
  }

  async function updateStatus(id: string, status: Jadwal['status']) {
    await supabase.from('jadwal').update({ status }).eq('id', id);
    setExpandedId(null);
    load();
  }

  const FILTERS: { id: FilterStatus; label: string }[] = [
    { id: 'terjadwal', label: 'Terjadwal' },
    { id: 'selesai', label: 'Selesai' },
    { id: 'dibatalkan', label: 'Dibatalkan' },
    { id: 'semua', label: 'Semua' },
  ];

  return (
    <>
      <div className="space-y-4 pb-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Jadwal Tarikan</h1>
            <p className="text-xs text-gray-400 mt-0.5">{counts.terjadwal} jadwal mendatang</p>
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
                onClick={() => setModalData({})}
                className="flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-emerald-600 active:scale-95 transition-all shadow-md shadow-emerald-200"
              >
                <Plus className="w-4 h-4" />
                Tambah
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
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
            {filtered.map((j, idx) => {
              const isExpanded = expandedId === j.id;
              const isLast = idx === filtered.length - 1;

              return (
                <div
                  key={j.id}
                  className={!isLast ? 'border-b border-gray-50' : ''}
                >
                  <button
                    onClick={() => {
                      if (!isBendahara) return;
                      setExpandedId(isExpanded ? null : j.id);
                    }}
                    className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${isBendahara ? 'hover:bg-gray-50/80 active:bg-gray-100/80' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                      j.status === 'selesai' ? 'bg-blue-100 text-blue-600' :
                      j.status === 'dibatalkan' ? 'bg-gray-100 text-gray-400' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {j.warga?.nama?.charAt(0) ?? '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${j.status === 'dibatalkan' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {j.warga?.nama ?? '-'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatTanggal(j.tanggal)} · {formatRupiahPlain(j.nominal)}
                      </p>
                      {j.keterangan && (
                        <p className="text-xs text-gray-400 truncate">{j.keterangan}</p>
                      )}
                    </div>

                    {/* Status */}
                    <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full border flex-shrink-0 ${STATUS_STYLE[j.status]}`}>
                      {STATUS_LABEL[j.status]}
                    </span>
                  </button>

                  {/* Action Row (bendahara only, expanded) */}
                  {isBendahara && isExpanded && (
                    <div className="flex items-center gap-2 px-4 pb-3">
                      <button
                        onClick={() => setModalData(j)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      {j.status !== 'selesai' && (
                        <button
                          onClick={() => updateStatus(j.id, 'selesai')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selesai
                        </button>
                      )}
                      {j.status === 'terjadwal' && (
                        <button
                          onClick={() => updateStatus(j.id, 'dibatalkan')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Batalkan
                        </button>
                      )}
                      {j.status !== 'terjadwal' && (
                        <button
                          onClick={() => updateStatus(j.id, 'terjadwal')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Aktifkan
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

      {/* Modal */}
      {modalData !== null && (
        <JadwalModal
          jadwal={modalData}
          wargaList={wargaList}
          onSave={handleSave}
          onClose={() => setModalData(null)}
        />
      )}
    </>
  );
}
