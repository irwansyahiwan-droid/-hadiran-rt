---
name: hadiran-desain
description: Sistem desain Hadiran RT — enam tangga (warna, tipografi, spasi, bentuk, gerak, bayangan, ikon), tiga golongan yang sengaja tidak diatur, daftar penjaga, dan jebakan deploy. Pakai SETIAP KALI menyentuh tampilan app ini.
---

# Sistem desain Hadiran RT

Bukan salinan CLAUDE.md. Ini yang harus DIPATUHI, bukan diulang.

## Enam tangga — nilai di luar tangga dibikin MUSTAHIL, bukan dijanjikan

| sumbu | tangga | ditegakkan oleh |
|---|---|---|
| **warna** | rona Hutan 158°, ambang app **AAA 7:1** (bukan AA) | `audit:kontras`, `-deep`, `-nonteks`, `audit:mati` |
| **tipografi** | 9 peran `display…overline`, tak ada 16px | `theme.fontSize` (MENIMPA) |
| **spasi** | `0.5 · 1 · 2 · 3 · 4 · 5 · 6 · 8` (2–32px) | `npm run audit:spasi` |
| **bentuk** | `lg8 · xl12 · 2xl16 · 3xl24 · full`; radius tile diturunkan dari sisinya | `npm run audit:bentuk` |
| **gerak** | `0.12 · 0.16 · 0.24 · 0.40 · 0.60s`; KELUAR selalu di bawah MASUK | `--dur-*` + `theme.transitionDuration` (MENIMPA) |
| **bayangan** | `.rest · .lift · .float · .float-high` | `npm run audit:bayangan` |
| **tebal huruf** | sumbu KERJA: `normal` redup · `medium` prosa · `semibold` nilai & kontrol · `bold` judul · `extrabold` angka besar (HANYA `font-display`) | `npm run audit:tebal` |
| **ikon** | `12px/2,25 · 14px/2 · 16px/1,75 · 20px/1,6`; stroke DITURUNKAN dari ukuran | `npm run audit:ikon` |

**Pola yang WAJIB diikuti saat menambah tangga:** timpa skala Tailwind DI LUAR
`extend`. Selama nilai lama masih ada, nilai ke-25 lahir minggu depan.

## Tiga golongan yang SENGAJA tidak diatur

Memaksanya masuk tangga itu **perusakan, bukan kerapian**:

1. **FUNGSIONAL** — ruang bebas nav, inset ikon dalam input, safe-area, cincin
   fokus, keadaan `:active`, reset `:disabled`.
2. **GAMBAR** — geometri ilustrasi dekoratif (`BannerCarousel`, `AbsensiArt`,
   ornamen Empty/ErrorState). Membulatkannya = membulatkan titik path SVG.
3. **SUASANA / MEDIA LAIN** — animasi ≥0,9s (shimmer, aurora); Login berkanvas
   hijau gelap; `warnaCetak` untuk KERTAS. Mazhab adalah properti MEDIA.

Tiap sapuan punya daftar **IZIN** — tulis alasannya per baris, jangan
menggeneralisir.

## Kepemilikan: keputusan tidak boleh diambil di tempat pemanggil

Pelajaran `AvatarPeci`. Kalau sebuah nilai bisa diketik di call-site, ia akan
menyimpang. Yang sudah dipindah ke pemiliknya:
`.btn-brand`/`.btn-danger`/`.btn-secondary` memiliki **tebalnya**; `<Tag>` &
`<SectionTitle>` memiliki tebal badge-nya; stroke ikon hidup di **CSS**, bukan
`strokeWidth` di call-site; hero saldo = `HeroSaldo`.

## Perintah

```bash
npm run periksa        # typecheck + lint + 6 sapuan statis + 269 tes
npm run sapu-semua     # SEMUA sapuan berurutan → satu ringkasan hijau/merah
npm run lembar-kontak  # 55 layar (normal/kosong/memuat/gagal/luring) → 1 PNG
```

Sapuan visual butuh build produksi hidup:
`npm run build && npx vite preview --port 5199`

## Jebakan yang sudah mahal — jangan diulang

- **DEPLOY TIDAK OTOMATIS.** `git push` tidak men-deploy apa pun.
  `vercel --prod --yes` dari akar repo. **Vonis "live" WAJIB dari mengambil
  produksi lalu memeriksa ISInya**, bukan dari exit code.
- **Verifikasi build**: pastikan `npm run build` BERHASIL sebelum memeriksa
  keluarannya — grep pada `dist` yang basi pernah menjawab "0" yang menyesatkan.
- **Mengubah warna PERMUKAAN membatalkan tiap angka kontras di atasnya** —
  termasuk yang dulu disimpulkan "aman". Cari sisa migrasi lewat **RONA**,
  bukan rasio.
- **Kelas `box-shadow` polos MENGHAPUS `ring-*` Tailwind.** Sertakan
  `var(--tw-ring-offset-shadow)` & `var(--tw-ring-shadow)`.
- **15 sapuan matang dikunci read-only.** Jangan buka tanpa izin user.
  `find . -path ./node_modules -prune -o -type f ! -perm -u+w -print`
- **Login memakai kait `id="masuk-warga"`** — kait WAJIB `id`, bukan teks
  tombol. Sekali berubah, 20 sapuan mati serentak.
- Sapuan memakai harness bersama `scripts/lib/audit-harness.mjs`. **Jangan
  tulis alur login sendiri.**

## Cara kerja yang diminta user

1. **Ukur dulu, baru bervonis.** Jangan sebut "tidak konsisten" sebelum
   menghitungnya. 28 "nilai arbitrer" pernah ternyata 15 di antaranya benar.
2. **Gambarkan, jangan dijelaskan.** Pilihan rasa → render 2–3 varian PNG,
   user yang memilih dengan mata.
3. **Temuan lama dibiarkan terbuka, jangan diklaim.** Sapuan merah → buktikan
   dulu apakah dari perubahanmu (`git stash` + build ulang + banding).
4. **Kalau sapuan melaporkan temuan palsu, betulkan ALATNYA, bukan kodenya.**
5. **Sapuan baru WAJIB divalidasi MUTASI** — rusak aturannya, sapuan harus
   merah. Hijau tanpa mutasi tak membuktikan apa pun.
6. **Perubahan KATA disetujui user dulu** sebelum ditulis ke kode.
