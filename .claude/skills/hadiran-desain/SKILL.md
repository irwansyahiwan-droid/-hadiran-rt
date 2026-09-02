---
name: hadiran-desain
description: Sistem desain Hadiran RT — target besar (app harus terlihat MAHAL secara VISUAL, dan kenapa menyetel token bukan jawabannya), permukaan & tangga (warna, tipografi, spasi, bentuk, gerak, bayangan, ikon, nama kontrol), tiga golongan yang sengaja tidak diatur, urutan tuas saat "kurang nendang", daftar penjaga, jebakan deploy, dan target ke depan. Pakai SETIAP KALI menyentuh tampilan app ini.
---

# Sistem desain Hadiran RT

Bukan salinan CLAUDE.md. Ini yang harus DIPATUHI, bukan diulang.

## Target besar — dan apa yang BUKAN jawabannya

**App ini harus terlihat MAHAL, dan "mahal" di sini berarti VISUAL:** warna,
kontras, kanvas, font, spasi, bentuk, gerak. BUKAN keamanan, bukan arsitektur,
bukan disiplin rilis, bukan kesiapan audit. Temuan di luar sumbu itu ditulis
**satu baris, bukan dikerjakan** — kecuali user memintanya.

Dua hal yang SERING disalahbaca sbg cacat, padahal disengaja:
- **Aturan app memang lentur** — jadwal bisa berubah H-1, status tarikan baru
  final sesudah dilaksanakan. Itu cara RT bekerja, bukan bug.
- **Data terbuka untuk warga adalah TUJUAN**, bukan kebocoran. Transparansi kas
  itu alasan app ini ada.

**Lever piksel & token sudah nyaris habis — yang tersisa PERILAKU.** Ini bukan
pendapat; empat kali permintaan "bikin lebih mahal/mewah/nendang" dijawab
dengan MENGUKUR app yang berjalan, dan tiap kali temuannya bukan token:

| permintaan | yang ternyata jadi jawabannya |
|---|---|
| "mewah 2026" (18 Agu) | 19 teks terpotong 7–18px & pita kaki 83% kosong → padding, **nol hex baru** |
| "lebih mahal & mewah" (19 Agu) | lever token habis; cacat lahir dari INTERAKSI keputusan |
| "kurang nendang" (30 Agu) | kroma kanvas, bukan L — 6,6× lebih pucat dari hero |
| "putihnya belum nendang" | kartu terjebak di antara putih & senada |

Jadi kalau diminta "bikin lebih premium": **ukur app yang berjalan dulu.**
Menyetel token tanpa celah yang terukur adalah churn — baseline store-ready
sudah diverifikasi menyeluruh, sistemnya sengaja ditata.

**TOLAK brief premium generik.** Permintaan bergaya "fintech kelas atas" yang
mengandaikan navy `#0A1628` + gold + glassmorphism sudah pernah datang dan
ketiganya SALAH untuk repo ini: `tailwind.config.js` harfiah menulis "JANGAN
ganti ke navy/gold", emas satu-satunya `--gold-songket` #E8B651 dan ia
DECORATIVE-only, dan kartu sengaja FLAT (glass sudah dibuang sekali). Identitas
app ini rona Hutan + songket, bukan template fintech.

## Permukaan — nilai persis, dan siapa yang memilikinya

| | TERANG | GELAP |
|---|---|---|
| kanvas | `#CFE6D8` L\*90,4 C=0,0308 | `#001709` |
| kartu | `#FFFFFF` **putih murni** | `gray-900` `#192920` |
| sheet | kartu + bayangan | `gray-800` `#26362D` |
| langkah nada kanvas→kartu | **9,6 % L** | **8,3 % L** |
| hairline `line` | `#D3E0D8` — whisper, JANGAN digelapkan | ring cahaya `.12/.16/.19/.22` |

**Hero cuma SATU permukaan: `.hero-emerald`.** `.hero-card` sudah dibuang (nol
pemakai). Hero ber-NOMINAL memakai komponen `HeroSaldo`; hero tanpa nominal
memakai `hero-emerald` + `HeroStats` langsung (preseden: Beranda carousel,
Jadwal bendahara, Jadwal warga). Jangan lahirkan permukaan hero ketiga.

