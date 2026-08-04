import { describe, it, expect, vi } from 'vitest';
import { hitungGeometriStruk, bagikanFileGambar, warnaTone, perluChipDefisit, STRUK, type ReceiptRow } from './shareReceipt';
import { CETAK } from './warnaCetak';

/**
 * Kartu PNG struk adalah artefak yang KELUAR dari app: bendahara membagikannya
 * ke grup WA berisi puluhan warga. Dua hal yang tak boleh salah dan tak terlihat
 * dari audit layar:
 *   1. Geometri — tinggi kanvas salah = isi terpotong / mengambang di gambar
 *      yang sudah terlanjur tersebar.
 *   2. Kontrak share — WhatsApp menolak share yang mencampur file + title/text
 *      (mental balik tanpa lampiran). WAJIB files-only.
 *   3. WARNA & penanda defisit — ditambahkan 4 Agu 2026, lihat blok ujinya di
 *      bawah. Sampai saat itu suite ini hanya mengunci GEOMETRI, dan celah itu
 *      persis yang membiarkan `tone` diabaikan diam-diam selama berbulan-bulan.
 */

const baris = (n: number): ReceiptRow[] =>
  Array.from({ length: n }, (_, i) => ({ label: `Baris ${i + 1}`, value: 'Rp1.000' }));

describe('hitungGeometriStruk — geometri kartu struk', () => {
  it('tanpa baris ber-`kind`, memakai rumus LAMA (36/baris + 16) — sifat opt-in dijaga', () => {
    const g = hitungGeometriStruk({ rows: baris(4) });
    expect(g.hasGroups).toBe(false);
    expect(g.rowsCardH).toBe(36 * 4 + 16);
    // tinggi total = atas kartu + tinggi kartu + footer (tanpa daftar nama)
    expect(g.H).toBe(STRUK.rowsCardTop + g.rowsCardH + STRUK.FOOTER);
    expect(g.listCardH).toBe(0);
  });

  it('satu baris ber-`kind` saja sudah mengaktifkan mode berseksi utk SELURUH kartu', () => {
    const rows: ReceiptRow[] = [...baris(2), { label: 'Saldo', value: 'Rp9', kind: 'total' }];
    const g = hitungGeometriStruk({ rows });
    expect(g.hasGroups).toBe(true);
    expect(g.rowsCardH).toBe(STRUK.H_DETAIL * 2 + STRUK.H_TOTAL + 24);
  });

  it('tiap jenis baris memakai tingginya sendiri (section/detail/total)', () => {
    const rows: ReceiptRow[] = [
      { label: 'PENERIMAAN', value: 'Rp10', kind: 'section' },
      { label: 'Iuran', value: 'Rp10' },
      { label: 'Saldo Bersih', value: 'Rp10', kind: 'total' },
    ];
    const g = hitungGeometriStruk({ rows });
    expect(g.rowsCardH).toBe(STRUK.H_SECTION + STRUK.H_DETAIL + STRUK.H_TOTAL + 24);
  });

  it('daftar nama menambah kartu kedua + tingginya tumbuh per nama', () => {
    const tanpa = hitungGeometriStruk({ rows: baris(3) });
    const dgn2 = hitungGeometriStruk({ rows: baris(3), list: { heading: 'Tidak Hadir (2)', items: ['A', 'B'] } });
    const dgn5 = hitungGeometriStruk({ rows: baris(3), list: { heading: 'Tidak Hadir (5)', items: ['A', 'B', 'C', 'D', 'E'] } });

    expect(dgn2.listCardTop).toBe(STRUK.rowsCardTop + dgn2.rowsCardH + STRUK.LIST_GAP);
    expect(dgn2.listCardH).toBe(STRUK.LIST_TOP_PAD + STRUK.LIST_HEAD_H + 2 * STRUK.LIST_ITEM_H + STRUK.LIST_BOT_PAD);
    // tiap nama tambahan menambah tepat satu LIST_ITEM_H
    expect(dgn5.listCardH - dgn2.listCardH).toBe(3 * STRUK.LIST_ITEM_H);
    // kanvas ikut tumbuh — kalau tidak, nama terakhir terpotong di PNG
    expect(dgn5.H).toBeGreaterThan(dgn2.H);
    expect(dgn2.H).toBeGreaterThan(tanpa.H);
  });

  it('daftar kosong diperlakukan sama dgn tanpa daftar (tak ada kartu hantu)', () => {
    const a = hitungGeometriStruk({ rows: baris(2) });
    const b = hitungGeometriStruk({ rows: baris(2), list: { heading: 'Kosong', items: [] } });
    expect(b).toEqual(a);
  });

  it('setiap baris benar-benar muat di dalam kartunya (tak ada isi meluber)', () => {
    for (const rows of [baris(1), baris(9), [...baris(3), { label: 'T', value: 'Rp1', kind: 'total' } as ReceiptRow]]) {
      const g = hitungGeometriStruk({ rows });
      const tinggiIsi = g.hasGroups
        ? rows.reduce((s, r) => s + (r.kind === 'section' ? STRUK.H_SECTION : r.kind === 'total' ? STRUK.H_TOTAL : STRUK.H_DETAIL), 0)
        : 36 * rows.length;
      expect(g.rowsCardH).toBeGreaterThanOrEqual(tinggiIsi);
      expect(g.H).toBeGreaterThanOrEqual(STRUK.rowsCardTop + g.rowsCardH);
    }
  });
});

