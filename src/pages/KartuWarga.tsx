import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Contact, Search, UserRound, Users, AlertTriangle } from 'lucide-react';
import OverlayHeader from '../components/layout/OverlayHeader';
import AvatarPeci from '../components/AvatarPeci';
import ClearButton from '../components/ClearButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { HeroStats } from '../components/HeroSaldo';
import MetaPisah from '../components/MetaPisah';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useClosePhase } from '../hooks/useClosePhase';
import { useUmumkanHasil } from '../hooks/useUmumkanHasil';
import { haptic, formatRupiahPlain, formatTanggal, formatTanggalRingkas } from '../lib/utils';
import {
  ambilDaftarKartu,
  ambilDataWarga,
  susunKartu,
  type KartuWarga as DataKartu,
  type StatusJejak,
  type BarisAbsensi,
  type BarisTalangan,
  type TarikanRingkas,
} from '../lib/kartuWarga';
import type { Warga } from '../lib/types';
import { bacaPilihan, simpanPilihan } from '../lib/kartuIngat';
import { umumkanSaja } from '../lib/toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

/* Pilihan nama diingat di perangkat ini saja — lihat `lib/kartuIngat.ts`
   (sumber bersama dgn slide Kartu Warga di carousel Beranda). */
/* BENTUK kartu terakhir (jumlah tunggakan & talangan lunas) untuk warga yang
   diingat — HANYA petunjuk tata letak kerangka, tak pernah ditampilkan sbg
   angka. Kartu ini hampir selalu dibuka untuk nama yang SAMA, jadi kunjungan
   berikutnya kerangkanya setinggi isinya (terukur +271…+338px tanpa ini).
   Data talangan semua warga demi kerangka saja sudah diukur & DITOLAK: 304
   baris / 22,8 kB hari ini dan tumbuh tiap tarikan. */
const KUNCI_BENTUK = 'hadiran-kartu-bentuk';
interface BentukKartu { id: string; belum: number; lunas: number }
function bacaBentuk(id: string | null): BentukKartu | null {
  if (!id) return null;
  try { const b = JSON.parse(localStorage.getItem(KUNCI_BENTUK) || 'null'); return b && b.id === id ? b : null; } catch { return null; }
}
function simpanBentuk(b: BentukKartu) {
  try { localStorage.setItem(KUNCI_BENTUK, JSON.stringify(b)); } catch { /* abaikan */ }
}

const KOSONG_BELUM = ['Belum ada anggota', 'Daftar anggota muncul setelah bendahara menambahkan warga.'] as const;
const KOSONG_CARI = ['Tidak ada hasil', 'Coba kata kunci lain.'] as const;

