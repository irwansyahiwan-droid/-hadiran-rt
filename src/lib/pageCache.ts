// Cache data halaman — stale-while-revalidate ala app bank (myBCA/Revolut):
// pindah tab / buka ulang app → data TERAKHIR tampil instan (tanpa skeleton),
// fetch tetap jalan diam-diam lalu menimpa. Dua lapis:
//   1. Map in-memory  → antar-tab dalam satu sesi (tab di-unmount saat pindah).
//   2. localStorage   → antar-sesi & saat sinyal jelek/offline (warga tetap
//      bisa lihat saldo/jadwal terakhir, bukan layar error).
// Isi cache = data Supabase apa adanya (JSON-serializable). Set/instance kelas
// harus dikonversi array dulu di call-site. VER dinaikkan bila bentuk data
// halaman berubah (deploy baru tak membaca snapshot lama yang beda bentuk).

const VER = 'v1';
const key = (k: string) => `hadiran-cache-${VER}:${k}`;

const mem = new Map<string, unknown>();

export function getPageCache<T>(k: string): T | null {
  if (mem.has(k)) return mem.get(k) as T;
  try {
    const raw = localStorage.getItem(key(k));
    if (!raw) return null;
    const v = JSON.parse(raw) as T;
    mem.set(k, v);
    return v;
  } catch {
    return null; // parse gagal / storage diblokir → anggap tak ada cache
  }
}

export function setPageCache<T>(k: string, value: T): void {
  mem.set(k, value);
  try {
    localStorage.setItem(key(k), JSON.stringify(value));
  } catch {
    // kuota penuh / private mode — cache memori tetap jalan, abaikan
  }
}
