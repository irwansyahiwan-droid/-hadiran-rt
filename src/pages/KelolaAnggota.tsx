import { useSaving } from '../lib/hooks';
import { useEffect, useMemo, useState } from 'react';
import {
  Users, Search, X, RefreshCw, RotateCcw, UserPlus, Pencil,
  CheckCircle2, Phone, Home, History, AlertTriangle,
} from 'lucide-react';
import Fab from '../components/Fab';
import OverlayHeader, { OverlayAction } from '../components/layout/OverlayHeader';
import ClearButton from '../components/ClearButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Tag from '../components/Tag';
import AvatarPeci from '../components/AvatarPeci';
import { supabase } from '../lib/supabase';
import {
  fetchAnggota, tambahAnggota, updateAnggota, backfillAnggotaSusulan,
  jadwalSohibulMendatang,
} from '../lib/anggota';
import { formatTanggal, formatRupiahPlain, haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useDragDismiss } from '../hooks/useDragDismiss';
import { useClosePhase } from '../hooks/useClosePhase';
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
  const [saving, setSaving, sedangSimpan] = useSaving();
  // Pengaman: anggota yang dinonaktifkan tapi masih punya jadwal tarikan ke depan
  const [jadwalNonaktif, setJadwalNonaktif] = useState<number[] | null>(null);
  // Exit meluncur: semua jalur tutup (backdrop, X, Batal, Escape, Back HP)
  // lewat drag.dismiss (handlers tak disebar; panel form scrollable).
  const drag = useDragDismiss(onClose);
  useBackDismiss(true, drag.dismiss);
  const dlg = useDialog(true, { onClose: drag.dismiss, label: mode === 'edit' ? 'Edit anggota' : 'Tambah anggota' });

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
    if (sedangSimpan()) return;               // latch sinkron — lihat useSaving()
    // Pengaman: menonaktifkan anggota yang masih jadi Sohibul di tarikan ke depan
    if (mode === 'edit' && initial && initial.status_aktif && !aktif && !forceNonaktif) {
      setSaving(true);
      let nomorMendatang: number[];
      try {
        nomorMendatang = await jadwalSohibulMendatang(initial.id);
      } catch {
        // Penjaga gagal-tertutup: tak tahu = jangan nonaktifkan.
        setSaving(false);
        showToast('Gagal memeriksa jadwal Sohibul. Cek koneksi lalu coba lagi.', 'error');
        return;
      }
      setSaving(false);
      if (nomorMendatang.length) {
        setJadwalNonaktif(nomorMendatang);
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
  const label = 'label-field';

  return (
    <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center">
      <div aria-hidden="true" className={`sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm ${drag.dismissing ? 'sheet-backdrop-out' : ''}`} onClick={drag.dismiss} />
      <div
        ref={dlg.panelRef}
        {...dlg.panelProps}
        className="sheet-panel relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5 float max-h-[90dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)', ...drag.style }}
      >
        <div className="-mt-2 mb-1 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...drag.handlers}>
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-subtitle font-bold text-gray-900 dark:text-gray-100">
              {mode === 'add' ? 'Tambah Anggota' : 'Edit Anggota'}
            </p>
            <p className="text-caption text-ink-faint dark:text-gray-400 mt-0.5">
              {mode === 'add' ? 'Data warga baru RT' : initial?.nama}
            </p>
          </div>
          <button onClick={drag.dismiss} aria-label="Tutup" className="press w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
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
              onClick={() => { if (role !== r) haptic(); setRole(r); }}
              aria-pressed={role === r}
              className={`press min-h-[44px] py-3 rounded-xl text-body font-semibold border transition ${
                role === r
                  ? 'bg-brand text-white border-transparent' /* fill brand DATAR (MATERIAL-FLAT) — gradient+glow pra-flat dihapus */
                  : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-control dark:border-control-dark'
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
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-control dark:border-control-dark mb-4"
          >
            <span className="text-body font-semibold text-gray-700 dark:text-gray-200">Status keanggotaan</span>
            <span className={`text-caption font-bold px-3 py-1 rounded-full ${
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
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-body font-semibold text-amber-800 dark:text-amber-300">
                <History className="w-4 h-4 shrink-0" />
                Anggota susulan — sudah lunas tarikan lama
              </span>
              <span className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${susulan ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${susulan ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </span>
            </button>

            {susulan && (
              <div className="px-4 pb-4 space-y-2">
                <p className="text-pretty text-micro text-warn dark:text-amber-400 leading-relaxed">
                  Ditandai <b>hadir</b> di tarikan terpilih lalu kas dihitung ulang. Talangan warga lain tidak terpengaruh.
                </p>
                <div className="rounded-xl bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900/40 list-inset [--di-l:2.75rem] [--di-r:0.75rem] max-h-52 overflow-y-auto">
                  {selesaiTarikan.map((t) => {
                    const on = pilih.has(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => togglePilih(t.id)}
                        className="w-full flex items-center gap-3 px-3 py-3 text-left"
                      >
                        <span className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                          on ? 'bg-brand-500 border-brand-500' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {on && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-body font-semibold text-gray-800 dark:text-gray-100">
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
                  {pilih.size} tarikan dipilih · Kas Hadiran <span className="font-display tabular-nums">+{formatRupiahPlain(kasNaik)}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Peringatan: masih punya jadwal tarikan ke depan */}
        {jadwalNonaktif && (
          <div className="mb-4 rounded-2xl border border-rose-200 dark:border-rose-800/50 bg-rose-50/70 dark:bg-rose-900/15 p-4">
            <p className="flex items-center gap-2 text-body font-bold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" /> Masih punya jadwal ke depan
            </p>
            <p className="text-pretty text-caption text-neg dark:text-rose-400/90 mt-1 leading-relaxed">
              {initial?.nama} masih jadi Sohibul Bait di {jadwalNonaktif.length} tarikan:{' '}
              <b>#{jadwalNonaktif.join(', #')}</b>. Setelah dinonaktifkan, jangan lupa ganti Sohibul Bait tarikan tersebut lewat <b>Revisi jadwal</b>.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={jadwalNonaktif ? () => setJadwalNonaktif(null) : drag.dismiss}
            className="btn-secondary flex-1 py-3 rounded-full"
          >
            Batal
          </button>
          <button
            onClick={() => { haptic(12); simpan(!!jadwalNonaktif); }}
            disabled={saving || !nama.trim()}
            className={`flex-1 py-3 rounded-full text-white text-body font-bold active:scale-[0.97] transition flex items-center justify-center gap-2 ${
              /* btn-danger, bukan bg-rose-600 tangan: satu sumber CTA merah →
                 ikut state nonaktif ber-fill abu (label tetap terbaca). */
              jadwalNonaktif ? 'btn-danger' : 'btn-brand'
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

  // Exit mundur ke kanan (page-out-right) baru unmount — satu jalur requestClose.
  const exit = useClosePhase(onClose, 160);
  useBackDismiss(open && !form, exit.requestClose);
  const dlg = useDialog(open && !form, { onClose: exit.requestClose, label: 'Kelola anggota' });

  const aktifCount = list.filter((w) => w.status_aktif).length;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((w) => w.nama.toLowerCase().includes(q) || w.no_rumah.toLowerCase().includes(q));
  }, [list, search]);

  if (!open) return null;

  return (
    <div ref={dlg.panelRef} {...dlg.panelProps} className={`fixed inset-0 z-overlay bg-sunken dark:bg-gray-950 ${exit.closing ? 'page-out-right' : 'page-in-right'} overflow-y-auto`}>
      <OverlayHeader
        icon={Users}
        title="Kelola Anggota"
        onBack={exit.requestClose}
        actions={<OverlayAction icon={RefreshCw} label="Muat ulang" onClick={load} spinning={loading} />}
      />

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}>
        {/* Penjaga `loading || error` (24 Agu 2026). Baris ini sebelumnya TANPA
            penjaga sama sekali — bahkan `loading` pun tidak — sehingga saat
            pemuatan gagal ia menulis "0 aktif · 0 total" tepat di atas
            ErrorState "Gagal memuat data", dan selama pemuatan normal ia
            sempat berkedip "0 aktif · 0 total" sebelum data datang.

            Nol di sini berarti "belum tahu", bukan "RT tak punya anggota" —
            kanon yang sama dgn "app kas DILARANG menyatakan nominal saat muat
            gagal", cuma untuk angka TELANJANG. Saudara dari cacat StatRow
            Jadwal (93f606c); ditemukan dgn menyapu SETIAP klaim berangka di
            seluruh layar dlm keadaan gagal, bukan dgn menebak.

            Tetap "—" dan bukan disembunyikan: barisnya di atas kolom cari, jadi
            menghilangkannya menggeser form naik lalu turun lagi saat berhasil. */}
        <p className="text-caption text-ink-faint dark:text-gray-400">
          {loading || error ? '—' : aktifCount} aktif · {loading || error ? '—' : list.length} total
        </p>

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
          // Skeleton MENCERMINKAN geometri list asli (satu kartu rounded-3xl +
          // baris divide-inset, px-4 py-4, --di-l/--di-r sama) → tak ada "lompat"
          // saat skeleton → konten. Sebelumnya: 6 kartu rounded-2xl terpisah
          // (space-y-2) yang menyatu jadi satu kartu saat data datang — melanggar
          // standar anti-jump app (lihat BannerSkeleton di Beranda).
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-4 [--di-l:4.25rem] [--di-r:1rem] ${i < 7 ? 'divide-inset' : ''}`}>
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
                // ~79+ baris (aktif + nonaktif): content-visibility lewati render
                // baris di luar layar — pola sama dgn Jadwal.tsx & KasRT.tsx.
                /* Stagger masuk — dialek gerak bersama (lihat Jadwal.tsx). `.rise`
                   duduk di elemen yang SAMA dgn `content-visibility:auto`, persis
                   pola KasRT.tsx: animasi elemen itu sendiri tetap jalan, yang
                   dilewati cuma render ISI baris di luar layar. */
                style={{ animationDelay: `${Math.min(idx, 10) * 0.035}s` }}
                className={`rise w-full flex items-center gap-3 px-4 py-4 text-left [--di-l:4.25rem] [--di-r:1rem] [content-visibility:auto] [contain-intrinsic-block-size:auto_76px] active:bg-gray-50 dark:active:bg-gray-800/60 transition-colors ${
                  idx < filtered.length - 1 ? 'divide-inset' : ''
                }`}
              >
                {/* `AvatarPeci`, bukan tile bertint sendiri (24 Agu 2026).
                    Dua alasan, keduanya soal SATU SUARA:

                    1. Dialek. App punya satu avatar inisial — slate netral,
                       ring hairline — dipakai Beranda, Talangan, Kas Hadiran,
                       Tentang App. Halaman ini satu-satunya yang menggambar
                       versinya sendiri, padahal ia menampilkan ORANG YANG SAMA:
                       Ustad Saiful Hadi berkeping abu di Talangan lalu berkeping
                       hijau di sini.

                    2. Sinyal yang tak pernah berubah bukan sinyal. Tint hijau
                       dulu menandai `status_aktif` — dan 70 dari 71 anggota
                       aktif, jadi warna TERKUAT di palet dipakai di hampir tiap
                       baris tanpa membedakan apa pun; yang terbaca cuma dinding
                       hijau. Statusnya toh sudah ter-encode DUA kali lagi di
                       baris yang sama, keduanya lebih jujur: nama meredup jadi
                       gray-500, dan Tag "Nonaktif" menyebutnya dengan KATA
                       (kanon yang sama dgn chip "Defisit" — status dibawa kata,
                       bukan dgn mewarnai). Yang hilang cuma sandi ketiga yang
                       paling mahal dan paling tak informatif. */}
                <AvatarPeci nama={w.nama} ukuran={10} />
                <div className="flex-1 min-w-0">
                  <p className={`text-body font-semibold potong-lentur ${w.status_aktif ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {w.nama}
                  </p>
                  <p className="text-micro text-ink-faint dark:text-gray-400 flex items-center gap-2 mt-0.5">
                    {w.no_rumah && <span className="inline-flex items-center gap-0.5"><Home className="w-3 h-3" />{w.no_rumah}</span>}
                    {w.no_hp && <span className="inline-flex items-center gap-0.5"><Phone className="w-3 h-3" />{w.no_hp}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {w.role === 'bendahara' && <Tag tone="success">Bendahara</Tag>}
                  {!w.status_aktif && <Tag tone="neutral">Nonaktif</Tag>}
                  {/* Aturan yang sama dgn tombol baris Jadwal (4 Agu): abu di app
                      ini SINYAL KONTROL INAKTIF, jadi ikon aksi yang aktif tak
                      boleh memakainya. Sisi gelapnya yang paling terasa —
                      gray-500 di atas kartu gray-900 cuma 3,70:1, ikon paling
                      redup di seluruh daftar; gray-300 ≈12:1. Barisnya sendiri
                      memang seluruhnya tombol (44px), pensil ini penanda
                      "bisa diubah", bukan target terpisah. */}
                  <Pencil className="w-3.5 h-3.5 text-ink-faint dark:text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* FAB Tambah — komponen Fab, bukan tombol tangan: versi lama duduk di
          TENGAH tanpa whitespace-nowrap (labelnya patah 2 baris di 360px), tanpa
          kerut-saat-scroll, dan tanpa kunci lapisan GPU (FAB fixed ikut terseret
          di iOS Safari). overNav=false karena halaman overlay tak punya nav. */}
      <Fab
        label="Tambah Anggota"
        icon={UserPlus}
        ariaLabel="Tambah anggota"
        overNav={false}
        disabled={error}
        onClick={() => setForm({ mode: 'add', warga: null })}
      />

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
