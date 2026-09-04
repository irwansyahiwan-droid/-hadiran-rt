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

/* ── GEOMETRI: posisi & lebar tiap teks ────────────────────────────────────
   Penjaga teks di atas membaca APA yang tercetak; ini membaca DI MANA. Dua
   pertanyaan berbeda, dan yang kedua tak pernah dijaga sampai 4 Sep 2026 —
   padahal luber ke luar halaman atau jatuh di bawah batas bawah membuat isi
   HILANG dari kertas tanpa satu pun uji teks protes (teksnya tetap ada di
   aliran isi, cuma tak terlihat waktu dicetak).

   Dibaca dari aliran isi jsPDF: tiap teks satu blok `BT … Td … Tj … ET`, dgn
   posisi dalam POIN dan origin di KIRI-BAWAH. Lebarnya diukur ulang memakai
   font & ukuran yang sama seperti saat digambar — bukan ditaksir. Ketepatannya
   terbukti: teks rata-kanan Kas RT mendarat tepat di 555,6pt sementara batas
   marginnya juga 555,6pt.

   BATAS: hanya TEKS. Garis, kotak, dan latar tabel tak ikut — jadi ini tak
   melihat tumpang tindih dgn elemen non-teks. Dan lebar dihitung dgn model
   yang SAMA dgn jsPDF (tanpa charSpace) — lihat catatan di badan fungsi. */
export interface TeksGeo { hal: number; x: number; y: number; size: number; bold: boolean; teks: string; w: number; kanan: number }

export function geometriPdf(doc: unknown, jsPDFCtor: new (o?: object) => { setFont(f: string, s: string): void; setFontSize(n: number): void; getTextWidth(t: string): number }): { W: number; H: number; runs: TeksGeo[] } {
  const PT = 72 / 25.4;
  const d = doc as { internal: { pages: string[][]; pageSize: { getWidth(): number; getHeight(): number } } };
  const ukur = new jsPDFCtor({ unit: 'pt' });
  const W = d.internal.pageSize.getWidth() * PT, H = d.internal.pageSize.getHeight() * PT;
  const runs: TeksGeo[] = [];
  d.internal.pages.forEach((pg, hal) => {
    if (!Array.isArray(pg)) return;
    const isi = pg.join('\n');
    const re = /BT\s+([\s\S]*?)ET/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(isi))) {
      const blok = m[1];
      const f = blok.match(/\/(F\d+)\s+([\d.]+)\s+Tf/);
      const td = blok.match(/([-\d.]+)\s+([-\d.]+)\s+Td/);
      const tj = blok.match(/\(((?:\\.|[^()\\])*)\)\s*Tj/);
      if (!f || !td || !tj) continue;
      const size = parseFloat(f[2]);
      const bold = f[1] === 'F2';
      const teks = tj[1].replace(/\\([()\\])/g, '$1');
      ukur.setFont('helvetica', bold ? 'bold' : 'normal');
      ukur.setFontSize(size);
      /* Lebar TANPA menambahkan `Tc`, dan itu bukan kelalaian: jsPDF sendiri
         tak memperhitungkan charSpace saat menghitung penempatan `align`.
         Terbukti — "RINCIAN PENDAPATAN SOHIBUL BAIT" (31 huruf, Tc 1,13pt)
         ditempatkan jsPDF di x=433,8, artinya ia menganggap lebarnya 121,8pt
         (= tepat batas margin), bukan 155pt. Menambahkan Tc membuat probe
         melaporkan luber 33pt untuk teks yang menurut model jsPDF pas.
         BATAS YANG DIAKUI: kalau jsPDF salah dan teks ber-charSpace memang
         terender lebih lebar, selisih itu TIDAK terlihat di sini. Ia tetap di
         dalam halaman (tak ada isi yang hilang) — yang termakan cuma margin. */
      const w = ukur.getTextWidth(teks);
      const x = parseFloat(td[1]);
      runs.push({ hal, x, y: parseFloat(td[2]), size, bold, teks, w, kanan: x + w });
    }
  });
  return { W, H, runs };
}
