import { describe, it, expect } from 'vitest';
import { bandingPeriode } from './SmartInsight';

/**
 * Kartu "Kas masuk bulan ini" dilihat WARGA di mode lihat-saja, jadi kalimat
 * yang keliru di sini bukan cuma soal rapi — ia menceritakan kesehatan kas RT
 * kepada puluhan orang. Yang dikunci: kapan persentase BOLEH muncul.
 */

describe('bandingPeriode — periode berjalan yang masih kosong', () => {
  /* Uji INTI. Sebelum 5 Agu 2026 kasus ini menghasilkan -100% merah + panah
     turun: membandingkan bulan yang baru jalan beberapa hari lawan bulan lalu
     yang penuh. Di data RT ini pemasukan pertama tiap bulan mendarat tgl 2–12
     (bahkan 31 di Januari, dan Maret nihil), jadi alarm palsu itu muncul 1–2
     minggu pertama hampir setiap bulan. */
  it('current 0 & previous ada → TANPA persentase (bukan -100%)', () => {
    const h = bandingPeriode(0, 3_270_000);
    expect(h.pct).toBeNull();
    expect(h.alasan).toBe('periode-berjalan-kosong');
  });

  it('nilai negatif diperlakukan sama dgn kosong', () => {
    expect(bandingPeriode(-1, 1_000_000).pct).toBeNull();
  });

  it('begitu ada pemasukan sekecil apa pun, persentase kembali muncul', () => {
    const h = bandingPeriode(1_000, 3_270_000);
    expect(h.pct).toBe(-100); // membulat, tapi BUKAN karena disembunyikan
    expect(h.alasan).toBeNull();
  });
});

describe('bandingPeriode — pembanding tak ada', () => {
  it('previous 0 → tanpa persentase, alasannya beda', () => {
    const h = bandingPeriode(500_000, 0);
    expect(h.pct).toBeNull();
    expect(h.alasan).toBe('tanpa-pembanding');
  });

  /* Dua keadaan ini WAJIB terbedakan: kalimat penggantinya beda ("belum ada
     data bulan lalu" vs "belum ada pemasukan bulan ini"). Kalau seseorang
     menyatukannya jadi satu cabang, salah satunya jadi bohong. */
  it('kosong-di-dua-sisi dilaporkan sbg tanpa-pembanding, bukan berjalan-kosong', () => {
    expect(bandingPeriode(0, 0).alasan).toBe('tanpa-pembanding');
  });
});

describe('bandingPeriode — hitungan saat memang layak dibandingkan', () => {
  it('naik & turun dibulatkan ke bilangan bulat', () => {
    expect(bandingPeriode(2_000_000, 1_000_000).pct).toBe(100);
    expect(bandingPeriode(1_500_000, 3_000_000).pct).toBe(-50);
    expect(bandingPeriode(3_270_000, 3_270_000).pct).toBe(0);
  });

  it('nilai sama persis = 0%, bukan null (datar itu kabar, bukan ketiadaan data)', () => {
    const h = bandingPeriode(4_710_000, 4_710_000);
    expect(h.pct).toBe(0);
    expect(h.alasan).toBeNull();
  });
});
