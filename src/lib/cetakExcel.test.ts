/**
 * Penjaga ISI dua ekspor EXCEL — Kas RT & Kas Hadiran.
 *
 * Lebih tegas daripada penjaga PDF, dan itu keuntungan formatnya: `exceljs`
 * menyimpan NILAI SEL yang sesungguhnya, jadi perbandingannya ANGKA lawan
 * ANGKA — bukan cocok-cocokan string yang bisa buta tanda.
 *
 * Invarian utamanya LINTAS-SHEET: satu workbook menyebut totalnya dua kali —
 * di sheet Ringkasan, dan sebagai kolom rincian di sheet mutasi/rekap.
 * Menuntut keduanya ada = menuntut keduanya SEPAKAT. Kalau berselisih,
 * bendahara yang membuka sheet berbeda mendapat jawaban berbeda dari SATU
 * berkas.
 *
 * Jebakan fixture yang sudah memakan korban dua kali & dicatat di sini: bentuk
 * `Stats` BERBEDA antar-modul — PDF Kas Hadiran memakai `saldoAktif`,
 * Excel-nya memakai `saldo`. Cast `as never`/`as unknown as` menyembunyikan
 * ketidakcocokan itu dan menghasilkan sel KOSONG yang lolos diam-diam. Jangan
 * pakai cast di fixture Stats.
 */
import { describe, it, expect } from 'vitest';
import type { Worksheet } from 'exceljs';
import { buildKasRTExcel } from './generateKasRTExcel';
import { buildKasHadiranExcel } from './generateKasHadiranExcel';
import { hitungSaldoHadiran } from './utils';
import type { KasRT, Tarikan } from './types';

/** Cari indeks kolom lewat NAMA di baris header — bukan indeks yang dipaku. */
function kolom(ws: Worksheet, headerRow: number, nama: string): number {
  const v = ws.getRow(headerRow).values as unknown[];
  const i = v.findIndex((x) => String(x).trim() === nama);
  if (i < 1) throw new Error(`kolom "${nama}" tak ada di sheet ${ws.name}`);
  return i;
}
const angka = (ws: Worksheet, row: number, col: number): number => Number(ws.getCell(row, col).value ?? 0);
/** Jumlahkan satu kolom mulai dari baris pertama data. */
function jumlahKolom(ws: Worksheet, headerRow: number, col: number): number {
  let s = 0;
  for (let r = headerRow + 1; r <= ws.rowCount; r++) s += angka(ws, r, col);
  return s;
}

const b = (i: number, tipe: 'masuk' | 'keluar', n: number, kategori: string, ket: string): KasRT => ({
  id: `x${i}`, tipe, nominal: n, keterangan: ket, tanggal: '2026-08-01',
  tarikan_id: null, kategori, saldo_setelah: 0, created_at: '2026-08-01T00:00:00Z',
});
const tk = (n: number, terkumpul: number): Tarikan => ({
  id: `t${n}`, nomor: n, tanggal: `2026-0${n}-10`, jumlah_per_orang: 50_000,
  total_hadir: 60, total_warga: 69, sohibul_bait_id: `w${n}`, status: 'selesai',
  total_terkumpul: terkumpul, created_at: `2026-0${n}-10T00:00:00Z`,
  sohibul_bait: { id: `w${n}`, nama: `Warga ${n}` } as Tarikan['sohibul_bait'],
});

describe('Excel Kas RT — isi workbook', () => {
  const LIST = [
    b(1, 'masuk', 5_000_000, 'hadiran', 'Setoran kas Hadiran'),
    b(2, 'masuk', 1_250_000, 'iuran_warga', 'Iuran warga'),
    b(3, 'keluar', 750_000, 'sosial', 'Santunan'),
  ];
  const MASUK = 5_000_000 + 1_250_000, KELUAR = 750_000;
  const wbOf = () => buildKasRTExcel(LIST, { saldo: MASUK - KELUAR, totalMasuk: MASUK, totalKeluar: KELUAR, saldoAwal: 0 }).wb;

  it('RINGKASAN rekonsiliasi sendiri: awal + masuk − keluar = akhir', () => {
    const ws = wbOf().getWorksheet('Ringkasan')!;
    const [awal, masuk, keluar, akhir] = [5, 6, 7, 8].map((r) => angka(ws, r, 2));
    expect(awal + masuk - keluar, 'Saldo Akhir tak sama dgn awal + masuk − keluar').toBe(akhir);
  });

  it('LINTAS-SHEET: kolom Mutasi menjumlah tepat ke Ringkasan', () => {
    const wb = wbOf();
    const sum = wb.getWorksheet('Ringkasan')!, mut = wb.getWorksheet('Mutasi')!;
    const H = 4;
    expect(jumlahKolom(mut, H, kolom(mut, H, 'Masuk')), 'Σ kolom Masuk ≠ Total Masuk di Ringkasan').toBe(angka(sum, 6, 2));
    expect(jumlahKolom(mut, H, kolom(mut, H, 'Keluar')), 'Σ kolom Keluar ≠ Total Keluar di Ringkasan').toBe(angka(sum, 7, 2));
    expect(mut.rowCount - H, 'jumlah baris mutasi ≠ jumlah transaksi').toBe(LIST.length);
  });
});

describe('Excel Kas Hadiran — isi workbook', () => {
  const LIST = [tk(1, 3_000_000), tk(2, 3_450_000)];
  const KAS = LIST.reduce((s, t) => s + t.total_terkumpul, 0);
  const TAL = 100_000, SET = 1_000_000;
  const wbOf = () => buildKasHadiranExcel(LIST, { t1: { count: 2, total: TAL } },
    { totalKasTerkumpul: KAS, totalTalanganBelum: TAL, totalSetor: SET, saldo: hitungSaldoHadiran(KAS, TAL, SET) }).wb;

  it('RINGKASAN memakai rumus saldo yang SAMA dengan app', () => {
    const ws = wbOf().getWorksheet('Ringkasan')!;
    const [kas, tal, setor, saldo] = [5, 6, 7, 8].map((r) => angka(ws, r, 2));
    expect(saldo, 'saldo di Excel ≠ hitungSaldoHadiran(kas, talangan, setor)').toBe(hitungSaldoHadiran(kas, tal, setor));
    expect(saldo, 'sel saldo kosong — periksa nama field Stats (saldo vs saldoAktif)').not.toBeNaN();
  });

  it('LINTAS-SHEET: kolom Kas Terkumpul menjumlah tepat ke Ringkasan', () => {
    const wb = wbOf();
    const sum = wb.getWorksheet('Ringkasan')!, rek = wb.getWorksheet('Rekap Tarikan')!;
    const H = 4;
    expect(jumlahKolom(rek, H, kolom(rek, H, 'Kas Terkumpul')), 'Σ Kas Terkumpul ≠ Ringkasan').toBe(angka(sum, 5, 2));
    expect(rek.rowCount - H, 'jumlah baris rekap ≠ jumlah tarikan').toBe(LIST.length);
  });
});
