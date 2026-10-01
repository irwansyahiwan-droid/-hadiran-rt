import { useEffect, useMemo, useState } from 'react';
import {
  Search, History, Plus, Pencil, Trash2,
  CheckCircle2, RotateCcw, ArrowRight, RefreshCw, FileText,
  ChevronDown, Route, Lightbulb, Loader2 } from 'lucide-react';
import OverlayHeader, { OverlayAction } from '../components/layout/OverlayHeader';
import ClearButton from '../components/ClearButton';
import EmptyState from '../components/EmptyState';
import { useUmumkanHasil } from '../hooks/useUmumkanHasil';
import ErrorState from '../components/ErrorState';
import FilterChips from '../components/FilterChips';
import { useRealtime } from '../hooks/useRealtime';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useClosePhase } from '../hooks/useClosePhase';
import { fetchAktivitas, fetchKamus, formatAktivitas, formatWaktu, formatWaktuRelatif } from '../lib/aktivitas';
import type { KamusNama } from '../lib/aktivitas';
import { formatRupiahPlain, haptic, ikatFrasa, labelTanggalRelatif } from '../lib/utils';
import { showToast } from '../lib/toast';
import { useAksiBerat } from '../lib/hooks';
import type { AktivitasLog } from '../lib/types';
import type { Accent } from '../lib/aktivitas';

interface Props {
  open: boolean;
  onClose: () => void;
}

const FILTERS = [
  { id: 'semua', label: 'Semua' },
  { id: 'transaksi_kas', label: 'Kas Hadiran' },
  { id: 'kas_rt', label: 'Kas RT' },
  { id: 'tarikan', label: 'Tarikan' },
  { id: 'talangan', label: 'Talangan' },
] as const;

const ACCENT_CLS: Record<Accent, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
  rose: 'text-neg dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
};

function iconFor(row: AktivitasLog) {
  if (row.table_name === 'talangan') {
    return row.new_data?.status_lunas === true ? CheckCircle2 : RotateCcw;
  }
  if (row.action === 'INSERT') return Plus;
  if (row.action === 'DELETE') return Trash2;
  return Pencil;
}


