import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, RefreshCw, Search, Users, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import type { Warga } from '../lib/types';

interface FormData {
  nama: string;
  no_rumah: string;
  no_hp: string;
  status_aktif: boolean;
}

const EMPTY: FormData = { nama: '', no_rumah: '', no_hp: '', status_aktif: true };

export default function WargaPage() {
  const { isBendahara } = useAuthContext();
  const [list, setList] = useState<Warga[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Warga | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const namaRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('warga')
      .select('*')
      .order('no_rumah', { ascending: true });
    setList((data as Warga[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = query
    ? list.filter(w =>
        w.nama.toLowerCase().includes(query.toLowerCase()) ||
        w.no_rumah.toLowerCase().includes(query.toLowerCase())
      )
    : list;

  const aktif = list.filter(w => w.status_aktif).length;

  function openAdd() {
    setSelected(null);
    setForm(EMPTY);
    setErr('');
    setModal('add');
    setTimeout(() => namaRef.current?.focus(), 80);
  }

  function openEdit(w: Warga) {
    setSelected(w);
    setForm({ nama: w.nama, no_rumah: w.no_rumah, no_hp: w.no_hp ?? '', status_aktif: w.status_aktif });
    setErr('');
    setModal('edit');
    setTimeout(() => namaRef.current?.focus(), 80);
  }

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function save() {
    if (!form.nama.trim()) { setErr('Nama wajib diisi.'); return; }
    setSaving(true);
    setErr('');
    const payload = {
      nama: form.nama.trim(),
      no_rumah: form.no_rumah.trim(),
      no_hp: form.no_hp.trim(),
      status_aktif: form.status_aktif,
    };
    const { error: e } = modal === 'edit' && selected
      ? await supabase.from('warga').update(payload).eq('id', selected.id)
      : await supabase.from('warga').insert(payload);
    if (e) { setErr('Gagal menyimpan, coba lagi.'); setSaving(false); return; }
    setSaving(false);
    setModal(null);
    load();
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Data Anggota</h1>
          <p className="text-xs text-gray-400">{aktif} aktif · {list.length} terdaftar</p>
        </div>
        {isBendahara && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#0D6B5E] to-[#1A9B86] text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari nama atau no. rumah..."
          className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Progress bar 69 anggota */}
      {!query && list.length > 0 && list.length < 69 && (
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600">Progress Input Anggota</p>
            <p className="text-xs font-bold text-emerald-600">{list.length} / 69</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
              style={{ width: `${(list.length / 69) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{69 - list.length} anggota lagi perlu diinput</p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium">
            {query ? 'Tidak ditemukan' : 'Belum ada anggota'}
          </p>
          {!query && isBendahara && (
            <p className="text-xs text-gray-400 mt-1">Klik Tambah untuk mulai input data</p>
          )}
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {filtered.map((w, idx) => (
            <div
              key={w.id}
              onClick={() => isBendahara && openEdit(w)}
              className={`flex items-center gap-3 p-4 transition-colors
                ${isBendahara ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''}
                ${idx < filtered.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="text-base font-bold text-emerald-700">
                  {w.nama.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-900 truncate">{w.nama}</p>
                  {!w.status_aktif && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold text-gray-500 bg-gray-100 rounded-full border border-gray-200 shrink-0">
                      Nonaktif
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                  No. {w.no_rumah || '—'}
                  {w.no_hp ? ` · ${w.no_hp}` : ''}
                </p>
              </div>
              {isBendahara && <Pencil className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
            </div>
          ))}
        </div>
      )}

      {/* Modal Bottom Sheet */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setModal(null)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-900">
                {modal === 'edit' ? 'Edit Anggota' : 'Tambah Anggota Baru'}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Nama Lengkap <span className="text-red-400">*</span>
                </label>
                <input
                  ref={namaRef}
                  value={form.nama}
                  onChange={e => set('nama', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && save()}
                  placeholder="Contoh: Ahmad Budi Santoso"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">No. Rumah</label>
                  <input
                    value={form.no_rumah}
                    onChange={e => set('no_rumah', e.target.value)}
                    placeholder="Contoh: 15A"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">No. HP</label>
                  <input
                    type="tel"
                    value={form.no_hp}
                    onChange={e => set('no_hp', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Status Aktif</p>
                  <p className="text-xs text-gray-400">Aktif mengikuti arisan</p>
                </div>
                <button
                  type="button"
                  onClick={() => set('status_aktif', !form.status_aktif)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.status_aktif ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.status_aktif ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>

              {err && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  <p className="text-sm text-red-600">{err}</p>
                </div>
              )}

              <button
                onClick={save}
                disabled={saving}
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#0D6B5E] to-[#1A9B86] text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-all disabled:opacity-60 mt-1"
              >
                {saving ? 'Menyimpan...' : modal === 'edit' ? 'Simpan Perubahan' : 'Tambah Anggota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
