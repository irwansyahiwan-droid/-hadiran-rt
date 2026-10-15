import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Search, UserRound, Users, AlertTriangle } from 'lucide-react';
import OverlayHeader from '../components/layout/OverlayHeader';
import AvatarPeci from '../components/AvatarPeci';
import ClearButton from '../components/ClearButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import StatRow from '../components/StatRow';
import Tag from '../components/Tag';
import MetaPisah from '../components/MetaPisah';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useClosePhase } from '../hooks/useClosePhase';
import { useUmumkanHasil } from '../hooks/useUmumkanHasil';
import { haptic, formatRupiahPlain, formatTanggal } from '../lib/utils';
import {
  ambilDaftarKartu,
  ambilDataWarga,
  susunKartu,
  type BarisAbsensi,
  type BarisTalangan,
  type TarikanRingkas,
} from '../lib/kartuWarga';
import type { Warga } from '../lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

/* Pilihan nama diingat di perangkat ini saja — kartu ini tanpa akun dan tanpa
   PIN (keputusan user: data yang tampil memang sudah terbuka untuk semua warga
   di Jadwal, Hadiran, dan Talangan). Storage bisa diblokir: semua akses
   dibungkus try/catch dan kartu tetap jalan tanpa ingatan. */
const KUNCI = 'hadiran-kartu-warga';

function bacaPilihan(): string | null {
  try { return localStorage.getItem(KUNCI); } catch { return null; }
}
function simpanPilihan(id: string | null) {
  try {
    if (id) localStorage.setItem(KUNCI, id);
    else localStorage.removeItem(KUNCI);
  } catch { /* abaikan (storage diblokir) */ }
}

const KOSONG_BELUM = ['Belum ada anggota', 'Daftar anggota muncul setelah bendahara menambahkan warga.'] as const;
const KOSONG_CARI = ['Tidak ada hasil', 'Coba kata kunci lain.'] as const;

