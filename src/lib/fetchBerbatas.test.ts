import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buatFetchBerbatas, BATAS_REQ_MS } from './fetchBerbatas';
import { pesanError } from './utils';

const aslinya = globalThis.fetch;
afterEach(() => { globalThis.fetch = aslinya; vi.restoreAllMocks(); });

/** Ganti fetch global dengan sesuatu yang perilakunya kita kendalikan. */
function palsukanFetch(impl: (init?: RequestInit) => Promise<Response>) {
  const dipanggil: RequestInit[] = [];
  globalThis.fetch = ((_i: unknown, init?: RequestInit) => {
    dipanggil.push(init ?? {});
    return impl(init);
  }) as typeof fetch;
  return dipanggil;
}

describe('buatFetchBerbatas', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('meneruskan respons yang datang tepat waktu', async () => {
    palsukanFetch(() => Promise.resolve(new Response('ok', { status: 200 })));
    const r = await buatFetchBerbatas()('https://x.test/a');
    expect(r.status).toBe(200);
  });

  // INTI: request yang menggantung tak pernah reject sendiri. Tanpa batas ini,
  // `finally` yang melepas status "Menyimpan…" tak pernah tercapai.
  it('memotong request yang MENGGANTUNG selamanya', async () => {
    palsukanFetch((init) => new Promise((_res, rej) => {
      init?.signal?.addEventListener('abort', () => rej(init.signal?.reason ?? new Error('abort')));
    }));
    const janji = buatFetchBerbatas(1_000)('https://x.test/gantung');
    const tertangkap = janji.catch((e: Error) => e.name);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await tertangkap).toBe('TimeoutError');
  });

  it('alasan pembatalan terbaca sebagai kalimat yang bisa ditindaklanjuti', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const e = new DOMException('Batas waktu jaringan terlampaui', 'TimeoutError');
    expect(pesanError(e, 'Gagal menyimpan.')).toBe('Server lama tak menjawab. Coba lagi.');
  });

  it('tidak memotong request yang selesai sebelum batas (jam dibersihkan)', async () => {
    palsukanFetch(() => Promise.resolve(new Response('ok')));
    await buatFetchBerbatas(1_000)('https://x.test/a');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sinyal milik pemanggil tetap dihormati, tidak ditelan', async () => {
    palsukanFetch((init) => new Promise((_res, rej) => {
      init?.signal?.addEventListener('abort', () => rej(init.signal?.reason ?? new Error('abort')));
    }));
    const punyaPemanggil = new AbortController();
    const janji = buatFetchBerbatas(60_000)('https://x.test/a', { signal: punyaPemanggil.signal });
    const tertangkap = janji.catch((e: Error) => e.message);
    punyaPemanggil.abort(new Error('dibatalkan pemanggil'));
    await vi.advanceTimersByTimeAsync(0);
    expect(await tertangkap).toBe('dibatalkan pemanggil');
  });

  it('batas bawaan sepadan dengan anggaran muat 400 kbps', () => {
    expect(BATAS_REQ_MS).toBe(20_000);
  });
});
