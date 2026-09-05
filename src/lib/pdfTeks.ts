/**
 * Penjaga ENCODING teks PDF — satu-satunya tempat yang tahu apa yang bisa
 * dicetak Helvetica jsPDF.
 *
 * MASALAHNYA, dan ia lebih buas dari kelihatannya: font standar jsPDF
 * ber-encoding WinAnsi (≈cp1252). Begitu SATU karakter di luar itu masuk,
 * jsPDF mengalihkan SELURUH string ke UTF-16BE — sementara font standarnya tak
 * punya CMap untuk itu. Jadi yang rusak bukan satu glyph, melainkan seluruh
 * barisnya. Terukur 5 Sep 2026:
 *
 *   layar   "Tarikan #18: Dijadwalkan → Selesai"
 *   kertas  "\x00T\x00a\x00r…\x00n !\x92\x00 \x00S…"  → tercetak: Tarikan #: terjadwal !' Selesai
 *
 * DUA jalur, dan yang kedua yang membuatnya wajib ditutup di sini, bukan di
 * satu call-site: (1) `→` yang ditulis tangan di `aktivitas.ts` merusak tiap
 * baris ganti-status di PDF Riwayat Aktivitas — dokumen jejak audit; (2) TIAP
 * keterangan yang diketik bendahara. Terukur: "Perbaikan ✓ selesai" dan
 * "Iuran 🙏 terima kasih" dua-duanya rusak total. Di RT yang hidup di
 * WhatsApp, emoji bukan kasus tepi.
 *
 * Ke-35 penjaga cetak buta terhadap ini karena fixture-nya ASCII semua —
 * populasi yang tak pernah memuat kasusnya, bukan penjaga yang lengah.
 *
 * KENAPA BUKAN font Unicode: menyematkan TTF menambah ratusan kB ke tiap chunk
 * ekspor DAN mengganti tipografi kesembilan dokumen sekaligus — itu perubahan
 * RASA, bukan perbaikan cacat, dan tiap angka di `cetakTataLetak.test.ts`
 * diukur dgn metrik Helvetica. Ini menjaga wajah dokumen apa adanya.
 *
 * BATAS YANG DIAKUI: aksara di luar Latin (mis. Arab) TIDAK bisa
 * ditransliterasi dan ikut dibuang. Itu memang kehilangan isi — tapi
 * alternatifnya bukan "utuh", melainkan seluruh barisnya jadi sampah berikut
 * kata-kata yang sudah benar. Kalau suatu hari dokumen ini perlu memuat aksara
 * Arab, jawabannya font tersemat, bukan melonggarkan berkas ini.
 */

/* 27 titik kode cp1252 di rentang 0x80–0x9F yang TIDAK ada di Latin-1.
   Ditulis eksplisit karena JS tak punya encoder cp1252 bawaan — dan menebaknya
   dgn "kode < 256" akan meloloskan 0x80–0x9F yang justru bukan cp1252. */
const CP1252_TAMBAHAN = new Set([
  0x20AC, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017D, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
  0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x017E, 0x0178,
]);

const bisaDicetak = (k: number): boolean =>
  (k >= 0x20 && k <= 0x7E) || (k >= 0xA0 && k <= 0xFF) || CP1252_TAMBAHAN.has(k);

/* Transliterasi untuk yang PLAUSIBEL diketik atau sudah ada di kode. Sengaja
   pendek & bisa dipertanggungjawabkan — bukan kamus Unicode lengkap. */