export default function KartuWarga({ open, onClose }: Props) {
  const exit = useClosePhase(onClose, 160);
  useBackDismiss(open, exit.requestClose);
  const dlg = useDialog(open, { onClose: exit.requestClose, label: 'Kartu warga' });

  const [daftar, setDaftar] = useState<{ warga: Warga[]; tarikan: TarikanRingkas[] } | null>(null);
  const [errorDaftar, setErrorDaftar] = useState(false);
  const [pilihanId, setPilihanId] = useState<string | null>(bacaPilihan);
  const [data, setData] = useState<{ absensi: BarisAbsensi[]; talangan: BarisTalangan[] } | null>(null);
  const [errorData, setErrorData] = useState(false);
  const [search, setSearch] = useState('');
  const [percobaan, setPercobaan] = useState(0);

  useEffect(() => {
    let batal = false;
    setErrorDaftar(false);
    ambilDaftarKartu()
      .then((d) => { if (!batal) setDaftar(d); })
      .catch(() => { if (!batal) setErrorDaftar(true); });
    return () => { batal = true; };
  }, [percobaan]);

  useEffect(() => {
    if (!pilihanId) { setData(null); return; }
    let batal = false;
    setData(null);
    setErrorData(false);
    ambilDataWarga(pilihanId)
      .then((d) => { if (!batal) setData(d); })
      .catch(() => { if (!batal) setErrorData(true); });
    return () => { batal = true; };
  }, [pilihanId, percobaan]);

  const warga = useMemo(
    () => daftar?.warga.find((w) => w.id === pilihanId) ?? null,
    [daftar, pilihanId],
  );

  // Ingatan menunjuk warga yang sudah tak aktif/terhapus → lupakan, tampilkan pencarian.
  useEffect(() => {
    if (daftar && pilihanId && !warga) { simpanPilihan(null); setPilihanId(null); }
  }, [daftar, pilihanId, warga]);

  const hasil = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (daftar?.warga ?? []).filter((w) => !q || w.nama.toLowerCase().includes(q));
  }, [daftar, search]);

  useUmumkanHasil(
    hasil.length,
    'warga',
    [search],
    (daftar && daftar.warga.length === 0 ? KOSONG_BELUM : KOSONG_CARI).join('. '),
  );

  const kartu = useMemo(
    () => (daftar && data && pilihanId ? susunKartu(pilihanId, daftar.tarikan, data.absensi, data.talangan) : null),
    [daftar, data, pilihanId],
  );

  function pilih(w: Warga) {
    haptic();
    simpanPilihan(w.id);
    setSearch('');
    setPilihanId(w.id);
  }

  function ganti() {
    haptic();
    simpanPilihan(null);
    setPilihanId(null);
  }

  if (!open) return null;

  const coba = () => setPercobaan((n) => n + 1);

  return (
    <div ref={dlg.panelRef} {...dlg.panelProps} className={`fixed inset-0 z-overlay bg-sunken kanvas-cahaya dark:bg-gray-950 ${exit.closing ? 'page-out-right' : 'page-in-right'} overflow-y-auto [overscroll-behavior:contain]`}>
      <OverlayHeader icon={UserRound} title="Kartu Warga" onBack={exit.requestClose} />

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
        {/* App kas dilarang menyatakan angka saat gagal muat: tak ada kartu,
            tak ada nol — hanya ErrorState. */}
        {errorDaftar ? (
          <ErrorState onRetry={coba} />
        ) : !daftar ? (
          <div className="space-y-3" aria-hidden="true">
            <div className="skeleton h-12 rounded-2xl" />
            <div className="skeleton h-48 rounded-3xl" />
          </div>
        ) : !pilihanId || !warga ? (
          <PilihNama
            warga={daftar.warga}
            hasil={hasil}
            search={search}
            setSearch={setSearch}
            onPilih={pilih}
          />
        ) : errorData ? (
          <>
            <Identitas warga={warga} onGanti={ganti} />
            <ErrorState onRetry={coba} />
          </>
        ) : !kartu ? (
          <>
            <Identitas warga={warga} onGanti={ganti} />
            <div className="space-y-3" aria-hidden="true">
              <div className="skeleton h-24 rounded-3xl" />
              <div className="skeleton h-32 rounded-3xl" />
            </div>
          </>
        ) : (
          <>
            <Identitas warga={warga} onGanti={ganti} />

            {/* Talangan di atas: ini yang paling dicari warga ("sudah lunas belum?"). */}
            {kartu.tunggakan.length === 0 ? (
              <div className="flex items-center gap-3 rounded-3xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800/60 lift p-5">
                <span className="icon-tile w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-body font-semibold text-ink dark:text-gray-100">Tidak ada talangan</p>
                  <p className="text-caption text-ink-sub dark:text-gray-400 mt-0.5">Semua kewajiban sudah lunas.</p>
                </div>
              </div>
            ) : (
              <section aria-label="Talangan belum lunas" className="rounded-3xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800/60 lift p-5">
                <div className="flex items-center gap-3">
                  <span className="icon-tile w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-neg dark:text-rose-400" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-caption text-ink-sub dark:text-gray-400">Talangan belum lunas</p>
                    <p className="font-display text-title font-bold text-neg dark:text-rose-400 tabular-nums">
                      {formatRupiahPlain(kartu.totalTunggakan)}
                    </p>
                  </div>
                </div>
                <ul className="mt-4 divide-y divide-line dark:divide-gray-800">
                  {kartu.tunggakan.map((t) => (
                    <li key={t.nomor} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-body font-medium text-ink dark:text-gray-100">Tarikan #{t.nomor}</p>
                        <p className="text-caption text-ink-sub dark:text-gray-400">{formatTanggal(t.tanggal)}</p>
                      </div>
                      <Tag tone="danger">{formatRupiahPlain(t.nominal)}</Tag>
                    </li>
                  ))}
                </ul>
                <p className="text-caption text-ink-sub dark:text-gray-400 mt-3">
                  Hubungi bendahara untuk melunasi. Hanya bendahara yang bisa menandai lunas.
                </p>
              </section>
            )}

            <StatRow
              items={[
                { label: 'Hadir', value: kartu.hadir, tone: 'pos' },
                { label: 'Titip', value: kartu.titip, tone: 'info' },
                { label: 'Tidak', value: kartu.tidakHadir, tone: 'neg' },
              ]}
            />

            <section aria-label="Giliran Sohibul Bait" className="rounded-3xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800/60 lift p-5">
              <div className="flex items-center gap-3">
                <span className="icon-tile w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-caption text-ink-sub dark:text-gray-400">Giliran Sohibul Bait</p>
                  {kartu.giliran ? (
                    /* MetaPisah: @320px baris ini melipat — digabung jadi satu
                       teks ia patah jadi "Tarikan #30 · Sab," / "21 Nov 2026",
                       memisahkan tanggal dari harinya & menggantung titiknya. */
                    <MetaPisah
                      className="text-body font-semibold text-ink dark:text-gray-100"
                      bagian={[`Tarikan #${kartu.giliran.nomor}`, formatTanggal(kartu.giliran.tanggal)]}
                    />
                  ) : (
                    <p className="text-body font-semibold text-ink dark:text-gray-100">Belum ada jadwal</p>
                  )}
                </div>
              </div>
              {kartu.giliran && (
                <p className="text-caption text-ink-sub dark:text-gray-400 mt-3">
                  {kartu.giliran.sisaSebelum === 0
                    ? 'Ini tarikan berikutnya.'
                    : `${kartu.giliran.sisaSebelum} tarikan lagi sebelum giliran ini.`}
                </p>
              )}
              {kartu.sudahMenerima.length > 0 && (
                <p className="text-caption text-ink-sub dark:text-gray-400 mt-2">
                  Sudah menerima: {kartu.sudahMenerima.map((t) => `#${t.nomor}`).join(', ')}.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Identitas({ warga, onGanti }: { warga: Warga; onGanti: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800/60 lift p-5">
      <AvatarPeci nama={warga.nama} ukuran={12} />
      <div className="min-w-0 flex-1">
        <p className="text-subtitle font-bold text-ink dark:text-gray-100 break-words">{warga.nama}</p>
        {warga.no_rumah && <p className="text-caption text-ink-sub dark:text-gray-400">Rumah {warga.no_rumah}</p>}
      </div>
      <button
        onClick={onGanti}
        className="press shrink-0 min-h-[44px] px-3 rounded-xl text-caption font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        Bukan saya?
      </button>
    </div>
  );
}

function PilihNama({
  warga,
  hasil,
  search,
  setSearch,
  onPilih,
}: {
  warga: Warga[];
  hasil: Warga[];
  search: string;
  setSearch: (s: string) => void;
  onPilih: (w: Warga) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-title font-bold text-ink dark:text-gray-100">Cari nama Anda</h2>
        <p className="text-caption text-ink-sub dark:text-gray-400 mt-1">
          Pilih sekali, lain kali kartu Anda langsung tampil di HP ini.
        </p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
        <input
          name="cari-nama"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama warga…"
          aria-label="Cari nama warga"
          inputMode="search"
          enterKeyHint="search"
          className="field-search pr-11"
        />
        {search && <ClearButton onClick={() => setSearch('')} />}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
        {hasil.length === 0 ? (
          <EmptyState
            icon={Users}
            title={(warga.length === 0 ? KOSONG_BELUM : KOSONG_CARI)[0]}
            subtitle={(warga.length === 0 ? KOSONG_BELUM : KOSONG_CARI)[1]}
          />
        ) : (
          /* Pemisah INSET, sejajar awal teks nama (px-4 + avatar 40 + gap-3 =
             4.25rem) — kanon daftar app (Kelola Anggota, Talangan). Garis selebar
             kartu memotong kolom avatar dan terbaca sbg tabel, bukan daftar. */
          <ul className="list-inset [--di-l:4.25rem] [--di-r:1rem]">
            {hasil.map((w) => (
              <li key={w.id}>
                <button
                  onClick={() => onPilih(w)}
                  className="w-full flex items-center gap-3 min-h-[44px] px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800/60 dark:active:bg-gray-800 transition-colors"
                >
                  <AvatarPeci nama={w.nama} ukuran={10} />
                  <span className="min-w-0 flex-1 text-body font-medium text-ink dark:text-gray-100 break-words">{w.nama}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
