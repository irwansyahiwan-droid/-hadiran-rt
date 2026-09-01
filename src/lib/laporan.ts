import { supabase } from './supabase';

/**
 * Rekap "tutup buku" per TRIWULAN (3 bulan) — dihitung langsung dari ledger
 * faktual (transaksi_kas untuk Kas Hadiran, kas_rt untuk Kas RT). Tidak
 * mengubah data; murni membaca & meringkas. Saldo akhir tiap triwulan
 * dihitung kumulatif dari triwulan terlama agar konsisten.
 *
 * Triwulan: I = Jan–Mar, II = Apr–Jun, III = Jul–Sep, IV = Okt–Des.
 */

export interface RekapTriwulan {
  key: string;             // '2026-Q2'
  tahun: number;
  triwulan: 1 | 2 | 3 | 4;
  romawi: string;          // 'II'
  label: string;           // 'Triwulan II 2026'
  rentang: string;         // 'Apr–Jun 2026'
  hadiranMasuk: number;      // iuran (total_terkumpul) saja — "Kas Terkumpul"
  hadiranSetor: number;      // setor_kas_rt saja — "Setor ke Kas RT" (sudah disetor)
  hadiranBelumSetor: number; // masuk − setor, kumulatif — "hasil akhir" tutup buku, boleh minus
  hadiranTalangan: number;   // talangan belum lunas dari tarikan triwulan ini — INFORMASIONAL,
                             // bukan bagian rumus hadiranBelumSetor (lihat komentar di bawah)
  rtSaldoAwal: number;    // "Saldo Awal Kas RT" — seed satu kali, DIKECUALIKAN dari rtMasuk
  rtMasuk: number;        // pemasukan NYATA saja (Saldo Awal bukan pemasukan periode ini)
  rtKeluar: number;
  rtSaldoAkhir: number;   // = saldoAwal + masuk − keluar, kumulatif
  tarikanSelesai: number;
  talanganLunas: number;
  jumlahTransaksi: number;
}

// Pendapatan Kas Hadiran = SUM(tarikan.total_terkumpul) tarikan SELESAI — sumber
// PERSIS sama dgn hero Beranda (fetchDashboardSummary), supaya tak pernah drift.
// (Jangan pakai SUM transaksi_kas.kas_masuk: bisa ada baris basi/manual yg tak
// nyangkut ke tarikan selesai → angka beda dgn Beranda.)
//
// ── Kenapa hadiranBelumSetor BUKAN hitungSaldoHadiran (1 Sep 2026) ─────────
// Beranda & KasHadiran.tsx punya SATU rumus "Saldo Kas Hadiran" = kas − talangan
// belum lunas − setor (bisa minus — talangan ditutup penuh dari kas, komitmen
// RT, lihat `hitungSaldoHadiran` di utils.ts). `laporan.ts` sampai 1 Sep 2026
// memakai rumus yang SAMA untuk kartu "tutup buku", dan itu salah SASARAN:
// talangan adalah bagian ALUR PROSES tarikan (mekanisme "yg absen ditalangi
// dulu supaya Sohibul Bait tetap dapat penuh"), bukan bagian dari "hasil akhir"
// yang mau dilaporkan tutup buku — pertanyaannya di sini murni "dari yang
// terkumpul, berapa yang SUDAH disetor ke Kas RT, berapa yang BELUM". Rumus
// lama membuat kartu tutup buku mencetak "-Rp1.135.000" seolah setorannya
// macet, padahal Setor ke Kas RT sudah Rp6.195.000 dari Rp6.210.000 terkumpul
// (selisih cuma Rp15.000) — minus itu murni 23 talangan yg belum lunas
// (piutang ke warga, BUKAN uang belum disetor).
//
// Jadi di sini: hadiranBelumSetor = masuk − setor SAJA. hadiranTalangan tetap
// dihitung & dilaporkan (bendahara minta talangan ikut tampil di tutup buku,
// persis anatomi panel "Alur Kas Hadiran") tapi sebagai baris INFORMASIONAL
// terpisah — bukan pengurang hadiranBelumSetor. kas_keluar SENGAJA tak
// dihitung sama sekali: tak ada satu pun jalur di app yang pernah menulisnya
// (selalu 0).
const HADIRAN_SETOR = new Set(['setor_kas_rt']);

