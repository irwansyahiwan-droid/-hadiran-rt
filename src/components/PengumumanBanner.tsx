import { useEffect, useState } from 'react';
import { Megaphone, Pencil, X, Trash2, RefreshCw, Plus, Info, AlertTriangle, PartyPopper, type LucideIcon } from 'lucide-react';
import { getPengumuman, setPengumuman, clearPengumuman, type Pengumuman, type PengumumanTipe } from '../lib/pengaturan';
import { haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import { useBackDismiss } from '../hooks/useBackDismiss';

/** Gaya per jenis pengumuman: gradien latar + warna denyut glow + ikon. */
const STYLE: Record<PengumumanTipe, { grad: string; glow: string; icon: LucideIcon; label: string }> = {
  info:    { grad: 'linear-gradient(135deg, #0F766E 0%, #10B981 100%)', glow: 'rgba(16,185,129,0.55)',  icon: Info,         label: 'Info' },
  penting: { grad: 'linear-gradient(135deg, #C2410C 0%, #F59E0B 100%)', glow: 'rgba(245,158,11,0.55)',  icon: AlertTriangle, label: 'Penting' },
  sukses:  { grad: 'linear-gradient(135deg, #15803D 0%, #22C55E 100%)', glow: 'rgba(34,197,94,0.55)',   icon: PartyPopper,  label: 'Kabar Baik' },
};

interface Props {
  /** Bendahara (bukan mode warga) boleh kelola pengumuman. */
  canManage: boolean;
}

export default function PengumumanBanner({ canManage }: Props) {
  const [data, setData] = useState<Pengumuman | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  async function load() {
    try { setData(await getPengumuman()); }
    catch { setData(null); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) return null;

  const tampil = data?.aktif && (data.isi || data.judul);
  const style = STYLE[data?.tipe ?? 'info'];
  const Icon = style.icon;

  return (
    <>
      {/* Banner untuk semua warga (saat aktif) */}
      {tampil && (
        <div
          className="ann-in ann-glow ann-sheen relative overflow-hidden rounded-3xl px-5 py-4 text-white"
          style={{ background: style.grad, ['--ann-glow' as string]: style.glow }}
        >
          <div className="relative z-[2] flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 ann-wiggle" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">
                {style.label}
              </p>
              {data!.judul && (
                <p className="text-[15px] font-black leading-snug mt-0.5 break-words">{data!.judul}</p>
              )}
              {data!.isi && (
                <p className="text-[13px] text-white/90 leading-relaxed mt-0.5 break-words whitespace-pre-line">{data!.isi}</p>
              )}
            </div>
            {canManage && (
              <button
                onClick={() => { haptic(); setEditing(true); }}
                className="press shrink-0 w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                aria-label="Edit pengumuman"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Kontrol bendahara saat banner tidak tampil (belum ada / nonaktif) */}
      {!tampil && canManage && (
        <button
          onClick={() => { haptic(); setEditing(true); }}
          className="press w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
        >
          {data ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {data ? 'Pengumuman nonaktif — Edit' : 'Buat Pengumuman'}
        </button>
      )}

      {editing && (
        <PengumumanEditor
          initial={data}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }}
        />
      )}
    </>
  );
}

// ── Editor (bendahara) ──────────────────────────────────────

interface EditorProps {
  initial: Pengumuman | null;
  onClose: () => void;
  onSaved: () => void;
}

function PengumumanEditor({ initial, onClose, onSaved }: EditorProps) {
  const [judul, setJudul] = useState(initial?.judul ?? '');
  const [isi, setIsi] = useState(initial?.isi ?? '');
  const [tipe, setTipe] = useState<PengumumanTipe>(initial?.tipe ?? 'info');
  const [aktif, setAktif] = useState(initial?.aktif ?? true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useBackDismiss(true, onClose);

  async function simpan() {
    if (!judul.trim() && !isi.trim()) { showToast('Isi pengumuman dulu', 'error'); return; }
    setSaving(true);
    const ok = await setPengumuman({ judul: judul.trim(), isi: isi.trim(), tipe, aktif });
    setSaving(false);
    if (ok) { haptic(12); showToast(aktif ? 'Pengumuman tayang' : 'Pengumuman disimpan (nonaktif)'); onSaved(); }
    else showToast('Gagal menyimpan', 'error');
  }

  async function hapus() {
    setDeleting(true);
    const ok = await clearPengumuman();
    setDeleting(false);
    if (ok) { haptic(12); showToast('Pengumuman dihapus'); onSaved(); }
    else showToast('Gagal menghapus', 'error');
  }

  const style = STYLE[tipe];
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="sheet-panel relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5 float max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">Pengumuman</p>
            <p className="text-xs text-gray-400 mt-0.5">Info penting untuk semua warga</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Pratinjau langsung */}
        <div
          className="ann-glow ann-sheen relative overflow-hidden rounded-2xl px-4 py-3 text-white mb-4"
          style={{ background: style.grad, ['--ann-glow' as string]: style.glow }}
        >
          <div className="relative z-[2] flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/75">{style.label}</p>
              <p className="text-sm font-black leading-snug break-words">{judul.trim() || 'Judul pengumuman'}</p>
              {isi.trim() && <p className="text-xs text-white/90 mt-0.5 break-words whitespace-pre-line">{isi.trim()}</p>}
            </div>
          </div>
        </div>

        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Judul</label>
        <input
          value={judul}
          onChange={e => setJudul(e.target.value)}
          placeholder="mis. Kerja Bakti Minggu Pagi"
          className="w-full px-3.5 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-control dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 mb-4"
        />

        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Isi</label>
        <textarea
          value={isi}
          onChange={e => setIsi(e.target.value)}
          rows={3}
          placeholder="Tulis detail pengumuman di sini..."
          className="w-full px-3.5 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-control dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 mb-4 resize-none"
        />

        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Jenis</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(Object.keys(STYLE) as PengumumanTipe[]).map(t => (
            <button
              key={t}
              onClick={() => setTipe(t)}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                tipe === t
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white dark:bg-gray-900 text-gray-500 border-control dark:border-gray-700'
              }`}
            >
              {STYLE[t].label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setAktif(a => !a)}
          className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-control dark:border-gray-700 mb-5"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <Megaphone className="w-4 h-4 text-gray-400" /> Tampilkan ke warga
          </span>
          <span className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${aktif ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${aktif ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </span>
        </button>

        <div className="flex gap-2.5">
          {initial && (
            <button
              onClick={() => { haptic(); hapus(); }}
              disabled={saving || deleting}
              className="px-4 py-3 rounded-full border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Hapus
            </button>
          )}
          <button
            onClick={() => { haptic(12); simpan(); }}
            disabled={saving || deleting}
            className="flex-1 py-3 rounded-full bg-[#0F6039] text-white text-sm font-bold active:scale-[0.97] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
