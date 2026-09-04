/**
 * Penjaga ISI PDF Riwayat Aktivitas — jejak audit siapa mengubah apa.
 *
 * Invariannya: kepala dokumen mengumumkan `N aktivitas tercatat`, dan N WAJIB
 * sama dengan jumlah baris yang benar-benar dicetak. Pada dokumen audit,
 * angka yang lebih besar dari isinya berarti ada jejak yang HILANG — persis
 * hal yang paling tak boleh terjadi di sini.
 */
import { describe, it, expect } from 'vitest';
import { buildAktivitasPDF } from './generateAktivitasPDF';
import { teksPdf } from './pdfTeksUji';
import type { AktivitasLog } from './types';

const log = (i: number, action: AktivitasLog['action'], table: string): AktivitasLog => ({
  id: `a${i}`, table_name: table, record_id: `r${i}`, action,
  actor_name: `Bendahara ${i}`, old_data: null, new_data: { nominal: 50_000 },
  created_at: `2026-08-0${i}T09:00:00Z`,
} as unknown as AktivitasLog);

const ROWS: AktivitasLog[] = [
  log(1, 'INSERT', 'kas_rt'), log(2, 'UPDATE', 'transaksi_kas'), log(3, 'DELETE', 'talangan'),
];

describe('PDF Riwayat Aktivitas — isi dokumen', () => {
  it('REKONSILIASI: jumlah yang diumumkan sama dengan baris yang dicetak', () => {
    const teks = teksPdf(buildAktivitasPDF(ROWS, 'Semua').doc);
    expect(teks, 'jumlah aktivitas di kepala dokumen salah/hilang')
      .toContain(`Kategori: Semua · ${ROWS.length} aktivitas tercatat`);
    expect(teks.length, 'terlalu sedikit string — tabel kemungkinan kosong').toBeGreaterThan(20);
  });

  it('label filter yang dipilih ikut tercetak — dokumen mengaku apa yang DISARING', () => {
    /* Penting untuk jejak audit: laporan yang tersaring tapi tak menyebut
       saringannya terbaca seolah itu SELURUH riwayat. */
    const teks = teksPdf(buildAktivitasPDF(ROWS, 'Kas RT').doc);
    expect(teks, 'label filter hilang — dokumen tersaring menyamar jadi lengkap')
      .toContain(`Kategori: Kas RT · ${ROWS.length} aktivitas tercatat`);
  });
});
