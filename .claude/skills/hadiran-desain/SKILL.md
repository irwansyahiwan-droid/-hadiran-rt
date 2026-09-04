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
| **tipografi** | 9 peran `display…overline`, tak ada 16px; **tahan setelan JARAK TEKS §1.4.12** | `theme.fontSize` (MENIMPA) + `npm run audit:jarak-teks` |
| **spasi** | `0.5 · 1 · 2 · 3 · 4 · 5 · 6 · 8` (2–32px) | `npm run audit:spasi` |
| **bentuk** | `lg8 · xl12 · 2xl16 · 3xl24 · full`; radius tile diturunkan dari sisinya | `npm run audit:bentuk` |
| **gerak** | `0.12 · 0.16 · 0.24 · 0.40 · 0.60s`; KELUAR selalu di bawah MASUK | `--dur-*` + `theme.transitionDuration` (MENIMPA) |
| **bayangan** | `.rest · .lift · .float · .float-high` | `npm run audit:bayangan` |
| **tebal huruf** | sumbu KERJA: `normal` redup · `medium` prosa · `semibold` nilai & kontrol · `bold` judul · `extrabold` angka besar (HANYA `font-display`). **Badge/tombol `text-micro` (11px) wajib `bold`** — kompensasi optis | `npm run audit:tebal` |
| **ikon** | `12px/2,25 · 14px/2 · 16px/1,75 · 20px/1,6`; stroke DITURUNKAN dari ukuran | `npm run audit:ikon` |
| **nama kontrol** | tiap kontrol punya nama, dan nama itu UNIK per layar | `npm run audit:nama` |
| **lantai huruf** | tak ada teks TERCAT di bawah anak tangga terkecil (**11px**) | `npm run audit:huruf` |

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

- **Perubahan RASA tak pernah menumpang commit lain.** Warna, bayangan,
  tipografi, spasi — wajib DIRENDER & disetujui user sebelum dikirim, dan wajib
  punya commit sendiri. 2 Sep 2026 nilai `--shadow-card` ikut ter-deploy lewat
  `git add -A` di commit yang judulnya §1.4.12; user menemukannya dari layarnya
  sendiri ("kok jadi redup"), bukan dari catatan rilis. **Sebelum commit:
  `git diff --staged --stat`, lalu tanyakan tiap berkas — kenapa ini di sini?**
- **"Redup" hampir tak pernah berarti GELAP.** Jawabannya tak sekali pun
  menggelapkan sesuatu: ia berarti kartu kehilangan KEDALAMAN (bayangan
  dipangkas → kartu melebur ke kanvas) atau huruf kecil kehilangan BERAT
  (badge 11px 700 → 600 terbaca memudar). Ukur bayangan & tebal dulu — palet
  dan kontras justru sedang hijau, jadi menyentuh warna itu salah tuas.
- **Di 11px, satu anak tangga tebal = beda "terbaca" vs "memudar".** Prinsipnya
  sama dgn tangga IKON (stroke diturunkan dari UKURAN). Kalau aturan tangga
  meleset di satu ukuran, **ubah ATURANnya, jangan tulis izin** — izin menutup
  satu call-site & membiarkan kelasnya terbuka. Begitu aturan micro-bold
  ditegakkan, ia langsung menemukan 7 badge lain di luar `<Tag>`.

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
- **Tinggi kotak teks JANGAN dipaku angka `em`/`px` — biarkan LAHIR dari kotak
  barisnya.** Pengguna yang menyetel jarak teks (§1.4.12, AA WAJIB) menimpa
  `line-height` lewat `!important`, jadi `style={{height:'1em'}}` tetap 34px
  sementara isinya jadi 51px. Itu yang membuat saldo hero mencetak serpihan
  digit tetangga (Odometer, 2 Sep 2026): obatnya pengukur `visibility:hidden`
  di dalam jendela + langkah PERSENTASE, bukan angka `em`.
- **Ringkasan boleh dipotong HANYA kalau tujuannya tidak.** `line-clamp` di
  baris daftar itu sah (keterangan Kas RT tanpa clamp = 288px, sepertiga layar
  untuk satu transaksi) — tapi ia WAJIB memakai penanda `data-ringkas` DAN
  duduk di dalam kontrol yang bisa diaktifkan, dan **sheet tujuannya tak boleh
  punya batas sama sekali**: bukan `truncate`, bukan juga `.potong-lentur`.
  Ini bukan teori — waktu aturannya dipasang, jalan keluar nama Sohibul Bait
  ternyata `truncate` juga. `audit:jarak-teks` ikut mengukur sheet detail
  justru supaya janji itu diperiksa, bukan dipercaya.