export default function KartuWarga({ open, onClose }: Props) {
  const exit = useClosePhase(onClose, 160);
  useBackDismiss(open, exit.requestClose);
  const dlg = useDialog(open, { onClose: exit.requestClose, label: 'Kartu saya' });

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

  /* Nama ikut diingat (untuk sapaan slide Kartu Warga di Beranda) dan
     DISEGARKAN tiap kartu terbuka — warga yang memilih sebelum 19 Okt 2026
     belum punya nama tersimpan, dan bendahara bisa mengganti ejaan nama. */
  useEffect(() => { if (warga) simpanPilihan(warga.id, warga.nama); }, [warga]);

  // Ingatan menunjuk warga yang sudah tak aktif/terhapus → lupakan, tampilkan pencarian.
  useEffect(() => {
    if (daftar && pilihanId && !warga) { simpanPilihan(null); setPilihanId(null); }
  }, [daftar, pilihanId, warga]);

  const hasil = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (daftar?.warga ?? []).filter((w) => !q || w.nama.toLowerCase().includes(q));
  }, [daftar, search]);

  /* Kolom cari sudah hidup selama daftar dimuat (kanon Kelola Anggota), jadi
     pemicunya ditahan '' sampai daftar ada — kalau tidak, ketikan selagi memuat
     diumumkan "Tidak ada hasil" untuk daftar yang belum tiba. Ketikan itu
     diumumkan begitu daftarnya datang. */
  useUmumkanHasil(
    hasil.length,
    'warga',
    [daftar ? search : ''],
    (daftar && daftar.warga.length === 0 ? KOSONG_BELUM : KOSONG_CARI).join('. '),
  );

  const kartu = useMemo(
    () => (daftar && data && pilihanId ? susunKartu(pilihanId, daftar.tarikan, data.absensi, data.talangan) : null),
    [daftar, data, pilihanId],
  );

  useEffect(() => {
    if (kartu && pilihanId) simpanBentuk({ id: pilihanId, belum: kartu.tunggakan.length, lunas: kartu.talanganLunas.length });
  }, [kartu, pilihanId]);

  /* Bentuk kartu yang SUDAH bisa diketahui dari daftar tarikan saja — untuk
     kerangka (jumlah bulatan jejak & baris "Sudah menerima"), tak pernah tampil. */
  const perkiraan = useMemo(
    () => (daftar && pilihanId ? susunKartu(pilihanId, daftar.tarikan, [], []) : null),
    [daftar, pilihanId],
  );

  function pilih(w: Warga) {
    haptic();
    simpanPilihan(w.id, w.nama);
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
      <OverlayHeader icon={UserRound} title="Kartu Saya" onBack={exit.requestClose} />

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
        {/* App kas dilarang menyatakan angka saat gagal muat: tak ada kartu,
            tak ada nol — hanya ErrorState. */}
        {errorDaftar ? (
          <ErrorState onRetry={coba} />
        ) : !daftar ? (
          /* Kerangka mengikuti layar yang AKAN tampil: kartu kalau nama sudah
             diingat di HP ini, daftar nama kalau belum. */
          pilihanId ? (
            <>
              <IdentitasKerangka />
              <KartuKerangka perkiraan={null} bentuk={bacaBentuk(pilihanId)} />
            </>
          ) : (
            <PilihNama
              warga={null}
              hasil={hasil}
              search={search}
              setSearch={setSearch}
              onPilih={pilih}
            />
          )
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
            <KepalaKartu warga={warga} kartu={null} onGanti={ganti} />
            <ErrorState onRetry={coba} />
          </>
        ) : !kartu ? (
          <>
            <KepalaKartu warga={warga} kartu={null} onGanti={ganti} />
            <KartuKerangka perkiraan={perkiraan} bentuk={bacaBentuk(pilihanId)} />
          </>
        ) : (
          <>
            <KepalaKartu warga={warga} kartu={kartu} onGanti={ganti} />
            {/* Talangan di atas: ini yang paling dicari warga ("sudah lunas belum?"). */}
            <KartuTalangan kartu={kartu} />
            <JejakKehadiran kartu={kartu} />
            <KartuSohibul kartu={kartu} />
          </>
        )}
      </main>
    </div>
  );
}

/* ── Kerangka ───────────────────────────────────────────────────────────────
   Meniru PERMUKAAN tujuannya (kartu putih ber-hairline, bukan blok abu di atas
   kanvas) DAN kotak barisnya: tiap batang duduk di dalam baris teks berkelas
   peran yang sama dgn isinya, jadi tingginya lahir dari line-height yang sama.
   Sebelumnya dua blok abu polos: daftar nama meloncat 65px saat tiba, dan
   kerangka kartu 224px lawan isi 557px. Varian kartu yang ditiru = TANPA
   talangan (bentuk paling umum); kartu bertalangan memang lebih tinggi. */
const bar = 'inline-block align-middle rounded-lg skeleton';
const KARTU = 'rounded-3xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800/60 lift';
const LEBAR_NAMA = ['w-2/5', 'w-1/2', 'w-1/3', 'w-3/5', 'w-2/5', 'w-1/2', 'w-1/3', 'w-2/5'];

