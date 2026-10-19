import { describe, it, expect } from 'vitest';
import {
  kataNama, susunNama, susunLegenda, hitungGeometriKartuSaya, teksKartuSaya, KARTU_SAYA,
} from './shareKartuSaya';
import type { KartuWarga } from './kartuWarga';

/* Pengukur palsu: lebar = jumlah huruf × px × 0,6 (kira-kira Sora 800). */
const ukur = (t: string, px: number) => t.length * px * 0.6;
const LEBAR = KARTU_SAYA.W - 2 * KARTU_SAYA.X; // 300

describe('nama di kartu PNG — tak pernah dipotong', () => {
  it('kurung yang berdiri sendiri menempel ke kata di dalamnya', () => {
    expect(kataNama('Saman Suryadi ( Mono )')).toEqual(['Saman', 'Suryadi', '( Mono )']);
    expect(kataNama('  Karta   Saleh ')).toEqual(['Karta', 'Saleh']);
  });

  it('nama pendek: satu baris di ukuran penuh', () => {
    expect(susunNama('Irwansyah', ukur, LEBAR)).toEqual({ px: 30, baris: ['Irwansyah'] });
  });

  it('nama sedang: menyusut dulu, tetap satu baris (>= 24px)', () => {
    const r = susunNama('Muhammad Abdul Rozak', ukur, LEBAR); // 20 huruf
    expect(r.baris).toHaveLength(1);
    expect(r.px).toBeGreaterThanOrEqual(KARTU_SAYA.NAMA_SATU_MIN);
    expect(ukur(r.baris[0], r.px)).toBeLessThanOrEqual(LEBAR);
  });

  it('nama panjang: dua baris di batas KATA, isinya utuh', () => {
    const nama = 'Saman Suryadi Wirakusuma ( Mono )';
    const r = susunNama(nama, ukur, LEBAR);
    expect(r.baris.length).toBe(2);
    expect(r.baris.join(' ')).toBe(nama);
    expect(r.baris.every((b) => ukur(b, r.px) <= LEBAR)).toBe(true);
    expect(r.baris.some((b) => b.endsWith('('))).toBe(false);
  });
});

describe('legenda jejak', () => {
  const lebarTeks = (t: string) => t.length * 7;
  it('hadir & tidak hadir selalu tampil; status lain hanya kalau ada', () => {
    const l = susunLegenda([{ status: 'hadir' }, { status: 'titip' }], lebarTeks, LEBAR);
    expect(l.map((x) => x.st)).toEqual(['hadir', 'titip', 'tidak_hadir']);
    expect(l.find((x) => x.st === 'tidak_hadir')?.n).toBe(0);
  });
  it('melipat ke baris berikutnya saat lebar habis', () => {
    const semua = (['hadir', 'titip', 'tidak_hadir', 'sohibul', 'kosong'] as const).map((status) => ({ status }));
    const l = susunLegenda(semua, lebarTeks, LEBAR);
    expect(l[0]).toMatchObject({ x: 0, baris: 0 });
    expect(Math.max(...l.map((x) => x.baris))).toBeGreaterThan(0);
    for (const x of l.filter((i) => i.x === 0)) expect(x.x).toBe(0);
  });
});

describe('geometri kartu — kotak tak bertumpuk & tinggi ikut isi', () => {
  const dasar = {
    barisNama: 1, pxNama: 30, adaRumah: true, nTunggakan: 0,
    nJejak: 22, barisLegenda: 1, adaGiliran: true, nMenerima: 0,
  };
  const urut = (g: ReturnType<typeof hitungGeometriKartuSaya>) =>
    [g.hero, g.talangan, g.jejak, g.giliran].filter(Boolean) as { top: number; h: number }[];

  it('tiap kotak mulai SESUDAH kotak sebelumnya, kaki muat', () => {
    const g = hitungGeometriKartuSaya(dasar);
    const k = urut(g);
    for (let i = 1; i < k.length; i++) expect(k[i].top).toBeGreaterThanOrEqual(k[i - 1].top + k[i - 1].h + KARTU_SAYA.GAP);
    const terakhir = k[k.length - 1];
    expect(g.H).toBe(terakhir.top + terakhir.h + KARTU_SAYA.FOOTER);
  });

  it('nama dua baris memanjangkan hero, sisanya ikut turun', () => {
    const a = hitungGeometriKartuSaya(dasar);
    const b = hitungGeometriKartuSaya({ ...dasar, barisNama: 2, pxNama: 24 });
    expect(b.hero.h - a.hero.h).toBe(Math.round(24 * 1.2) * 2 - 36);
    expect(b.H - a.H).toBe(b.hero.h - a.hero.h);
  });

  it('tunggakan, jejak & penerimaan menambah tinggi', () => {
    const a = hitungGeometriKartuSaya(dasar).H;
    expect(hitungGeometriKartuSaya({ ...dasar, nTunggakan: 2 }).H).toBeGreaterThan(a);
    expect(hitungGeometriKartuSaya({ ...dasar, nJejak: 41 }).H).toBeGreaterThan(a);
    expect(hitungGeometriKartuSaya({ ...dasar, nMenerima: 1 }).H).toBeGreaterThan(a);
  });

  it('daftar panjang dipagari: tunggakan > maks = satu baris "+N lainnya"', () => {
    const maks = hitungGeometriKartuSaya({ ...dasar, nTunggakan: KARTU_SAYA.TUNGGAKAN_MAKS }).talangan.h;
    expect(hitungGeometriKartuSaya({ ...dasar, nTunggakan: 9 }).talangan.h).toBe(maks + KARTU_SAYA.BARIS_TUNGGAKAN);
  });

  it('jejak 10 per baris di kolom 300px', () => {
    expect(hitungGeometriKartuSaya(dasar).jejak?.perBaris).toBe(10);
    expect(hitungGeometriKartuSaya({ ...dasar, nJejak: 0 }).jejak).toBeNull();
  });
});

describe('teks cadangan wa.me', () => {
  const kartu = { hadir: 18, titip: 1, tidakHadir: 3, totalTunggakan: 0 } as KartuWarga;
  it('menyebut nama, talangan & kehadiran', () => {
    expect(teksKartuSaya({ nama: 'Karta Saleh', kartu })).toBe('Kartu Saya — Karta Saleh\nTalangan: lunas · Hadir 18/22\n— Hadiran RT');
    expect(teksKartuSaya({ nama: 'X', kartu: { ...kartu, totalTunggakan: 100000 } })).toContain('Rp100.000 belum lunas');
  });
});
