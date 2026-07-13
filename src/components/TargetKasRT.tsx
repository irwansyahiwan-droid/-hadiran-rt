import { useEffect, useState } from 'react';
import { Target, Pencil, Trophy, CalendarClock, Plus, Trash2, PartyPopper } from 'lucide-react';
import { useDragDismiss } from '../hooks/useDragDismiss';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useAuthContext } from '../context/AuthContext';
import { formatRupiahPlain, haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import { getTargetKasRT, setTargetKasRT, clearTargetKasRT, type TargetKasRT as Target_ } from '../lib/pengaturan';

export default function TargetKasRT({ saldo }: { saldo: number }) {
  const { isBendahara } = useAuthContext();
  const [target, setTarget] = useState<Target_ | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);

  async function load() {
    setTarget(await getTargetKasRT());
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  if (!loaded) return null;
  if (!target && !isBendahara) return null;

  // Kosong → ajakan set target (bendahara saja)
  if (!target) {
    return (
      <>
        <button
          onClick={() => { haptic(); setEditing(true); }}
          className="press w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 px-4 py-3.5 text-left hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors"
        >
          <span className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <Target className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">Tetapkan Target Kas RT</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">Mis. dana 17 Agustus — pacu semangat warga</span>
          </span>
          <Plus className="w-4 h-4 text-gray-400 shrink-0" />
        </button>
        {editing && <EditSheet onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      </>
    );
  }

  const tercapai = saldo >= target.nominal;
  const pct = target.nominal > 0 ? Math.min(100, Math.max(0, (saldo / target.nominal) * 100)) : 0;
  const sisa = Math.max(0, target.nominal - saldo);

  let deadline: string | null = null;
  let deadlineLewat = false;
  if (target.tanggal) {
    const d = new Date(target.tanggal);
    const hari = Math.ceil((d.getTime() - Date.now()) / 86400000);
    const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    deadlineLewat = hari < 0 && !tercapai;
    deadline = hari >= 0 ? `${tgl} · ${hari} hari lagi` : `${tgl} · lewat`;
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tercapai ? 'bg-emerald-500/15 dark:bg-emerald-400/15' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
              {tercapai
                ? <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                : <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{target.keterangan || 'Target Kas RT'}</p>
              <p className="text-micro text-gray-500 dark:text-gray-400">Target {formatRupiahPlain(target.nominal)}</p>
            </div>
          </div>
          {isBendahara && (
            <button
              onClick={() => { haptic(); setEditing(true); }}
              aria-label="Ubah target"
              className="press relative w-9 h-9 -mr-1 inline-flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors before:absolute before:-inset-1 before:content-['']"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div
          className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress target ${target.keterangan || 'Kas RT'}`}
        >
          <div
            className={`h-full w-full origin-left rounded-full transition-transform duration-700 ease-out ${tercapai ? 'bg-gradient-to-r from-emerald-500 to-brand' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'}`}
            style={{ transform: `scaleX(${Math.min(pct, 100) / 100})` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            {tercapai ? <><PartyPopper className="w-3.5 h-3.5" /> Target tercapai!</> : `${Math.round(pct)}% terkumpul`}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {formatRupiahPlain(Math.max(0, saldo))} / {formatRupiahPlain(target.nominal)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-1.5 text-micro text-gray-500 dark:text-gray-400">
          <span>{tercapai ? `Lebih ${formatRupiahPlain(saldo - target.nominal)}` : `Kurang ${formatRupiahPlain(sisa)}`}</span>
          {deadline && (
            <span className={`inline-flex items-center gap-1 ${deadlineLewat ? 'text-warn dark:text-amber-400 font-semibold' : ''}`}><CalendarClock className="w-3 h-3" />{deadline}</span>
          )}
        </div>
      </div>

      {editing && (
        <EditSheet
          initial={target}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }}
        />
      )}
    </>
  );
}

// ── Sheet edit/set target ──────────────────────────────────
function EditSheet({ initial, onClose, onSaved }: { initial?: Target_; onClose: () => void; onSaved: () => void }) {
  const drag = useDragDismiss(onClose);
  // Semua jalur tutup (backdrop, Batal, Escape, Back HP) lewat dismiss() → meluncur.
  useBackDismiss(true, drag.dismiss);
  const dlg = useDialog(true, { onClose: drag.dismiss, label: initial ? 'Ubah target Kas RT' : 'Tetapkan target Kas RT' });
  const [nominal, setNominal] = useState(initial?.nominal ?? 0);
  const [keterangan, setKeterangan] = useState(initial?.keterangan ?? '');
  const [tanggal, setTanggal] = useState(initial?.tanggal ?? '');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nominal) return;
    setSaving(true);
    const ok = await setTargetKasRT({ nominal, keterangan: keterangan.trim(), tanggal: tanggal || null });
    setSaving(false);
    showToast(ok ? 'Target disimpan' : 'Gagal menyimpan target', ok ? 'success' : 'error');
    if (ok) onSaved();
  }

  async function hapus() {
    setSaving(true);
    const ok = await clearTargetKasRT();
    setSaving(false);
    showToast(ok ? 'Target dihapus' : 'Gagal menghapus', ok ? 'info' : 'error');
    if (ok) onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={drag.dismiss}>
      <div className={`sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm ${drag.dismissing ? 'sheet-backdrop-out' : ''}`} />
      <div
        ref={dlg.panelRef}
        {...dlg.panelProps}
        className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={drag.style}
      >
        <div className="-mt-2 mb-1 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...drag.handlers}>
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{initial ? 'Ubah Target Kas RT' : 'Tetapkan Target Kas RT'}</h3>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="target-nama" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nama Target</label>
            <input
              id="target-nama"
              name="nama-target"
              autoComplete="off"
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Dana HUT RI 17 Agustus…"
              className="field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="target-nominal" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nominal Target</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">Rp</span>
                <input
                  id="target-nominal"
                  name="nominal-target"
                  autoComplete="off"
                  type="text"
                  inputMode="numeric"
                  value={nominal ? nominal.toLocaleString('id-ID') : ''}
                  onChange={(e) => setNominal(Number(e.target.value.replace(/\D/g, '')) || 0)}
                  required
                  className="field pl-9 pr-3"
                />
              </div>
            </div>
            <div>
              <label htmlFor="target-tanggal" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Batas Waktu</label>
              <input
                id="target-tanggal"
                name="batas-waktu-target"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="field"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {initial && (
              <button
                type="button"
                onClick={hapus}
                disabled={saving}
                className="press inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 disabled:opacity-60 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Hapus
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !nominal}
              className="btn-brand flex-1 py-3 font-semibold text-sm disabled:opacity-60"
            >
              {saving ? 'Menyimpan…' : 'Simpan Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
