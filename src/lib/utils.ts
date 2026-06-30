import { supabase } from './supabase';
import type { DashboardSummary } from './types';

export function formatRupiah(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('id-ID');
  if (amount < 0) return `-Rp${formatted}`;
  if (amount > 0) return `+Rp${formatted}`;
  return `Rp${formatted}`;
}

export function formatRupiahPlain(amount: number): string {
  return `Rp${Math.abs(amount).toLocaleString('id-ID')}`;
}

/**
 * Ubah error Supabase/Postgres jadi pesan yang manusiawi (Bahasa Indonesia),
 * dan catat detail mentahnya ke console untuk debug. JANGAN tampilkan
 * error.message mentah ke warga — kode SQL seperti "duplicate key value..."
 * bikin bingung & tidak premium.
 *
 * Pakai: showToast(pesanError(error, 'Gagal menyimpan'), 'error')
 */
export function pesanError(error: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  // Selalu simpan detail mentah untuk diagnosa.
  if (error) console.error('[pesanError]', error);

  const e = error as { code?: string; message?: string } | null | undefined;
  const code = e?.code;
  const msg = (e?.message ?? '').toLowerCase();

  // Petakan kode/pola umum Postgres & PostgREST ke kalimat ramah.
  if (code === '23505' || msg.includes('duplicate')) return 'Data ini sudah ada — tidak bisa ditambah dua kali.';
  if (code === '23503') return 'Data masih terkait catatan lain, jadi tidak bisa diubah/dihapus.';
  if (code === '23514' || msg.includes('check constraint')) return 'Nilai yang dimasukkan tidak valid.';
  if (code === '23502') return 'Ada kolom wajib yang masih kosong.';
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission')) return 'Akses ditolak. Pastikan kamu masuk sebagai Bendahara.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Koneksi bermasalah. Periksa internet lalu coba lagi.';

  return fallback;
}

/** Rupiah ringkas untuk tempat sempit: Rp1,7jt / Rp850rb / Rp500. */
export function formatRupiahCompact(amount: number): string {
  const neg = amount < 0 ? '-' : '';
  const a = Math.abs(amount);
  if (a >= 1_000_000) return `${neg}Rp${(a / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')}jt`;
  if (a >= 1_000) return `${neg}Rp${Math.round(a / 1_000)}rb`;
  return `${neg}Rp${a}`;
}

/** Ukuran nominal hero yang adaptif-panjang — angka kecil tetap megah (text-5xl),
 *  jutaan turun (text-4xl), ratusan juta turun lagi (text-3xl) → headline saldo
 *  TAK PERNAH terpotong `overflow-hidden` di HP sempit (≈360px, Android umum).
 *  Diukur (Playwright @360px): di kartu hero p-5, batas muat ≈288px; "Rp 1.500.000"
 *  @text-5xl = 304px (meluap). Berbasis nilai FINAL (bukan animasi) → font stabil,
 *  tak goyang saat count-up. SATU sumber untuk ketiga kartu hero saldo. */
export function heroAmountSize(value: number): string {
  const a = Math.abs(value);
  if (a >= 100_000_000) return 'text-3xl'; // ≥ Rp100jt (mis. "-Rp125.000.000")
  if (a >= 1_000_000) return 'text-4xl';   // Rp1jt–99jt — kasus paling umum kas RT
  return 'text-5xl';                        // < Rp1jt — muat penuh, dampak maksimal
}

/** Sensor nominal saat mode privasi aktif: ganti angka dgn bullet, "Rp" tetap.
 *  `dots` mengatur lebar sensor agar proporsional dgn ukuran teks aslinya. */
export function maskRp(rendered: string, hidden: boolean, dots = 6): string {
  if (!hidden) return rendered;
  const t = rendered.trimStart();
  const sign = t.startsWith('-') ? '-' : t.startsWith('+') ? '+' : '';
  return `${sign}Rp${'•'.repeat(dots)}`;
}

/** Haptic feedback ringan untuk interaksi utama (no-op bila perangkat tak mendukung). */
export function haptic(pattern: number | number[] = 8): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* abaikan */ }
  }
}

export function formatTanggal(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTanggalShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * SATU SUMBER rumus Saldo Kas Hadiran. Dipakai dashboard (Beranda) & halaman
 * Kas Hadiran supaya angkanya tak pernah drift bila salah satu diubah.
 *
 *   saldo = kas terkumpul − talangan belum lunas − setoran ke Kas RT
 *
 * Saldo SENGAJA bisa NEGATIF: talangan ditutup penuh (Rp50.000) dari kas, jadi
 * saat banyak talangan belum lunas saldo bisa minus. Kalau minus, dananya
 * ditalangi Kas RT (kebijakan pengurus — TIDAK dicatat sbg transaksi terpisah).
 * Jadi saldo negatif itu normal, bukan bug.
 */
export function hitungSaldoHadiran(
  totalKasTerkumpul: number,
  totalTalanganBelumLunas: number,
  totalSetor: number,
): number {
  return totalKasTerkumpul - totalTalanganBelumLunas - totalSetor;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const [wargaRes, tarikanRes, talanganRes, transaksiRes] = await Promise.all([
    supabase.from('warga').select('id', { count: 'exact' }).eq('status_aktif', true),
    supabase.from('tarikan').select('*').order('nomor', { ascending: false }),
    supabase.from('talangan').select('nominal, status_lunas'),
    supabase.from('transaksi_kas').select('tipe, nominal'),
  ]);

  const jumlahAnggota = wargaRes.count ?? 0;
  const tarikanList = tarikanRes.data ?? [];
  const talanganList = talanganRes.data ?? [];
  const transaksiList = transaksiRes.data ?? [];
  const jumlahJadwal = tarikanList.filter((t: { status: string }) => t.status === 'dijadwalkan').length;

  const totalTalanganBelumLunas = talanganList
    .filter((t) => !t.status_lunas)
    .reduce((sum, t) => sum + t.nominal, 0);

  const totalSetor = transaksiList
    .filter((t) => t.tipe === 'setor_kas_rt')
    .reduce((sum, t) => sum + t.nominal, 0);

  // Kas Hadiran Terkumpul = SUM(tarikan.total_terkumpul) tarikan selesai
  const totalKasTerkumpul = tarikanList
    .filter((t: { status: string }) => t.status === 'selesai')
    .reduce((sum: number, t: { total_terkumpul: number }) => sum + (t.total_terkumpul ?? 0), 0);

  // Saldo = kas terkumpul − talangan belum lunas − setoran ke kas RT (satu sumber)
  const saldoAktif = hitungSaldoHadiran(totalKasTerkumpul, totalTalanganBelumLunas, totalSetor);

  return {
    saldo_aktif: saldoAktif,
    total_talangan_belum_lunas: totalTalanganBelumLunas,
    total_setor_kas_rt: totalSetor,
    total_kas_terkumpul: totalKasTerkumpul,
    jumlah_anggota: jumlahAnggota,
    jumlah_tarikan: tarikanList.filter((t: { status: string }) => t.status === 'selesai').length,
    jumlah_dijadwalkan: jumlahJadwal,
    tarikan_terakhir: tarikanList[0] ?? null,
  };
}