// "Saldo Awal Kas RT" = baris seed SATU KALI (nominal kas RT sebelum app ini
// mulai mencatat), tersimpan sbg baris `kas_rt` biasa bertipe 'masuk' — bukan
// pemasukan periode manapun. Sampai 1 Sep 2026 laporan.ts melumatnya ke dalam
// `rtMasuk` (siapa pun yg tipe-nya bukan 'keluar' otomatis dihitung masuk),
// jadi "Masuk" tutup buku selalu Rp8.134.000 lebih besar dari uang yang BENAR
// dikumpulkan periode itu. Deteksinya lewat `keterangan`, BUKAN `kategori IS
// NULL` — kolom kategori juga dipakai utk "belum dikategorikan" pada transaksi
// nyata, jadi menyaring lewat NULL berisiko ikut menelan pemasukan asli yang
// cuma lupa dikategorikan. Pola & literalnya PERSIS `KasRT.tsx` &
// `generateKasRTPDF.ts` (sudah lebih dulu benar di sana) — supaya tak drift.
const SALDO_AWAL_KETERANGAN = 'Saldo Awal Kas RT';

interface TalanganRow {
  nominal: number | null;
  status_lunas: boolean;
  tanggal_lunas: string | null;
  tarikan: { tanggal: string | null } | null;
}
const ROMAWI = ['I', 'II', 'III', 'IV'];
const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

interface Bagian { tahun: number; q: number; key: string }

function bagianOf(dateStr: string | null | undefined): Bagian | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const q = Math.floor(d.getMonth() / 3); // 0..3
  return { tahun: d.getFullYear(), q, key: `${d.getFullYear()}-Q${q + 1}` };
}

function buat(b: Bagian): RekapTriwulan {
  const start = b.q * 3;
  return {
    key: b.key,
    tahun: b.tahun,
    triwulan: (b.q + 1) as 1 | 2 | 3 | 4,
    romawi: ROMAWI[b.q],
    label: `Triwulan ${ROMAWI[b.q]} ${b.tahun}`,
    rentang: `${BULAN_SINGKAT[start]}–${BULAN_SINGKAT[start + 2]} ${b.tahun}`,
    hadiranMasuk: 0, hadiranSetor: 0, hadiranBelumSetor: 0, hadiranTalangan: 0,
    rtSaldoAwal: 0, rtMasuk: 0, rtKeluar: 0, rtSaldoAkhir: 0,
    tarikanSelesai: 0, talanganLunas: 0, jumlahTransaksi: 0,
  };
}

