import ExcelJS from 'exceljs';
import type { Tarikan } from './types';
import { formatTanggal } from './utils';
import { border, titleBlock, headerRow, downloadWorkbook, stamp, stampLong, warnaiUang, ZEBRA } from './excelStyle';

interface TalanganInfo { count: number; total: number }
interface Stats {
  totalKasTerkumpul: number;
  totalTalanganBelum: number;
  totalSetor: number;
  saldo: number;
}

const CUR = '#,##0';

/* Seam `build*` — pola sama dgn generator PDF (4 Sep 2026). SINKRON: yang async
   hanya pengunduhannya, bukan penyusunan workbook-nya. Murni ekstraksi. */
export function buildKasHadiranExcel(
  tarikan: Tarikan[],
  talanganMap: Record<string, TalanganInfo>,
  stats: Stats,
): { wb: ExcelJS.Workbook; filename: string } {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hadiran RT';
  wb.created = new Date();
  const tgl = stampLong();

  // ── Sheet 1: Ringkasan ──
  const sum = wb.addWorksheet('Ringkasan');
  sum.columns = [{ width: 28 }, { width: 20 }];
  titleBlock(sum, 'Kas Hadiran RT 004/006', `Ringkasan · ${tgl}`, 2);
  headerRow(sum, 4, ['Keterangan', 'Nominal (Rp)']);
  /* Nada mencermin PDF-nya baris demi baris: talangan `neg`, setoran `warn`,
     saldo pos/neg menurut tandanya. Lihat didParseCell generateKasHadiranPDF. */
  /* NILAI BERTANDA — alasan sama dgn `generateKasRTExcel`. Talangan & setoran
     KEDUANYA pengurang: `hitungSaldoHadiran` = kas − talangan − setor, dan
     PDF-nya sudah mencetak `-Rp250.000` / `-Rp13.600.000`. Dgn tanda, =SUM()
     atas keempat baris menghasilkan Saldo Kas Hadiran. */
  const ringkasan: [string, number, 'pos' | 'neg' | 'warn' | 'ink'][] = [
    ['Kas Hadiran Terkumpul', stats.totalKasTerkumpul, 'ink'],
    ['Talangan Belum Lunas', -stats.totalTalanganBelum || 0, 'neg'],
    ['Setoran ke Kas Besar RT', -stats.totalSetor || 0, 'warn'],
    ['Saldo Kas Hadiran', stats.saldo, stats.saldo < 0 ? 'neg' : 'pos'],
  ];
  ringkasan.forEach(([label, val, tone], i) => {
    const r = sum.addRow([label, val]);
    r.getCell(2).numFmt = CUR;
    r.getCell(2).alignment = { horizontal: 'right' };
    r.eachCell((c) => (c.border = border));
    if (i === ringkasan.length - 1) r.font = { bold: true };
    warnaiUang(r.getCell(2), tone);
  });

  // ── Sheet 2: Rekap Tarikan ──
  const ws = wb.addWorksheet('Rekap Tarikan', { views: [{ state: 'frozen', ySplit: 4 }] });
  ws.columns = [
    { width: 8 }, { width: 18 }, { width: 26 }, { width: 8 }, { width: 12 },
    { width: 16 }, { width: 16 }, { width: 12 }, { width: 16 },
  ];
  titleBlock(ws, 'Kas Hadiran RT 004/006', `Rekap per Tarikan · ${tgl}`, 9);
  /* `Talangan` (cacah) sengaja TANPA satuan — begitu tetangganya menyebut
     (Rp), kolom tanpa satuan terbaca sbg cacah dgn sendirinya, sama seperti
     `Hadir` & `Total Warga`. */
  headerRow(ws, 4, ['No', 'Tanggal', 'Sohibul Bait', 'Hadir', 'Total Warga', 'Kas Terkumpul (Rp)', 'Sohibul Terima (Rp)', 'Talangan', 'Talangan (Rp)']);

  tarikan.forEach((t, i) => {
    const info = talanganMap[t.id] ?? { count: 0, total: 0 };
    const r = ws.addRow([
      t.nomor,
      formatTanggal(t.tanggal),
      t.sohibul_bait?.nama ?? '-',
      t.total_hadir,
      t.total_warga,
      t.total_terkumpul ?? 0,
      (t.total_terkumpul ?? 0) * 9,
      info.count,
      info.total,
    ]);
    [6, 7, 9].forEach((ci) => {
      r.getCell(ci).numFmt = CUR;
      r.getCell(ci).alignment = { horizontal: 'right' };
    });
    [1, 4, 5, 8].forEach((ci) => (r.getCell(ci).alignment = { horizontal: 'center' }));
    /* Talangan yang BELUM lunas itu uang yang ditalangi kas — di PDF ia `neg`
       (didParseCell kolom 4). Nol dibiarkan netral: memerahkan nol membuat
       tarikan yang justru bersih terbaca bermasalah. */
    if (info.total > 0) warnaiUang(r.getCell(9), 'neg');
    if (i % 2 === 1) r.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }));
    r.eachCell((c) => (c.border = border));
  });

  return { wb, filename: `Kas-Hadiran-${stamp()}.xlsx` };
}

export async function generateKasHadiranExcel(
  tarikan: Tarikan[],
  talanganMap: Record<string, TalanganInfo>,
  stats: Stats,
): Promise<void> {
  const { wb, filename } = buildKasHadiranExcel(tarikan, talanganMap, stats);
  await downloadWorkbook(wb, filename);
}
