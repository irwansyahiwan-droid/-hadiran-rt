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
 * BATAS fungsi INI: hanya APA yang tercetak. DI MANA dibaca `geometriPdf`,
 * dan elemen non-teks (garis, kotak, gambar) oleh `nonTeksPdf` di bawah.
 * Kalau generator pindah dari jsPDF, ini yang pertama patah — dan itu memang
 * yang diinginkan.
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

   Garis, kotak & gambar TIDAK di sini — populasinya `nonTeksPdf` di bawah
   (ditambahkan 5 Sep 2026, menutup batas yang baris ini dulu akui). Lebar
   dihitung dgn model yang SAMA dgn jsPDF (tanpa charSpace) — lihat catatan di
   badan fungsi; itu satu-satunya batas yang masih berdiri. */
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

/* ── NON-TEKS: garis, kotak & gambar ───────────────────────────────────────
   Menutup batas yang dua komentar di atas akui sejak 4 Sep 2026.

   Kosakata gambar keenam dokumen cuma tiga: RUAS GARIS (`m … l … S` — hairline
   masthead, rule seksi, pemisah tegak strip statistik, double-rule ringkasan,
   garis tanda tangan, dan tiap tepi sel autoTable), KOTAK (`re`), dan GAMBAR
   (`q … cm /I0 Do Q` — logo "46" di kepala surat). `re` dipetakan walau hari
   ini populasinya NOL: kalau nanti ada latar tabel yang di-fill, ia masuk
   sendiri alih-alih hilang diam-diam dari populasi.

   Ruang koordinatnya SAMA dgn `geometriPdf` — poin, origin kiri-BAWAH — jadi
   keduanya bisa langsung dibandingkan. Diverifikasi: rule masthead terbaca
   y=725,67pt, dan 841,89 − 725,67 = 116,2pt = 41mm, persis `doc.line(M, 41, …)`.

   Blok `BT … ET` DIBUANG sebelum menokenkan, bukan disaring sesudahnya: teks
   yang tercetak bisa memuat `m`, `l`, atau `S` di dalam kurungnya, dan
   tokenizer yang membacanya akan mengarang ruas garis dari sebuah nama warga. */
export interface Segmen { hal: number; x1: number; y1: number; x2: number; y2: number; tebal: number }
export interface Kotak  { hal: number; x: number; y: number; w: number; h: number; jenis: 'gambar' | 'kotak' }

type M6 = [number, number, number, number, number, number];
const IDEN: M6 = [1, 0, 0, 1, 0, 0];
const kali = (m: M6, c: M6): M6 => [
  m[0] * c[0] + m[1] * c[2],           m[0] * c[1] + m[1] * c[3],
  m[2] * c[0] + m[3] * c[2],           m[2] * c[1] + m[3] * c[3],
  m[4] * c[0] + m[5] * c[2] + c[4],    m[4] * c[1] + m[5] * c[3] + c[5],
];
const titik = (c: M6, x: number, y: number) => ({ x: c[0] * x + c[2] * y + c[4], y: c[1] * x + c[3] * y + c[5] });

export function nonTeksPdf(doc: unknown): { W: number; H: number; segmen: Segmen[]; kotak: Kotak[] } {
  const d = doc as { internal: { pages: string[][]; pageSize: { getWidth(): number; getHeight(): number } } };
  const PT = 72 / 25.4;
  const W = d.internal.pageSize.getWidth() * PT, H = d.internal.pageSize.getHeight() * PT;
  const segmen: Segmen[] = [], kotak: Kotak[] = [];

  d.internal.pages.forEach((pg, hal) => {
    if (!Array.isArray(pg)) return;
    const tok = pg.join('\n').replace(/BT[\s\S]*?ET/g, ' ').split(/\s+/).filter(Boolean);
    let ctm: M6 = [...IDEN] as M6, tebal = 1;
    const tumpuk: { ctm: M6; tebal: number }[] = [];
    let ops: number[] = [], kini: { x: number; y: number } | null = null;
    let tunda: Segmen[] = [], tundaKotak: Kotak[] = [];

    const cat = () => { segmen.push(...tunda); kotak.push(...tundaKotak); tunda = []; tundaKotak = []; kini = null; };

    for (const t of tok) {
      if (/^[-+.\d]/.test(t) && Number.isFinite(Number(t))) { ops.push(Number(t)); continue; }
      switch (t) {
        case 'q': tumpuk.push({ ctm: [...ctm] as M6, tebal }); break;
        case 'Q': { const s = tumpuk.pop(); if (s) { ctm = s.ctm; tebal = s.tebal; } break; }
        case 'cm': if (ops.length >= 6) ctm = kali(ops.slice(-6) as M6, ctm); break;
        case 'w': if (ops.length) tebal = ops[ops.length - 1]; break;
        case 'm': if (ops.length >= 2) kini = titik(ctm, ops[ops.length - 2], ops[ops.length - 1]); break;
        case 'l': if (ops.length >= 2 && kini) {
          const p = titik(ctm, ops[ops.length - 2], ops[ops.length - 1]);
          tunda.push({ hal, x1: kini.x, y1: kini.y, x2: p.x, y2: p.y, tebal });
          kini = p;
        } break;
        case 're': if (ops.length >= 4) {
          const [x, y, w, h] = ops.slice(-4);
          const a = titik(ctm, x, y), b = titik(ctm, x + w, y + h);
          tundaKotak.push({ hal, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y), jenis: 'kotak' });
        } break;
        case 'Do': {
          const a = titik(ctm, 0, 0), b = titik(ctm, 1, 1);
          kotak.push({ hal, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y), jenis: 'gambar' });
          break;
        }
        case 'S': case 's': case 'f': case 'F': case 'f*': case 'B': case 'B*': case 'b': case 'b*': case 'n': cat(); break;
        case 'h': break;
        default: break;
      }
      if (t !== 'q' && t !== 'Q') ops = [];
      else ops = [];
    }
  });
  return { W, H, segmen, kotak };
}