Kanvas punya **sepuluh titik sinkron** — berhenti di CSS berarti gagal:
`body` · `.app-bg` · token `sunken` · `warnaCetak.ts` (dikunci uji) ·
`manifest.background_color` · `landing.html --canvas` & `--alt-bg` ·
`index.html` theme-color statis · splash inline · `gen-splash.mjs` ·
`useTheme`. Splash PNG di-BAKE pada tone kanvas → regen + **periksa pikselnya**.

## Delapan tangga — nilai di luar tangga dibikin MUSTAHIL, bukan dijanjikan

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
| **nama kontrol** | tiap kontrol punya nama, dan nama itu UNIK per layar | `npm run audit:nama` |

**Pola yang WAJIB diikuti saat menambah tangga:** timpa skala Tailwind DI LUAR
`extend`. Selama nilai lama masih ada, nilai ke-25 lahir minggu depan.

**AAA sekarang DIUKUR, bukan cuma dinyatakan.** `audit:kontras` & `-deep`
mencetak seksi terpisah "AMBANG APP · AAA" — dilaporkan tapi TIDAK menggagalkan
rantai (disiplin sama bagian 200% di `audit:potong`). Garis dasar (1 Sep 2026):
**0 dari 1216** (warga) dan **0 dari 2256** (bendahara). Kalau angka GAGAL itu
naik dari nol, sesuatu baru saja mundur.

**Yang wajib nol PEMBILANGNYA, bukan penyebutnya.** Populasi memang bergerak
tiap permukaan lahir atau berpindah peran, dan itu bukan regresi — 1 Sep 2026
bendahara naik 2199 → 2256 (+57) semata karena Riwayat Aktivitas dibuka untuk
warga, jadi ia permukaan yang belum pernah diukur di peran itu (warga sendiri
1219 → 1216). Membandingkan penyebutnya lalu menyimpulkan "ada yang berubah"
akan mengirim sesi berikutnya memburu hantu. **Yang menarik justru sebaliknya:
sampel BARU adalah tempat teks lemah paling mungkin menyelinap** — sesudah
membuka permukaan ke peran baru, jalankan kedua sapuan ini dan pastikan
pembilangnya tetap nol di populasi yang sudah tumbuh.

## Aturan yang gampang terlewat

- **Kontrol berulang WAJIB bernama per-item.** `aria-label` string tetap di
  dalam daftar = N kontrol bernama sama; yang tak melihat layar tak bisa
  membedakannya, dan Voice Control menerima perintah lewat nama itu. Pola app:
  `Proses tarikan #N`, `Hapus tarikan #N`, `Batalkan hasil tarikan #N`.
- **`-webkit-font-smoothing: antialiased` HANYA di permukaan gelap**
  (`.dark`, `.hero-emerald`, `.hero-noise`, `.btn-brand`, `.bg-brand`).
  Global = teks gelap di kartu terang jadi tipis & "pecah". Properti ini
  mewarisi, jadi satu selektor per permukaan menutup keturunannya.
- **Animasi masuk pakai `backwards`, bukan `both`,** kalau keyframe akhirnya
  sama dgn keadaan dasar. `both` menahan `transform: matrix(…)` selamanya →
  elemen naik ke lapisan komposit dan tak pernah turun.
- **"Per ⟨tanggal⟩" itu KLAIM atas saldo**, jadi ia milik halaman ber-UANG
  (Kas RT, Kas Hadiran, Talangan) — bukan halaman jadwal — dan WAJIB
  ber-penjaga `usePerTanggal(loading, error)`: app tak boleh menyatakan tanggal
  yang tak ia ketahui.
- **Lapisan baru WAJIB `useBackDismiss` berdampingan `useDialog`.** Escape saja
  meninggalkan seluruh warga Android tanpa jalan keluar.

## Tiga golongan yang SENGAJA tidak diatur