const PETA: Record<string, string> = {
  '→': '->', '←': '<-', '↑': '^', '↓': 'v', '↔': '<->', '↗': '->', '↘': '->',
  '⇒': '=>', '⇐': '<=',
  /* CENTANG DIBUANG, SILANG TIDAK — dan itu bukan ketidakkonsistenan.
     Membuang centang aman: "musholah ✓ selesai" → "musholah selesai", makna
     utuh. Membuang SILANG MEMBALIK makna: "atap ✗ selesai" → "atap selesai",
     yaitu pernyataan yang berlawanan — dan di dokumen uang itu jauh lebih
     buruk daripada satu huruf yang terbaca janggal. Centang jatuh ke jalur
     "tak bisa di-encode → dibuang" di bawah; keputusan user 5 Sep 2026. */
  '✗': 'x', '✘': 'x', '☒': 'x',
  '−': '-', '‒': '-', '―': '-', '≈': '~', '≠': '!=', '≤': '<=', '≥': '>=',
  '‣': '-', '▪': '-', '▸': '-', '●': '-', '○': '-',
  /* Ditulis sbg ESCAPE, bukan karakter harfiah: yang tak terlihat di editor
     tak bisa ditinjau siapa pun. NBSP (U+00A0) sengaja TIDAK di sini — ia sah
     di cp1252 dan tercetak benar apa adanya. */
  '\u2007': ' ', '\u2009': ' ', '\u202F': ' ', '\u3000': ' ',
  /* Lebar-nol & penyambung emoji: DIBUANG, bukan diganti spasi — kalau tidak,
     satu emoji majemuk meninggalkan deretan spasi di tengah kalimat. */
  '\u200B': '', '\u200C': '', '\u200D': '', '\uFEFF': '', '\uFE0F': '', '\uFE0E': '',
};

/** Ubah satu string jadi bentuk yang PASTI bisa dicetak Helvetica jsPDF. */
export function amanWinAnsi(s: string): string {
  let out = '';
  for (const ch of s.normalize('NFC')) {
    if (ch in PETA) { out += PETA[ch]; continue; }
    const k = ch.codePointAt(0) ?? 0;
    if (bisaDicetak(k)) { out += ch; continue; }
    /* Aksen yang bisa diuraikan diselamatkan dulu (mis. "ā" → "a") sebelum
       menyerah — NFD lalu buang tanda diakritiknya. */
    const urai = ch.normalize('NFD').replace(/\p{M}/gu, '');
    out += [...urai].every((c) => bisaDicetak(c.codePointAt(0) ?? 0)) ? urai : '';
  }
  /* Rapikan sisa: karakter yang dibuang bisa meninggalkan spasi ganda. */
  return out.replace(/[ \t]{2,}/g, ' ').replace(/ +$/gm, '');
}

const petakan = (t: unknown): unknown =>
  typeof t === 'string' ? amanWinAnsi(t) : Array.isArray(t) ? t.map(petakan) : t;

type DocMirip = Record<string, unknown>;

/**
 * Pasang penjaga pada SATU dokumen, tepat sesudah `new jsPDF(...)`.
 *
 * Ditambal di tingkat instance, bukan di tiap call-site: `doc.text` adalah
 * titik cekik yang TERBUKTI — dibuktikan dgn probe, bukan diandaikan: panggilan
 * langsung MAUPUN tiap sel autoTable (head, body, foot) semuanya lewat sini.
 *
 * `getTextWidth` & `splitTextToSize` ikut ditambal, dan itu bukan kemewahan:
 * autoTable MENGUKUR lalu MEMBUNGKUS teks sebelum menggambarnya. Kalau cuma
 * `text` yang dijaga, lebar kolom dihitung dari string mentah sementara yang
 * tercetak string bersih — dua model yang tak sepakat, persis kelas cacat yang
 * bikin probe `charSpace` melaporkan luber 33pt (lihat `pdfTeksUji.ts`).
 */
export function amankanPdf(doc: unknown): void {
  const d = doc as DocMirip;
  if (d.__winAnsiAman) return;
  for (const nama of ['text', 'getTextWidth', 'splitTextToSize'] as const) {
    const asli = d[nama];
    if (typeof asli !== 'function') continue;
    const f = asli.bind(doc) as (...a: unknown[]) => unknown;
    d[nama] = (t: unknown, ...sisa: unknown[]) => f(petakan(t), ...sisa);
  }
  d.__winAnsiAman = true;
}