/** Kepala kerangka = hero yang sama, nama & rumah jadi batang; teks statis
 *  (eyebrow, label kaki, "Bukan saya?") tetap teks supaya tingginya identik. */
function IdentitasKerangka() {
  return (
    <div aria-hidden="true" className="relative overflow-hidden rounded-3xl hero-emerald" style={{ boxShadow: 'var(--hero-shadow)' }}>
      <div className="relative p-6">
        <p className="flex min-w-0 items-center gap-2 text-micro font-semibold uppercase tracking-[0.12em] text-white/90">
          <Contact className="h-4 w-4 shrink-0 text-white/80" />
          <span className="potong-lentur">{'Anggota Hadiran · RT\u00A0004/006'}</span>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="w-12 h-12 rounded-2xl skeleton skeleton-hero shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-title leading-tight"><span className={`${bar} skeleton-hero h-5 w-36 max-w-full`} /></p>
            <p className="mt-0.5 text-caption"><span className={`${bar} skeleton-hero h-3 w-20`} /></p>
          </div>
          <span className="shrink-0 ml-auto min-h-[44px] px-3 rounded-xl inline-flex items-center text-caption font-semibold bg-white/10"><span className="invisible">Bukan saya?</span></span>
        </div>
        <HeroStats className="mt-5 pt-5" items={[
          { icon: CheckCircle2, label: 'Hadir', value: '—' },
          { icon: AlertTriangle, label: 'Talangan', value: '—' },
          { icon: CalendarDays, label: 'Giliran', value: '—' },
        ]} />
      </div>
    </div>
  );
}

/* Varian talangan yang ditiru = varian TUNGGAL paling umum: tanpa tunggakan &
   tanpa riwayat (21 dari 70, 18 Okt 2026; sisanya tersebar 1/2/3+ baris lunas
   dan 13 menunggak). Kartu warga lain hanya TUMBUH ke bawah, tak pernah
   menciut — data talangan baru ada sesudah datanya tiba. Jejak & Sohibul Bait
   memakai `perkiraan` (susunKartu tanpa absen/talangan — daftar tarikan SUDAH
   dimuat): jumlah bulatan & baris "Sudah menerima" tepat, tanpa satu angka pun
   dinyatakan sebelum datanya tiba. */
const JEJAK_KIRA = 24;
/** Satu baris daftar talangan di kerangka: "Tarikan #N" + tanggal · penarik. */
function BarisKerangka() {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-body"><span className={`${bar} h-4 w-24`} /></p>
        <p className="text-caption"><span className={`${bar} h-3 w-40 max-w-full`} /></p>
      </div>
      <span className="text-caption"><span className={`${bar} h-3 w-16`} /></span>
    </div>
  );
}