Memaksanya masuk tangga itu **perusakan, bukan kerapian**:

1. **FUNGSIONAL** — ruang bebas nav, inset ikon dalam input, safe-area, cincin
   fokus, keadaan `:active`, reset `:disabled`.
2. **GAMBAR** — geometri ilustrasi dekoratif (`BannerCarousel`, `AbsensiArt`,
   ornamen Empty/ErrorState). Membulatkannya = membulatkan titik path SVG.
3. **SUASANA / MEDIA LAIN** — animasi ≥0,9s (shimmer, aurora); Login berkanvas
   hijau gelap; `warnaCetak` untuk KERTAS. Mazhab adalah properti MEDIA.

Tiap sapuan punya daftar **IZIN** — tulis alasannya per baris, jangan
menggeneralisir. Kunci izin JANGAN nomor baris; pakai bentuk `berkas#Ikon@px`.

## Kepemilikan: keputusan tidak boleh diambil di tempat pemanggil

Pelajaran `AvatarPeci`. Kalau sebuah nilai bisa diketik di call-site, ia akan
menyimpang. Yang sudah dipindah ke pemiliknya:
`.btn-brand`/`.btn-danger`/`.btn-secondary` memiliki **tebalnya**; `<Tag>` &
`<SectionTitle>` memiliki tebal badge-nya; stroke ikon hidup di **CSS**, bukan
`strokeWidth` di call-site; hero saldo = `HeroSaldo`; subjudul tanggal =
`usePerTanggal`.

## Kalau user bilang "kurang nendang" — urutan tuas, jangan menebak

Keluhan ini sudah datang **empat kali**, dan tiga jawaban pertama menggeser tuas
yang berbeda. Urutan yang terbukti:

1. **Ukur kroma dulu.** Kanvas jauh lebih pucat dari hero → soalnya WARNA, bukan
   kontras. Geser kroma dgn **L & rona DIKUNCI** di OKLab → nol rasio turun.
2. **Periksa nisbah se-rona kartu terhadap kanvas.** Kartu harus jelas putih
   ATAU jelas senada — di antaranya terbaca "kusam". (Kartu kini putih murni;
   kalau nanti terasa klinis, naikkan kroma kartu sampai nisbah ~43% pulih,
   `C≈0,0132` — JANGAN kembali ke `#F8FCF9` setengah jalan.)
3. **Bayangan / ring**, bukan permukaan. Nol biaya kontras.
4. **Langkah nada** — paling akhir, dan ukur ongkosnya dulu: menggelapkan kanvas
   3% menjatuhkan `#34453B` ke 7,04, sisa 0,04 dari ambang AAA.

**JANGAN menggelapkan hairline.** Jalan itu sudah terbukti buntu berkali-kali.
**Sesudah konversi OKLab→sRGB, periksa apakah hasilnya TERPOTONG gamut** —
kalau ya, rona yang tadi "dikunci" sebenarnya sudah lepas.

## Perintah

```bash
npm run periksa        # typecheck + lint + 5 sapuan statis + 283 tes
npm run sapu-semua     # SEMUA sapuan berurutan → satu ringkasan hijau/merah
npm run lembar-kontak  # 55 layar (normal/kosong/memuat/gagal/luring) → 1 PNG
```

29 sapuan. Yang visual butuh build produksi hidup:
`npm run build && npx vite preview --port 5199`

Sapuan yang paling sering menemukan cacat baru, dan apa yang HANYA ia lihat:
`audit:keadaan` (layar kosong/gagal/memuat) · `audit:luring-pertama` (kunjungan
pertama, server DIMATIKAN sungguhan) · `audit:nama` (kontrol bisa dibedakan
tanpa melihat) · `audit:gestur` · `audit:mundur` (tombol Back HP).

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
- **14 sapuan matang dikunci read-only.** Jangan buka tanpa izin user.
  `find . -path ./node_modules -prune -o -type f ! -perm -u+w -print`