describe('bagikanFileGambar — kontrak share WhatsApp', () => {
  const file = new File(['x'], 'hadiran-rt.png', { type: 'image/png' });

  it('mengirim HANYA files — tanpa title/text (WA menolak share campuran)', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const hasil = await bagikanFileGambar(file, 'Ringkasan kas', { canShare: () => true, share });

    expect(hasil).toBe('share');
    expect(share).toHaveBeenCalledTimes(1);
    const arg = share.mock.calls[0][0];
    expect(arg.files).toEqual([file]);
    expect(arg).not.toHaveProperty('title');
    expect(arg).not.toHaveProperty('text');
    expect(Object.keys(arg)).toEqual(['files']);
  });

  it('user membatalkan (AbortError) → berhenti, TIDAK jatuh ke fallback unduh', async () => {
    const abort = Object.assign(new Error('batal'), { name: 'AbortError' });
    const share = vi.fn().mockRejectedValue(abort);
    const hasil = await bagikanFileGambar(file, 'teks', { canShare: () => true, share });
    expect(hasil).toBe('batal');
  });

  it('canShare menolak → tak memanggil share sama sekali', async () => {
    const share = vi.fn();
    // Fallback menyentuh DOM; di lingkungan node ia melempar — yang penting
    // di sini: share TIDAK dipanggil dengan file yang ditolak platform.
    await bagikanFileGambar(file, 'teks', { canShare: () => false, share }).catch(() => {});
    expect(share).not.toHaveBeenCalled();
  });
});


/* ── Warna nilai & penanda defisit ─────────────────────────────────────────
 *
 * Kenapa blok ini ada. `warnaTone` dulu fungsi LOKAL di dalam cabang berseksi
 * `shareReceipt()`, sehingga cabang detail polos — yang dipakai kartu Kas
 * Hadiran & Jadwal — mengecat semua nilai `ink` dan membuang `row.tone` tanpa
 * suara. Tipe `ReceiptRow` menerima `tone`, pemanggil boleh mengisinya, dan tak
 * terjadi apa-apa. Tak ada test yang merah, karena suite ini cuma mengukur
 * geometri; ketahuannya lewat melihat kartunya sendiri.
 *
 * Uji divalidasi lewat MUTASI (disiplin uji uang repo ini): kembalikan
 * `warnaTone` jadi `() => CETAK.ink` → kasus pos/neg/warn di bawah gagal.
 */
describe('warnaTone — tone baris benar-benar dipakai', () => {
  it('memetakan tiap tone ke token uang, bukan ink', () => {
    expect(warnaTone({ tone: 'pos' })).toBe(CETAK.pos);
    expect(warnaTone({ tone: 'neg' })).toBe(CETAK.neg);
    expect(warnaTone({ tone: 'warn' })).toBe(CETAK.warn);
  });

  it('tanpa tone → ink (baris netral, mis. "Setor ke Kas RT")', () => {
    expect(warnaTone({})).toBe(CETAK.ink);
    expect(warnaTone({ tone: undefined })).toBe(CETAK.ink);
  });

  it('tiga tone menghasilkan tiga warna BERBEDA — bukan diam-diam ink semua', () => {
    const dipakai = new Set([
      warnaTone({ tone: 'pos' }),
      warnaTone({ tone: 'neg' }),
      warnaTone({ tone: 'warn' }),
      warnaTone({}),
    ]);
    expect(dipakai.size).toBe(4);
  });
});

describe('perluChipDefisit — satu-satunya penanda saldo minus di kartu', () => {
  /* Nominal hero TETAP putih (DESIGN.stitch §7 melarang mewarnainya salmon),
     jadi kalau predikat ini salah, kartu yang beredar di WA kehilangan seluruh
     tanda bahwa saldonya minus. */
  it('nominal minus → chip', () => {
    expect(perluChipDefisit('-Rp390.000')).toBe(true);
    expect(perluChipDefisit('  -Rp1.250.000')).toBe(true); // spasi awal tak menipu
  });

  it('nominal positif / nol → tanpa chip', () => {
    expect(perluChipDefisit('Rp390.000')).toBe(false);
    expect(perluChipDefisit('+Rp390.000')).toBe(false);
    expect(perluChipDefisit('Rp0')).toBe(false);
  });

  it('angka yang KEBETULAN memuat minus di tengah bukan defisit', () => {
    expect(perluChipDefisit('Rp1.000-2.000')).toBe(false);
  });
});