export async function fetchRekapTriwulan(): Promise<RekapTriwulan[]> {
  const [trxRes, rtRes, tarikanRes, talanganRes] = await Promise.all([
    supabase.from('transaksi_kas').select('tipe, nominal, tanggal'),
    supabase.from('kas_rt').select('tipe, nominal, tanggal, keterangan'),
    supabase.from('tarikan').select('tanggal, status, total_terkumpul').eq('status', 'selesai'),
    supabase.from('talangan').select('nominal, status_lunas, tanggal_lunas, tarikan(tanggal)'),
  ]);

  // Supabase TIDAK melempar saat gagal → tanpa cek ini, HTTP 500 pulang sebagai
  // `data: null` dan `?? []` mengubahnya jadi "tidak ada transaksi". Akibatnya
  // fatal untuk halaman ini: layar menampilkan "Belum ada data" (padahal buku
  // penuh) DAN angka nol itu ikut mengalir ke PDF & kartu PNG tutup buku yang
  // dibagikan bendahara ke grup WA. Lebih baik melempar → ErrorState + tombol
  // "Coba lagi" daripada laporan nol yang terlihat sah.
  const gagal = trxRes.error ?? rtRes.error ?? tarikanRes.error ?? talanganRes.error;
  if (gagal) throw gagal;

  const map = new Map<string, RekapTriwulan>();
  const get = (b: Bagian): RekapTriwulan => {
    let r = map.get(b.key);
    if (!r) { r = buat(b); map.set(b.key, r); }
    return r;
  };

  // Setor ke Kas RT dari ledger transaksi_kas. kas_masuk SENGAJA diabaikan di
  // sini — pendapatan diambil dari total_terkumpul.
  for (const t of (trxRes.data as { tipe: string; nominal: number; tanggal: string }[] ?? [])) {
    const b = bagianOf(t.tanggal); if (!b) continue;
    if (!HADIRAN_SETOR.has(t.tipe)) continue;
    const r = get(b);
    r.hadiranSetor += t.nominal;
    r.jumlahTransaksi += 1;
  }

  for (const t of (rtRes.data as { tipe: string; nominal: number; tanggal: string; keterangan: string | null }[] ?? [])) {
    const b = bagianOf(t.tanggal); if (!b) continue;
    const r = get(b);
    if (t.keterangan === SALDO_AWAL_KETERANGAN) r.rtSaldoAwal += t.nominal;
    else if (t.tipe === 'keluar') r.rtKeluar += t.nominal;
    else r.rtMasuk += t.nominal;
    r.jumlahTransaksi += 1;
  }

  for (const t of (tarikanRes.data as { tanggal: string; total_terkumpul: number | null }[] ?? [])) {
    const b = bagianOf(t.tanggal); if (!b) continue;
    const r = get(b);
    r.tarikanSelesai += 1;
    r.hadiranMasuk += t.total_terkumpul ?? 0; // pendapatan = iuran tarikan
    r.jumlahTransaksi += 1;
  }

  for (const t of (talanganRes.data as unknown as TalanganRow[] ?? [])) {
    if (!t.status_lunas) {
      // Talangan masih nyangkut = kas keluar di triwulan tarikannya (full nominal).
      const b = bagianOf(t.tarikan?.tanggal);
      if (b) get(b).hadiranTalangan += t.nominal ?? 0;
    } else {
      // Sudah lunas = uang balik (net nol); hanya untuk badge hitungan.
      const b = bagianOf(t.tanggal_lunas);
      if (b) get(b).talanganLunas += 1;
    }
  }

  // Urut menaik untuk saldo kumulatif, lalu kembalikan menurun (terbaru dulu).
  // hadiranBelumSetor = masuk − setor SAJA, dikumulatifkan lintas triwulan —
  // talangan TIDAK ikut dikurangi (lihat komentar di atas).
  const asc = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  let hadiranRun = 0, rtRun = 0;
  for (const r of asc) {
    hadiranRun += r.hadiranMasuk - r.hadiranSetor;
    rtRun += r.rtSaldoAwal + r.rtMasuk - r.rtKeluar;
    r.hadiranBelumSetor = hadiranRun;
    r.rtSaldoAkhir = rtRun;
  }
  return asc.reverse();
}

/** Snapshot "tutup buku sekarang" — kumulatif SELURUH kas s/d hari ini. */
export interface SnapshotKas {
  tanggal: string;        // 'Selasa, 10 Juni 2026'
  rentang: string;        // 's/d 10 Jun 2026'
  hadiranMasuk: number;      // "Kas Terkumpul"
  hadiranSetor: number;      // "Setor ke Kas RT" (sudah disetor)
  hadiranBelumSetor: number; // masuk − setor — "hasil akhir" tutup buku, boleh minus
  hadiranTalangan: number;   // "Talangan Belum Lunas" — informasional, lihat laporan.ts
  rtSaldoAwal: number;    // "Saldo Awal Kas RT" — dikecualikan dari rtMasuk
  rtMasuk: number;        // pemasukan NYATA saja
  rtKeluar: number;
  rtSaldoAkhir: number;   // = saldoAwal + masuk − keluar
  tarikanSelesai: number;
  talanganLunas: number;
  jumlahTransaksi: number;
}

