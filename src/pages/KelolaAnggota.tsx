import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Users, Search, X, RefreshCw, RotateCcw, UserPlus, Pencil,
  CheckCircle2, Phone, Home, History, AlertTriangle,
} from 'lucide-react';
import ClearButton from '../components/ClearButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Tag from '../components/Tag';
import { supabase } from '../lib/supabase';
import {
  fetchAnggota, tambahAnggota, updateAnggota, backfillAnggotaSusulan,
} from '../lib/anggota';
import { formatTanggal, formatRupiahPlain, haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import type { Warga, Tarikan } from '../lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Form Tambah / Edit Anggota ──────────────────────────────

interface FormProps {
  mode: 'add' | 'edit';
  initial: Warga | null;
  selesaiTarikan: Tarikan[]; // untuk opsi "anggota susulan" (mode add)
  onClose: () => void;
  onSaved: () => void;
}

function AnggotaFormModal({ mode, initial, selesaiTarikan, onClose, onSaved }: FormProps) {
  const [nama, setNama] = useState(initial?.nama ?? '');
  const [noRumah, setNoRumah] = useState(initial?.no_rumah ?? '');
  const [noHp, setNoHp] = useState(initial?.no_hp ?? '');
  const [role, setRole] = useState<'bendahara' | 'warga'>(initial?.role ?? 'warga');
  const [aktif, setAktif] = useState(initial?.status_aktif ?? true);
  // Anggota susulan (hanya mode add)
  const [susulan, setSusulan] = useState(false);
  const [pilih, setPilih] = useState<Set<string>>(() => new Set(selesaiTarikan.map((t) => t.id)));
  const [saving, setSaving] = useState(false);
  // Pengaman: anggota yang dinonaktifkan tapi masih punya jadwal tarikan ke depan
  const [jadwalNonaktif, setJadwalNonaktif] = useState<number[] | null>(null);
  useBackDismiss(true, onClose);
  const dlg = useDialog(true, { onClose, label: mode === 'edit' ? 'Edit anggota' : 'Tambah anggota' });

  const kasNaik = pilih.size * 5000;

  function togglePilih(id: string) {
    setPilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function simpan(forceNonaktif = false) {
    if (!nama.trim()) { showToast('Nama anggota wajib diisi', 'error'); return; }
    // Pengaman: menonaktifkan anggota yang masih jadi Sohibul di tarikan ke depan
    if (mode === 'edit' && initial && initial.status_aktif && !aktif && !forceNonaktif) {
      setSaving(true);
      const { data } = await supabase
        .from('tarikan')
        .select('nomor')
        .eq('sohibul_bait_id', initial.id)
        .neq('status', 'selesai')
        .order('nomor', { ascending: true });
      setSaving(false);
      if (data && data.length) {
        setJadwalNonaktif(data.map((t) => t.nomor as number));
        return; // tahan dulu, tampilkan peringatan
      }
    }
    setSaving(true);
    try {
      if (mode === 'edit' && initial) {
        await updateAnggota(initial.id, {
          nama, no_rumah: noRumah, no_hp: noHp, role, status_aktif: aktif,
        });
        showToast('Data anggota diperbarui');
      } else {
        const baru = await tambahAnggota({ nama, no_rumah: noRumah, no_hp: noHp, role });
        if (susulan && pilih.size > 0) {
          const ids = selesaiTarikan.filter((t) => pilih.has(t.id)).map((t) => t.id);
          const res = await backfillAnggotaSusulan(baru.id, ids);
          showToast(
            `${baru.nama} ditambahkan · lunas ${res.tarikanCount} tarikan · Kas +${formatRupiahPlain(res.kasNaik)}`
          );
        } else {
          showToast(`${baru.nama} ditambahkan`);
        }
      }
      haptic(12);
      onSaved();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  }

  const input =
    'field';
  const label = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5';

  return (
    <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center">
      <div aria-hidden="true" className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dlg.panelRef}
        {...dlg.panelProps}
        className="sheet-panel relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5 float max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">
              {mode === 'add' ? 'Tambah Anggota' : 'Edit Anggota'}
            </p>
            <p className="text-xs text-ink-faint dark:text-gray-400 mt-0.5">
              {mode === 'add' ? 'Data warga baru RT' : initial?.nama}
            </p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="press w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <label htmlFor="anggota-nama" className={label}>Nama Lengkap</label>
        <input id="anggota-nama" name="nama" autoComplete="name" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama warga…" className={`${input} mb-4`} />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="anggota-rumah" className={label}>No. Rumah</label>
            <input id="anggota-rumah" name="no-rumah" autoComplete="off" value={noRumah} onChange={(e) => setNoRumah(e.target.value)} placeholder="mis. A-12…" className={input} />
          </div>
          <div>
            <label htmlFor="anggota-hp" className={label}>No. HP</label>
            <input id="anggota-hp" name="no-hp" type="tel" autoComplete="tel" value={noHp} onChange={(e) => setNoHp(e.target.value)} placeholder="08xxxx…" inputMode="tel" className={input} />
          </div>
        </div>

        <span className={label}>Peran</span>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['warga', 'bendahara'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
                role === r
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white dark:bg-gray-900 text-gray-500 border-control dark:border-gray-700'
              }`}
            >
              {r === 'warga' ? 'Warga' : 'Bendahara'}
            </button>
          ))}
        </div>

        {/* Status aktif — edit saja */}
        {mode === 'edit' && (
          <button
            onClick={() => setAktif((a) => !a)}
            role="switch"
            aria-checked={aktif}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-control dark:border-gray-700 mb-4"
          >
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Status keanggotaan</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {aktif ? 'Aktif' : 'Nonaktif'}
            </span>
          </button>
        )}

        {/* Anggota susulan — tambah saja & hanya bila ada tarikan selesai */}
        {mode === 'add' && selesaiTarikan.length > 0 && (
          <div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-900/15 overflow-hidden">
            <button
              onClick={() => setSusulan((s) => !s)}
              role="switch"
              aria-checked={susulan}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                <History className="w-4 h-4 shrink-0" />
                Anggota susulan — sudah lunas tarikan lama
              </span>
              <span className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${susulan ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${susulan ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </span>
            </button>

            {susulan && (
              <div className="px-3.5 pb-3.5 space-y-2">
                <p className="text-micro text-amber-700 dark:text-amber-400 leading-relaxed">
                  Ditandai <b>hadir</b> di tarikan terpilih lalu kas dihitung ulang. Talangan warga lain tidak terpengaruh.
                </p>
                <div className="rounded-xl bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900/40 list-inset [--di-l:2.75rem] [--di-r:0.75rem] max-h-52 overflow-y-auto">
                  {selesaiTarikan.map((t) => {
                    const on = pilih.has(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => togglePilih(t.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                      >
                        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          on ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {on && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">
                            Tarikan #{t.nomor}
                          </span>
                          <span className="block text-micro text-ink-faint dark:text-gray-400">
                            {t.sohibul_bait?.nama ?? '—'} · {formatTanggal(t.tanggal)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-micro font-semibold text-emerald-700 dark:text-emerald-400">
                  {pilih.size} tarikan dipilih · Kas Hadiran +{formatRupiahPlain(kasNaik)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Peringatan: masih punya jadwal tarikan ke depan */}
        {jadwalNonaktif && (
          <div className="mb-4 rounded-2xl border border-rose-200 dark:border-rose-800/50 bg-rose-50/70 dark:bg-rose-900/15 p-3.5">
            <p className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" /> Masih punya jadwal ke depan
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400/90 mt-1 leading-relaxed">
              {initial?.nama} masih jadi Sohibul Bait di {jadwalNonaktif.length} tarikan:{' '}
              <b>#{jadwalNonaktif.join(', #')}</b>. Setelah dinonaktifkan, jangan lupa ganti Sohibul Bait tarikan tersebut lewat <b>Revisi jadwal</b>.
            </p>
          </div>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={jadwalNonaktif ? () => setJadwalNonaktif(null) : onClose}
            className="btn-secondary flex-1 py-3 rounded-full"
          >
            Batal
          </button>
          <button
            onClick={() => { haptic(12); simpan(!!jadwalNonaktif); }}
            disabled={saving || !nama.trim()}
            className={`flex-1 py-3 rounded-full text-white text-sm font-bold active:scale-[0.97] transition disabled:opacity-60 flex items-center justify-center gap-2 ${
              jadwalNonaktif ? 'bg-rose-600' : 'btn-brand'
            }`}
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {saving
              ? 'Menyimpan…'
              : jadwalNonaktif
                ? 'Tetap Nonaktifkan'
                : mode === 'add' ? 'Simpan Anggota' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Halaman Kelola Anggota ──────────────────────────────────

export default function KelolaAnggota({ open, onClose }: Props) {
  const [list, setList] = useState<Warga[]>([]);
  const [selesaiTarikan, setSelesaiTarikan] = useState<Tarikan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ mode: 'add' | 'edit'; warga: Warga | null } | null>(null);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const [anggota, tarRes] = await Promise.all([
        fetchAnggota(),
        supabase
          .from('tarikan')
          .select('*, sohibul_bait:warga!sohibul_bait_id(*)')
          .eq('status', 'selesai')
          .order('nomor', { ascending: true }),
      ]);
      setList(anggota);
      setSelesaiTarikan((tarRes.data as Tarikan[]) ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) { setSearch(''); load(); }
  }, [open]);

  useBackDismiss(open && !form, onClose);
  const dlg = useDialog(open && !form, { onClose, label: 'Kelola anggota' });

  const aktifCount = list.filter((w) => w.status_aktif).length;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((w) => w.nama.toLowerCase().includes(q) || w.no_rumah.toLowerCase().includes(q));
  }, [list, search]);

  if (!open) return null;

  return (
    <div ref={dlg.panelRef} {...dlg.panelProps} className="fixed inset-0 z-50 bg-sunken dark:bg-gray-950 page-in-right overflow-y-auto">
      <header
        className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-line dark:border-gray-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-2 max-w-lg mx-auto px-4 py-3">
          <button
            onClick={() => { haptic(); onClose(); }}
            className="press w-11 h-11 flex items-center justify-center -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">Kelola Anggota</h1>
          </div>
          <button
            onClick={() => { haptic(); load(); }}
            className="press w-11 h-11 flex items-center justify-center -mr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Muat ulang"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}>
        <p className="text-xs text-ink-faint dark:text-gray-400 px-1">{aktifCount} aktif · {list.length} total</p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / no. rumah…"
            aria-label="Cari anggota"
            inputMode="search"
            enterKeyHint="search"
            className="field-search pr-11"
          />
          {search && <ClearButton onClick={() => setSearch('')} />}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 px-4 py-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded-lg w-3/5" />
                  <div className="h-3 skeleton rounded-lg w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift">
            <ErrorState onRetry={() => load()} retrying={loading} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift">
            <EmptyState
              icon={Users}
              title={list.length === 0 ? 'Belum ada anggota' : 'Tidak ada hasil'}
              subtitle={list.length === 0 ? 'Tambahkan anggota RT lewat tombol di bawah.' : 'Coba kata kunci lain.'}
              action={list.length > 0
                ? { label: 'Hapus pencarian', icon: RotateCcw, onClick: () => setSearch('') }
                : undefined}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
            {filtered.map((w, idx) => (
              <button
                key={w.id}
                onClick={() => { haptic(); setForm({ mode: 'edit', warga: w }); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left [--di-l:4.25rem] [--di-r:1rem] active:bg-gray-50 dark:active:bg-gray-800/60 transition-colors ${
                  idx < filtered.length - 1 ? 'divide-inset' : ''
                }`}
              >
                <div className={`icon-tile w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
                  w.status_aktif ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {w.nama.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${w.status_aktif ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {w.nama}
                  </p>
                  <p className="text-micro text-ink-faint dark:text-gray-400 flex items-center gap-2 mt-0.5">
                    {w.no_rumah && <span className="inline-flex items-center gap-0.5"><Home className="w-3 h-3" />{w.no_rumah}</span>}
                    {w.no_hp && <span className="inline-flex items-center gap-0.5"><Phone className="w-3 h-3" />{w.no_hp}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {w.role === 'bendahara' && <Tag tone="success">Bendahara</Tag>}
                  {!w.status_aktif && <Tag tone="neutral">Nonaktif</Tag>}
                  <Pencil className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* FAB Tambah */}
      <button
        onClick={() => { haptic(); setForm({ mode: 'add', warga: null }); }}
        className="btn-brand fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full font-bold text-sm active:scale-[0.97] transition"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
      >
        <UserPlus className="w-4 h-4" /> Tambah Anggota
      </button>

      {form && (
        <AnggotaFormModal
          mode={form.mode}
          initial={form.warga}
          selesaiTarikan={selesaiTarikan}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load(); }}
        />
      )}
    </div>
  );
}
