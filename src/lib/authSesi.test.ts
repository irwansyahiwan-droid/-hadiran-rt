import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  adaSesiTersimpan, batasWaktu, hapusSesiLokal, pesanLogin, WAKTU_HABIS,
} from './authSesi';

// `pesanError` menulis detail mentah ke console.error — bising di output uji.
beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); });

/** Pura-pura HP luring/daring. Node tak punya `navigator.onLine`. */
function setOnline(v: boolean | undefined) {
  const nav = globalThis.navigator as unknown as Record<string, unknown> | undefined;
  if (!nav) {
    (globalThis as Record<string, unknown>).navigator = { onLine: v };
    return;
  }
  Object.defineProperty(nav, 'onLine', { value: v, configurable: true });
}

describe('pesanLogin', () => {
  it('kredensial salah tetap disebut kredensial salah', () => {
    setOnline(true);
    const err = { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' };
    expect(pesanLogin(err)).toBe('Email atau password salah.');
  });

  // INTI perbaikan: sebelumnya SEMUA kegagalan diratakan jadi "password salah",
  // jadi bendahara di sinyal jelek mengganti sandi yang sebenarnya sudah benar.
  it('gagal jaringan TIDAK menuduh password salah', () => {
    setOnline(true);
    const err = new TypeError('Failed to fetch');
    expect(pesanLogin(err)).toBe('Koneksi bermasalah. Periksa internet lalu coba lagi.');
  });

  it('chunk klien Supabase gagal diunduh juga dibaca sebagai masalah koneksi', () => {
    setOnline(true);
    // Bentuk asli lemparan Vite saat chunk lazy gagal diambil.
    const err = new TypeError('Failed to fetch dynamically imported module: /assets/supabase-a1b2.js');
    expect(pesanLogin(err)).toBe('Koneksi bermasalah. Periksa internet lalu coba lagi.');
  });

  it('luring dijawab dengan tindakan yang benar, bukan tuduhan sandi', () => {
    setOnline(false);
    expect(pesanLogin(new Error('boom'))).toBe('Tidak ada internet. Sambungkan lalu coba lagi.');
  });

  it('batas sabar habis punya pesannya sendiri', () => {
    setOnline(true);
    expect(pesanLogin(new Error(WAKTU_HABIS))).toBe('Server lama tak menjawab. Cek koneksi lalu coba lagi.');
  });

  it('dibatasi laju auth: suruh tunggu, jangan suruh ganti sandi', () => {
    setOnline(true);
    expect(pesanLogin({ status: 429, message: 'Request rate limit reached' }))
      .toBe('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.');
    expect(pesanLogin({ code: 'over_request_rate_limit', message: 'x' }))
      .toBe('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.');
  });

  it('sebab tak dikenal jatuh ke pesan kredensial (perilaku lama dipertahankan)', () => {
    setOnline(true);
    expect(pesanLogin({ message: 'sesuatu yang aneh' })).toBe('Email atau password salah.');
    expect(pesanLogin(null)).toBe('Email atau password salah.');
  });
});

/** localStorage tiruan — Node tak menyediakannya. */
function pasangStorage(isi: Record<string, string>) {
  const peta = new Map(Object.entries(isi));
  (globalThis as Record<string, unknown>).localStorage = {
    get length() { return peta.size; },
    key: (i: number) => [...peta.keys()][i] ?? null,
    getItem: (k: string) => peta.get(k) ?? null,
    removeItem: (k: string) => { peta.delete(k); },
    setItem: (k: string, v: string) => { peta.set(k, v); },
    clear: () => peta.clear(),
  };
  return peta;
}

describe('sesi tersimpan', () => {
  it('mengenali token Supabase tanpa memuat kliennya', () => {
    pasangStorage({ 'hadiran-theme': 'light', 'sb-abcdef-auth-token': '{...}' });
    expect(adaSesiTersimpan()).toBe(true);
  });

  it('kunci app biasa bukan sesi', () => {
    pasangStorage({ 'hadiran-theme': 'light', 'hadiran-warga-banner': '1' });
    expect(adaSesiTersimpan()).toBe(false);
  });

  // "Keluar" yang gagal menghubungi server TIDAK boleh meninggalkan token hidup.
  it('hapusSesiLokal membuang SEMUA token, menyisakan preferensi warga', () => {
    const peta = pasangStorage({
      'hadiran-theme': 'dark',
      'sb-satu-auth-token': 'a',
      'sb-dua-auth-token': 'b',
    });
    hapusSesiLokal();
    expect(adaSesiTersimpan()).toBe(false);
    expect([...peta.keys()]).toEqual(['hadiran-theme']);
  });

  it('storage diblokir tak menjatuhkan app', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('SecurityError'); },
    });
    expect(adaSesiTersimpan()).toBe(false);
    expect(() => hapusSesiLokal()).not.toThrow();
  });
});

describe('batasWaktu', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('meneruskan hasil bila janji selesai sebelum batas', async () => {
    await expect(batasWaktu(Promise.resolve('ok'), 20_000)).resolves.toBe('ok');
  });

  it('meneruskan kegagalan asli, tak ditelan jadi waktu-habis', async () => {
    const asli = new Error('gagal asli');
    await expect(batasWaktu(Promise.reject(asli), 20_000)).rejects.toThrow('gagal asli');
  });

  // Inilah yang bikin tombol "Memproses…" berputar selamanya: fetch yang
  // menggantung TIDAK pernah reject sendiri.
  it('janji yang menggantung selamanya tetap ditolak saat batas lewat', async () => {
    const menggantung = new Promise<string>(() => {});
    const hasil = batasWaktu(menggantung, 20_000);
    const tertangkap = hasil.catch((e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await tertangkap).toBe(WAKTU_HABIS);
  });

  it('tak menembak batas setelah janji selesai (timer dibersihkan)', async () => {
    await expect(batasWaktu(Promise.resolve(1), 20_000)).resolves.toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