- **Teks BERMAKNA pakai `.potong-lentur`, bukan `truncate`.** Kelas itu kini
  berdasar clamp DUA baris: satu baris kalau muat, baris kedua lahir hanya saat
  ruangnya habis — termasuk saat yang menghabiskannya setelan jarak teks, yang
  tak bisa ditanyakan ke media query mana pun. **NOMINAL tetap `truncate`**
  (angka yang membungkus lebih buruk daripada angka terpotong).

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
                       # + LANTAI POPULASI: turun di bawah garis dasar = MERAH,
                       #   dan pola yang tak cocok juga MERAH (penjaga buta)
npm run lembar-kontak  # 55 layar (normal/kosong/memuat/gagal/luring) → 1 PNG
```

31 sapuan. Yang visual butuh build produksi hidup:
`npm run build && npx vite preview --port 5199`

Sapuan yang paling sering menemukan cacat baru, dan apa yang HANYA ia lihat:
`audit:keadaan` (layar kosong/gagal/memuat) · `audit:luring-pertama` (kunjungan
pertama, server DIMATIKAN sungguhan) · `audit:nama` (kontrol bisa dibedakan
tanpa melihat) · `audit:gestur` · `audit:mundur` (tombol Back HP) ·
`audit:jarak-teks` (§1.4.12 — satu-satunya sapuan bersumbu TEGAK) ·
`audit:huruf` (lantai keterbacaan — satu-satunya yang menjaga UKURAN huruf).

**Yang tak dijalankan `sapu-semua`, dan wajib diingat:** 7 sapuan PERILAKU —
`masuk` · `tulis` · `kembali` · `respon` · `gestur` · `mundur` · `papan-ketik`
— plus `luring`, `luring-pertama` & `muat`. Rantai hijau TIDAK berarti mereka
hijau; jalankan terpisah sebelum rilis besar. Di situlah cacat "terasa murah"
bersembunyi, dan tak satu pun terlihat oleh review visual.

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
- **15 sapuan matang dikunci read-only.** Jangan buka tanpa izin user; kunci lagi (`chmod a-w`) sesudah selesai.
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
- **§1.4.12 = 0, dan jaga tetap 0.** Garis dasar 2 Sep 2026: populasi 6.036
  elemen / 20 layar, temuan NOL. Kalau angka itu naik, sesuatu baru mundur.
- **Lantai hero WAJIB = tinggi SETTLE tertinggi, dan diukur ulang tiap anatomi
  hero berubah.** `HERO_MIN_H` dipakai kerangka (tinggi) SEKALIGUS hero asli
  (lantai); begitu keduanya berbeda, tiap muat mendorong seluruh halaman.
  Terukur 3 Sep 2026 di EMPAT halaman sekaligus — JadwalWarga 167 lawan settle
  190, Talangan 208 lawan 244, Jadwal 192 lawan 217, KasRT 218 lawan 269 —
  dan tak satu pun pernah dilaporkan karena skor CLS-nya cuma 0,02–0,05.
  Ambil settle TERTINGGI dari 320/360/390/430: `min-height` itu lantai, jadi
  nilai tertinggi membuat kerangka persis setinggi isinya di semua lebar.
- **Teks boleh turun di bawah 11px HANYA lewat `data-susut`, dan tak pernah di
  bawah 9,6px.** Mesin susut-agar-muat (`ukuranMuat` kaki hero) sah menyusut —
  dinaikkan ke 11px ia meluber 6px dari kolomnya di 360px pada skala ×100 —
  tapi penandanya bukan pintu bebas: `audit:huruf` tetap menegakkan LANTAI
  KERAS 9,6px (= `MIN_KAKI_PX`). Eyebrow hero TIDAK dapat pengecualian; ia
  dinaikkan ke `text-micro` karena ongkosnya diukur nol (melipat 2 baris hanya
  di 320px, hero tak tumbuh). **Jangan bungkam sapuan dgn menurunkan `AMBANG`**
  — 11px itu anak tangga terkecil, bukan angka yang bisa ditawar.
- **Kerangka wajib mencermin STRUKTUR DOM halaman aslinya, bukan cuma tinggi &
  permukaannya.** React merekonsiliasi per-POSISI, jadi kalau pohon kerangka
  berbeda bentuk, node dipakai ulang di peran yang BERBEDA dan rect-nya
  melompat — `audit:lompat` melaporkan geseran yang tak pernah dilihat siapa
  pun (JadwalWarga, −56px hantu: bantalan `p-6` menempel di kotak hero
  kerangka, sedangkan hero asli menaruhnya di anak). Hanya mungkin di halaman
  ber-`if (loading) return` — satu-satunya JadwalWarga; halaman ber-`CrossFade`
  kebal karena kerangka & isi jadi dua anak terpisah.
- **Populasi yang tak pernah diukur = celah termahal, dan `dilewat` adalah
  bunyinya.** Kalau sapuan mengaku melewatkan sebagian populasinya, itu hutang,
  bukan catatan kaki — dan sering yang salah SAPUANNYA, bukan datanya. Dua
  kejadian di hari yang sama (3 Sep 2026): `audit:kontras-nonteks` bagian E
  melewatkan 3 dari 5 kolom tanggal karena pemicunya tak pernah diklik (9 → 18
  sampel), dan `audit:mundur` menguji dua popover di layar yang tak pernah
  memuatnya sehingga keduanya tak pernah teruji sama sekali (16 → 19 lapisan).
  **Petakan dulu di mana pemicunya benar-benar hidup, jangan tebak.** Menambah
  populasi WAJIB diikuti mutasi ulang — hijau di populasi baru tak membuktikan
  apa pun sampai probe terbukti menggigit di sana.
- **Nol yang BENAR tetap butuh mutasi.** `audit:potong` bagian C (teks 200%)
  nol karena `.potong-lentur` MELIPAT di sana — penalaran yang benar, tapi
  selama tak ada mutasi yang bisa memerahkannya, penjaganya cuma penalaran.
  `MUTASI=2` (3 Sep 2026) meniru regresi nyata — pelonggaran 22.4em hilang &
  kelas itu kembali memotong satu baris — dan bagian C melonjak **0 → 68**.
  Jangan hapus mutasi itu untuk "merapikan"; ia satu-satunya bukti bahwa
  pelonggaran 22.4em memang yang menanggung beban.
- **`sapu-semua` menjaga LANTAI POPULASI, bukan cuma temuan.** Ia pernah
  mencetak 24 hijau dari jalan yang diam-diam mengukur separuh populasinya
  (`sentuh` 410 → 360, `sheet` 13 → 7) — tiap sapuan tetap keluar 0 karena
  memang tak ada temuan pada apa pun yang sempat diukur. Cacat ke-23 menutup
  populasi KOSONG; populasi SEPARUH lolos sampai 3 Sep 2026. Lantainya ketat
  (~95% garis dasar) karena populasi app ini stabil antar-jalan — toleransi
  longgar justru meloloskan penurunan 12% yang memicu penjaga ini. Kalau data
  memang bertambah, **perbarui lantainya, jangan longgarkan**. Pola yang tak
  cocok = MERAH (`POLA POPULASI HILANG`), bukan aman: penjaga buta yang diam
  adalah cacat yang mau ditutup. Ketiga sapuan yang sempat tanpa lantai
  (`lebar`, `reflow`, `gerak`) kini mencetak populasinya sendiri dan ikut
  dijaga. **Sapuan BARU wajib mencetak berapa yang diukurnya** — yang tidak,
  tak bisa dijaga sama sekali. `test` pun dijaga (jumlah TES, bukan berkas:
  berkas bisa tetap 23 sementara isinya menyusut); hanya `typecheck` & `lint`
  yang memang tak punya populasi terhitung.
- **Angka yang mungkin basi WAJIB mengaku SELAMA ia masih basi.** Toast tidak
  cukup — ia hidup ~2,6 dtk sementara basinya permanen. App punya DUA strip
  kembar di Header: LURING (sinyal hilang) & BASI (sinyal ada, server menolak).
  Keduanya tak bisa ditutup dan hilang sendiri saat keadaannya pulih. Jalur
  muat BARU wajib memanggil `tandaiBasi()`/`tandaiSegar()` (`src/lib/basi.ts`).
  **Sapuan TIDAK menguji arah bersihnya** — ukur manual; strip yang tak pernah
  pergi lebih buruk daripada toast.
- **Yang masih terbuka & sengaja tidak diklaim:** `audit:mundur` bagian E2 vonis
  KETIGA (`HISTORY DESYNC`) tak terjangkau by construction — di bawah lapisan
  selalu ada entri TAB, jadi Back berikutnya selalu terlihat; butuh permukaan
  bertumpuk di Beranda yang app tak punya. Vonis 1 & 2 terbukti bergigi
  (`MUTASI=2`).
- **`status-bar-style: default` DIVERIFIKASI di iPhone nyata (3 Sep 2026, oleh
  user): status bar TERBACA di mode gelap.** Ia sempat berdiri lama sbg
  keraguan — `default` memberi teks status bar GELAP, dan kekhawatirannya teks
  itu hilang di atas header hijau tua. Ternyata tidak. **Tak ada sapuan yang
  bisa menutup item ini** — iOS memilih gaya status bar di luar halaman, jadi
  tak ada satu piksel pun yang bisa dibaca probe (lihat `statusBar.test.ts`);
  satu-satunya bukti yang sah adalah mata di perangkat nyata. Kalau warna
  Header atau meta ini berubah, verifikasinya HANGUS dan harus diulang di
  perangkat — bukan diasumsikan tetap benar.

## Kertas — permukaan yang paling lama tak dijaga

App punya **9 generator PDF/Excel** (1.109 baris, 29 call-site) dan sampai
4 Sep 2026 tak satu pun diuji ISInya: yang ada cuma `warnaCetak` (palet) &
pembungkus berbagi. `audit:respon` menyentuh jalur ekspor, tapi hanya bertanya
"apakah ketukannya diakui" — bukan "apakah dokumennya benar". **Layar dijaga 31
sapuan, kertas nol** — padahal PDF-lah yang dicetak, di-WA-kan ke grup, dan
jadi catatan resmi RT.

- **Generator sudah punya seam-nya**: `buildXxxPDF()` mengembalikan
  `{ doc, filename }` TANPA mengeluarkan berkas, jadi bisa diuji di Node tanpa
  mock apa pun. Seam itu sudah lama ada dan tak pernah dipakai.
- **Isi dokumen dibaca dari `doc.internal.pages`** (literal string di isi
  halaman) — tak perlu parser PDF. Batasnya: hanya teks, BUKAN tata letak.
- **Yang dijaga INVARIAN, bukan tata letak:** ringkasan bertanda tangan wajib
  REKONSILIASI dgn baris di atasnya. `buildKasRTPDF` menerima `stats` dari
  pemanggil dan mencetaknya apa adanya — ia tak pernah menghitung ulang dari
  `list`. Terukur: dgn stats bertentangan, dokumen tetap tercetak rapi —
  ringkasan Rp88.000.000 di atas baris berjumlah Rp6.250.000, tanpa keberatan.
  Call-site hari ini BENAR (mengirim `list` utuh, bukan `displayList` yang
  tersaring), tapi jaraknya satu kata.
- **Kategori di data uji WAJIB dari `kategoriKasRt.ts`, bukan karangan.**
  Generator menyaring baris per kategori, jadi kunci yang salah membuat SELURUH
  tabel kosong dan uji lulus PALSU. Terjadi saat probe pertama ditulis — dan
  nyaris dilaporkan sbg "generator tak mencetak tabel".
- **Invarian TERKUAT: dokumen dibandingkan dgn DIRINYA SENDIRI.** PDF Kas
  Hadiran mencetak totalnya DUA KALI dari DUA sumber di halaman yang sama —
  kaki TABEL dihitung generator dari baris nyata (`hitungSaldoHadiran`),
  blok RINGKASAN dari `stats` pemanggil, apa adanya. Uji yang membandingkan
  keduanya tak butuh angka harapan dari luar, jadi ia tak rapuh saat fixture
  berubah. (Risikonya bahkan sudah diakui di kode — `totalSetor` "TIDAK
  struktural" — diakui, tapi tak pernah dijaga.)
- **Substring BUTA TANDA.** `toContain('6.250.000')` cocok di dalam
  `'-Rp6.250.000'`, jadi rumus yang TERBALIK tetap lolos. Di dokumen keuangan
  itu bukan kelonggaran, itu kebutaan. Pungut string per-elemen
  (`doc.internal.pages` menghasilkan tiap nilai sbg string UTUH berikut
  tandanya) lalu bandingkan PERSIS — `expect(arr).toContain('-Rp2.750.000')`.
  Ketemu lewat mutasi, dan lubangnya ada di TIGA berkas uji sekaligus.
- **`toContain('')` SELALU benar.** Uji isi dokumen wajib memastikan fixture-nya
  bermakna lebih dulu (`expect(nama.length).toBeGreaterThan(2)`), kalau tidak
  pemeriksaannya HAMPA: nama/keterangan kosong membuat uji lulus tanpa
  memeriksa apa pun. Ketemu lewat mutasi, dan ada di DUA berkas uji sekaligus.
- **Jangan tuntut "computed == given" tanpa membaca tipenya.** Di Laporan
  Triwulan, `hadiranBelumSetor` & `rtSaldoAkhir` KUMULATIF lintas triwulan,
  sedangkan `Selisih triwulan` hanya periode ini — menuntut keduanya sama =
  temuan PALSU. Yang sah dijaga di sana: rumus milik generator sendiri, baris
  BERSYARAT (`Saldo Awal` hanya bila > 0), dan KELENGKAPAN — tinggi halaman
  dihitung dari isi, jadi baris yang luput HILANG tanpa jejak, tidak meluber.
- **Daftar Hadir: strip statistik TIDAK menyebut TITIP** (terukur 4 Sep 2026 —
  5 hadir/1 titip/2 tidak → strip "5" & "2", kaki "Total 8"; orang ke-8 tak
  disebut di ringkasan mana pun). Layar app justru menampilkan Titip sbg stat
  sendiri, jadi KERTAS yang ganjil. Dipatok apa adanya di `cetakAbsensi.test.ts`
  — menambah kolom ke strip itu perubahan KATA & tata letak, wajib disetujui
  user dulu.
- **Lima generator lain masih tanpa penjaga isi.** `cetakKasRT` /
  `cetakKasHadiran` / `cetakLaporanTriwulan` polanya; ikuti bentuknya, jangan
  bikin dialek baru. Yang belum punya seam `build*`, ekstrak dulu — murni
  ekstraksi, nol perubahan pada dokumen.

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
8. **Kalau user melihat sesuatu yang keliru sementara SEMUA sapuan hijau —
   percayai mata user, lalu cari sapuan mana yang mengukur hal yang salah.**
   Terbukti ENAM kali dalam satu sesi (3 Sep 2026). Hijau cuma membuktikan apa
   yang DIUKUR; ia tak pernah membuktikan bahwa yang diukur itu yang penting.
9. **Perubahan RASA tak pernah menumpang commit lain**, dan wajib dirender &
   disetujui sebelum dikirim. Sebelum tiap commit: `git diff --staged --stat`,
   lalu tanyakan tiap berkas — kenapa ini di sini? `git add -A` buta pernah
   men-deploy perubahan bayangan yang tak pernah dilihat siapa pun.
10. **Catatan yang menunjuk mekanisme MATI menyesatkan sesi berikutnya.** Kalau
   kau mengubah cara sesuatu bekerja, cari catatan lama yang menjelaskan cara
   LAMANYA dan tulis ulang — bukan tambahkan di bawahnya. Dua kali hari ini
   sebuah item berdiri di daftar "masih terbuka" berbulan-bulan sesudah lunas.

## Lima cara sebuah sapuan BERBOHONG (semua ketemu 3 Sep 2026)

Semuanya melapor `0` dengan jujur, dan semuanya salah. Periksa kelima ini
sebelum percaya pada hijau:

1. **Populasi yang tak pernah disentuh.** Kontrol di balik pemicu yang tak
   pernah diklik (`audit:mundur` menguji dua popover di layar yang tak pernah
   memuatnya; `audit:kontras-nonteks` melewatkan 3 dari 5 kolom tanggal).
   Gejalanya: baris `dilewat` — **curigai sekuat temuan merah**, ia sering
   berarti sapuan mencari di tempat yang salah, bukan data yang kurang.
2. **Agregat menyembunyikan peristiwa.** Skor CLS 0,040 untuk hero yang
   melompat 74px — hitungannya benar, akibatnya buta. Vonis wajib menyebut NAMA
   yang ia lihat, bukan cuma berapa.
3. **Populasi menyusut diam-diam.** "0 temuan" terbaca sama saja dari 410
   kontrol maupun 360. Obatnya LANTAI populasi di `sapu-semua`.
4. **Uji kontrol yang mengandaikan bentuk DATA.** Kontrol "harus melihat teks
   besar" berteriak palsu di halaman yang memang tak punya nominal. Kontrol
   harus menguji PROBE, bukan menebak isi layar.
5. **Nol yang benar tapi tak terbukti.** Kalau sebuah bagian selalu nol,
   pastikan ada mutasi yang BISA memerahkannya — kalau tidak, ia bukan penjaga
   melainkan janji. Dan mutasi yang membunuh PRASYARAT sebuah bagian tidak
   menguji bagian itu; ia melewatinya.
