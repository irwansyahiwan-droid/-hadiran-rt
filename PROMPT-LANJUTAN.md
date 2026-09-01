# Prompt lanjutan — tempel di Claude Code

Buka Claude Code di `~/Projects/hadiran-rt`, lalu tempel blok di bawah ini.

---

Halo. Aku lanjutkan pengerjaan **Hadiran RT** (hadiran-rt.vercel.app) dari sesi
sebelumnya. Baca `CLAUDE.md` dulu sampai habis — di sana ada 30 pelajaran yang
mahal, beberapa di antaranya lahir dari kesalahan yang sudah pernah terjadi dan
tidak boleh terulang.

## Tujuan saya, satu kalimat

App ini harus **terlihat mahal** — dan yang saya maksud mahal itu **visual**:
warna, kontras, kanvas, font, spasi, bentuk, gerak. Bukan keamanan, bukan
arsitektur, bukan disiplin rilis, bukan kesiapan audit. Ketiganya sudah saya
putuskan sendiri dan sudah saya tulis di halaman "Tentang Aplikasi". Kalau kamu
merasa ada temuan di luar sumbu visual, **catat saja satu baris, jangan
dijadikan pekerjaan**, kecuali saya yang meminta.

Satu hal yang sering disalahpahami: aturan app ini memang **fleksibel** (jadwal
bisa berubah H-1, status penarikan baru fix setelah pelaksanaan) dan
keterbukaan data ke warga itu **tujuan, bukan kebocoran**. Jangan diperlakukan
sebagai cacat.

## Yang SUDAH punya sistem — jangan diulang, cukup dipatuhi

Lima sumbu sudah jadi tangga, dan tiap tangga dijaga alat supaya nilai di luar
tangga jadi **mustahil**, bukan sekadar dijanjikan tidak dipakai:

| sumbu | tangga | penjaga |
|---|---|---|
| warna | rona Hutan 158°, remap AAA diukur di permukaan terburuk | `audit:kontras`, `-deep`, `-nonteks`, `audit:mati` |
| tipografi | 9 peran (display…overline), tanpa 16px | `tailwind.config.js` `fontSize` (menimpa) |
| spasi | `0.5·1·2·3·4·5·6·8` (2–32px) | `npm run audit:spasi` |
| bentuk | `lg8·xl12·2xl16·3xl24·full`, radius tile diturunkan dari sisinya | `npm run audit:bentuk` |
| gerak | `0.12·0.16·0.24·0.40·0.60s`, keluar selalu di bawah masuk | `--dur-*` + `theme.transitionDuration` (menimpa) |

Tiga golongan yang **sengaja tidak diatur** — memaksanya ke tangga itu
perusakan, bukan kerapian: **fungsional** (ruang bebas nav, inset ikon,
safe-area), **gambar** (geometri ilustrasi dekoratif), dan **suasana**
(animasi ≥0.9s). Daftar izinnya tertulis di masing-masing sapuan.

## Cara kerja yang saya minta

1. **Ukur dulu, baru bervonis.** Jangan bilang sesuatu "tidak konsisten"
   sebelum menghitungnya. Sesi lalu 28 "nilai arbitrer" ternyata 15 di
   antaranya geometri ilustrasi yang memang benar begitu.
2. **Gambarkan, jangan dijelaskan.** Kalau ada pilihan rasa (nada kanvas,
   kekuatan bayangan), render dua-tiga varian jadi PNG dan biarkan saya yang
   memilih. Saya memutuskan dengan mata, bukan dengan angka.
3. **Verifikasi pakai sapuan repo sendiri**, bukan perasaan. `npm run periksa`
   lalu sapuan visual yang relevan.
4. **Temuan lama dibiarkan terbuka, jangan diklaim.** Kalau sebuah sapuan
   merah, buktikan dulu apakah itu dari perubahanmu — `git stash` + build ulang
   + bandingkan. Sesi lalu cara ini menyelamatkan dua vonis salah.
5. **"Push berhasil" BUKAN bukti "live".** Deploy proyek ini TIDAK otomatis:
   `vercel --prod --yes` dari akar repo. Vonis live wajib dari **mengambil
   produksi lalu memeriksa ISINYA** (nilai hex / durasi / radius yang
   benar-benar dikirim), bukan dari exit code perintah sebelumnya.

## Perintah yang dipakai

```bash
npm run periksa          # typecheck + lint + audit:spasi + audit:bentuk + 269 tes
npx vite preview --port 5199    # WAJIB hidup dulu sebelum sapuan visual
npm run audit:kontras    # + kontras-deep, kontras-nonteks, mati
npm run audit:potong     # + lebar, sentuh, sheet, lompat, gerak
vercel --prod --yes      # deploy (TIDAK otomatis dari git push)
```

## Yang sengaja masih terbuka (sudah dibuktikan bukan regresi baru)

- 6 label bulan di Kas RT terpotong pada **teks 200%** — ambang ini di ATAS AA,
  bukan syarat WCAG.
- Satu nama panjang di absensi bendahara @360px (`cw 158 / sw 178`) — sudah
  dapat 8px lebih lega dari sebelumnya, tapi belum muat.
- Peran tipografi `headline` (28px) terdefinisi tapi belum terpakai — sengaja,
  sebagai anak tangga sah untuk lompatan 22→38px.
- Status **signup Supabase belum terverifikasi**. Saya sengaja tidak
  mengizinkan probe-nya karena itu akan membuat akun sungguhan di sistem auth
  produksi. Kalau perlu, saya cek sendiri dari dashboard Supabase.

## Tugas pertama

**Langkah nada kanvas → kartu.** Sudah terukur dan belum saya kerjakan:

```
terang : kanvas #E4ECE7 → kartu #F8FCF9   = 1,162 : 1
gelap  : kanvas #07170E → kartu #22342A   = 1,400 : 1
```

Sisi terang **20% lebih lemah** dari sisi gelap — kartu kurang mengangkat dari
kanvas, dan menurut saya inilah sisa terbesar dari rasa "belum maksimal".

Yang saya minta: jangan langsung diubah. **Render tiga varian** langkah nada
(±1,16 sekarang / ~1,28 / ~1,40) sebagai potret Beranda + Kas RT mode terang
berdampingan, lalu tunjukkan ke saya. Kunci kartu di `#F8FCF9` supaya kontras
teks tidak berkurang; yang bergerak kanvasnya. Ingat konsekuensinya: kanvas
lebih gelap menurunkan rasio setiap teks yang duduk LANGSUNG di kanvas — ukur
itu dan laporkan sebelum saya memilih. Kalau ada yang jatuh di bawah 7:1,
naikkan warnanya dengan rona & kroma dikunci di OKLab (cuma L yang bergerak),
seperti pass kontras terakhir.

Sesudah saya pilih, baru: terapkan → `periksa` → sapuan visual → commit →
`vercel --prod --yes` → buktikan dari isi CSS produksi.

## Sesudah itu (urutan usulan, konfirmasi dulu ke saya)

1. **Tangga bayangan/elevasi** — `--shadow-card` / `lift` / `float` belum punya
   peran bertingkat seperti tangga yang lain.
2. **Tangga tebal huruf** — cek apakah `font-medium/semibold/bold/extrabold`
   dipakai berdasarkan peran atau kebiasaan.
3. **Kepadatan halaman Jadwal** — satu-satunya halaman yang belum pernah kena
   sesi pengurangan seperti Beranda.