- **Login memakai DUA kait `id`: `masuk-warga` & `masuk-bendahara`** — kait
  WAJIB `id`, bukan teks tombol. Sekali berubah, 20 sapuan mati serentak.
  Kait bendahara lahir 1 Sep 2026 karena pelajaran ke-24 TERULANG di jalur yang
  dulu terlewat: perbaikan waktu itu cuma memasang kait warga, sedangkan
  `audit:masuk` masih berkait ke teks — dan sesudah Login digambar ulang,
  "Masuk sebagai Bendahara" pindah ke LUAR `<form>` sementara submit di dalam
  tinggal berbunyi "Masuk". Sapuannya MATI ~8 hari tanpa vonis. **Kalau sebuah
  kelas cacat diperbaiki di satu jalur, periksa jalur kembarannya di hari yang
  sama** — kalau tidak, ia menunggu di sana sampai ada yang menyentuhnya.
- Sapuan memakai harness bersama `scripts/lib/audit-harness.mjs`. **Jangan
  tulis alur login sendiri.**
- **Uji luring yang MENGEMULASI luring bukan uji luring.** `setOffline` tidak
  memutus fetch service worker; matikan servernya.
- **Komentar JSX `{/* */}` tak boleh jadi anak kedua** di `action={…}` atau di
  `{cond && ( … )}` — ekspresi itu hanya boleh berisi SATU elemen.

## Target ke depan — yang harus tetap benar saat app tumbuh

- **300 KK.** App menjanjikan skala itu; hari ini ~79 aktif. Uji bentuk data
  dgn `EKSTREM=1 npm run audit:potong` / `audit:lebar` — skala **×100**, bukan
  ×1000 (nominal 16 milyar takkan pernah ada, dan "temuan" darinya karangan).
  Jumlah baris SENGAJA tak digandakan: id kembar = agregat uang bohong.
- **AAA harus TETAP 0.** Garis dasarnya baru tercapai; tiap perubahan permukaan
  wajib menjalankan `audit:kontras` + `-deep` dan membaca seksi AAA-nya.
- **Luring kunjungan pertama harus TETAP boot.** `SHELL` di `sw.js` disuntik
  saat build dari graf impor entry + dynamic import kedalaman-1. Kalau kaitnya
  hilang, build MELEDAK — jangan "perbaiki" dgn melunakkan itu.
- **Single-RT.** Isolasi multi-tenant sengaja DITUNDA; jangan bangun untuk
  multi-RT sebelum user memintanya.
- **Yang masih terbuka & sengaja tidak diklaim:** kontrol MUTASI bagian C
  `audit:potong` belum terbukti bergigi (populasi 200% memakai `.potong-lentur`
  yang MELIPAT, bukan memotong); iOS mode gelap mengirim `status-bar-style:
  default` dan perilakunya belum diverifikasi di perangkat nyata.

## Cara kerja yang diminta user

1. **Ukur dulu, baru bervonis.** Jangan sebut "tidak konsisten" sebelum
   menghitungnya. 28 "nilai arbitrer" pernah ternyata 15 di antaranya benar.
2. **Gambarkan, jangan dijelaskan.** Pilihan rasa → render 2–3 varian PNG,
   user yang memilih dengan mata.
3. **Temuan lama dibiarkan terbuka, jangan diklaim.** Sapuan merah → buktikan
   dulu apakah dari perubahanmu (`git stash` + build ulang + banding).
4. **Kalau sapuan melaporkan temuan palsu, betulkan ALATNYA, bukan kodenya.**
   Daftar kejadiannya panjang & bernomor di CLAUDE.md — baca sebelum menuduh
   kode.
5. **Sapuan baru WAJIB divalidasi MUTASI** — rusak aturannya, sapuan harus
   merah. Hijau tanpa mutasi tak membuktikan apa pun. Populasi kosong =
   `PROBE CACAT`, bukan lulus.
6. **Perubahan KATA disetujui user dulu** sebelum ditulis ke kode.
7. **Curigai probe-mu sendiri sekuat kau mencurigai app.** Angka mustahil di
   laporanmu sendiri adalah vonisnya, bukan detail.
