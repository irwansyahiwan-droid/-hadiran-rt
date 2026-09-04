/**
 * Pemungut teks PDF untuk UJI — satu sumber, bukan disalin per berkas uji.
 *
 * Diangkat 4 Sep 2026 sesudah disalin ke EMPAT berkas uji cetak: duplikasi
 * yang hari ditulisnya tak berbiaya, lalu jadi dialek yang mustahil diperbaiki
 * di satu tempat (kelas yang sama dgn alur login yang pernah disalin ke 13
 * sapuan; lihat pelajaran ke-24 di CLAUDE.md).
 *
 * Membaca literal string dari isi halaman jsPDF. Tiap nilai tercetak sebagai
 * string UTUH berikut tandanya (`-Rp2.750.000`), jadi bandingkan dengan
 * kesamaan PERSIS pada elemen — bukan substring pada teks gabungan, yang buta
 * tanda dan meloloskan rumus terbalik.
 *
 * BATAS: hanya TEKS. Tata letak (posisi, pemenggalan halaman, tumpang tindih)
 * tidak terlihat di sini. Kalau generator pindah dari jsPDF, ini yang pertama
 * patah — dan itu memang yang diinginkan.
 *
 * Bukan berkas uji (tak berakhiran `.test.ts`) & hanya diimpor dari uji, jadi
 * tak pernah ikut bundel produksi.
 */
export function teksPdf(doc: unknown): string[] {
  const pages = (doc as { internal: { pages: string[][] } }).internal.pages;
  const isi = pages.flat().filter(Boolean).join('\n');
  const out: string[] = [];
  const re = /\(((?:\\.|[^()\\])*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(isi))) out.push(m[1].replace(/\\([()\\])/g, '$1'));
  return out;
}

/** Angka yang dicetak tepat SESUDAH sebuah label strip statistik. */
export function angkaSesudah(t: string[], label: string): number {
  return Number(t[t.indexOf(label) + 1]);
}
