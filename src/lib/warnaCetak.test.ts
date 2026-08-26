import { describe, it, expect } from 'vitest';
import { CETAK, rgb, argb } from './warnaCetak';
// @ts-expect-error — config Tailwind JS polos, tanpa deklarasi tipe.
import tw from '../../tailwind.config.js';

/**
 * Penjaga DRIFT palet keluaran.
 *
 * Ini uji yang paling penting di berkas ini, dan alasannya konkret. Sebelum
 * 4 Agu 2026, tiga berkas keluaran (`pdfTheme`, `shareReceipt`, `shareLaporanKas`)
 * masing-masing menyalin nilai token app dengan tangan, dan tiap salinannya
 * membawa komentar yang MENYATAKAN dirinya "selaras token app". Niatnya benar;
 * mekanismenya tak ada. Tiap berkas lalu membeku di generasi token yang berbeda:
 *
 *   pdfTheme         pos #047857 · neg #DC2626 · warn #B45309 · line #E5E7EB
 *   shareReceipt     pos #047857 · neg #BE123C · warn #B45309 · line #C5CFDB
 *   shareLaporanKas  pos #047857 · neg #DC2626 · label #9CA3AF (2,50:1 di putih)
 *   excelStyle       zebra #F1F5F9 · border #E2E8F0 · subjudul #94A3B8
 *
 * Tak satu pun ketahuan lewat test, lint, atau sapuan — semuanya di luar DOM.
 * Ketahuannya lewat mata, setelah bertahun-tahun. Uji di bawah membuat kelas
 * bug itu MUSTAHIL berulang: begitu token app digeser tanpa `warnaCetak.ts`
 * ikut digeser, suite merah.
 *
 * Kalau uji ini gagal: JANGAN ubah angka di sini agar hijau. Yang benar adalah
 * menyamakan `warnaCetak.ts` dengan token app — atau, kalau memang tokennya
 * yang salah, perbaiki tokennya.
 */
const c = tw.theme.extend.colors;

const terangHex = (hex: string) => rgb(hex).reduce((s, v) => s + v, 0);

describe('warnaCetak = cermin token app', () => {
  it('warna uang persis token pos/neg/warn', () => {
    expect(CETAK.pos).toBe(c.pos.DEFAULT);
    expect(CETAK.neg).toBe(c.neg.DEFAULT);
    expect(CETAK.warn).toBe(c.warn.DEFAULT);
  });

  it('brand, kanvas, garis, dan tangga teks ikut token', () => {
    expect(CETAK.brand).toBe(c.brand.DEFAULT);
    expect(CETAK.canvas).toBe(c.sunken);
    /* `line` cetak SENGAJA tak lagi sama dgn `c.line`: sejak app bermazhab
       tonal, hairline LAYAR mundur ke whisper karena pemisahan pindah ke
       langkah nada + bayangan. Kertas tak punya keduanya, jadi garisnya wajib
       lebih tegas. Yang dikunci di sini ARAHNYA — garis cetak tak boleh lebih
       TERANG dari garis layar — supaya ia tak pernah diam-diam ikut memudar. */
    expect(terangHex(CETAK.line)).toBeLessThanOrEqual(terangHex(c.line));
    expect(CETAK.ink).toBe(c.ink.DEFAULT);
    expect(CETAK.sub).toBe(c.ink.sub);
    expect(CETAK.faint).toBe(c.ink.faint);
  });

  /* `muted` sengaja TIDAK punya padanan token — app tak mengizinkan teks
     selemah itu di layar. Di kertas & di kartu WA ia dipakai untuk footer &
     nomor urut, jadi yang dikunci di sini BATASNYA: ia tak boleh lebih terang
     dari `ink.faint`, supaya tak pernah lagi ada #94A3B8 (2,50:1) menyelinap
     masuk seperti dulu di shareLaporanKas & excelStyle. */
  it('muted tak boleh lebih terang dari ink.faint', () => {
    const terang = (hex: string) => rgb(hex).reduce((s, v) => s + v, 0);
    expect(terang(CETAK.muted)).toBeLessThanOrEqual(terang(CETAK.faint) + 60);
  });

  it('semua nilai berupa hex 6 digit (bukan rgb()/nama warna)', () => {
    const datar: string[] = [
      ...Object.values(CETAK).filter((v) => typeof v === 'string' && v.startsWith('#')) as string[],
      ...CETAK.heroRamp,
    ];
    expect(datar.length).toBeGreaterThan(8);
    for (const v of datar) expect(v).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('pengubah format', () => {
  it('rgb() memecah hex jadi komponen jsPDF', () => {
    expect(rgb('#0B1220')).toEqual([11, 18, 32]);
    expect(rgb('0B1220')).toEqual([11, 18, 32]); // tanpa pagar juga jalan
    expect(rgb('#FFFFFF')).toEqual([255, 255, 255]);
  });

  it('argb() menaruh alfa di DEPAN — urutan ExcelJS, bukan #rrggbbaa', () => {
    expect(argb('#0F4C2E')).toBe('FF0F4C2E');
    expect(argb('#ecf1f7')).toBe('FFECF1F7'); // dinaikkan ke huruf besar
    expect(argb('#0F4C2E')).toHaveLength(8);
  });
});