function KartuKerangka({ perkiraan, bentuk }: { perkiraan: DataKartu | null; bentuk: BentukKartu | null }) {
  const nJejak = perkiraan?.jejak.length ?? JEJAK_KIRA;
  const belum = bentuk?.belum ?? 0, lunas = bentuk?.lunas ?? 0;
  return (
    <>
      <div aria-hidden="true" className={`${KARTU} p-5`}>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl skeleton shrink-0" />
          {belum > 0 ? (
            <div className="min-w-0 flex-1">
              <p className="text-caption"><span className={`${bar} h-3 w-32`} /></p>
              <p className="text-title"><span className={`${bar} h-5 w-28`} /></p>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="text-body"><span className={`${bar} h-4 w-36`} /></p>
              {/* Kalimat ASLI `invisible` (ia melipat 2 baris @390 kalau ada riwayat). */}
              <p className="text-caption mt-0.5 grid">
                <span className="invisible col-start-1 row-start-1">{lunas > 0 ? `Pernah ditalangi ${lunas}×, semuanya sudah lunas.` : 'Belum pernah kena talangan.'}</span>
                <span className="col-start-1 row-start-1"><span className={`${bar} h-3 w-52 max-w-full`} /></span>
              </p>
            </div>
          )}
        </div>
        {belum > 0 && (
          <>
            <div className="mt-4">{Array.from({ length: belum }, (_, i) => <BarisKerangka key={i} />)}</div>
            {/* Petunjuk melunasi = teks statis 2 baris @390 — dicetak `invisible`
                supaya pelipatannya sama, batang di baris pertamanya. */}
            <p className="text-caption mt-3 grid">
              <span className="invisible col-start-1 row-start-1">Hubungi bendahara untuk melunasi. Hanya bendahara yang bisa menandai lunas.</span>
              <span className="col-start-1 row-start-1"><span className={`${bar} h-3 w-4/5`} /></span>
            </p>
          </>
        )}
        {lunas > 0 && (
          <div className="mt-4 border-t border-line dark:border-gray-800 pt-4">
            <p className="text-micro"><span className={`${bar} h-3 w-20`} /></p>
            <div className="mt-1">{Array.from({ length: Math.min(lunas, LUNAS_RINGKAS) }, (_, i) => <BarisKerangka key={i} />)}</div>
            {lunas > LUNAS_RINGKAS && <p className="mt-1 min-h-[44px] flex items-center text-caption"><span className={`${bar} h-3 w-24`} /></p>}
          </div>
        )}
      </div>
      {nJejak > 0 && (
        <div aria-hidden="true" className={`${KARTU} p-5`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-body"><span className={`${bar} h-4 w-32`} /></p>
            <p className="text-caption"><span className={`${bar} h-3 w-16`} /></p>
          </div>
          <ol className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-2">
            {Array.from({ length: nJejak }, (_, i) => (
              <li key={i} className="flex justify-center"><span className="w-9 h-9 rounded-full skeleton" /></li>
            ))}
          </ol>
          <p className="mt-3 text-caption"><span className={`${bar} h-3 w-48 max-w-full`} /></p>
          {/* Legenda = label ASLI (kata statis, bukan klaim) + batang di tempat
              hitungannya, jadi ia melipat di titik yang sama. "Sohibul Bait"
              ikut kalau `perkiraan` tahu warga ini pernah menerima. */}
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {(['hadir', 'tidak_hadir', ...(perkiraan?.jejak.some((j) => j.status === 'sohibul') ? ['sohibul' as const] : [])] as StatusJejak[]).map((st) => (
              <li key={st} className="flex items-center gap-2 text-caption text-ink-sub dark:text-gray-400">
                <span className="w-3 h-3 rounded-full skeleton" />
                {LABEL_JEJAK[st]} <span className={`${bar} h-3 w-4`} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div aria-hidden="true" className={`${KARTU} p-5`}>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl skeleton shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-caption"><span className={`${bar} h-3 w-32`} /></p>
            <p className="text-body"><span className={`${bar} h-4 w-52 max-w-full`} /></p>
          </div>
        </div>
        {(perkiraan ? perkiraan.giliran : true) && <p className="text-caption mt-3"><span className={`${bar} h-3 w-56 max-w-full`} /></p>}
        {perkiraan && perkiraan.sudahMenerima.length > 0 && (
          <div className="mt-4 border-t border-line dark:border-gray-800 pt-4">
            <p className="text-micro"><span className={`${bar} h-3 w-24`} /></p>
            <div className="mt-1">
              {perkiraan.sudahMenerima.map((t) => (
                <div key={t.nomor} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body"><span className={`${bar} h-4 w-24`} /></p>
                    <p className="text-caption"><span className={`${bar} h-3 w-32`} /></p>
                  </div>
                  <span className="text-body"><span className={`${bar} h-4 w-24`} /></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Isi kartu ─────────────────────────────────────────────────────────────
   Dicetak ulang 18 Okt 2026 ("maksimalkan isi & tampilan"). Dulu empat kartu
   putih bertumpuk; datanya justru jauh lebih kaya dari yang tampil — 49 warga
   punya riwayat talangan LUNAS dan 24 sudah pernah jadi Sohibul Bait, tapi
   kartu cuma menulis "Sudah menerima: #19". Kini: kepala = hero (permukaan
   yang sama dgn hero Jadwal & carousel Beranda), lalu talangan (+ riwayat
   lunas), jejak kehadiran per tarikan, dan Sohibul Bait (+ pendapatan kotor). */

/** Kepala kartu: hero. `kartu` null = data warga masih dimuat/gagal — kaki
 *  statistik "—" (app dilarang menyatakan angka yang belum ia ketahui). */
function KepalaKartu({ warga, kartu, onGanti }: { warga: Warga; kartu: DataKartu | null; onGanti: () => void }) {
  const tercatat = kartu ? kartu.hadir + kartu.titip + kartu.tidakHadir : 0;
  return (
    <div className="relative overflow-hidden rounded-3xl hero-emerald" style={{ boxShadow: 'var(--hero-shadow)' }}>
      <div className="hero-sheen pointer-events-none absolute inset-0" />
      <div className="relative p-6">
        <p className="flex min-w-0 items-center gap-2 text-micro font-semibold uppercase tracking-[0.12em] text-white/90">
          <Contact className="h-4 w-4 shrink-0 text-white/80" />
          <span className="potong-lentur">{'Anggota Hadiran · RT\u00A0004/006'}</span>
        </p>
        {/* `flex-wrap` + kolom nama `min-w-min` (19 Okt 2026): @320px kolom nama
            tinggal ±68px di antara avatar & "Bukan saya?", dan `break-words`
            membelah "Niman" jadi "Nim/an" (audit:kata-patah). Kini kolom tak
            pernah lebih sempit dari KATA terpanjangnya; kalau tak muat, tombolnya
            yang turun sebaris. 360/390px tak berubah untuk nama yang ada. */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <AvatarPeci nama={warga.nama} ukuran={12} sorot />
          <div className="min-w-min flex-1">
            <h2 className="text-title font-bold leading-tight text-white break-words">{warga.nama}</h2>
            {warga.no_rumah && <p className="mt-0.5 text-caption text-white/90">Rumah {warga.no_rumah}</p>}
          </div>
          <button
            onClick={onGanti}
            className="press shrink-0 ml-auto min-h-[44px] px-3 rounded-xl text-caption font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors"
          >
            Bukan saya?
          </button>
        </div>
        <HeroStats
          className="mt-5 pt-5"
          items={[
            { icon: CheckCircle2, label: 'Hadir', value: kartu ? `${kartu.hadir}/${tercatat}` : '—' },
            { icon: AlertTriangle, label: 'Talangan', value: kartu ? (kartu.totalTunggakan > 0 ? formatRupiahPlain(kartu.totalTunggakan) : 'Lunas') : '—' },
            { icon: CalendarDays, label: 'Giliran', value: kartu ? (kartu.giliran ? `#${kartu.giliran.nomor}` : kartu.sudahMenerima.length > 0 ? 'Selesai' : '—') : '—' },
          ]}
        />
      </div>
    </div>
  );
}

const JUDUL_KARTU = '[font-family:inherit] [letter-spacing:normal] text-body font-bold text-ink dark:text-gray-100';
const SUB_JUDUL = 'text-micro font-bold uppercase tracking-wide text-ink-faint dark:text-gray-400';

/* Riwayat lunas bisa panjang (terukur 8 baris untuk satu warga — selayar
   penuh yang mendorong jejak kehadiran ke bawah lipatan). Tampil 3 terbaru;
   sisanya di balik satu ketukan. */
const LUNAS_RINGKAS = 3;

function KartuTalangan({ kartu }: { kartu: DataKartu }) {
  const [semua, setSemua] = useState(false);
  const belum = kartu.tunggakan.length > 0;
  const lunas = kartu.talanganLunas;
  const tampil = semua ? lunas : lunas.slice(0, LUNAS_RINGKAS);
  return (
    <section aria-label="Talangan" className={`${KARTU} p-5`}>
      <div className="flex items-center gap-3">
        {belum ? (
          <span className="icon-tile w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-neg dark:text-rose-400" aria-hidden="true" />
          </span>
        ) : (
          <span className="icon-tile w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </span>
        )}
        {belum ? (
          <div className="min-w-0">
            <p className="text-caption text-ink-sub dark:text-gray-400">Talangan belum lunas</p>
            <p className="font-display text-title font-bold text-neg dark:text-rose-400 tabular-nums">
              {formatRupiahPlain(kartu.totalTunggakan)}
            </p>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-body font-semibold text-ink dark:text-gray-100">Tidak ada talangan</p>
            <p className="text-caption text-ink-sub dark:text-gray-400 mt-0.5">
              {lunas.length > 0 ? `Pernah ditalangi ${lunas.length}×, semuanya sudah lunas.` : 'Belum pernah kena talangan.'}
            </p>
          </div>
        )}
      </div>
      {belum && (
        <>
          <ul className="mt-4 divide-y divide-line dark:divide-gray-800">
            {kartu.tunggakan.map((t) => (
              <li key={t.nomor} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-body font-medium text-ink dark:text-gray-100">Tarikan #{t.nomor}</p>
                  {/* Tanggal · penarik — warga mengingat tarikan lewat SIAPA penariknya. */}
                  <MetaPisah className="text-caption text-ink-sub dark:text-gray-400" bagian={[formatTanggal(t.tanggal), t.penarik]} />
                </div>
                {/* Angka biasa, bukan pil (16 Okt 2026) — merahnya cukup di total kepala. */}
                <span className="text-caption font-display font-semibold tabular-nums text-ink-sub dark:text-gray-300 whitespace-nowrap">
                  {formatRupiahPlain(t.nominal)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-caption text-ink-sub dark:text-gray-400 mt-3">
            Hubungi bendahara untuk melunasi. Hanya bendahara yang bisa menandai lunas.
          </p>
        </>
      )}
      {lunas.length > 0 && (
        <div className="mt-4 border-t border-line dark:border-gray-800 pt-4">
          <p className={SUB_JUDUL}>Sudah lunas</p>
          <ul id="talangan-lunas" className="mt-1 divide-y divide-line dark:divide-gray-800">
            {tampil.map((t) => (
              <li key={t.nomor} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-body font-medium text-ink dark:text-gray-100">Tarikan #{t.nomor}</p>
                  <MetaPisah className="text-caption text-ink-sub dark:text-gray-400" bagian={[formatTanggal(t.tanggal), t.penarik]} />
                </div>
                <span className="text-caption font-semibold text-pos dark:text-emerald-400 whitespace-nowrap">
                  {t.tanggalLunas ? `Lunas ${formatTanggalRingkas(t.tanggalLunas)}` : 'Lunas'}
                </span>
              </li>
            ))}
          </ul>
          {lunas.length > LUNAS_RINGKAS && (
            <button
              onClick={() => { haptic(); setSemua((x) => !x); }}
              aria-expanded={semua}
              aria-controls="talangan-lunas"
              className="press mt-1 -mx-3 min-h-[44px] px-3 rounded-xl text-caption font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {semua ? 'Ringkas' : `Lihat semua (${lunas.length})`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* Satu bulatan per tarikan SELESAI. Warna + nomor + teks sr-only (warna tak
   pernah jadi satu-satunya penanda). Hadir & tidak = isian penuh (putih di
   atas pos/neg: 8,96 & 8,78:1); titip = cincin biru; Sohibul Bait = cincin
   emas songket (sorot dekoratif, artinya ditulis di legenda); tanpa catatan =
   abu putus-putus. */
const GAYA_JEJAK: Record<StatusJejak, string> = {
  hadir: 'bg-pos text-white dark:bg-emerald-400 dark:text-gray-950',
  titip: 'bg-white text-blue-600 ring-2 ring-inset ring-blue-600 dark:bg-gray-900 dark:text-blue-400 dark:ring-blue-400',
  tidak_hadir: 'bg-neg text-white dark:bg-rose-400 dark:text-gray-950',
  sohibul: 'bg-white text-ink ring-2 ring-inset ring-[var(--gold-songket)] dark:bg-gray-900 dark:text-gray-100',
  kosong: 'bg-gray-50 text-ink-faint ring-1 ring-inset ring-line dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700',
};
const LABEL_JEJAK: Record<StatusJejak, string> = {
  hadir: 'Hadir', titip: 'Titip', tidak_hadir: 'Tidak hadir', sohibul: 'Sohibul Bait', kosong: 'Belum tercatat',
};
const URUT_LEGENDA: StatusJejak[] = ['hadir', 'titip', 'tidak_hadir', 'sohibul', 'kosong'];

/* Bulatan bisa DIKETUK (19 Okt 2026, permintaan user): di iPhone `title`
   tak pernah tampil, jadi "#20 merah" tak menjawab "kapan & tarikan siapa?".
   Rincian muncul di SATU slot di bawah kisi (menggantikan petunjuknya) dan
   diumumkan lewat region polite Toaster (`umumkanSaja`), bukan region baru.
   Target sentuh 44px tanpa tumpang-tindih: bulatan 36px + `before:-inset-1`
   (4px tiap sisi) dgn celah 8px — dua pelebaran bertetangga bertemu PERSIS.
   Tanda terpilih = `outline`, BUKAN `ring`: cincin status (titip/Sohibul
   Bait) sudah memakai ring, dan ring kedua menimpanya. */
function JejakKehadiran({ kartu }: { kartu: DataKartu }) {
  const [pilih, setPilih] = useState<number | null>(null);
  if (kartu.jejak.length === 0) return null;
  const jumlah = (st: StatusJejak) => kartu.jejak.filter((j) => j.status === st).length;
  const terpilih = kartu.jejak.find((j) => j.nomor === pilih) ?? null;
  const rincian = (j: (typeof kartu.jejak)[number]) => [
    `Tarikan #${j.nomor}`,
    formatTanggal(j.tanggal),
    j.status === 'sohibul' ? 'Anda Sohibul Bait' : j.penarik ? `Sohibul Bait ${j.penarik}` : null,
    j.status === 'sohibul' ? null : LABEL_JEJAK[j.status],
  ];
  function ketuk(n: number) {
    haptic();
    const baru = pilih === n ? null : n;
    setPilih(baru);
    const j = kartu.jejak.find((x) => x.nomor === baru);
    if (j) umumkanSaja(rincian(j).filter(Boolean).join(', '));
  }
  return (
    <section aria-label="Jejak kehadiran" className={`${KARTU} p-5`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={JUDUL_KARTU}>Jejak Kehadiran</h2>
        <p className="text-caption text-ink-sub dark:text-gray-400 whitespace-nowrap">{kartu.jejak.length} tarikan</p>
      </div>
      <ol className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-2">
        {kartu.jejak.map((j) => (
          <li key={j.nomor} className="flex justify-center">
            <button
              type="button"
              onClick={() => ketuk(j.nomor)}
              aria-pressed={pilih === j.nomor}
              aria-label={`Tarikan #${j.nomor}: ${LABEL_JEJAK[j.status]}`}
              className={`press pilihan-isi-hover relative w-9 h-9 rounded-full inline-flex items-center justify-center text-micro font-bold tabular-nums before:absolute before:-inset-1 before:content-[''] ${GAYA_JEJAK[j.status]} ${pilih === j.nomor ? 'outline outline-2 outline-offset-2 outline-ink dark:outline-gray-100' : ''}`}
            >
              {j.nomor}
            </button>
          </li>
        ))}
      </ol>
      {/* Slot tetap: petunjuk ↔ rincian. */}
      {terpilih ? (
        <MetaPisah className="mt-3 text-caption font-semibold text-ink dark:text-gray-100" bagian={rincian(terpilih)} />
      ) : (
        <p className="mt-3 text-caption text-ink-sub dark:text-gray-400">Ketuk bulatan untuk melihat rinciannya.</p>
      )}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Keterangan warna">
        {URUT_LEGENDA.filter((st) => jumlah(st) > 0 || st === 'hadir' || st === 'tidak_hadir').map((st) => (
          <li key={st} className="flex items-center gap-2 text-caption text-ink-sub dark:text-gray-400">
            <span aria-hidden="true" className={`w-3 h-3 rounded-full ${GAYA_JEJAK[st]}`} />
            {LABEL_JEJAK[st]} <span className="font-semibold tabular-nums text-ink dark:text-gray-100">{jumlah(st)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function KartuSohibul({ kartu }: { kartu: DataKartu }) {
  return (
    <section aria-label="Giliran Sohibul Bait" className={`${KARTU} p-5`}>
      <div className="flex items-center gap-3">
        <span className="icon-tile w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-caption text-ink-sub dark:text-gray-400">Giliran Sohibul Bait</p>
          {kartu.giliran ? (
            /* MetaPisah: @320px baris ini melipat — tanggal tak terpisah dari harinya. */
            <MetaPisah className="text-body font-semibold text-ink dark:text-gray-100" bagian={[`Tarikan #${kartu.giliran.nomor}`, formatTanggal(kartu.giliran.tanggal)]} />
          ) : (
            <p className="text-body font-semibold text-ink dark:text-gray-100">Belum ada jadwal</p>
          )}
        </div>
      </div>
      {kartu.giliran && (
        <p className="text-caption text-ink-sub dark:text-gray-400 mt-3">
          {kartu.giliran.sisaSebelum === 0 ? 'Ini tarikan berikutnya.' : `${kartu.giliran.sisaSebelum} tarikan lagi sebelum giliran ini.`}
        </p>
      )}
      {kartu.sudahMenerima.length > 0 && (
        <div className="mt-4 border-t border-line dark:border-gray-800 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className={SUB_JUDUL}>Sudah menerima</p>
            <p className={SUB_JUDUL}>Pendapatan kotor</p>
          </div>
          <ul className="mt-1 divide-y divide-line dark:divide-gray-800">
            {kartu.sudahMenerima.map((t) => (
              <li key={t.nomor} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-body font-medium text-ink dark:text-gray-100">Tarikan #{t.nomor}</p>
                  <p className="text-caption text-ink-sub dark:text-gray-400">{formatTanggal(t.tanggal)}</p>
                </div>
                <span className="font-display text-body font-semibold tabular-nums text-ink dark:text-gray-100 whitespace-nowrap">
                  {t.pendapatanKotor !== null ? formatRupiahPlain(t.pendapatanKotor) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PilihNama({
  warga,
  hasil,
  search,
  setSearch,
  onPilih,
}: {
  /** null = daftar masih dimuat: kepala & kolom cari tetap tampil (keduanya
   *  tak bergantung data), hanya isi kartu yang jadi kerangka. */
  warga: Warga[] | null;
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
        {!warga ? (
          <ul aria-hidden="true" className="list-inset [--di-l:4.25rem] [--di-r:1rem]">
            {LEBAR_NAMA.map((w, i) => (
              <li key={i} className="flex items-center gap-3 min-h-[44px] px-4 py-3">
                <span className="w-10 h-10 rounded-xl skeleton shrink-0" />
                <span className="min-w-0 flex-1 text-body"><span className={`${bar} h-4 ${w}`} /></span>
              </li>
            ))}
          </ul>
        ) : hasil.length === 0 ? (
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
