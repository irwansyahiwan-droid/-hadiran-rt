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
  hadiranMasuk: number;    // kas_masuk + talangan_masuk
  hadiranKeluar: number;   // setor_kas_rt + kas_keluar + talangan_keluar
  hadiranSaldoAkhir: number;
  rtMasuk: number;
  rtKeluar: number;
  rtSaldoAkhir: number;
  tarikanSelesai: number;
  talanganLunas: number;
  jumlahTransaksi: number;
}

const MASUK_HADIRAN = new Set(['kas_masuk', 'talangan_masuk']);
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
    hadiranMasuk: 0, hadiranKeluar: 0, hadiranSaldoAkhir: 0,
    rtMasuk: 0, rtKeluar: 0, rtSaldoAkhir: 0,
    tarikanSelesai: 0, talanganLunas: 0, jumlahTransaksi: 0,
  };
}

export async function fetchRekapTriwulan(): Promise<RekapTriwulan[]> {
  const [trxRes, rtRes, tarikanRes, talanganRes] = await Promise.all([
    supabase.from('transaksi_kas').select('tipe, nominal, tanggal'),
    supabase.from('kas_rt').select('tipe, nominal, tanggal'),
    supabase.from('tarikan').select('tanggal, status').eq('status', 'selesai'),
    supabase.from('talangan').select('tanggal_lunas, status_lunas').eq('status_lunas', true),
  ]);

  const map = new Map<string, RekapTriwulan>();
  const get = (b: Bagian): RekapTriwulan => {
    let r = map.get(b.key);
    if (!r) { r = buat(b); map.set(b.key, r); }
    return r;
  };

  for (const t of (trxRes.data as { tipe: string; nominal: number; tanggal: string }[] ?? [])) {
    const b = bagianOf(t.tanggal); if (!b) continue;
    const r = get(b);
    if (MASUK_HADIRAN.has(t.tipe)) r.hadiranMasuk += t.nominal;
    else r.hadiranKeluar += t.nominal;
    r.jumlahTransaksi += 1;
  }

  for (const t of (rtRes.data as { tipe: string; nominal: number; tanggal: string }[] ?? [])) {
    const b = bagianOf(t.tanggal); if (!b) continue;
    const r = get(b);
    if (t.tipe === 'keluar') r.rtKeluar += t.nominal;
    else r.rtMasuk += t.nominal;
    r.jumlahTransaksi += 1;
  }

  for (const t of (tarikanRes.data as { tanggal: string }[] ?? [])) {
    const b = bagianOf(t.tanggal); if (!b) continue;
    get(b).tarikanSelesai += 1;
  }

  for (const t of (talanganRes.data as { tanggal_lunas: string | null }[] ?? [])) {
    const b = bagianOf(t.tanggal_lunas); if (!b) continue;
    get(b).talanganLunas += 1;
  }

  // Urut menaik untuk saldo kumulatif, lalu kembalikan menurun (terbaru dulu).
  const asc = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  let hadiranRun = 0, rtRun = 0;
  for (const r of asc) {
    hadiranRun += r.hadiranMasuk - r.hadiranKeluar;
    rtRun += r.rtMasuk - r.rtKeluar;
    r.hadiranSaldoAkhir = hadiranRun;
    r.rtSaldoAkhir = rtRun;
  }
  return asc.reverse();
}

/** Snapshot "tutup buku sekarang" — kumulatif SELURUH kas s/d hari ini. */
export interface SnapshotKas {
  tanggal: string;        // 'Selasa, 10 Juni 2026'
  rentang: string;        // 's/d 10 Jun 2026'
  hadiranMasuk: number;
  hadiranKeluar: number;
  hadiranSaldoAkhir: number;
  rtMasuk: number;
  rtKeluar: number;
  rtSaldoAkhir: number;
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
    supabase.from('kas_rt').select('tipe, nominal, tanggal'),
    supabase.from('tarikan').select('tanggal, status').eq('status', 'selesai'),
    supabase.from('talangan').select('tanggal_lunas, status_lunas').eq('status_lunas', true),
  ]);

  const snap: SnapshotKas = {
    tanggal: cutoff.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    rentang: `s/d ${cutoff.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    hadiranMasuk: 0, hadiranKeluar: 0, hadiranSaldoAkhir: 0,
    rtMasuk: 0, rtKeluar: 0, rtSaldoAkhir: 0,
    tarikanSelesai: 0, talanganLunas: 0, jumlahTransaksi: 0,
  };

  for (const t of (trxRes.data as { tipe: string; nominal: number; tanggal: string }[] ?? [])) {
    if (!sampai(t.tanggal)) continue;
    if (MASUK_HADIRAN.has(t.tipe)) snap.hadiranMasuk += t.nominal;
    else snap.hadiranKeluar += t.nominal;
    snap.jumlahTransaksi += 1;
  }
  for (const t of (rtRes.data as { tipe: string; nominal: number; tanggal: string }[] ?? [])) {
    if (!sampai(t.tanggal)) continue;
    if (t.tipe === 'keluar') snap.rtKeluar += t.nominal;
    else snap.rtMasuk += t.nominal;
    snap.jumlahTransaksi += 1;
  }
  for (const t of (tarikanRes.data as { tanggal: string }[] ?? [])) {
    if (sampai(t.tanggal)) snap.tarikanSelesai += 1;
  }
  for (const t of (talanganRes.data as { tanggal_lunas: string | null }[] ?? [])) {
    if (sampai(t.tanggal_lunas)) snap.talanganLunas += 1;
  }

  snap.hadiranSaldoAkhir = snap.hadiranMasuk - snap.hadiranKeluar;
  snap.rtSaldoAkhir = snap.rtMasuk - snap.rtKeluar;
  return snap;
}