export default function RiwayatAktivitas({ open, onClose }: Props) {
  /* Ekspor PDF = aksi berat (chunk diunduh saat diketuk). Lihat `useAksiBerat`. */
  const [pdfSibuk, jalankanPdf] = useAksiBerat();
  const [rows, setRows] = useState<AktivitasLog[]>([]);
  const [kamus, setKamus] = useState<KamusNama | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('semua');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setError(false);
    try {
      /* Kamus dimuat BERBARENGAN tapi kegagalannya ditelan sengaja, dan
         perbedaan itu penting: baris audit adalah ISI layar — gagal berarti
         layar gagal; kamus cuma memberi NAMA pada baris `talangan` yang
         datanya UUID. Kalau ia gagal, barisnya kembali seperti sebelum
         2 Sep 2026 (tanpa nama) sementara sisa riwayat tetap utuh. Menjatuhkan
         seluruh layar demi pelengkap = menukar kerugian kecil dgn besar. */
      const [data, k] = await Promise.all([
        fetchAktivitas(),
        fetchKamus().catch(() => null),
      ]);
      setRows(data);
      setKamus(k);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      setLoading(true);
      load();
      import('../lib/generateAktivitasPDF').catch(() => {}); // preload (gesture share HP)
    }
  }, [open]);

  // Live: muat ulang saat ada aktivitas baru tercatat
  useRealtime(open ? ['audit_log'] : [], () => { if (open) load(); });

  // Tombol Back HP menutup overlay (bukan keluar app). Semua jalur tutup
  // lewat requestClose → mundur ke kanan (page-out-right) baru unmount.
  const exit = useClosePhase(onClose, 160);
  useBackDismiss(open, exit.requestClose);
  const dlg = useDialog(open, { onClose: exit.requestClose, label: 'Riwayat aktivitas' });

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (filter !== 'semua' && r.table_name !== filter) return false;
      if (!q) return true;
      const v = formatAktivitas(r, kamus ?? undefined);
      return (
        v.title.toLowerCase().includes(q) ||
        (v.detail ?? '').toLowerCase().includes(q) ||
        v.actor.toLowerCase().includes(q)
      );
    });
    const out: { hari: string; items: AktivitasLog[] }[] = [];
    for (const r of filtered) {
      /* Label grup = `labelTanggalRelatif`, helper YANG SAMA dgn kepala grup
         transaksi Beranda (26 Sep 2026). Dulu halaman ini punya salinannya
         sendiri dgn format PANJANG ("KAMIS, 24 SEPTEMBER 2026") sementara
         Beranda — pola buku besar yang sama — menulis "KAM, 24 SEP 2026". */
      const hari = labelTanggalRelatif(r.created_at);
      const last = out[out.length - 1];
      if (last && last.hari === hari) last.items.push(r);
      else out.push({ hari, items: [r] });
    }
    return out;
    /* `kamus` WAJIB ikut: ia dipakai di dalam saringan pencarian, dan datangnya
       bisa SESUDAH `rows` (dua request paralel). Tanpa dep ini, mencari
       "Saiful" tak menemukan baris talangan sampai filter/ketikan lain
       kebetulan memicu hitung ulang. */
  }, [rows, filter, search, kamus]);
  /* Kalimat layar kosong SATU sumber: `EmptyState` + pengumuman pembaca layar. */
  const kosongJudul = rows.length === 0 ? 'Belum ada aktivitas' : 'Tidak ada hasil';
  const kosongSub = rows.length === 0
    ? 'Setiap perubahan kas, tarikan, & talangan akan tercatat di sini secara otomatis.'
    : 'Coba ubah filter atau kata kunci pencarian.';
  useUmumkanHasil(
    grouped.reduce((n, g) => n + g.items.length, 0), 'aktivitas', [filter, search],
    `${kosongJudul}. ${kosongSub}`,
  );

  /* Sampai 20 Agu 2026 jalur ini TANPA `catch` sama sekali: chunk gagal (mis.
     chunk basi sesudah deploy, yang dibalas HTML 200 oleh rewrite Vercel) cuma
     meninggalkan unhandled rejection di konsol dan layar diam. `useAksiBerat`
     yang kini menerjemahkannya jadi toast + keadaan sibuk. */
  async function exportPDF() {
    haptic(12);
    const flat = grouped.flatMap((g) => g.items);
    if (flat.length === 0) { showToast('Tidak ada aktivitas untuk diekspor', 'info'); return; }
    const label = FILTERS.find((f) => f.id === filter)?.label ?? 'Semua';
    await jalankanPdf(async () => {
      const { generateAktivitasPDF } = await import('../lib/generateAktivitasPDF');
      generateAktivitasPDF(flat, label);
      showToast('PDF riwayat dibuat');
    }, { mulai: 'Menyiapkan PDF…', gagal: 'Gagal membuat PDF. Coba muat ulang aplikasi.' });
  }

  if (!open) return null;

  /* Satu nilai untuk kerangka & daftar termuat — teks statis, tinggi keduanya
     lahir dari elemen yang sama. */
  const petunjuk = (
    <div className="flex items-center gap-2 text-micro text-ink-faint dark:text-gray-400">
      <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      <span>Ketuk satu aktivitas untuk lihat penjelasan alur &amp; pencatatannya.</span>
    </div>
  );

  // overscroll-contain: overlay ini scroll sendiri & menutupi penuh layar — tanpa
  // ini scroll yang mentok di ujung daftar diteruskan ke halaman di belakangnya
  // (halaman induk ikut bergeser / pull-to-refresh terpicu). `.sheet-panel` sudah
  // punya ini; overlay full-screen tidak lewat kelas itu.
  return (
    <div ref={dlg.panelRef} {...dlg.panelProps} className={`fixed inset-0 z-overlay bg-sunken kanvas-cahaya dark:bg-gray-950 ${exit.closing ? 'page-out-right' : 'page-in-right'} overflow-y-auto [overscroll-behavior:contain]`}>
      <OverlayHeader
        icon={History}
        title="Riwayat Aktivitas"
        onBack={exit.requestClose}
        actions={<>
          <OverlayAction icon={pdfSibuk ? Loader2 : FileText} label="Ekspor PDF" onClick={exportPDF} spinning={pdfSibuk} />
          <OverlayAction icon={RefreshCw} label="Muat ulang" onClick={() => { setLoading(true); load(); }} spinning={loading} />
        </>}
      />

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
        {/* Cari + chip DISEMBUNYIKAN saat muat gagal (29 Sep 2026): enam kontrol
            yang tak punya apa pun untuk disaring berdiri di atas kartu "Gagal
            memuat data". Kanon tab Kas Hadiran & Kas RT — saringan hanya hadir
            kalau ada yang bisa disaring. Saat `error`, seluruh daftar memang
            diganti ErrorState di bawah, jadi saringannya tak menyaring apa pun. */}
        {!error && (<>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            name="cari-aktivitas"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            /* Menyebut KETIGA sumbu yang benar-benar disaring di `grouped`:
               nama (warga lewat detail, bendahara lewat actor), nomor tarikan,
               dan jenis aktivitas lewat judul. Yang lama, "Cari aktivitas /
               nama bendahara…", menyebut yang paling jarang dicari sambil
               menghilangkan dua yang paling mungkin diketik warga.

               PANJANGNYA TERIKAT: ruang teks kolom ini 248px @360px, dan yang
               lama 253px — terpotong 5px diam-diam. Placeholder tak memakai
               `truncate`, jadi ia dipangkas TANPA elipsis dan `audit:potong`
               (yang memburu `truncate`/`line-clamp`) buta terhadapnya. Yang ini
               223px. Kalau kata-katanya diubah lagi, UKUR ULANG. */
            placeholder="Cari nama, tarikan, aktivitas…"
            aria-label="Cari aktivitas"
            inputMode="search"
            enterKeyHint="search"
            className="field-search pr-11"
          />
          {search && <ClearButton onClick={() => setSearch('')} />}
        </div>

        {/* Filter chips */}
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
        </>)}

        {/* Hint: tiap baris bisa diketuk untuk penjelasan alur */}
        {!loading && rows.length > 0 && petunjuk}

        {/* List */}
        {loading ? (
          /* Kerangka mencermin SUSUNAN asli (30 Sep 2026): petunjuk → label hari
             → SATU kartu per hari berisi baris-baris. Dulu enam kartu terpisah
             mulai y=195 @390px, sedangkan kartu pertama asli di y=267 — turun
             72px saat data datang, dan bentuknya pun lain (kartu lepas → kartu
             berkelompok). Petunjuknya teks statis, jadi dipakai ASLI. Tiap baris
             kerangka memakai kotak baris yang sama dgn baris asli (judul
             `text-body leading-snug` DUA baris — rel nominal mengapung membuat
             judul hampir selalu melipat di HP — lalu keterangan & meta), jadi
             tingginya lahir dari tangga huruf, bukan angka piksel. Jumlah baris
             per hari tak bisa diketahui sebelum data; yang dijaga kartu PERTAMA. */
          <div className="space-y-4">
            {petunjuk}
            {[2, 3].map((n, g) => (
              <div key={g} className="space-y-2">
                <p className="text-micro pt-1"><span className="inline-block h-2.5 w-24 align-middle rounded-full skeleton" /></p>
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
                  {Array.from({ length: n }).map((_, i) => (
                    <div key={i} className={`flex items-start gap-3 px-4 py-4 [--di-l:4.25rem] [--di-r:1rem] ${i < n - 1 ? 'divide-inset' : ''}`}>
                      <div className="w-10 h-10 rounded-xl skeleton shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-body leading-snug">
                          <span className="inline-block h-3.5 w-3/5 align-middle rounded-lg skeleton" /><br />
                          <span className="inline-block h-3.5 w-2/5 align-middle rounded-lg skeleton" />
                        </p>
                        <p className="text-caption mt-0.5"><span className="inline-block h-3 w-4/5 align-middle rounded-lg skeleton" /></p>
                        <p className="text-micro mt-1"><span className="inline-block h-2.5 w-1/3 align-middle rounded-full skeleton" /></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift">
            <ErrorState onRetry={() => { setLoading(true); load(); }} retrying={loading} />
          </div>
        ) : grouped.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift">
            <EmptyState
              icon={History}
              title={kosongJudul}
              subtitle={kosongSub}
              action={rows.length > 0
                ? { label: 'Reset filter', icon: RotateCcw, onClick: () => { setFilter('semua'); setSearch(''); } }
                : undefined}
            />
          </div>
        ) : (
          grouped.map((grp) => (
            <div key={grp.hari} className="space-y-2">
              <p className="text-micro font-semibold uppercase tracking-wider text-ink-faint dark:text-gray-400 pt-1">{grp.hari}</p>
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
                {grp.items.map((row, idx) => {
                  const v = formatAktivitas(row, kamus ?? undefined);
                  const Icon = iconFor(row);
                  const isOpen = expanded === row.id;
                  const hasMore = v.changes.length > 0;
                  const hasDetail = v.penjelasan != null || hasMore;
                  const punyaNominal = v.amount != null && v.amount !== 0;
                  return (
                    <button
                      key={row.id}
                      onClick={() => { if (hasDetail) { haptic(); setExpanded(isOpen ? null : row.id); } }}
                      /* Nama dirangkai EKSPLISIT (28 Sep 2026): rail nominal kini
                         mendahului judul di DOM supaya bisa mengapung (lihat di bawah),
                         dan tanpa ini pembaca layar mendengar "Rp350.000, Ubah
                         pengeluaran…". Urutan dengar tetap judul → nominal → keterangan
                         → pencatat, plus isi yang dibuka — isi tombol itu anak
                         PRESENTASIONAL, jadi yang tak disebut di sini tak terdengar. */
                      aria-labelledby={[
                        `riw-${row.id}-judul`,
                        punyaNominal && `riw-${row.id}-nominal`,
                        v.detail && `riw-${row.id}-ket`,
                        `riw-${row.id}-meta`,
                        isOpen && hasDetail && `riw-${row.id}-isi`,
                      ].filter(Boolean).join(' ')}
                      aria-expanded={hasDetail ? isOpen : undefined}
                      style={{ animationDelay: `${Math.min(idx, 8) * 0.03}s` }}
                      className={`rise w-full flex items-start gap-3 px-4 py-4 text-left [--di-l:4.25rem] [--di-r:1rem] ${hasDetail ? 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60' : 'cursor-default'} transition-colors ${idx < grp.items.length - 1 ? 'divide-inset' : ''}`}
                    >
                      <div className={`icon-tile w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0 mt-0.5 ${ACCENT_CLS[v.accent]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Rail KANAN hanya sejajar JUDUL (15 Sep 2026). Dulu rail
                            (nominal + chevron) jadi kolom saudara setinggi SELURUH baris,
                            jadi keterangan & nama pencatat ikut terjepit di kolom ~140px
                            dari layar 390px: "Donasi Rawat Inap Bpk Pramono Budi (" pecah
                            3–4 baris sementara ruang di bawah nominal kosong melompong.
                            Kini hanya judul yang berbagi baris dgn rail; keterangan, meta
                            & isi yang dibuka memakai lebar kolom penuh. Nominal tetap rata
                            KANAN di kolomnya sendiri (kolom uang sejajar antar baris), dan
                            posisinya tetap 0px dari tepi atas isi — catatan chevron
                            zigzag di bawah tetap berlaku.

                            Rail kini MENGAPUNG (28 Sep 2026). Sebagai saudara flex ia tetap
                            memotong SELURUH tinggi judul, jadi di 360px judul cuma kebagian
                            ±100px: "Ubah / pengeluaran / Kas RT" pecah 3 baris (18 baris
                            @360, 24 @320 sampai 5 baris). `float-right` membuat judul hanya
                            mengalah di baris PERTAMA; baris berikutnya memakai lebar penuh →
                            0 judul >=3 baris di 320/360/390, tepi kanan nominal tak bergeser.
                            `-mb-2` WAJIB: rail (baris nominal 17px ≈ 22px) lebih tinggi dari
                            satu baris judul (15px snug ≈ 20,6px), dan tanpa itu baris KEDUA
                            ikut terjepit di sampingnya — terukur: nol perbaikan di 360px.
                            Rail harus mendahului judul di DOM (syarat float), maka urutan
                            dengar dikunci lewat `aria-labelledby` di tombol. */}
                        <div className="flow-root">
                          {/* Rail KANAN mendatar, bukan `flex-col` (2 Sep 2026). Waktu ia
                              kolom, chevron ditumpuk DI BAWAH nominal — jadi letaknya
                              ditentukan ADA/TIDAKNYA nominal: terukur 0px dari tepi atas
                              baris saat baris tak bernominal, 30,1px saat bernominal
                              (tinggi nominal + `gap-2`). Karena jenis baris di daftar ini
                              berselang-seling ("Pelunasan talangan" bernominal, "Tandai
                              talangan lunas" tidak), hasilnya chevron zigzag sepanjang
                              daftar. Mendatar, keduanya duduk di 0px.

                              `items-center`, bukan `items-start`: kotak chevron 16px lebih
                              pendek dari kotak baris nominal, jadi rata-atas membuatnya
                              terbaca menggantung. Sisa selisihnya 3px — di bawah ambang
                              mata, dan tetap KONSTAN antar baris; itu yang dikejar.

                              NOMINAL TIDAK BERGESER: ia sudah di 0px sebelum & sesudah.

                              Catatan probe, karena ini nyaris salah didiagnosis: mengukur
                              dari titik-TENGAH JUDUL memberi TIGA posisi semu (-2 / +17,8 /
                              +28,1) — judul yang membungkus dua baris menggeser acuannya
                              sendiri. Acuan yang sah tepi atas isi baris. */}
                          <div className="float-right ml-3 -mb-2 flex items-center gap-2">
                            {punyaNominal && (
                              /* Nominal NETRAL (27 Sep 2026). Warnanya dulu diturunkan dari
                                 JENIS AKSI (tambah = hijau, hapus = merah), padahal di seluruh
                                 app hijau/merah berarti ARAH UANG — jadi "Pengeluaran Kas RT
                                 Rp350.000" yang baru ditambahkan tampil hijau, dan menghapus
                                 pemasukan tampil merah. Jenis aksi sudah dibawa ubin ikon,
                                 arah uang sudah dibawa judul ("Pengeluaran…"/"Pemasukan…"). */
                              <span id={`riw-${row.id}-nominal`} className="font-display text-amount font-semibold tabular-nums text-ink dark:text-gray-100">
                                {formatRupiahPlain(v.amount!)}
                              </span>
                            )}
                            {/* `text-gray-400`, BUKAN `text-gray-300` (2 Sep 2026). Chevron ini
                                SATU-SATUNYA penanda bahwa baris bisa dibuka — jadi kontrol
                                non-teks yang dituntut 3:1 (§1.4.11), bukan hiasan. Nilai lama
                                terukur 1,47:1 di kartu putih & 2,04:1 di `gray-900`; halaman
                                sampai perlu kalimat bantu "Ketuk satu aktivitas…" untuk
                                menambalnya, dan kalimat itu gejalanya.

                                Ia juga menyimpang sendirian: dari 45 pemakaian `text-gray-300`,
                                44 adalah `dark:` — gray-300 itu tinta TERANG untuk permukaan
                                GELAP (10,37:1). Baris ini satu-satunya yang memakainya sbg tinta
                                terang di permukaan terang, sekaligus satu-satunya
                                `dark:text-gray-600` di app.

                                Varian `dark:` TIDAK dipasang: `html.dark .text-gray-400`
                                (index.css:557) sengaja ikut menangkap kelas POLOS, jadi satu
                                kelas sudah membawa #3E4F44 / #B4C9BB → 8,73 & 8,71:1.
                                `gray-400` adalah anak tangga TERTERANG yang lolos 3:1 — di sisi
                                terang tangga melompat 1,47 (300) → 8,73 (400), tak ada nilai di
                                rentang 3–5. Kalau kelak terasa terlalu tebal, obatnya token
                                affordance tersendiri, BUKAN kembali ke gray-300.

                                LOLOS `audit:kontras-nonteks` (676 sampel, 0 gagal) karena
                                populasinya membuang ikon yang kontrolnya punya label teks
                                (audit-kontras-nonteks.mjs:211) — sah untuk ikon yang MENGULANG
                                labelnya, meleset untuk chevron yang membawa info yang tak ada
                                di label mana pun. */}
                            {hasDetail && (
                              <ChevronDown data-penanda className={`w-4 h-4 text-gray-400 transition-transform duration-ketuk ${isOpen ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                          <p id={`riw-${row.id}-judul`} className="text-body font-semibold text-ink dark:text-gray-100 leading-snug break-words">{ikatFrasa(v.title)}</p>
                        </div>
                        {/* `ikatFrasa` (26 Sep 2026): 50 dari 81 baris di sini berakhir dgn
                            "#20)" sendirian, lepas dari "(Tarikan". TANPA `text-pretty`: ia
                            ikut menarik kata sebelumnya ke bawah dan membelah NAMA orang
                            ("Ahmad / Iqbal (Tarikan #20)"); tanpa itu frasa terikat pindah
                            utuh ke baris sendiri. */}
                        {v.detail && (
                          <p id={`riw-${row.id}-ket`} className="text-caption text-gray-500 dark:text-gray-400 mt-0.5 break-words">{ikatFrasa(v.detail)}</p>
                        )}
                        <p id={`riw-${row.id}-meta`} className="text-micro text-ink-faint dark:text-gray-400 mt-1">
                          {v.actor} · {formatWaktuRelatif(row.created_at)}
                        </p>

                        {/* Expand: penjelasan alur + diff */}
                        {isOpen && hasDetail && (
                          <div id={`riw-${row.id}-isi`} className="reveal mt-2 space-y-2">
                            {v.penjelasan && (
                              <div className="flex items-start gap-2 bg-emerald-50/70 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-xl p-3">
                                <Route className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <p className="text-micro font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-0.5">Alur &amp; pencatatan</p>
                                  <p className="text-caption leading-relaxed text-gray-600 dark:text-gray-300 text-pretty">{ikatFrasa(v.penjelasan)}</p>
                                </div>
                              </div>
                            )}
                            {hasMore && (
                              <div className="space-y-2 inset-soft rounded-xl p-3">
                                {v.changes.map((c, i) => (
                                  <div key={i} className="flex items-center gap-2 text-micro flex-wrap">
                                    <span className="text-ink-faint dark:text-gray-400 font-medium">{c.label}:</span>
                                    <span className="text-neg dark:text-rose-400 line-through">{c.from}</span>
                                    <ArrowRight className="w-3 h-3 text-gray-400" />
                                    <span className="text-pos dark:text-emerald-400 font-semibold">{c.to}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-micro text-ink-faint dark:text-gray-400 pl-0.5">{formatWaktu(row.created_at)}</p>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
