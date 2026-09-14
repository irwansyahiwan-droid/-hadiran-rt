/**
 * Trek + kenop sakelar — VISUAL saja. `role="switch"` & `aria-checked` milik
 * tombol pembungkusnya (seluruh baris = satu area sentuh, labelnya ikut terbaca).
 *
 * Penanda `data-sakelar-trek` / `data-sakelar-kenop` dibaca
 * `audit:kontras-nonteks` bagian F: `role="switch"` TANPA penanda dihitung
 * gagal, bukan dilewati — sakelar baru wajib memakai komponen ini.
 *
 * ── Warna (14 Sep 2026, §1.4.11 ambang 3:1) ────────────────────────────────
 * Trek MATI dulu `gray-300` / `gray-600` — terukur piksel 1,44:1 (terang, di
 * banner amber-50) & 1,94:1 (gelap), kenop putih di trek abu 1,47:1, dan trek
 * NYALA `brand-500` di gelap 2,45:1. Sakelar yang mati praktis tak terlihat.
 *
 * Terang: trek gray-500 / brand-500, kenop putih.
 * Gelap : trek gray-400 / emerald-400, kenop gray-900 — pola Material 3
 *         (trek terang, kenop gelap). Kenop putih di trek terang gelap-mode
 *         jatuh ke ~2,4:1, jadi kenopnya yang dibalik, bukan treknya digelapkan.
 * Terburuk (hitungan token, lawan KEDUA latar pemakai): 4,55 · kenop 4,76.
 *
 * ── `left-0` WAJIB ─────────────────────────────────────────────────────────
 * Kenop `absolute` tanpa `left` mengambil POSISI STATIS, dan <button>
 * mewariskan `text-align: center` — di baris tanpa `text-left` kenopnya mulai
 * dari TENGAH trek: saat mati duduk di kanan (terbaca "nyala"), saat nyala
 * keluar 14px dari trek. Terukur di "Anggota aktif", dijaga bagian F.
 * Geser 18px = celah 2px di KEDUA sisi (36 − 16 − 2).
 */
export default function Sakelar({ nyala }: { nyala: boolean }) {
  return (
    <span
      data-sakelar-trek=""
      aria-hidden="true"
      className={`relative w-9 h-5 shrink-0 rounded-full transition-colors ${nyala ? 'bg-brand-500 dark:bg-emerald-400' : 'bg-gray-500 dark:bg-gray-400'}`}
    >
      <span
        data-sakelar-kenop=""
        className={`absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-900 transition-transform ${nyala ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
      />
    </span>
  );
}