export async function fetchSnapshotKas(): Promise<SnapshotKas> {
  // Batas akhir hari ini (inklusif)
  const cutoff = new Date();
  cutoff.setHours(23, 59, 59, 999);
  const sampai = (s: string | null | undefined): boolean => {
    if (!s) return false;
    const t = new Date(s).getTime();
    return !Number.isNaN(t) && t <= cutoff.getTime();
  };

  const [trxRes, rtRes, tarikanRes, talanganRes] = await Promise.all([
    supabase.from('transaksi_kas').select('tipe, nominal, tanggal'),
    supabase.from('kas_rt').select('tipe, nominal, tanggal, keterangan'),
    supabase.from('tarikan').select('tanggal, status, total_terkumpul').eq('status', 'selesai'),
    supabase.from('talangan').select('nominal, status_lunas, tanggal_lunas, tarikan(tanggal)'),
  ]);

  // Supabase TIDAK melempar saat gagal → tanpa cek ini, HTTP 500 pulang sebagai
  // `data: null` dan `?? []` mengubahnya jadi "tidak ada transaksi". Akibatnya
  // fatal untuk halaman ini: layar menampilkan "Belum ada data" (padahal buku
  // penuh) DAN angka nol itu ikut mengalir ke PDF & kartu PNG tutup buku yang
  // dibagikan bendahara ke grup WA. Lebih baik melempar → ErrorState + tombol
  // "Coba lagi" daripada laporan nol yang terlihat sah.
  const gagal = trxRes.error ?? rtRes.error ?? tarikanRes.error ?? talanganRes.error;
  if (gagal) throw gagal;

  const snap: SnapshotKas = {
    tanggal: cutoff.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    rentang: `s/d ${cutoff.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    hadiranMasuk: 0, hadiranSetor: 0, hadiranBelumSetor: 0, hadiranTalangan: 0,
    rtSaldoAwal: 0, rtMasuk: 0, rtKeluar: 0, rtSaldoAkhir: 0,
    tarikanSelesai: 0, talanganLunas: 0, jumlahTransaksi: 0,
  };

  // Setor ke Kas RT saja (kas_masuk diabaikan; pendapatan dari total_terkumpul).
  for (const t of (trxRes.data as { tipe: string; nominal: number; tanggal: string }[] ?? [])) {
    if (!sampai(t.tanggal) || !HADIRAN_SETOR.has(t.tipe)) continue;
    snap.hadiranSetor += t.nominal;
    snap.jumlahTransaksi += 1;
  }
  for (const t of (rtRes.data as { tipe: string; nominal: number; tanggal: string; keterangan: string | null }[] ?? [])) {
    if (!sampai(t.tanggal)) continue;
    if (t.keterangan === SALDO_AWAL_KETERANGAN) snap.rtSaldoAwal += t.nominal;
    else if (t.tipe === 'keluar') snap.rtKeluar += t.nominal;
    else snap.rtMasuk += t.nominal;
    snap.jumlahTransaksi += 1;
  }
  for (const t of (tarikanRes.data as { tanggal: string; total_terkumpul: number | null }[] ?? [])) {
    if (!sampai(t.tanggal)) continue;
    snap.tarikanSelesai += 1;
    snap.hadiranMasuk += t.total_terkumpul ?? 0; // pendapatan = iuran tarikan
    snap.jumlahTransaksi += 1;
  }
  for (const t of (talanganRes.data as unknown as TalanganRow[] ?? [])) {
    if (!t.status_lunas) {
      if (sampai(t.tarikan?.tanggal)) snap.hadiranTalangan += t.nominal ?? 0; // talangan nyangkut = kas keluar
    } else if (sampai(t.tanggal_lunas)) {
      snap.talanganLunas += 1;                                              // lunas = net nol, cukup dihitung
    }
  }

  snap.hadiranBelumSetor = snap.hadiranMasuk - snap.hadiranSetor;
  snap.rtSaldoAkhir = snap.rtSaldoAwal + snap.rtMasuk - snap.rtKeluar;
  return snap;
}
