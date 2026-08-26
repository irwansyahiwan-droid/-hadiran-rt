import { useSaving } from '../lib/hooks';
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
  const [gagal, setGagal] = useState(false);
  const [editing, setEditing] = useState(false);

  async function load() {
    try {
      setTarget(await getTargetKasRT());
    } catch {
      // Gagal baca ≠ target belum ada. Menawarkan "Tetapkan Target" di sini
      // membuat bendahara meng-upsert di atas target lama yang masih hidup.
      setGagal(true);
    }
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  /* Selama fetch-nya SENDIRI kartu ini dulu `return null` — nol ruang, lalu
     muncul utuh 147px sekaligus. Kartunya dirender TANPA syarat oleh KasRT,
     jadi kemunculannya mendorong semua yang di bawahnya: grafik, rekap, dan
     seluruh daftar mutasi. Terukur 19 Agu 2026 sbg penyumbang TUNGGAL terbesar
     geseran Kas RT (bersama SmartInsight: grafik turun ~175px; CLS halaman
     0,107 warga / 0,118 bendahara, ambang "baik" Google 0,1).

     Skeletonnya BERBENTUK anatomi aslinya, bukan slab setinggi tetap — pelajaran
     yang sama dgn skeleton hero JadwalWarga: tinggi tetap akan salah begitu
     judul melipat (`line-clamp-2`) atau kaki kartu membungkus di teks 200%.
     Dengan struktur yang sama ia melipat di titik yang SAMA. Terukur 145px
     lawan 147px kartu asli.

     Tombol ubah ikut `isBendahara` persis seperti kartu asli: kalau tidak,
     warga dapat skeleton 36px lebih lebar dari isi yang menggantikannya. */
  if (!loaded) {
    return (
      <div aria-hidden="true" className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="skeleton w-8 h-8 rounded-xl shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="skeleton h-[22px] w-3/5 rounded-full" />
              <div className="skeleton h-[15px] w-2/5 rounded-full" />
            </div>
          </div>
          {isBendahara && <div className="skeleton w-9 h-9 -mr-1 rounded-xl shrink-0" />}
        </div>
        <div className="skeleton h-3 rounded-full" />
        <div className="flex items-center justify-between gap-2 mt-3">
          <div className="skeleton h-[17px] w-28 rounded-full" />
          <div className="skeleton h-[15px] w-32 rounded-full" />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="skeleton h-[15px] w-24 rounded-full" />
          <div className="skeleton h-[15px] w-28 rounded-full" />
        </div>
      </div>
    );
  }
  if (gagal) return null; // kartu opsional — sembunyikan, jangan mengarang keadaan
  if (!target && !isBendahara) return null;

  // Kosong → ajakan set target (bendahara saja)
  if (!target) {
    return (
      <>
        <button
          onClick={() => { haptic(); setEditing(true); }}
          className="press w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 px-4 py-4 text-left hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors"
        >
          <span className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <Target className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-body font-bold text-gray-800 dark:text-gray-100">Tetapkan Target Kas RT</span>
            <span className="block text-caption text-gray-500 dark:text-gray-400">Mis. dana 17 Agustus — pacu semangat warga</span>
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
              {/* line-clamp-2, bukan truncate: keterangan target itu teks bebas
                  dari bendahara. Default "Target Saldo Kas RT Akhir Tahun" saja
                  sudah kurang 3px di 360px → kata terakhir hilang jadi "…Tahu…".
                  Judul = identitas kartu; biarkan melipat (pola sama judul
                  transaksi Beranda). */}
              <p className="text-body font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">{target.keterangan || 'Target Kas RT'}</p>
              <p className="text-micro text-gray-500 dark:text-gray-400">Target <span className="font-display tabular-nums">{formatRupiahPlain(target.nominal)}</span></p>
            </div>
          </div>
          {isBendahara && (
            <button
              onClick={() => { haptic(); setEditing(true); }}
              aria-label="Ubah target"
              /* Dua hal, keduanya menyusul aturan yang SUDAH ditegakkan di tempat
                 lain — call-site ini yang tertinggal.

                 1. Warna. `text-gray-400` dicabut: abu di app ini SINYAL KONTROL
                    INAKTIF, jadi ikon AKSI yang aktif tak boleh memakainya.
                    Persis alasan yang tertulis di tombol baris Jadwal.tsx dan
                    pensil baris KelolaAnggota.tsx (keduanya dibetulkan 4 Agu);
                    pensil ini peer sejatinya dan luput. Tombol "Tutup" app SENGAJA
                    tetap gray-400 — dismiss memang low-emphasis, dan keenamnya
                    seragam; yang salah cuma ikon aksi yang menyamar nonaktif.
                    Ini BUKAN cacat kontras: `text-gray-400` di-remap #475569 di
                    terang, dan lolos 3:1 di gelap — `audit:kontras-nonteks` 688
                    sampel 0 gagal. Yang salah maknanya, dan tak ada sapuan yang
                    bisa melihat itu.

                 2. Area sentuh. `-inset-1` (4px) menghasilkan 44px TEPAT di 390px,
                    tapi cuma 42px di 360px — lebar acuan app: di sana pelebarannya
                    mentok tepi kartu dan `elementFromPoint` menjawab KARTU, bukan
                    tombol. Niatnya jelas 44 (§ambang app), mendaratnya 42, dan tak
                    ada komentar yang menyatakan 42 disengaja → kelewatan, bukan
                    keputusan. `-inset-1.5` (6px) menyisakan margin supaya 2px yang
                    termakan tepi tak menjatuhkannya lagi. Tetangganya blok teks,
                    bukan target lain, jadi aturan "dua target yang dilebarkan wajib
                    dijarakkan ≥ pelebarannya" tetap aman. */
              className="press relative w-9 h-9 -mr-1 inline-flex items-center justify-center rounded-xl text-ink-faint dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors before:absolute before:-inset-1.5 before:content-['']"
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
          {/* Mulai dari emerald-600: fill informatif (role=progressbar) wajib ≥3:1
              vs track gray-100 (WCAG 1.4.11) — ujung from-emerald-400 lama 1,8:1 */}
          <div
            className={`h-full w-full origin-left rounded-full transition-transform duration-rayakan ease-out ${tercapai ? 'bg-gradient-to-r from-emerald-600 to-brand' : 'bg-gradient-to-r from-emerald-600 to-emerald-700'}`}
            style={{ transform: `scaleX(${Math.min(pct, 100) / 100})` }}
          />
        </div>

        {/* Kaki bar progres: status di kiri, angka mentahnya di kanan. Angka
            kanan sengaja SATU TIER di bawah persentase (micro, bukan caption) —
            hierarkinya memang begitu (warnanya pun sudah redup lawan emerald
            tebal di kiri), dan pada 360px keduanya di caption butuh 300px
            sedangkan barisnya cuma 294: kurang 6px, cukup untuk memecah
            "66% terkumpul" jadi dua baris dengan "/" menggantung di ujung.
            JANGAN tambahkan `whitespace-nowrap` di sini: dicoba 17 Agu dan
            memang merapikan 360px, tapi saat teks dasar browser 200% baris ini
            kehilangan satu-satunya jalan melipatnya → geser samping Kas RT
            melonjak 117px menjadi 258px. Membungkus adalah katup pengamannya. */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <span className="inline-flex items-center gap-1 text-caption font-bold angka-prosa text-emerald-700 dark:text-emerald-400">
            {tercapai ? <><PartyPopper className="w-3.5 h-3.5" /> Target tercapai!</> : `${Math.round(pct)}% terkumpul`}
          </span>
          <span className="font-display text-micro text-gray-500 dark:text-gray-400 tabular-nums">
            {formatRupiahPlain(Math.max(0, saldo))} / {formatRupiahPlain(target.nominal)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-2 text-micro text-gray-500 dark:text-gray-400">
          <span>
            {tercapai ? 'Lebih ' : 'Kurang '}
            <span className="font-display tabular-nums">
              {formatRupiahPlain(tercapai ? saldo - target.nominal : sisa)}
            </span>
          </span>
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
  const [saving, setSaving, sedangSimpan] = useSaving();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nominal || sedangSimpan()) return;   // latch sinkron — lihat useSaving()
    setSaving(true);
    const ok = await setTargetKasRT({ nominal, keterangan: keterangan.trim(), tanggal: tanggal || null });
    setSaving(false);
    showToast(ok ? 'Target disimpan' : 'Gagal menyimpan target', ok ? 'success' : 'error');
    if (ok) onSaved();
  }

  async function hapus() {
    if (sedangSimpan()) return;               // latch sinkron — lihat useSaving()
    setSaving(true);
    const ok = await clearTargetKasRT();
    setSaving(false);
    showToast(ok ? 'Target dihapus' : 'Gagal menghapus', ok ? 'info' : 'error');
    if (ok) onSaved();
  }

  return (
    <div className="fixed inset-0 z-overlay flex items-end" onClick={drag.dismiss}>
      <div className={`sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm ${drag.dismissing ? 'sheet-backdrop-out' : ''}`} />
      <div
        ref={dlg.panelRef}
        {...dlg.panelProps}
        className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10 space-y-4 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={drag.style}
      >
        <div className="-mt-2 mb-1 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...drag.handlers}>
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <h3 className="text-subtitle font-bold text-gray-900 dark:text-gray-100">{initial ? 'Ubah Target Kas RT' : 'Tetapkan Target Kas RT'}</h3>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="target-nama" className="label-field">Nama Target</label>
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
              <label htmlFor="target-nominal" className="label-field">Nominal Target</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-body text-gray-500 dark:text-gray-400">Rp</span>
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
              <label htmlFor="target-tanggal" className="label-field">Batas Waktu</label>
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
                className="press inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-body font-semibold text-neg dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 disabled:opacity-60 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Hapus
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !nominal}
              className="btn-brand flex-1 py-3 font-semibold text-body"
            >
              {saving ? 'Menyimpan…' : 'Simpan Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
