/**
 * Batas sabar SETIAP request ke Supabase.
 *
 * Kenapa di lapisan klien, bukan di tiap halaman: `fetch` yang MENGGANTUNG
 * tidak pernah reject sendiri. Semua jalur tulis app ini sudah disiplin memakai
 * `try/finally` untuk melepas status "Menyimpan…" — tapi `finally` tak pernah
 * tercapai kalau janjinya tak pernah selesai. Dibuktikan 2 Agu 2026 lawan build
 * produksi: satu POST yang digantung mengunci tombol Simpan Kas RT > 25 detik,
 * dan bendahara tak punya jalan lain selain menutup sheet.
 *
 * Dipasang sekali di `lib/supabase.ts` supaya berlaku untuk tiap baca DAN tulis
 * — termasuk kode yang belum ditulis. Menaruhnya per-halaman berarti menunggu
 * seseorang lupa. Sesudah batas lewat, kegagalan jadi error biasa yang sudah
 * ditangani mesin `pesanError` + `try/finally` yang ada.
 *
 * 20 dtk ≈ 5× headroom atas muat terukur di 400 kbps/CPU 4× (lihat `audit:muat`).
 */
export const BATAS_REQ_MS = 20_000;

export function buatFetchBerbatas(ms = BATAS_REQ_MS): typeof fetch {
  return function fetchBerbatas(input, init) {
    const ac = new AbortController();
    const jam = setTimeout(
      () => ac.abort(new DOMException('Batas waktu jaringan terlampaui', 'TimeoutError')),
      ms,
    );
    // Jangan buang sinyal milik pemanggil — teruskan pembatalannya.
    init?.signal?.addEventListener('abort', () => ac.abort(init.signal?.reason), { once: true });
    return fetch(input, { ...init, signal: ac.signal }).finally(() => clearTimeout(jam));
  };
}
