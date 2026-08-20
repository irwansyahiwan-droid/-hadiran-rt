
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
  // Request dipotong oleh batas sabar di `lib/supabase.ts` — jaringan hidup tapi
  // tak menjawab. Bedakan dari putus total: yang ini pantas dicoba lagi.
  const nama = (error as { name?: string } | null | undefined)?.name ?? '';
  if (nama === 'TimeoutError' || nama === 'AbortError' || msg.includes('abort')) {
    return 'Server lama tak menjawab. Coba lagi.';
  }

  return fallback;
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

/**
 * Label kepala kelompok tanggal untuk daftar transaksi: "Hari ini" / "Kemarin"
 * untuk dua hari terakhir, selebihnya tanggal penuh. Warga membaca daftar dari
 * atas, jadi dua hari terdekat lebih cepat dikenali lewat kata daripada angka.
 * Perbandingan dilakukan pada tanggal LOKAL (bukan UTC) agar tidak meleset
 * sehari untuk warga di WIB.
 */
export function labelTanggalRelatif(dateStr: string): string {
  const kunci = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const d = new Date(dateStr);
  const now = new Date();
  const kemarin = new Date(now);
  kemarin.setDate(now.getDate() - 1);

  if (kunci(d) === kunci(now)) return 'Hari ini';
  if (kunci(d) === kunci(kemarin)) return 'Kemarin';
  return formatTanggal(dateStr);
}

export function formatTanggalShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Tanggal untuk BARIS DAFTAR yang sempit: "16 Agu" untuk tahun berjalan,
 * "16 Agu 2025" untuk tahun lain. Tanpa nama hari.
 *
 * Dipakai daftar mutasi Kas RT, yang tidak mengelompokkan per tanggal (jadi
 * tiap baris memikul tanggalnya sendiri) dan hanya punya ~120px untuk tanggal
 * DAN kategori sekaligus. Ketiga bentuk lain gagal di lebar itu, masing-masing
 * dengan caranya: `formatTanggal` penuh terpotong tepat di TAHUN
 * ("Min, 16 Agu 202…"); memaksa tahun selalu tampil menyisakan ruang yang
 * memotong kategori jadi satu huruf ("16 Agu 2026 · H…"); dan
 * `formatTanggalShort` membuang tahun SELAMANYA, yang menyesatkan begitu
 * mutasi mencakup lebih dari satu tahun buku.
 *
 * Menyembunyikan tahun HANYA saat ia sudah tersirat (tahun ini) adalah pola
 * yang sama dipakai klien surel arus utama, dan aman di sini karena tahun
 * lampau tetap dicetak. Tanggal lengkap berikut nama harinya tetap tampil di
 * sheet detail, jadi tak ada informasi yang benar-benar hilang.
 */
export function formatTanggalRingkas(dateStr: string, sekarang: Date = new Date()): string {
  const date = new Date(dateStr);
  const tahunLain = date.getFullYear() !== sekarang.getFullYear();
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    ...(tahunLain ? { year: 'numeric' } : {}),
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


/**
 * Ukuran huruf (px) yang membuat teks selebar `lebarTeks` (diukur pada `maksPx`)
 * muat di ruang `tersedia`. Angka pendek dapat ukuran penuh; yang panjang
 * menyusut SEPERLUNYA, tak pernah lebih kecil dari `minPx`.
 *
 * Dipakai kaki stat hero (3 kolom). Kenapa perlu: sampai 20 Agu 2026 ukurannya
 * `clamp()` TETAP yang dikalibrasi ke satu panjang angka — komentarnya sendiri
 * mencatat "nol margin — angka sedigit lebih panjang langsung menabrak". Sapuan
 * populasi ekstrem membuktikan digit itu sudah dalam jangkauan: pada kas
 * 8 digit ketiga nominal SALING MENIMPA di 360px (terlihat di screenshot,
 * bukan disimpulkan dari angka). "Terkumpul" itu total kumulatif — ia cuma naik.
 *
 * Menyusutkan huruf, BUKAN membulatkan angka: kaki ini menyebut UANG, dan
 * "Rp55,2 jt" adalah pernyataan yang berbeda dari "Rp55.200.000".
 */
export function ukuranMuat(tersedia: number, lebarTeks: number, maksPx: number, minPx: number): number {
  if (!(tersedia > 0) || !(lebarTeks > 0)) return maksPx;
  const aman = tersedia * 0.97;              // sisakan ~3% agar tepi tak mepet
  if (lebarTeks <= aman) return maksPx;
  return Math.max(minPx, Math.floor((aman / lebarTeks) * maksPx * 10) / 10);
}
