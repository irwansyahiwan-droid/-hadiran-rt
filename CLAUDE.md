# Hadiran RT — Project Context

## Tentang Aplikasi
Aplikasi manajemen arisan & kas RT (RT 004/006).
69 anggota aktif, diakses warga via browser HP.

## Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Supabase (PostgreSQL)
- Deploy: Vercel

## Fitur Utama
1. Beranda — dashboard saldo, statistik
2. Jadwal — jadwal tarikan per Sohibul Bait
3. Absensi — daftar hadir per tarikan
4. Talangan — tracking tunggakan warga
5. Kas Hadiran — kas per arisan
6. Kas RT — kas besar RT
7. Cetak PDF — laporan

## Role
- Bendahara (admin penuh)
- Warga (view only)

## Aturan Coding
- Gunakan bahasa Indonesia untuk UI
- Komponen kecil, satu file satu fitur
- Jangan ubah semua file sekaligus


## Logika Bisnis

### Arisan (Tarikan)
- Setiap tarikan ada 1 Sohibul Bait (penerima)
- Semua anggota wajib hadir, yang tidak hadir kena talangan
- Iuran per anggota = total kas / jumlah anggota hadir
- Sohibul Bait menerima semua iuran yang terkumpul

### Talangan
- Anggota tidak hadir = otomatis talangan Rp50.000
- Talangan harus lunas sebelum tarikan berikutnya
- Bendahara yang tandai lunas

### Kas RT
- Sebagian setoran masuk ke Kas Besar RT
- Kas RT terpisah dari Kas Hadiran 1
## Alat Audit

Sebelum commit — cepat, tanpa browser:

```
npm run periksa      # typecheck + lint + 265 test
```

Sapuan browser (butuh build produksi hidup: `npm run build && npx vite preview --port 5199`):

```
npm run audit        # keadaan + sheet + publik + masuk + tulis + potong + respon + kembali
```

| Perintah | Yang diperiksa | Kenapa ada |
|---|---|---|
| `audit:keadaan` | Layar saat data KOSONG & saat muat GAGAL (warga + bendahara + overlay) | Semua audit lain jalan lawan DB penuh, jadi EmptyState/ErrorState tak pernah dirender. **App kas dilarang menyatakan nominal saat gagal muat.** **Bagian ANGKA TELANJANG (24 Agu 2026)** ada karena sapuan ini pernah mencetak "24 layar · 0 bermasalah" sementara TIGA cacat kelasnya hidup di dalamnya: Jadwal "0 Selesai · 0 Terjadwal · 0 Total", Kelola Anggota "0 aktif · 0 total", dan form FAB Kas RT "Saldo setelah transaksi: Rp500.000" saat kas asli Rp16.352.000. Cacat POPULASI, bukan ukuran — probe hanya memburu `Rp\d`, sedangkan HITUNGAN tak berprefiks lewat begitu saja, padahal "0 tarikan" sama menyesatkannya dgn "Rp0": bendahara membacanya "RT ini belum punya jadwal", bukan "app sedang tak tahu". Kini tiap teks berangka yang terlihat di layar gagal dihitung sbg klaim. Pengecualiannya sempit & beralasan: tanggal (nama bulan PENUH maupun singkat — percobaan pertama cuma menyaring "Agu" sehingga "Agustus" lolos dan terbaca sbg klaim), jam, versi, chrome tetap (nav/header), dan isi Empty/ErrorState lewat penanda OPT-IN `data-keadaan` (preseden `data-grafik`/`data-ptr` — tak ada ciri struktural yang membedakannya dari teks halaman). Ambangnya "ada digit", BUKAN "ada 0": angka basi dari cache juga klaim palsu. Divalidasi MUTASI (cabut penjaga `loading \|\| error` di Kelola Anggota → sapuan meneriakkan persis `MENYATAKAN ANGKA saat gagal: ["0 aktif · 0 total"]`). **Layar berangka BARU wajib menjaga `error`, bukan cuma `loading`** — nol yang lahir dari list kosong terbaca sbg fakta. |
| `audit:sheet` | Geometri sheet/modal/popover di 360px | Form di dalam bottom-sheet tak pernah diukur; kontrol bisa meluber keluar panel |
| `audit:publik` | landing / warta / nobar / panduan-install, light+dark | HTML statis di `public/` tak tersentuh audit app, padahal wajah pertama |
| `audit:kontras` | Kontras piksel-nyata TEKS, **tab WARGA saja** (sampel screenshot) — termasuk `::placeholder` | Token tak bisa dipercaya; warna final = hasil blend. **Bagian placeholder (6 Agu)** ada karena pemungut teks berjalan lewat TEXT NODE, dan placeholder tak punya satu pun — 16 placeholder app tak pernah terukur sekali pun meski ia teks biasa di mata §1.4.3, dan justru itu yang dibaca warga lansia saat mencari namanya. Warna diambil dari computed `::placeholder`, BUKAN warna teks nilainya |
| `audit:kontras-deep` | Kontras TEKS di permukaan yang TAK disentuh `audit:kontras`: sheet/modal warga, SELURUH permukaan bendahara (5 tab + form FAB + overlay admin), landing /info | Populasinya justru yang TERBESAR — 2.174 dari 3.410 sampel. Sampai 6 Agu skripnya ada tapi tak terdaftar di `package.json`, jadi cuma jalan kalau seseorang ingat mengetik path-nya; sekarang bisa dipanggil dgn nama. Bendahara di-MOCK 3 lapis aman (sesi palsu di localStorage + rest/v1 dipaksa anon + method tulis DIBLOKIR Playwright) — jangan pernah pakai kredensial asli atau klik Simpan/Hapus di data produksi |
| `audit:kontras-nonteks` | Kontras NON-teks: ikon tanpa label, batas kolom isian, ring `:focus-visible`, **tanda grafik**, dan **glyph kontrol NATIVE** (§1.4.11 & §2.4.13, ambang 3:1) | `audit:kontras` cuma menyampel TEKS. Ring fokus tak pernah diukur sekali pun — ternyata ring hijau di atas hero HIJAU = 1,26:1 (praktis hilang bagi pengguna papan ketik) dan ring `.field` beralpha 30% gagal di SEMUA input. Fokus di-Tab beneran, screenshot per elemen (rect & piksel wajib sezaman). **Bagian grafik (4 Agu)** ada karena pemeriksaan ikon SENGAJA melewati svg ber-leluhur `aria-hidden` — dan semua grafik app memang aria-hidden, jadi garis "Tren Saldo" bertahan 2,33:1 di mode gelap tanpa satu pun sapuan menyentuhnya. Populasinya OPT-IN lewat `data-grafik` di call-site, bukan tebakan selektor: bar = `div`, garis = `path`, tak ada ciri struktural yang bisa dibedakan dari elemen tata letak. **Tanda grafik baru WAJIB memasang `data-grafik`** — kalau tidak, ia tak terukur | **Bagian GLYPH NATIVE (24 Agu 2026)** menutup titik-buta terakhir dari kelas yang sudah tiga kali muncul: A–D semuanya memungut populasi lewat `querySelectorAll`, sedangkan panah `select` & tombol picker `input[type=date]` BUKAN simpul DOM — ia pseudo shadow UA (`::-webkit-calendar-picker-indicator`) atau digambar langsung mesin render. Sembilan glyph (5 kolom tanggal + 4 select) karena itu tak pernah terukur sekali pun, di sapuan mana pun; ikon kalender sempat jadi glyph PADAT milik OS di app yang setiap ikonnya lucide outline tanpa satu pun laporan (diperbaiki `70aadd9`). Kelas yang SAMA dgn Odometer di `audit:lebar` & `::placeholder` di `audit:kontras`: **apa pun yang tak punya simpul DOM hilang dari populasi berbasis selektor.** Karena tak ada elemen untuk dibaca `getComputedStyle`-nya, E menilai MURNI dari piksel: latar = modus band, tinta = piksel TERJAUH dari latar (inti goresan, bukan tepi antialias). **Bandnya tidak ditebak** — dipetakan dulu di build sungguhan: teks `input[type=date]` berhenti 56px dari kanan & glyph-nya 12..38px; teks `select` berhenti 53px & panahnya 7..13px, jadi band 6..40px dari tepi kanan memuat keduanya tanpa pernah menyentuh TEKS. Itu bukan kerapian: teks near-black akan menang jadi "piksel terjauh" lalu MENYEMBUNYIKAN panah abu yang gagal. Inset 6px juga menjauhkannya dari garis batas (aturan anti-FP no.1). Langkah 1px mendatar karena panah `select` cuma ~6px & bergaris tipis. Band tanpa tinta dihitung **`tak terukur`, BUKAN lulus** (`SHOW_BUTA=1` merincinya). Divalidasi MUTASI: ikon kalender dijadikan `#D8DDE4` → sapuan meneriakkan persis `1.31 [glyph-native] "kasrt-tanggal (input[date])" fg(216,221,228)`, dan BENAR hanya di terang (abu pucat di atas `#1F2937` gelap memang lolos) — ia mengukur kenyataan, bukan mencocokkan pola; dipulihkan → 0 lagi. **Batas yang diakui:** hanya 2 dari 5 kolom tanggal masuk populasi (yang di sheet `b-sheet-setor` & `b-sheet-form-kasrt`); 3 sisanya di Jadwal & TargetKasRT belum dibuka sapuan ini.
| `audit:potong` | TEKS TERPOTONG (`truncate`/`line-clamp` yang isinya tak muat) di TIGA lebar: **390px** acuan HP, **320px** WAJIB §1.4.10, dan **teks dasar 200%** (ambang APP, di atas AA — laporkan terpisah, JANGAN sebut "gagal WCAG", disiplin sama dgn `audit:reflow`). Warga + SELURUH permukaan bendahara, 16 layar | Tak satu pun sapuan lain melihatnya: `audit:lebar` mencari nominal yang MELUBER keluar kotak, `audit:reflow` mencari halaman yang geser samping — teks terpotong tak melakukan keduanya, ia PATUH pada kotaknya dan cuma kehilangan isinya, jadi semua sapuan geometri melaporkannya sehat. **Ambang probe 0, bukan 1px** — percobaan pertama menyaring `> clientWidth+1` demi menghindari subpiksel dan justru menelan temuan yang meleset TEPAT 1,0px; lebar teks asli diukur lewat `Range`, bukan `scrollWidth` yang dibulatkan ke integer. **Lingkup = lapisan TERATAS saja**: halaman di belakang overlay tak di-unmount, jadi memungut se-dokumen membuat baris Kas RT yang sama terhitung ulang di tiap overlay (4 overlay melaporkan item identik — populasi salah, bukan temuan). Bendahara lewat `newCtx({bendahara})` harness bersama; mock TIDAK disalin supaya tak melenceng. Divalidasi MUTASI (`MUTASI=1` menyempitkan kolom 40px → 0 harus melonjak ratusan). **Bagian 200% memakai CDP `Page.setFontSizes`, BUKAN suntikan `html{font-size:32px}`** — media query `em` mengacu ke font BAWAAN BROWSER, bukan ke `font-size` root yang ditulis CSS, jadi suntikan CSS melaporkan komponen ber-ambang em (`.potong-lentur`) sebagai "masih gagal" padahal di browser warga ia bekerja. `audit:reflow` masih pakai suntikan CSS — sah untuk yang ia ukur (tekanan padding/gap rem), tapi ia TIDAK melihat adaptasi berbasis em |
| `audit:huruf` | **LANTAI KETERBACAAN HURUF** — ukuran huruf yang TERCAT, di 320/360/390px, warga + bendahara. Ambang **APP 11px**, bukan WCAG | Dari 30 sapuan, tak satu pun pernah bertanya *apakah teks ini masih terbaca*. `audit:kontras` menjaga RASIO, `audit:sentuh` menjaga luas JEMPOL, `audit:potong` menjaga ISI — tak ada yang menjaga UKURAN. Terukur: teks terkecil app **9,2px** di 320 & 360px, di app yang dipakai warga lansia. Bentuknya identik dgn dua celah yang sudah dibayar mahal (AAA pelajaran ke-33, §1.4.12): **ambang yang tak dijaga alat sama dgn ambang yang tak ada** — tanpa sapuan ini 9,2px bisa jadi 8,5px minggu depan tanpa satu pun laporan. **Ambangnya bukan angka karangan**: ia anak tangga TERKECIL tangga tipografi app sendiri (`micro`/`overline` = 0.6875rem = 11px), jadi aturannya bisa dinyatakan tanpa menawar — tak boleh ada teks tercat lebih kecil dari anak tangga terkecil. Teks di bawahnya bukan pilihan peran, ia teks yang LOLOS dari tangganya. **TIGA lebar wajib**: teks terkecil lahir dari `clamp()` ber-`vw` yang MENGECIL saat layar menyempit, jadi satu lebar akan melaporkan 11px yang sehat sambil melewatkan 9,2px yang sebenarnya dibaca warga (kelas yang sama sudah dibayar `audit:lebar`). Populasi = DAUN TEKS saja (elemen yang punya text node sendiri) — tanpa itu tiap leluhur ikut terhitung dgn ukuran warisan dan satu teks dilaporkan berkali-kali. **Uji KONTROL pertamaku SALAH & dicatat**: ia menuntut `maks >= 20px` ("harus melihat teks besar hero") lalu meneriakkan PROBE CACAT di 6 layar Jadwal yang justru sehat — halaman itu memang tak punya nominal, teks terbesarnya 18px. **Uji kontrol yang mengandaikan bentuk DATA akan berbohong begitu datanya berubah bentuk**; kontrolnya kini menguji PROBE (>=3 ukuran berbeda). Garis dasar pertama: populasi 6.651 di 27 layar-lebar, **33 di bawah lantai**, dua kelas & dua mekanisme — eyebrow hero `clamp(0.575rem,2.55vw,0.6875rem)` (min 9,2px) dan kaki stat hero `ukuranMuat` (lantai 9,6px). **Ongkos menaikkannya DIUKUR dulu, dan ternyata asimetris** — itu yang menentukan obatnya: eyebrow ke 11px GRATIS (di 320px label melipat 2 baris, di 360/390 tetap 1 baris, hero TIDAK tumbuh karena lantai `min-height` sudah menyerapnya, nol luber) sedangkan kaki stat ke 11px MELUBER 6px dari kolomnya di 360px pada skala ×100 (`EKSTREM=1`, janji 300 KK) — mengembalikan kelas tumpang-tindih kaki hero yang sudah pernah ditutup; tiga kolom di kartu 284px memang tak punya ruang itu. Jadi eyebrow DINAIKKAN (4 call-site `clamp(…)` → `text-micro`, sekalian membuang nilai arbitrer dari tangga) dan kaki DIKECUALIKAN lewat penanda opt-in `data-susut` yang **tidak dipercaya begitu saja**: ia tetap ditegakkan pada **LANTAI KERAS 9,6px** (= `MIN_KAKI_PX`), jadi yang dimaafkan cuma rentang 9,6–11px dan tak pernah lebih rendah — tanpa syarat itu penanda ini jadi pintu belakang menuju 6px. Sesudahnya **0 di bawah lantai · 39 dimaafkan**. Divalidasi DUA mutasi karena ada DUA vonis: `MUTASI=1` (`.text-caption` → 9px) **0 → 1185** menguji ambang tangga; `MUTASI=2` (`[data-susut]` → 8px) **39, semuanya bertanda `[TEMBUS LANTAI KERAS]`** menguji lantai kerasnya. Populasi tak bergeser di keduanya. **Cacat alat yang nyaris lolos & dicatat**: penggantian baris cetak penanda TEMBUS diam-diam tak terpasang (tak diberi `assert`) — penjaganya bekerja tapi laporannya bisu, dan itu hampir kulaporkan sbg "berfungsi". Dilaporkan sbg ambang APP, jangan sebut "gagal WCAG" — WCAG tak punya syarat ukuran huruf minimum (disiplin sama dgn seksi AAA & bagian teks-200%) |
| `audit:jarak-teks` | **WCAG §1.4.12 Text Spacing (AA, WAJIB)** — isi yang HILANG saat pengguna menyetel line-height 1,5 · jarak paragraf 2× · letter 0,12em · word 0,16em. Sumbu **X** (daun, lewat `Range`) **dan sumbu Y** (`scrollHeight` lawan kotaknya). Plus bagian **O**: invarian Odometer | Dari 29 sapuan, **tak satu pun pernah menyentuh §1.4.12** — dan itu bukan ambang pilihan app melainkan syarat konformansi AA yang selama ini diklaim lulus; bentuk cacatnya sama persis dgn pelajaran ke-33 (ambang AAA yang dinyatakan tapi tak pernah dicetak alat). **Sumbu Y-nya yang baru, dan itu intinya:** `audit:potong` mengukur LEBAR, `audit:lebar` luapan mendatar nominal, `audit:reflow` geser samping — ketiganya MENDATAR. Ditelusuri di seluruh `scripts/`: satu-satunya pemakaian `scrollHeight` untuk vonis ada di `audit-kontras-deep.mjs`, dan itu untuk MENEMUKAN wadah yang bisa digulir. Jadi tak ada satu pun sapuan yang pernah membandingkan tinggi teks lawan tinggi kotaknya sendiri — padahal justru itu yang dirusak §1.4.12: line-height 1,5 menambah TINGGI, dan yang menahannya adalah tinggi tetap, `line-clamp`, dan tinggi cadangan `contain-intrinsic-block-size`. Hasil pertama (2 Sep 2026): **93 temuan**, dan yang terparah bukan yang terbanyak — **saldo hero mencetak serpihan digit TETANGGA**: jendela Odometer dipaku `height: 1em` sementara selnya ikut `line-height`, jadi 34px lawan 51px dan pita bergeser dgn langkah yang tak lagi sama dgn tinggi selnya. Diperbaiki dgn membuat jendela LAHIR dari kotak baris yang sama (pengukur `visibility:hidden`) & langkah persentase pita — bukan angka `em` yang bisa ditimpa. Sisanya ditutup di HULU: `.potong-lentur` dasarnya diubah dari "satu baris + elipsis" jadi "maksimal DUA baris", sehingga **93 → 30** tanpa satu pun call-site disentuh (dan tanpa mengubah tampilan 390px — terukur 0 elemen berubah di sana, 14 di 360px). **Sisa 30 (semuanya `line-clamp-2`) ditutup di hari yang sama, dan BUKAN dgn melepas clamp** — melepasnya sudah diukur & ditolak dulu: keterangan Kas RT itu teks bebas, tanpa clamp 35 dari 36 baris membungkus >=3 baris, terburuk 288px (sepertiga layar untuk SATU transaksi). §1.4.12 melarang isi HILANG, bukan isi yang DIRINGKAS dgn jalan keluar — dan app ini memang sudah punya jalan keluarnya (sheet detail, dibuka SIAPA SAJA). Yang salah alatnya: ia menghitung ringkasan sbg kehilangan. Obatnya penanda opt-in `data-ringkas` yang **tidak dipercaya begitu saja** — dua syarat: (1) elemennya WAJIB duduk di dalam kontrol yang bisa diaktifkan (baris "Saldo Awal" yang bukan tombol karena itu TIDAK dimaafkan meski sekelas), dan (2) sapuan WAJIB ikut MENGUKUR sheet tujuannya. Syarat kedua langsung membayar dirinya: begitu sheet detail masuk populasi (16 → 20 layar), ketahuan **jalan keluarnya `truncate` juga** — nama Sohibul Bait diringkas di baris DAN dipotong di tujuannya, jadi namanya benar-benar hilang; ditambah 3 nama hadirin ber-`truncate` yang tak pernah terukur sapuan mana pun karena sheet itu belum pernah dibuka siapa pun. Tujuan diperbaiki TANPA batas sama sekali (bukan `.potong-lentur`: header "Jum, 28 Agu 2026 · Karta Saleh" ternyata butuh baris KETIGA, kurang 20px). **93 → 30 → 0.** Jumlah yang dimaafkan SELALU dicetak (`diringkas: 114`) — sapuan tak boleh menyempitkan populasinya sendiri tanpa mengaku. Empat sisa di GARIS DASAR (kartu bertumpuk `BannerCarousel`) tak perlu penanda apa pun: ia terpotong sama persis sebelum & sesudah, jadi pengurangan garis dasar sudah menanganinya. **Dua uji KONTROL, keduanya wajib:** K1 membaca BALIK computed style — tanpa itu "app patuh" & "alatku tak menyuntik apa pun" mencetak angka yang sama; K2 mengurangkan GARIS DASAR (probe yang sama tanpa override) supaya temuan `audit:potong` tak diklaim di sini. Populasi kosong = `PROBE CACAT`. **Pita digit Odometer DISARING lewat penanda opt-in `data-odo`** (preseden `data-grafik`/`data-ptr`): 10 digit dalam jendela satu baris memang SENGAJA terkurung, dan tanpa saringan itu probe melaporkan 285–323px "hilang" yang bukan temuan — kelas yang sama sudah dibayar `audit:lebar` & `audit:kembali` (komponen yang merender angka lewat KOLOM menyesatkan populasi berbasis teks). Divalidasi MUTASI: `MUTASI=1` memangkas tiap kotak teks terkurung jadi 70% tingginya (30 → 616) DAN mengembalikan geometri Odometer pra-perbaikan (`[data-odo]{height:1em}` → bagian O merah, 3 nominal) |
| `audit:papan-ketik` | **A.** Apakah tiap kontrol yang TERLIHAT & aktif tergapai Tab (§2.1.1, warga + bendahara, 9 layar). **B.** Disiplin fokus LAPISAN (§2.4.3): fokus masuk saat dibuka, berperilaku benar saat Tab, kembali ke pemicu saat ditutup | Tak satu pun sapuan lain menekan Tab. `audit:sentuh` mengukur luas area JEMPOL; `audit:kontras-nonteks` memang mem-Tab, tapi hanya untuk mengambil WARNA ring fokus — ia tak pernah bertanya apakah ada kontrol yang gilirannya tak pernah datang. **Ambang 100%, tak dinegosiasikan** (§2.1.1). Kelas ini bukan hipotesis: dua cacat ketemu di hari yang sama (19 Agu) — menu Header yang fokusnya tak pernah masuk (`useExitAnim` menunda mount satu commit → Escape/panah mati), dan **FAB yang TIDAK PERNAH tergapai Tab sama sekali**: Tab MENGGULIR, gulir menyalakan `useScrollHide`, dan itu dulu memasang `tabIndex={-1}` — FAB duduk di ekor DOM jadi gilirannya selalu datang sesudah ia pergi. Aksi-BUAT utama tiga halaman, dan bendahara-lah yang paling mungkin memakai papan ketik karena dialah yang mengetik transaksi. Obatnya bukan melepas "menyingkir saat gulir" (itu ada supaya FAB tak menutupi nominal) tapi **fokus memunculkannya kembali**, pola skip-link; `aria-hidden` wrapper ikut dibuang karena subtree `aria-hidden` DILARANG memuat elemen yang bisa difokus. Populasi menyaring `aria-hidden`/`disabled`/`.sr-only`/`tabindex=-1` di LUAR `[role=menu]` (roving tabindex itu sah). **Bagian B memakai aturan BERBEDA PER PERAN, dan itu bukan kelonggaran**: `role=dialog` WAJIB memerangkap Tab; `role=menu` WAJIB DITUTUP oleh Tab lalu fokus melanjutkan (pola WAI-ARIA menu button). Memberlakukan aturan dialog di menu = alat berteriak palsu — percobaan pertama melakukan persis itu dan melaporkan dua menu yang justru sudah benar. Cacat menu yang SEBENARNYA: fokus keluar sementara menunya MASIH TERBUKA → pengguna menyusuri halaman di BELAKANG scrim (tak bisa diklik, scrim menangkap pointer) dan Escape ikut mati karena handler menempel di wadah yang sudah ditinggalkan fokus. Temuan B (19 Agu): **ExportMenu mengulang PERSIS jebakan menu Header** — `useExitAnim` menunda mount satu commit → `menuRef.current` null → `?.focus()` menelannya → panah/Home/End mati total; dari tiga pemakai `useExitAnim` hanya FilterChips yang aman (tak menyentuh DOM anaknya). Divalidasi MUTASI dua-duanya: A menyala 8 dari 9 layar (React memiliki atribut `tabindex`, render-ulang bisa memulihkannya — jangan dibaca "1 layar kebal"), B menyala 6 dari 6 (fokus bukan atribut yang dirender React, jadi tak bisa dipulihkan) |
| `audit:lompat` | TATA LETAK MELOMPAT (layout shift) saat skeleton berganti isi nyata — warga + bendahara, 9 layar, CPU 4x & 400 kbps | Semua sapuan geometri lain memotret SATU keadaan DIAM: mereka mengukur layar yang sudah tenang, jadi perpindahan skeleton → data terjadi SEBELUM pengukuran dan tak terlihat oleh satu pun; `audit:muat` mengukur KAPAN app tercat, bukan apakah isinya melompat sesudah itu. **TIGA angka, dan yang ketiga lahir dari kegagalan dua yang pertama**: `tanpa-input` (definisi CLS Google), `total`, dan **`puncak` — geseran TERBESAR satu elemen, dalam PIKSEL** (3 Sep 2026). Vonisnya kini dua sumbu: skor > 0,1 ATAU puncak >= 24px. Sumbu piksel ada karena sapuan ini melaporkan `OK` untuk hero Kas Hadiran yang melompat **74px** — kartu terbesar & terpenting di layar — dgn skor cuma **0,040**. Skornya tidak salah hitung: CLS mengalikan jarak dgn FRAKSI DAMPAK, dan hero duduk di puncak halaman sehingga sebagian isi yang terdorong ada di bawah lipatan. **Agregat yang benar menyembunyikan peristiwa yang salah** — cacat ke-19 persis, dan kali ini di sapuan yang justru dibuat untuk melihat lompatan. Ambang 24px DIUKUR: layar sehat memuncak 13px, satu anak tangga spasi terbesar app 32px. **Sumber kini SELALU dicetak, bukan cuma saat merah** — sebelumnya 74px itu tak meninggalkan satu baris pun, jadi pembacanya tak punya cara tahu ada yang bergerak. **Pseudo-element dibuang dari pemilihan puncak** (tetap dicetak): percobaan pertama melaporkan `PUNCAK +629px ::after` — nama yang tak bisa ditunjuk siapa pun, sekaligus menutupi sumber aslinya `div.cf-out dy +74` di entri yang SAMA. Divalidasi DUA mutasi karena satu tak bisa menguji dua sumbu: `MUTASI=1` (pita 120→240px) menyalakan `[skor]`; `MUTASI=2` (satu geseran 30px) mencetak skor **0,052** — di bawah ambang, jadi sapuan LAMA hijau — dan merah lewat `[piksel]`. Divalidasi juga lawan cacat NYATA, bukan cuma sintetis: hero rusak → `+74px` merah, hero diperbaiki → `0px` hijau. Garis dasar sesudahnya: **6 → 4 → 1 melompat**. Keempat temuan PRA-SESI itu (dibuktikan dgn build `ec2884a`) ternyata SATU kelas: **lantai `HERO_MIN_H` lebih pendek dari tinggi SETTLE hero**, di EMPAT halaman sekaligus — JadwalWarga 167/190 · Talangan 208/244 · Jadwal 192/217 · KasRT 218/269. Lantainya dipakai kerangka (tinggi) SEKALIGUS hero asli (lantai), jadi selisihnya langsung jadi CLS tiap muat; diperbaiki dgn mengambil settle TERTINGGI dari 320/360/390/430. **Sisa satu** (Jadwal warga −56px) ternyata **GESERAN HANTU**, dan menemukannya perlu rantai leluhur node-nya, bukan angkanya: prev `217..263` (46px) → cur `161..328` (167px), dan 46px itu persis `h-[46px]`, blok kedua di KERANGKA hero. Kerangka JadwalWarga menaruh `p-6 space-y-3` di kotak hero SENDIRI, sedangkan hero asli menaruhnya di anak (`hero > sheen > div.relative.p-6.space-y-3`). React merekonsiliasi per-POSISI, jadi anak kedua kerangka dipakai ulang menjadi pembungkus isi — SATU node yang rect-nya melompat, sementara kotak hero-nya sendiri tak pernah bergerak (`heroTop` 161 identik di kedua keadaan, direkam per-frame). **Warga tak pernah melihat apa pun.** Obatnya mencermin POHON-nya, bukan cuma tinggi & permukaan: −56px → +13px, sapuan 0 melompat. **Kerangka wajib mencermin STRUKTUR DOM, bukan cuma anatomi visual** — kalau tidak, alat geometri melaporkan lompatan yang tak pernah terjadi. Kelas ini HANYA mungkin di halaman ber-`if (loading) return` (cuma JadwalWarga; diperiksa hari itu juga): halaman ber-`CrossFade` menaruh kerangka & isi sbg dua anak terpisah, jadi node tak pernah dipakai ulang antar-keduanya. Dua hipotesis SALAH dibuang lebih dulu lewat pengukuran — `PageFallback` generik (diubah tab-aware: NOL efek, dikembalikan) dan transisi antar-halaman (kunjungan KEDUA ke tab yang sama: 0 geseran). **Dua angka dilaporkan terpisah**: `tanpa-input` (definisi CLS Google) dan `total`. Yang kedua bukan pelengkap — pindah tab itu ketukan, jadi SELURUH perpindahan skeleton→isi sesudahnya ditandai `hadRecentInput` dan hilang dari CLS resmi, padahal justru itu yang kena jempol warga. Temuan pertama (19 Agu): dua blok Kas RT (`TargetKasRT` yang `return null` selama fetch-nya SENDIRI, + SmartInsight yang syaratnya dihitung dari list kosong) muncul dari NOL — bukan skeleton yang tingginya meleset — mendorong grafik & rekap turun ~175px; dan JadwalWarga satu-satunya halaman ber-early-return `if (loading)` sehingga PageHeader-nya lepas dari alur (0,186 di 360px). Bahwa penyebabnya tukar-skeleton dan BUKAN CrossFade dibuktikan lewat kunjungan KEDUA ke tab yang sama: data ter-cache, skeleton tak muncul, skor 0,000. Divalidasi MUTASI (`MUTASI=1` menyuntik pita yang tumbuh 120px → sapuan WAJIB merah) |
| `audit:gerak` | **K.** (kontrol) animasi masuk benar-benar TERJADI · **R.** patuh `prefers-reduced-motion` · **D.** setiap elemen MENDARAT di keadaan akhirnya | `audit:lompat` mengukur apakah isinya MELOMPAT (CLS), `audit:respon` mengukur BERAPA LAMA jarak ketukan→cat. Tak satu pun bertanya apakah animasi masuknya sendiri BERPERILAKU benar — dan di situ cacat nyata bersembunyi berbulan-bulan. Terukur 24 Agu 2026: blok `prefers-reduced-motion: reduce` cuma memampatkan `animation-duration`, **TIDAK `animation-delay`**. Sepuluh permukaan ber-stagger memakai delay inline (s/d 10 × 0,05s) dan `.rise` ber-fill-mode `both`, jadi barisnya bertahan di keyframe `from` (opacity 0) selama jeda itu: pengguna yang minta "kurangi gerak" justru mendapat daftar **KOSONG setengah detik lalu MELETUS muncul** — kebalikan dari yang ia minta, dan lebih buruk daripada animasi aslinya. Lolos SEMUA sapuan sejak stagger pertama dipasang, karena semuanya memakai `reducedMotion: 'reduce'` lalu MENUNGGU layar tenang sebelum mengukur — jendela cacatnya sudah lewat sebelum satu pun alat melihat. **Bagian K adalah uji KONTROL, bukan pelengkap**: kalau elemen animasi-masuk hadir tapi tak satu pun pernah terlihat beranimasi, yang gagal ALATNYA dan sapuan keluar `PROBE CACAT` — tanpa itu "app patuh" dan "aku tak pernah menyentuh apa-apa" mencetak angka yang sama (pelajaran `audit:gestur` G1, dan probe stagger sesi ini yang lulus palsu karena `gotoTab()` menunggu 3,5 dtk di dalamnya). Ketukan tab WAJIB dari DALAM halaman & sinkron — `locator.click()` mendarat di task berbeda dan frame-frame pertama animasi, justru yang diukur, sudah lewat. Vonis menyebut NAMA elemen, bukan berapa. Loop dekoratif abadi (shimmer, aurora Login, empty-bob) SENGAJA di luar populasi: ia memang tak pernah "mendarat". Divalidasi MUTASI (`MUTASI=1` memaksa `animation-delay:.4s` di bawah reduced-motion → **49 temuan**, dan mutasinya sekaligus menunjukkan kelasnya lebih luas dari `.rise`: `.cf-in` & `.page-in-right` ikut kena begitu ada jeda). Mutasi pertama memakai `animation-delay: revert` dan CACAT — aturan author ber-`!important` yang di-revert jatuh ke nilai UA (`0s`), yaitu lebih BENAR dari aslinya, jadi sapuan tetap hijau dan mutasinya tak membuktikan apa pun. **Bagian D diperbaiki 2 Sep 2026 (cacat alat ke-34):** ia dulu memvonis pada titik waktu TETAP dan karenanya merah SEPARUH waktu di tab berdata — kini `tungguDiam()` (dua bacaan identik & nol skeleton), plus `MUTASI=2` yang membekukan `.rise` di tengah jalan, karena probe yang berubah dari "potret" jadi "tunggu" WAJIB dapat mutasinya sendiri |
| `audit:lebar` | Nominal "Rp" terpotong/meluber di **DUA lebar: 360px** (acuan terkecil app) **+ 320px** (WAJIB §1.4.10) | `<span>` inline punya clientWidth 0 → scrollWidth buta. **Dua lubang ditutup 24 Agu 2026, dan keduanya bersama-sama membiarkan satu cacat uang hidup di produksi** (pil "Defisit" mengecat digit terakhir saldo di 320px, `ca6cea8`). **(a) LEBAR:** sapuan cuma berjalan di 360px, sedangkan cacatnya lahir TEPAT satu langkah di bawahnya — di 320px nominal hero meluber 7,7px, di 360px ia sisa 9,1px dan sapuan melaporkan bersih. Satu lebar = satu titik sampel. **(b) POPULASI, yang lebih berbahaya:** populasi hanya membaca TEXT NODE LANGSUNG, padahal `Odometer` menumpuk kolom digit di dalam anak `aria-hidden` dan menaruh nilai aslinya di `aria-label` induk — jadi HERO SALDO, nominal terbesar & terpenting di app, **tak pernah terukur sekali pun di lebar mana pun**. Menambah 320px saja takkan menangkap apa-apa. Kini `aria-label` dipungut saat text node kosong (cacat yang SAMA sudah dibayar `audit:kembali` bagian (c) — pola berulang: **komponen yang merender angka lewat kolom/kanvas menghilang dari populasi berbasis teks**). Divalidasi MUTASI dua sisi: cabut katup `max-[359px]:` di `HeroSaldo` → sapuan meneriakkan persis `[320px w-Hadiran] "-Rp105.000" bleed=8 30px`; pasang lagi → temuan itu hilang (4 → 3). Vonisnya lewat `bleed` (tepi teks lawan content-box leluhur), BUKAN `scrollWidth` — lihat cacat ke-16. Ringkasan WAJIB dipisah per lebar: menjumlahkannya jadi satu angka menyembunyikan lebar mana yang patah, persis yang bikin kelas ini lolos |
| `audit:reflow` | Halaman geser samping di 320px (§1.4.10, WAJIB) + saat font dasar browser 200% (di atas AA) | Yang WAJIB cuma 320px dan itu bersih. Bagian 200% sengaja dipisah supaya tak dilaporkan sebagai "gagal WCAG" — ia ambang app sendiri untuk warga lansia. Probe WAJIB menyaring elemen ber-leluhur `position:fixed`: isi bottom-nav tak menciptakan scroll dokumen, dan melaporkannya = menyuruh orang membetulkan yang bukan penyebab |
| `audit:sentuh` | Luas area sentuh tiap kontrol di 360px (§2.5.8 min 24px, ambang app 44px) | Warga pakai jempol, sebagian lansia. **Diukur lewat hit-test `elementFromPoint`, BUKAN geometri CSS**: percobaan pertama membaca `cs.insetTop` (properti yang tak ada — yang benar `top/right/bottom/left`) sehingga semua pelebaran `before:-inset-*` terbaca nol dan 19 kontrol dilaporkan gagal padahal semuanya sudah 44px. Tiap kontrol WAJIB di-`scrollIntoView` dulu sebelum diukur — kalau tidak, kontrol yang kebetulan separuh di bawah Header sticky terukur separuh tinggi |
| `audit:muat` | FCP & siap-pakai (CPU 4× lambat, 400 kbps) | Warga pakai Android kelas bawah, sinyal seadanya |
| `audit:masuk` | Gerbang masuk & keluar saat jaringan busuk (chunk gagal, request menggantung, logout luring) + **RELOAD di tengah sesi** & gate sesi baru | Semua audit lain menguji layar SESUDAH masuk. **Tombol "Masuk" yang terkunci tak menyisakan jalan lain sama sekali**, dan kegagalan jaringan yang dilaporkan sebagai "password salah" bikin bendahara mengganti sandi yang sudah benar. **Bagian reload (19 Agu)** ada karena SEMUA sapuan repo memuat halaman SEKALI lalu berinteraksi — tak satu pun pernah MEMUAT ULANG, dan di situlah cacat nyata bersembunyi: `wargaMode` cuma state React, jadi reload melempar warga ke Login. Bukan skenario langka — `PwaUpdatePrompt` MEMANGGIL `location.reload()` saat warga menekan "Muat ulang" pada toast versi baru, jadi tiap deploy = satu lemparan (dan 4 deploy dalam sehari = keluhan "mental terus balik ke login"). Diuji EMPAT sifat sekaligus, karena memperbaiki "bertahan" gampang diam-diam MEMBUKA PINTU: bertahan saat reload · tab aktif ikut pulih · Back sesudah pemulihan kembali ke Beranda (bukan keluar app) · **sesi/tab BARU tetap minta sandi**. Divalidasi MUTASI (kembalikan `useState(false)` → sapuan wajib merah dgn pesan yang tepat) |
| `audit:luring` | App dibuka & dipakai saat TAK ADA SINYAL sama sekali (service worker AKTIF) | `audit:keadaan` memaksa SERVER membalas gagal, `audit:masuk` menguji auth saat jaringan busuk — keduanya tetap PUNYA jaringan. Tak satu pun pernah MEMATIKANNYA, dan semua sapuan lain memakai `serviceWorkers: 'block'` demi hasil stabil; justru karena itu jalur luring tak pernah terlihat oleh satu pun dari mereka. Padahal itu KODE BERBEDA: shell dari cache, chunk dari stale-while-revalidate, sementara Supabase sengaja DILEWATI `sw.js` sehingga tiap request data gagal keras. Warga app ini pakai Android kelas bawah bersinyal seadanya — "dibuka tanpa sinyal" bukan kasus tepi. Empat sifat: shell tetap terbuka · TIDAK terlempar ke Login (gate warga bertahan tanpa jaringan) · app MENGAKU tanpa sinyal (angka basi dilarang tampil seolah angka sekarang) · pindah tab tetap bekerja dari cache. **Jebakan localhost:** `@vercel/analytics` & `@vercel/speed-insights` menyuntik `/_vercel/*/script.js`; path itu HANYA ada di Vercel, di `vite preview` ia 404 lalu dibalas index.html oleh fallback SPA → console memuntahkan "Unexpected token '<'". Artefak lokal, BUKAN cacat — di produksi keduanya balas `application/javascript` (diverifikasi 22 Agu 2026), jadi sapuan MENYARING `_vercel/`. Odometer juga dikecualikan dari deteksi "Rp0": ia merender pita digit `0 1 2 3 4 5 6 7 8 9`. Divalidasi MUTASI (cabut service worker + hapus cache → layar kosong saat luring, sapuan WAJIB merah) |
| `audit:luring-pertama` | Kunjungan PERTAMA → sinyal hilang → buka lagi. Servernya BENAR-BENAR DIMATIKAN, bukan diemulasikan | `audit:luring` memakai `ctx.setOffline(true)`, dan itu **TIDAK memutus fetch milik SERVICE WORKER** — terukur 30 Agu 2026: isi cache SW tumbuh **0 → 16 aset SELAMA fase yang disebut "luring"**, dan menambah 16 berkas segar ke cache tanpa jaringan itu mustahil. Jadi sapuan itu berbulan-bulan menguji app yang MASIH ONLINE lalu melaporkan hijau, sementara shell-nya GAGAL BOOT di kunjungan pertama (3/3 run). Sapuan ini karena itu menyalakan preview-nya sendiri lalu MEMBUNUHNYA — tak ada yang bisa berbohong tentang server yang sudah tak ada. **`npx` cuma pembungkus**: membunuh pid yang di-spawn meninggalkan proses vite asli tetap melayani, jadi yang dibunuh siapa pun yang MEMEGANG PORT-nya (percobaan pertama melaporkan BOOT dari server yang masih hidup). **UJI KONTROL wajib** (`KUNJUNGAN=2`): kunjungan kedua HARUS boot — tanpa itu "app cacat" & "alatku memutus lebih dari seharusnya" mencetak hasil sama. Divalidasi MUTASI (buang JS/CSS dari cache → merah dgn tanda tangan PERSIS bug aslinya). **BATAS:** lokal saja, ia harus memegang tombol matinya; lawan produksi penjaga setaranya = `SHELL` di /sw.js wajib menyebut aset ber-hash yang dirujuk /index.html |
| `audit:kembali` | Data di layar sesudah app DITINGGAL lalu dibuka lagi — sesi yang TETAP HIDUP, bukan reload | 17 sapuan lain menguji satu kunjungan yang berjalan terus; `audit:masuk` satu-satunya yang pernah memuat ULANG (dan itu reload penuh — state React lahir baru). Tak satu pun menguji cara app ini benar-benar dipakai: buka Hadiran RT, pindah ke WhatsApp membalas grup, kembali. Halaman tak dimuat ulang, `useEffect` mount tak jalan lagi, dan halaman utama TIDAK memasang realtime (`useRealtime` cuma di Riwayat Aktivitas) — terukur 20 Agu: **ditinggal 65 dtk → nol GET**, di kedua peran. Saldo lama yang tampak persis seperti saldo sekarang bukan soal rasa; itu pernyataan keliru tentang UANG. Diuji TIGA sifat sekaligus karena memperbaiki yang pertama gampang merusak sisanya: (1) pergi lama → ambil ulang; (2) pergi SEBENTAR → JANGAN (warga menyentuh notifikasi lalu balik 3 dtk = badai request di paket Supabase GRATIS + baterai HP kelas bawah); (3) penyegarannya DIAM-DIAM — skeleton tak boleh muncul lagi, layar yang berkedip balik ke abu terasa lebih murah daripada data basi yang diam. Obatnya `useKembaliDariLatar()` di `src/lib/hooks.ts`, dipasang di 6 halaman berdata. **BATAS SAPUAN, diakui:** Chromium harness tak bisa benar-benar disembunyikan (`Emulation.setPageVisibilityOverride` sudah tak ada di protokol, `Page.setWebLifecycleState('hidden')` ditolak, tab kedua yang dibawa ke depan TIDAK menyembunyikan tab pertama — diuji headless MAUPUN headed), jadi transisinya DISUNTIK: getter `visibilityState`/`hidden` ditimpa lalu `visibilitychange` dikirim. Yang diuji = handler app terhadap kontrak peramban, bukan peramban. Jedanya TIDAK dipalsukan — sapuan menunggu betulan. Divalidasi MUTASI dua arah (ambang ∞ → sifat 1 merah; ambang 0 → sifat 2 merah). **Bagian ke-4 (24 Agu)** menutup tepi yang sifat 1–3 akui: ketiganya mengandaikan penyegarannya BERHASIL. Keadaan yang belum diuji siapa pun duduk persis di ANTARA dua sapuan yang sudah ada — `audit:keadaan` menguji muat PERTAMA yang gagal (layar belum punya angka sama sekali), `audit:luring` menguji TANPA sinyal (app mengaku lewat strip Header "salinan terakhir"). Di antaranya: warga kembali dari WhatsApp, sinyal ADA, tapi server membalas galat. Penyegarannya SENGAJA senyap (sifat 3 melarang skeleton), jadi tanpa penjaga tak ada satu pun tanda bahwa angka di layar sudah tak dipercaya app-nya sendiri. DUA SISI, dan yang kedua gampang dirusak sambil "memperbaiki" yang pertama: **4a** app WAJIB mengaku gagal menyegarkan; **4b** angka lama WAJIB BERTAHAN — menukar "saldo terakhir yang diketahui" dgn "Rp0" bukan kejujuran, itu pernyataan baru yang salah, kelas yang persis ditutup 93f606c. Hasil 24 Agu: **hijau di dua peran** (nominal 12 → 12, app menoast "Gagal memperbarui data"), dgn satu **CATATAN ambang app yang sengaja TIDAK dihitung gagal**: pengakuannya SEMENTARA (toast ~2,6 dtk) sementara basinya PERMANEN — preseden obatnya sudah ada di app, strip LURING Header yang tak bisa ditutup. Divalidasi MUTASI DUA sisi, karena satu mutasi tak bisa menguji keduanya: `MUTASI=1` membungkam pengakuan → 4a merah `DIAM` di 2 peran; `MUTASI=2` membalas **200 `[]`** alih-alih 500 (meniru kegagalan paling menipu: app mengira BERHASIL, menimpa cache dgn daftar kosong) → 4b merah `Rp16.352.000 → Rp0`. **Empat cacat alat ditutup saat membangunnya, semuanya kelas lama repo ini:** (a) `ctx.unroute(pola)` TANPA handler membuang SEMUA handler pola itu — termasuk mock bendahara milik `siapkan()` (anon paksa + tulis diblokir); kini handler-nya BERNAMA. (b) Pengakuan cuma DIPOTRET sesudahnya, padahal toast hidup ~2,6 dtk sedangkan probe menunggu 9 dtk — yang tersisa cuma residu region live `role=alert` yang Toaster tahan SELAMANYA, jadi sapuan akan berubah merah begitu region itu dibersihkan padahal app tetap mengaku; kini dipantau SELAMA jendela (disiplin sama penghitung skeleton sifat 3). (c) Hero saldo TAK TERLIHAT probe: Odometer merender kolom digit bertumpuk sehingga `innerText` berbunyi `Rp\n0\n1\n2…` dan pola `Rp\d` tak pernah cocok — nilai aslinya hidup di `aria-label`, kini ikut dipungut dan DIDAHULUKAN (diimbuh di ekor lalu dipotong `slice(0,6)` justru membuang angka terpenting, karena badan Beranda punya lebih dari 6 nominal). (d) `process.exit(gagal ? 1 : 0)` membuat PROBE CACAT tak memerahkan sapuan — pelajaran ke-23; kini `gagal || cacat`. Uji KONTROL ikut dipasang: nol GET sesudah kembali = `PROBE CACAT`, bukan hijau — tanpa itu "app patuh" dan "alatku tak pernah menyentuh apa-apa" mencetak angka yang sama |
| `audit:respon` | **A.** Ketukan → cat, **B.** ketikan → cat (Event Timing/INP, CPU 4×), **C.** bingkai panjang saat gulir (LoAF), **D.** AKSI BERAT: ekspor/cetak/bagikan | Semua sapuan lain memotret layar yang SUDAH TENANG; tak satu pun punya angka soal jarak antara jempol menyentuh dan layar berubah. `audit:muat` mengukur KAPAN app tercat, `audit:lompat` apakah isinya melompat sesudah itu, `audit:papan-ketik` apakah kontrolnya TERGAPAI — bukan seberapa cepat ia menjawab. Hasil A–C: 34 interaksi, terburuk **56 ms** — app memang sudah cepat, dan justru itu yang membuat bagian D menonjol. **Bagian D (20 Agu)** menguji satu-satunya jeda berdetik-detik yang tersisa: tiap "Cetak PDF"/"Ekspor Excel"/"Bagikan" mengunduh chunk-nya SAAT diketuk (Excel 941 kB, PDF triwulan 399 kB, html2canvas 201 kB) lalu merender di main thread. Terukur di Kas RT, 400 kbps + CPU 4×: **6.247 ms tanpa satu pun perubahan di layar** — nol pemintal, nol tombol nonaktif, nol kata tunggu. Tiga cacat sekaligus, semuanya di luar jangkauan sapuan lain: (1) app tak mengaku menerima ketukan; (2) ketukan ganda menghasilkan **DUA berkas identik** — `audit:tulis` menjaga jalur TULIS dari ini, jalur ekspor tak pernah kebagian; (3) chunk yang gagal diunduh berakhir **diam selamanya** — dan itu bukan skenario karangan, `vercel.json` merewrite semua path ke index.html sehingga chunk basi pasca-deploy dibalas HTTP 200 berisi HTML dan `import()` menolak dgn galat MIME (jalur Excel bahkan tak punya `catch` sama sekali). Obatnya `useAksiBerat()` di `src/lib/hooks.ts` — latch sinkron + keadaan sibuk anti-kedip + penerjemah galat, dipasang di 11 call-site. **Jalur ekspor/berbagi BARU wajib memakainya.** Divalidasi MUTASI (tunda-sibuk ∞ + latch dilepas + catch dibisukan → sapuan WAJIB merah di D1, D2, D3) |
| `audit:gestur` | **G1** kontrol: geser mendatar di halaman TANPA lapisan WAJIB memindahkan tab · **G2** geser mendatar di ATAS lapisan terbuka TAK boleh menyentuh halaman di belakangnya | `audit:sentuh` mengukur LUAS area jempol, dan itu satu-satunya sapuan yang namanya menyebut sentuhan. **Tak satu pun dari 20 sapuan lain pernah benar-benar MENGIRIM sentuhan** — semuanya `click()` Playwright (pointer/mouse). Padahal jempol SATU-SATUNYA cara warga memakai app ini, dan di atasnya hidup EMPAT sistem gestur bertetangga: `useSwipeNavigate`, `PullToRefresh`, `useDragDismiss`, seret carousel. Yang tak terlihat dari satu berkas pun: dua yang pertama membungkus KONTEN HALAMAN di `App.tsx`, sedangkan sheet/overlay/konfirmasi dirender INLINE di JSX halamannya — dan **`position: fixed` memindahkan tempat elemen DICAT, bukan leluhurnya di DOM**, jadi sentuhan di atas sheet modal tetap menggelembung ke handler tingkat App. Terukur 23 Agu: **10 dari 10 lapisan TEMBUS** — geser mendatar di atas sheet memindahkan tab di BELAKANGNYA dan lapisannya ikut lenyap karena halamannya di-unmount; terparah `sheet-tambah`, satu geser membuang formulir transaksi yang sedang diketik bendahara. Bahwa kelas ini nyata & sudah dikenal terbukti dari `BannerCarousel` yang memasang `stopPropagation` persis untuk itu — satu komponen dijaga, lapisan tidak. Menu Header & InfoTip kebetulan AMAN karena `createPortal` ke `<body>`: keamanannya STRUKTURAL, bukan keputusan. Obatnya `adaLapisanTerbuka()` (baca `stack` `useBackDismiss`) dipasang di `useSwipeNavigate.onTouchStart` — SATU titik, bukan per call-site, sehingga lapisan baru ikut aman tanpa perlu ingat apa-apa; sumbernya `stack` dan bukan hitungan `[role=dialog]` di DOM karena yang terakhir meleset untuk popover ber-role lain & lapisan yang sedang beranimasi keluar. **VALIDASI sengaja TANPA flag MUTASI:** G1 jalan di SETIAP eksekusi dan langsung menangkap "obat" curang (kalau penjaganya mematikan swipe sama sekali, G1 merah seketika) — lebih kuat daripada flag yang harus diingat orang; bukti bebannya sebelum/sesudah 10 → 0 dgn G1 hijau di kedua sisi. **G3 (23 Agu)** menutup batas yang G1–G2 akui: kebocoran `PullToRefresh`. Percobaan pertama gagal MENGUKUR — tarikan di sheet Beranda keburu dimakan `useDragDismiss` milik panel itu sendiri, karena Beranda salah satu dari DUA call-site yang memasang handler di SELURUH panel. Populasi yang benar = sheet ber-GAGANG (11 dari 13), yang badannya tak dimiliki siapa pun. Hasilnya cacat NYATA: form **"Tambah transaksi Kas RT"** — menarik ke bawah di badan formulir menyalakan pemintal muat-ulang halaman di BELAKANGNYA, indikator bergerak **110px** di scrollY 0. Deteksinya lewat penanda OPT-IN `data-ptr` (preseden `data-grafik`: tak ada ciri struktural yang membedakan pembungkus PTR dari div tata letak). **Jebakan alat yang wajib diingat: tiap `touchmove` HARUS dipisah satu frame** — `PullToRefresh.onMove` memanggil `setPull` (state React), jadi 14 gerakan dalam SATU task tak pernah memberi React kesempatan me-render dan transform yang dibaca selalu nilai SEBELUM tarikan (puncak 0px, terbaca seperti "PTR tak menyala"). Ini KEBALIKAN disiplin `audit:tulis`, dan bedanya disengaja: di sana yang diuji dua ketukan dalam satu task (celah sebelum render), di sini yang ditiru satu jari yang menarik selama BANYAK frame. |
| `audit:mundur` | **Tombol Back HP** pada tiap lapisan yang bisa ditutup — **A1** terdaftar di back-stack · **A2** Back menutup lapisan (bukan app, bukan tab) · **B** saat bertumpuk yang tertutup cuma yang TERATAS · **C** tutup lewat UI tak meninggalkan entri nyangkut · **D** sesudah RELOAD-dengan-lapisan-terbuka, Back pertama masih menghasilkan perubahan yang TERLIHAT · **E** Back BERUNTUN cepat & Back di TENGAH animasi keluar | `audit:papan-ketik` bagian B menguji disiplin fokus lapisan dan menekan ESCAPE, lalu melaporkan enam lapisan sehat. Laporannya benar — dan justru itu titik butanya: **warga app ini membuka Hadiran RT dari Android dan tak satu pun punya tombol Escape.** Jalan keluar yang benar-benar mereka pakai tak pernah ditekan oleh satu pun dari 19 sapuan lain; `audit:masuk` paling dekat (Back SEKALI sesudah reload, di layar tanpa lapisan terbuka). Kanon repo sebenarnya sudah tertulis di harness (`closeLayer`: "Escape → jaring Back HP"), yang tak pernah ada cuma alat yang memeriksa apakah itu masih benar. **Ternyata tidak:** `useDialog` (Escape) dan `useBackDismiss` (back-stack) dipasang dari dua daftar call-site BERBEDA, dan selisihnya — 6 lapisan — tak terlihat dari satu berkas pun. Taruhan tertingginya **ConfirmDestruktif**, gerbang pengaman satu-satunya untuk aksi merusak uang: ia dibuka DI ATAS sheet aksi yang tetap hidup (`setHapusRow(row)` tanpa mengosongkan `selectedRow`), jadi Back memanggil close milik SHEET — terukur `[Aksi transaksi + Hapus transaksi ini?]` → Back → `[Hapus transaksi ini?]`: sheet lenyap, dialog merah bertahan sendirian, dan gerakan yang di seluruh Android berarti "batal" tak membatalkan apa pun; tekan sekali lagi (stack sudah kosong) dan **app KELUAR sementara konfirmasi hapus masih terpampang**. Lima lapisan lain melempar keluar app dalam SATU ketukan (menu Header, menu Ekspor, popover InfoTip, popover urutan FilterChips, panduan pasang iOS). Garis dasar & deteksi "terlempar keluar" pakai **SENTINEL** — singgah di `/landing.html` dulu baru ke app — supaya Back yang lolos mendarat di halaman NYATA yang bisa dikenali, bukan about:blank yang ambigu (dan bukan no-op diam kalau app kebetulan entri pertama tab). Divalidasi MUTASI (`MUTASI=1` mematikan `pushState`+`history.back` di halaman → 14 lapisan, 27 temuan; tanpa mutasi & sebelum perbaikan: 15 temuan dgn seluruh sheet ber-`useBackDismiss` HIJAU sbg kontrol). **Lapisan baru WAJIB memasang `useBackDismiss` berdampingan dgn `useDialog` — Escape saja meninggalkan seluruh warga tanpa jalan keluar.** **Bagian D (22 Agu)** ditambahkan di TEPI bagian A–C: ketiganya berjalan di SATU page life, warisan batas 18 sapuan lain (cuma `audit:masuk` yang pernah memuat ULANG, dan itu di layar tanpa lapisan terbuka). Padahal entri history SELAMAT dari reload sementara `stack` lapisan lahir KOSONG — app lalu duduk di atas entri yang tak dimiliki siapa pun, dan ketukan Back PERTAMA warga terbakar percuma: traversal mendarat, tak ada yang ditutup, tab tetap, app tak keluar, **NOL yang bisa dilihat**; baru ketukan kedua bekerja. Bukan skenario karangan — `PwaUpdatePrompt` memanggil `location.reload()` saat warga menekan "Muat ulang" pada toast versi baru, jadi tiap deploy satu putaran. Terukur di kedua peran. **Jebakannya: menonton `history.state` MENIPU** — state memang berubah tiap entri yatim dikonsumsi, jadi sapuan yang menilai dari state akan melaporkan "Back bekerja" untuk ketukan yang di mata warga tak melakukan apa pun; vonisnya WAJIB dari perubahan yang TERLIHAT (tab / jumlah lapisan / keluar app). Obatnya `sapuEntriYatim()` di `useBackDismiss.ts`, dijalankan saat MODUL diimpor — sengaja BUKAN dari `registerBack`: `init()` selama ini lazy dan di Beranda tak satu lapisan pun mendaftar, jadi penyapu yang menumpang di sana takkan pernah jalan justru di layar tempat Back paling sering ditekan. Menyapu di BOOT, bukan saat Back ditekan: memundurkan satu entri lagi dari dalam handler popstate tetap menyisakan ketukan yang tak terlihat efeknya — yang harus hilang entrinya, bukan gejalanya. `jaringSapu` 1 dtk WAJIB ada: `history.back()` di entri PERTAMA tab tak menghasilkan traversal & popstate tak pernah datang, dan tanpa jaring itu SELURUH pendaftaran lapisan sesudahnya terantri selamanya — obat yang mematikan back-stack yang mau diperbaiki. Validasi D = sebelum/sesudah (merah di 2 peran → 0), BUKAN `MUTASI=1` (mutasi itu menyasar mekanisme push/back bagian A–C). **Bagian E (23 Agu)** menutup batas yang bagian A–D akui: keduanya menekan Back SEKALI di lapisan yang sedang DIAM. **E1 beruntun** — jempol menekan Back 2–3× cepat (HP terasa tak merespons, atau memang mau keluar dari tumpukan); ini kelas balapan yang SAMA yang pernah bikin app BLANK TOTAL (`pendingBack`/`opQueue`: `history.back()` cuma MENJADWALKAN traversal, `pushState` sinkron). **E2 saat-keluar** — lapisan ditutup lewat tombol UI (fase keluar 120–150 ms berjalan, lapisannya MASIH terdaftar di `stack`) lalu Back ditekan sebelum animasi selesai; bahayanya BUKAN "dua lapisan tertutup" (Back memang niat kedua) tapi HISTORY DESYNC — `back()` tertunda milik fase keluar menyusul dan memakan SATU entri lagi, sesudah itu Back berikutnya mati persis penyakit bagian D. Karena itu vonis E2 bukan berapa lapisan tertutup melainkan **invariant**: app masih hidup & di layar, DAN ketukan Back BERIKUTNYA masih menghasilkan perubahan yang TERLIHAT. **Ketukannya WAJIB dari DALAM halaman & sinkron** — `page.goBack()` ditunggu sampai traversalnya mendarat, jadi dua panggilan selalu jatuh di task BERBEDA dan celah balapannya tak pernah terlihat (pelajaran yang sama sudah dibayar di `audit:tulis`: dua `.click()` terpisah bikin React sempat render & ketukan ganda tak pernah tertangkap). Hasil: **nol temuan** — mesin `pendingBack`/`opQueue` + penjaga `i === -1` memang menahan keduanya. **E1 divalidasi MUTASI tepat sasaran** (cabut penjaga `i === -1` di cleanup `registerBack`, satu-satunya yang mencegah double-pop → sapuan meneriakkan persis `3 ketukan Back cepat → APP KOSONG`, kelas blank-total tereproduksi). **E2 JUJUR lebih lemah:** ia hijau, tapi mutasi yang dicoba meledak lebih dulu di jalur lain sehingga failure mode-nya sendiri belum pernah terinduksi — pertahankan sbg penjaga murah, jangan diklaim terbukti menahan beban. |
| `audit:tulis` | Tombol simpan saat request tulis MENGGANTUNG (Kas RT + Kelola Anggota + **Absensi "Simpan & Hitung Iuran"**) + **KETUKAN GANDA** (satu niat tercatat berapa kali) + **NOL BARIS** (server menjawab sukses untuk tulis yang tak mengubah apa pun) | `audit:keadaan` menguji BACA gagal, `audit:masuk` menguji auth — jalur TULIS, satu-satunya tempat uang benar-benar dicatat, tak tersentuh keduanya. **`try/finally` ada di semua jalur tulis tapi tak menolong: `finally` tak pernah tercapai kalau janjinya tak pernah selesai**. Jalur Absensi (16 Agu) ditambahkan karena dua jalur lama sama-sama SATU insert, jadi tak satu pun menguji rantai `simpanTarikanSelesai` — 4 tabel berurutan; yang digantung = tulis PERTAMA (absensi delete), keadaan terburuk: nol tabel berubah tapi layar sudah bilang "Menghitung…". Form-nya baru ADA kalau ada tarikan, jadi `siapkan()` kini bisa menyuntik isi GET palsu (`bacaan`); tanpa itu semua GET dijawab `[]` dan editor absensi tak pernah bisa dibuka. **Bagian ketukan ganda (19 Agu)** menguji hal yang SAMA SEKALI BERBEDA dari bagian menggantung: bukan "apa yang dilihat bendahara saat jaringan busuk", tapi "apakah satu niat bisa tercatat DUA KALI". `disabled={saving}` tak menjawabnya — itu penjaga UI yang baru berlaku SETELAH React me-render, sedangkan dua ketukan di TASK YANG SAMA (ghost-click iOS/Android, atau warga menekan lagi karena HP terasa tak merespons) masuk ke handler sebelum render itu. Terukur: **dua `POST kas_rt` untuk satu ketukan ganda** — dua transaksi untuk satu niat, dan di app kas itu uang. Obatnya `useSaving()` di `src/lib/hooks.ts`: latch `useRef` yang berubah SEKARANG JUGA, dipasang satu baris (`if (… \|\| sedangSimpan()) return;`) di 9 handler tulis + jalur merusak `batalkan()`. **Jalur tulis BARU wajib memakainya** — `useState(false)` polos akan lolos semua sapuan lain. Dua jebakan alat saat membangunnya: `dispatchEvent` Playwright TAK memicu submit bawaan (nol request, terbaca "aman"), dan dua `.click()` Playwright terpisah selalu beda task sehingga React sempat render & celahnya tak pernah terlihat — kliknya WAJIB dari dalam halaman & sinkron. Yang dihitung hanya **POST**: percobaan pertama menghitung semua method dan melaporkan "DOBEL" untuk satu simpan sehat (satu POST memang diikuti PATCH hitung-ulang saldo). **Bagian NOL BARIS (23 Agu)** menguji hal ketiga yang berbeda lagi: bukan "server DIAM" dan bukan "dua kali tercatat", tapi **server menjawab SUKSES untuk tulis yang mengubah NOL BARIS**. Itu jawaban asli PostgREST saat tak ada baris cocok — `PATCH`/`DELETE` tanpa `Prefer: return=representation` dibalas **204 kosong, byte per byte identik** dgn balasan saat satu baris benar-benar berubah, sehingga klien tanpa `.select()` secara STRUKTURAL tak bisa membedakannya. Terukur: PATCH `warga` dibalas 204 → app tetap menoast **"Data anggota diperbarui"**. Dua pemicunya nyata — RT ini punya DUA admin aktif (baris bisa sudah diubah/dihapus dari HP lain), dan policy RLS yang hilang membuat UPDATE kena nol baris TANPA error sama sekali. Obatnya `wajibBerubah()` di `src/lib/tulisAman.ts` (menuntut `.select()` + baris tak kosong), dipasang di 6 jalur UANG: `updateWarga`, `transaksi_kas` nominal, ringkasan `tarikan`, saldo berjalan `kas_rt`, batal-lunas Talangan, revisi jadwal. **SENGAJA TIDAK dipasang** di hapus-bersih yang idempoten (menghapus catatan kas pasangan saat membatalkan pelunasan — kalau memang tak ada, itu hasil yang BENAR) dan di self-heal nomor jadwal; memaksakannya di sana melahirkan galat palsu. Divalidasi MUTASI (cabut penjaga di `updateWarga` → sapuan meneriakkan persis `MENGAKU BERHASIL … "Data anggota diperbarui"`). Dua cacat aim saat membangunnya, keduanya kelas lama: `hasNotText` saja MELOLOSKAN tombol ikon berteks kosong sehingga `.first()` mendarat di tombol tutup (wajib `hasText: /\S/` juga), dan label simpan mode EDIT berbeda dari mode tambah ("Simpan Perubahan" vs "Simpan Anggota") — cacat ke-13 berulang. **Jalur tulis BARU yang mengubah UANG wajib memakai `wajibBerubah`** |
| `audit:mati` | Keterbacaan label tombol saat `disabled` (terang+gelap, warga+bendahara) | Kedua audit kontras MELEWATI kontrol nonaktif secara eksplisit — sah, karena WCAG 1.4.3 mengecualikannya. Tapi "tak wajib" bukan "boleh tak terbaca", dan pengecualian itu berarti keadaan nonaktif **tak pernah diukur sekali pun**. Yang tersembunyi di baliknya: tombol masuk bendahara 3,79:1 saat "Memproses…", 3 tombol teks Kas Hadiran 2,2–2,7:1, dan perbaikan `.btn-brand:disabled` yang ternyata cuma dihitung untuk mode TERANG (4,32:1 di gelap). Ambang dilaporkan sebagai ambang APP, bukan "gagal WCAG" — disiplin yang sama dgn bagian teks-200% di `audit:reflow` |

**Populasi EKSTREM (`EKSTREM=1`).** Tiap sapuan geometri mengukur DATA HARI INI
— 69 warga, nama pendek, nominal 6 digit — jadi "0 temuan" berarti "tak ada yang
patah untuk data yang kebetulan ada sekarang", bukan "tata letaknya tahan".
`EKSTREM=1 npm run audit:potong` / `audit:lebar` menekan BENTUK jawaban rest/v1
lewat harness bersama (`jawabEkstrem`): nama 36 karakter, keterangan panjang,
nominal ×`EKSTREM_SKALA` (default 100). Jumlah baris SENGAJA tak digandakan —
menyalin baris berarti id kembar & agregat uang bohong, dan itu melahirkan
"temuan" yang sebenarnya cacat alat. **Skalanya wajib dikalibrasi ke yang app
janjikan** (300 KK): percobaan pertama memakai ×1000 → "Rp16.352.000.000", dan
menyebut tata letak patah karena angka 16 milyar yang takkan pernah ada = temuan
karangan. Hasil nyata 20 Agu: nama panjang yang terpotong di baris daftar BUKAN
temuan (keputusan 360px yang sudah ada), tapi kaki stat hero — 3 kolom di kartu
carousel 284px — SALING MENIMPA mulai 8 digit; kini `HeroStats` menyusutkan
huruf seperlunya (`ukuranMuat`, lantai 9,6px), bukan membulatkan angkanya.

Yang ke-16 (20 Agu): `audit:lebar` melaporkan hero Talangan & Laporan Triwulan
"terpotong 52px" — palsu. `scrollWidth - clientWidth` ikut menghitung keturunan
`position:absolute`, dan yang meluber justru SPAN PROBE milik `FitAmount`
sendiri (visibility:hidden, sengaja dipasang di maxPx 48 untuk mengukur rasio);
angka yang terlihat duduk di 39px dan muat. Alat yang percaya `scrollWidth` akan
menyuruh orang membetulkan komponen yang justru sedang bekerja. Kini lebar teks
diukur lewat RANGE atas TEXT NODE yang benar-benar terlihat (disiplin sama
`audit:potong`), dan `bleed` IKUT DICETAK di laporan — sebuah baris bisa masuk
daftar SEMATA karena melewati content-box leluhurnya, dan tanpa angka itu
laporannya menyuruh orang mencari luapan yang tak kelihatan di kolom mana pun.

**Aturan alat:** kalau sapuan melaporkan temuan yang ternyata palsu, **betulkan ALATNYA**,
bukan kodenya. Sudah terjadi 12×: sampel kena border 1px, aturan dialog dikenakan ke halaman
penuh, probe mengambil dialog di belakang sheet, `.sr-only` terbaca "terpotong", pola rute
`supabase-*.js` meleset dari nama asli `vendor-supabase-*.js` (sapuan diam-diam menguji jalur
ONLINE lalu "lolos"), klik ditolak karena panel collapse masih beranimasi, klik pembuka
panel mendarat SEBELUM hidrasi lalu tak berbuat apa-apa, `audit:mati` menyapu SEMUA tombol
(termasuk yang tak punya gaya `disabled` sama sekali) lalu melaporkan label bottom-nav sebagai
gagal — populasi salah, ukuran benar — dan sampel `fill` di sapuan yang sama mendarat di AVATAR
baris daftar, bukan di fill tombol, sehingga rasionya avatar-lawan-latar ("1:1"). Karena itu
`audit:mati` kini hanya melihat tombol yang gayanya BENAR-BENAR berubah saat nonaktif, dan fill
diambil dari MODUS kisi di dalam kotak teks. Tiap gangguan jaringan di
`audit-masuk.mjs` menghitung berapa kali benar-benar terpasang, dan tiap prasyarat UI ditunggu
sampai MENGAKU tercapai (`aria-expanded="true"`), bukan diasumsikan dari satu klik.
Yang ke-10 (4 Agu): `audit:tulis` melaporkan KEDUA jalur tulis "menyerah diam-diam" padahal
keduanya memang menampilkan toast galat — probenya cuma membaca `[role="status"]`, sedangkan
Toaster mengirim toast GALAT ke region ASSERTIVE `role="alert"` dan wadah toast yang terlihat
sengaja TANPA role (anti-baca-dobel). Selektor lama justru satu-satunya tempat yang dijamin
kosong saat gagal. Kini ketiga permukaan dibaca, plus jeda 400ms karena label tombol pulih di
tick yang sama saat toast baru dipasang.
Yang ke-11 (6 Agu): `audit:kontras` melaporkan dua nominal 5,13 & 5,86:1 padahal keduanya duduk
di banner amber-50 / kartu putih (≈9:1). Latarnya bukan miliknya: uji occlusion cuma menguji
titik TENGAH elemen, sedangkan baris sampel tepi-BAWAH elemen yang tergulir ke bawah bar nav
dok mendarat di hairline atas bar (`line` #B8C4D3) — dan karena latar dipilih lewat MODUS,
7 titik hairline menang atas fill aslinya. Hit-test per-titik saja **cuma menyembuhkan
separuh**: kotak bar mulai di y=774 tapi garisnya dicat di y=773, DI LUAR border-box-nya, jadi
`elementFromPoint` dengan patuh menjawab "itu paragrafnya". Kini ada dua penjaga — hit-test tiap
titik, plus buang titik yang jatuh di PITA 2px tepat di luar kotak elemen `position:fixed`
(pita tepi, bukan seluruh kotak: lapisan `fixed inset-0` akan menelan semua titik). Dan karena
penjaga occlusion bisa jadi tempat temuan bersembunyi, elemen yang HABIS titiknya dihitung &
dilaporkan (`tak terukur: N`, rinciannya lewat `SHOW_BUTA=1`) — sapuan tak boleh menyempitkan
populasinya sendiri tanpa mengaku.
Yang ke-12 (6 Agu, muncul begitu judul seksi naik 16→18px dan tata letak bergeser ~6px):
baris Kas RT dilaporkan 2,99:1 padahal latarnya kartu gray-900 (≈15:1). Penyebabnya `clamp`
`Math.min(843, y)` di `perimeterPoints` — ia MEMINDAHKAN titik yang jatuh di luar layar ke tepi
bawah, jadi untuk elemen dua baris yang menggantung di bawah lipatan SELURUH baris sampel mid-y
menumpuk di y=843, tepat di tengah barisan glyph; piksel tepi-antialias lolos saringan
"mirip warna teks" (jarak 175) lalu menang jadi MODUS. **Titik di luar viewport bukan sampel
yang dipindahkan — ia sampel yang TIDAK ADA**, jadi kini DIBUANG (filter, bukan clamp).
Efek sampingnya langsung ketahuan lewat penghitung `tak terukur`: baris PALING BAWAH tiap
halaman jadi nol sampel, karena langkah gulir 640px tak menjamin layar terakhir utuh — ditutup
dengan satu pas tambahan ke DASAR halaman. Populasi 1.243 → 1.265.
Yang ke-13 (16 Agu, saat menambah jalur Absensi ke `audit:tulis`): probe melapor "PROBE CACAT:
form tak pernah terbuka" — bukan bug app, selektornya yang meleset. Jadwal punya DUA wujud
tombol proses: pil BERLABEL TEKS "Proses" untuk tarikan BERIKUTNYA, dan ikon-saja ber-aria-label
"Proses tarikan #N" untuk tarikan terjadwal lainnya. Data palsu cuma berisi satu tarikan → yang
dirender justru wujud pertama, sehingga `name: /Proses tarikan/i` tak pernah cocok. Kini
`/^Proses/i` (jangkar `^` supaya tak ikut menangkap "Memproses…" setelah diklik). **Pelajaran
yang berulang: satu aksi bisa punya lebih dari satu accessible name tergantung KEADAAN DATA —
periksa apa yang benar-benar dirender (screenshot + `innerText`), jangan percaya satu selektor.**
Sapuan tulis baru juga divalidasi lewat MUTASI (naikkan `BATAS_REQ_MS` 20s→300s → ketiga jalur
WAJIB melapor "TOMBOL TERKUNCI"); hijau tanpa mutasi tak membuktikan apa pun.

Yang ke-14 & ke-15 (20 Agu, saat membangun `audit:respon` bagian D): keduanya
sapuan yang menyalahkan app untuk perilaku yang justru benar. (a) "Cetak PDF DIAM"
untuk berkas yang sudah turun dalam **134 ms** — tak ada yang perlu diakui, kerjanya
selesai sebelum mata sempat mencari tandanya; `useAksiBerat` memang menahan
pemintalnya 250 ms supaya jalur ber-chunk-cache tidak BERKEDIP, dan kedipan itulah
yang terbaca murah, bukan menunggunya. Kini tanda sibuk hanya diwajibkan kalau
aksinya belum selesai dalam 1 detik. (b) "chunk RUSAK → diam selamanya" padahal
toastnya muncul: route perusak dipasang di halaman yang SAMA dengan uji sebelumnya,
sedangkan modul yang sudah pernah di-`import()` duduk di **module cache** peramban
dan tak pernah menyentuh jaringan lagi — yang terukur di sana bukan kegagalan chunk
melainkan PDF yang berhasil dibuat. Uji chunk-gagal WAJIB konteks BARU.

Yang ke-17, ke-18 & ke-19 (22 Agu, saat membangun `audit:mundur`) — ketiganya sapuan
yang menyempitkan populasinya sendiri tanpa mengaku. (a) `pulih()` memanggil
`loginWarga` tanpa syarat, padahal gate warga hidup di sessionStorage: pemulihan
sesudah "terlempar keluar" mendarat di app yang MASIH masuk, sapuan menunggu
`#warga-password` yang takkan pernah datang, lalu MATI di tengah jalan.
(b) Sapuan tak punya probe TAB AKTIF, jadi "Back menutup lapisan" dan "Back
MEMINDAHKAN TAB sehingga lapisannya ikut lenyap karena halamannya di-unmount"
terbaca identik (n turun ke 0) — dan yang kedua justru cacat. Lebih buruk:
temuan itu menyeret seluruh uji SESUDAHNYA ke halaman salah, dan hasilnya
terbaca sebagai "pemicu tak ada" — 8 lapisan, termasuk uji bertingkat
ConfirmDestruktif, terlewat diam-diam. Kini tab aktif dibaca dari
`aria-current="page"` dan tiap uji dikembalikan ke layarnya sebelum mulai.
(c) Uji bertingkat cuma MENGHITUNG lapisan, sehingga "yang atas tutup" (benar)
dan "yang BAWAH tutup sementara dialog merah bertahan" (cacat) sama-sama
menyisakan satu lapisan — sapuan dgn patuh melaporkan tumpukan ConfirmDestruktif
LULUS. Kini NAMA lapisan bawah direkam sebelum yang atas dibuka, lalu dibanding.
**Pola yang berulang: penghitung yang benar bisa menyembunyikan peristiwa yang
salah — sapuan wajib menyebut nama apa yang ia lihat, bukan berapa.**

Yang ke-20 (23 Agu): `audit:mundur` MATI dua kali berturut-turut saat diarahkan
ke PRODUKSI — `page.goto` timeout 30 dtk (ambang bawaan Playwright). Bukan
temuan palsu melainkan CRASH, dan itu lebih buruk: matinya sesudah bagian warga
selesai bersih, jadi bendahara tak pernah diuji sama sekali dan laporannya
berhenti di tengah tanpa mengaku populasinya tinggal separuh. Sapuan ini yang
paling banyak bernavigasi dari semua sapuan repo — tiap `pulih()` memuat app
dari nol, dan bagian D memuat ULANG di tengah — sementara tiap navigasi
produksi menempuh cold start + Supabase nyata. Kini `NAV_MS` 90 dtk saat sasaran
JAUH (30 dtk lokal) + `pergi()` yang mengulang navigasi SEKALI: gagal tunggal
tak boleh membunuh sisa populasi, gagal dua kali tetap menyerah keras karena itu
memang bukan cegukan lagi. **Pelajaran yang menyambung cacat ke-13 & ke-18:
sapuan yang berhenti di tengah dan sapuan yang menyempitkan populasinya sendiri
adalah penyakit yang sama — laporan hijau/pendek yang tak mengaku apa yang tak
sempat diperiksa.**

Yang ke-21 & ke-22 (23 Agu, saat membangun `audit:gestur`) — keduanya cacat
MEMBIDIK, dan keduanya nyaris melahirkan laporan "aman" yang palsu.
(a) Gestur ditembakkan ke `#root`, yang justru LELUHUR pembungkus `{...swipe}`:
peristiwa menggelembung ke ATAS, jadi handler App tak pernah kebagian. Jari
warga tak pernah "mengenai #root" — ia mengenai apa pun yang tercat paling atas
di titik itu. Kini sasaran diambil `document.elementFromPoint` (disiplin yang
sama sudah dibayar `audit:sentuh`). Percobaan berikutnya masih meleset karena
titik tengah layar Beranda jatuh di dalam BannerCarousel — satu-satunya komponen
yang memang `stopPropagation` — jadi sapuan menyalahkan komponen yang justru
sedang bekerja benar; kini kontrol digulir turun dulu & mencoba tiga ketinggian.
(b) Arah geser TETAP "ke tab berikutnya", padahal `swipeTab` DIJEPIT di kedua
ujung (`if (next) changeTab(next)`). Di Kas RT — tab terakhir — geser itu tak
mengubah apa pun, dan EMPAT lapisan dilaporkan "aman" padahal gesturnya tetap
tembus. Kini arahnya dipilih dari posisi tab: yang PUNYA tujuan. Temuan 6 → 10.
**Pelajaran: G1-kontrol menyelamatkan ketiganya.** Sapuan yang tak punya uji
kontrol tak bisa membedakan "app aman" dari "alatku tak pernah menyentuh
apa-apa" — dan keduanya mencetak nol.

Yang ke-23 (23 Agu, run PRODUKSI pertama `audit:gestur`): sapuan mencetak
"0 bermasalah" dari **6 dari 10 lapisan** — keempat yang terlewat semuanya
warga, jadi peran itu sebenarnya TAK PUNYA VONIS sama sekali. Sebabnya jeda
TETAP di `muat()`/`keTab()`: cukup untuk localhost, tidak untuk produksi, jadi
sapuan mulai berburu pemicu saat halaman MASIH mencetak skeleton (terbaca
telanjang di G1: sasaran hit-test-nya `DIV.skeleton`). Dua perbaikan, dan yang
kedua yang penting: `tungguIsiNyata()` menunggu skeleton habis alih-alih jeda
tetap, DAN satu peran yang menyumbang NOL lapisan kini jadi `PROBE CACAT` yang
membuat sapuan keluar MERAH. Sebelumnya daftar `dilewat` memang tercetak — itu
yang menyelamatkan pembacanya — tapi exit code-nya tetap 0. **Sapuan tak boleh
LULUS dari populasi kosong: laporan hijau tanpa populasi itu kepercayaan palsu,
bukan hasil.**

Yang ke-24 (24 Agu 2026, sesudah Login digambar ulang): gerbang "ketik: warga"
dibuang, dan bersamanya kolom `#warga-password` — **kait yang dipakai SELURUH
sapuan untuk masuk sebagai warga.** Dua puluh sapuan mati serentak, dan bukan
sebagai temuan melainkan `TimeoutError` di `loginWarga`, sesudah perubahannya
TER-DEPLOY. Kerusakannya jauh melebihi satu selektor: harness sudah punya
`loginWarga()` justru supaya ada SATU pintu, tapi **13 sapuan menyalin sendiri
lima baris alur login itu** ke dalam berkasnya masing-masing. Duplikasi yang
hari ditulisnya tak berbiaya apa pun, dan yang justru membuat satu perubahan UI
mustahil diperbaiki di satu tempat.

Obatnya dua lapis. (1) Kaitnya kini `id="masuk-warga"` yang DIDEKLARASIKAN di
`Login.tsx` sebagai kontrak, dengan komentar yang menyebut siapa yang
bergantung padanya — sebelumnya kontraknya tak tertulis di mana pun, jadi tak
ada yang bisa melanggarnya secara terlihat (kelas yang sama dgn tier z-index
tanpa nama). (2) Ketiga belas salinan inline diganti panggilan `loginWarga()`.
**Kaitnya WAJIB `id`, BUKAN teks tombol** — teks berubah di pass penyuntingan
kata, dan `getByRole('button', { name: 'Masuk Sekarang' })` akan membunuh
seluruh sapuan lagi tanpa satu pun tanda.

Satu hal yang menyelamatkan keadaan ini justru kegagalannya yang KERAS: sapuan
mati dengan jejak tumpukan, bukan melaporkan "0 bermasalah" dari populasi nol
— persis cacat ke-23. Kalau `loginWarga` dulu ditulis "toleran" (mis.
`.catch(() => {})` lalu lanjut), hari ini kita akan punya dua puluh laporan
hijau yang tak pernah menyentuh app. **Kait yang hilang harus MELEDAK, jangan
dilewati.**

Efek sampingnya satu perbaikan gratis: pemangkasan slide promo 6 → 1 melarutkan
pengecualian §2.5.8 pada indikator carousel yang selama ini disengaja
("7 × 44 = 308px, jadi bilah navigasi selebar layar"). Dgn 2 slide, 2 × 45 =
90px. Ruang sampingnya kini digerbang `count <= 3`, sehingga kompromi lamanya
kembali sendiri kalau carousel tumbuh lagi. **Pengecualian yang lahir dari
sebuah ANGKA wajib digerbang oleh angka itu, bukan dipaku jadi tetap** — kalau
tidak, ia hidup terus lama sesudah alasannya mati.


Yang ke-25 (24 Agu 2026, sesudah palet app pindah ke rona Hutan): sapuan
kontras dijalankan untuk menjaga PALET, dan yang tertangkap justru dua cacat
dari redesign LOGIN yang sudah ter-deploy sehari sebelumnya — `text-white/55`
pada label "atau" (4,13:1) dan `placeholder-white/55` (4,32:1), dua-duanya di
bawah AA 4,5. Palet barunya sendiri: 2.165 sampel `kontras-deep`, NOL gagal.

Pelajarannya bukan "alpha 55 terlalu rendah". Kedua nilai itu LOLOS di tempat
mereka lahir — kartu putih — dan gagal begitu dipindahkan ke permukaan HIJAU
tanpa diukur ulang. **Alpha bukan warna; ia baru jadi warna setelah bertemu
permukaannya. Menyalin `/55` antar permukaan sama saja menyalin angka kontras
yang tak pernah dihitung.** Setiap kali sebuah elemen pindah ke latar baru,
nilai alpha-nya WAJIB diukur ulang, bukan dibawa serta.

Catatan kedua, tentang palet: yang digeser cuma RONA (hue 264 → 158), dengan
L tiap langkah dikunci di nilai Tailwind aslinya lewat OKLCH. Itu sebabnya
1.255 pemakaian kelas abu berubah wajah tanpa satu pun rasio kontras bergerak.
**Kalau palet digeser lagi: geser hue, jangan sentuh L.** Chroma-nya di-taper
di ujung terang (`min(1, (1-L)*4.5)`) — tanpa itu `gray-50` keluar #EBFFF3,
mint terang yang terbaca hijau muda di atas kartu putih, bukan abu.

Dan penjaga yang bekerja diam-diam: `warnaCetak.test.ts` langsung merah karena
`warnaCetak.ts` masih memegang kanvas lama. Tanpa uji itu, seluruh PDF & Excel
laporan akan tetap dicetak dengan kanvas palet lama tanpa ada yang sadar —
**cermin token wajib punya uji yang menguncinya ke tokennya.**


Yang ke-26 (24 Agu 2026): komentar `sunken` di tailwind.config.js mencatat
"**9 pass naik-turun L kanvas tak pernah selesai**", dan menyimpulkan sebabnya
"dua bahasa visual campur — bukan nilai L". Kesimpulan itu benar arahnya tapi
berhenti terlalu awal. Sebab sesungguhnya: app ini memakai sistem pemisahan
**FLAT** (kanvas polos + kartu putih murni + hairline sebagai SATU-SATUNYA
pemisah) untuk mengejar hasil bermazhab **TONAL** (Revolut/Mercury/Linear —
kartu membawa jejak rona kanvas, dipisahkan LANGKAH NADA + bayangan bertinta).
Dua mazhab itu tak pernah bertemu di nilai L berapa pun. Sembilan pass itu
mencari angka untuk soal yang bukan soal angka.

Bukti bahwa arahnya memang tonal datang dari sistem yang justru dikutip komentar
itu sendiri: **Material 3 sudah pindah ke tone-based surfaces** — tujuh peran
(`surfaceContainerLowest` … `surfaceContainerHighest`), `surfaceVariant`
dihapus, dan model overlay-berbasis-elevasi (`surfaceTintColor`) dimatikan;
defaultnya kini `null` dan pemisahan datang dari langkah nada. Jadi "MATERIAL-
FLAT ala Google" menggambarkan generasi Material yang LAMA; Google sendiri
sudah meninggalkannya.

Sesudah app pindah ke mazhab tonal, **hairline WAJIB mundur** (#B7C8BD →
#D3E0D8). Kalau tidak, ada dua sistem pemisahan berebut satu tepi dan hasilnya
justru lebih berisik daripada sebelum diperbaiki. **Kalau nanti terasa kurang
"nendang": geser LANGKAH NADA (kanvas vs kartu) atau bayangannya — JANGAN
menggelapkan hairline lagi. Itu jalan yang sudah dicoba sembilan kali.**

(30 Agu 2026: nasihat ini SUDAH dijalankan sampai habis — lihat pelajaran
ke-32. Langkah nada digeser dua kali, keluhannya tetap kembali. Tuas
berikutnya BUKAN L lagi, melainkan KROMA.)

Aturan itu langsung diuji di hari yang sama: user menilai versi pertama "kurang
tegas". Yang digeser LANGKAH NADA-nya (terang 2,75% → 6,3% L; gelap 8,1% →
12,0% L) + bayangan (.10/.13 → .14/.17), dan hairline TIDAK disentuh sama
sekali. Sekali geser, selesai — bandingkan dengan sembilan pass sebelumnya
yang menggeser tuas yang salah.

Satu batas mazhab yang penting: `warnaCetak.line` SENGAJA dilepas dari token
`line`. Di layar kartu dipisahkan nada + bayangan, jadi hairline boleh whisper.
Di KERTAS tak ada langkah nada (kertasnya putih) dan tak ada bayangan — garis
itu satu-satunya pemisah yang tersisa, dan whisper hilang di fotokopi. Ujinya
diubah dari kesamaan persis menjadi ARAH (garis cetak tak boleh lebih terang
dari garis layar). **Mazhab adalah properti MEDIA, bukan properti app.**


Yang ke-30 (26 Agu 2026) — **pass "KONTRAS MAKSIMAL" (4 Agu) sudah GUGUR
berbulan-bulan tanpa satu pun sapuan protes.** Seluruh angkanya dihitung lawan
kartu gelap LAMA `#111827`. Waktu palet pindah ke rona Hutan, kartu gelap naik
ke `#22342A` — lebih terang — dan tiap rasio ikut turun ~25%:

    gray-400 remap  8,85 → 6,58   (132 pemakaian, teks sekunder gelap)
    rose-400 remap  9,38 → 6,97   (nominal uang KELUAR)
    emerald-400     9,23 → 6,86   (nominal uang MASUK, 45 pemakaian)
    nonaktif        9,27 → 6,89
di permukaan TERBURUK (sheet `#26362D`) malah 6,36 / 6,74 / 6,63.

Kenapa senyap: `audit:kontras` menjaga **AA (4,5)**, sedangkan yang hilang
adalah **AAA (7)** — ambang yang dipilih app ini sendiri. **Sapuan hijau cuma
membuktikan apa yang diukurnya, bukan apa yang kita niatkan.** Ambang yang
tak dijaga alat sama dengan ambang yang tak ada.

Pelajaran yang lebih besar: **mengubah warna PERMUKAAN membatalkan tiap
angka kontras yang pernah ditulis di atasnya.** Daftar "yang harus diukur
ulang saat kanvas/kartu bergeser" bukan cuma teks yang jelas berubah — ia
mencakup SELURUH tabel remap, termasuk yang dulu disimpulkan "sudah aman, tak
disentuh" (persis nasib emerald-400: aman di kartu lama, jatuh di kartu baru,
dan karena tak pernah punya baris remap ia juga tak pernah ditengok lagi).

Diukur di permukaan TERBURUK, bukan terbaik: sheet `#26362D`, bukan kartu.
Semua dinaikkan dengan rona & kroma DIKUNCI di OKLab — cuma L yang bergerak —
jadi keluarga warnanya tak bergeser sedikit pun.

Sekalian: LIMA neutral HIDUP masih di keluarga BIRU (rona ~210°) di atas
kanvas hijau — sisa sebelum migrasi rona: remap `.text-gray-400` terang
`#41505F`, isian `.inset-soft` `#E9EEF5`, `.skeleton` `#E9ECEF`,
`.skeleton-bar` `#D6DADE`, teks nonaktif `#B4BCC8`. Netral biru di atas
kanvas hijau terbaca KOTOR, dan itu tak akan pernah dilaporkan sapuan
kontras mana pun — rasionya sempurna, ronanya yang salah. **Cari sisa migrasi
lewat RONA, bukan lewat rasio.**

Yang ke-29 (26 Agu 2026, sesudah tangga spasi) — **`AvatarPeci` tampil dengan
EMPAT bentuk sudut berbeda di app yang sama**, karena ukuran & radius dikirim
lewat `className` oleh pemanggil: `w-8 rounded-lg`, `w-9 rounded-xl`,
`w-10 rounded-xl`, `w-11 rounded-2xl` — dan inisialnya SELALU `text-subtitle`
(18px), jadi avatar 32px sesak dan avatar 48px kosong. Tak satu pun pemanggil
salah. **Yang salah adalah keputusan itu boleh diambil di tempat pemanggil.**

Ini persis alasan yang sudah tertulis di komponen itu sendiri untuk prop
`sorot` (dua utility `ring-*` beradu, warna emas diam-diam kalah). Alasannya
sudah ada, cuma belum diterapkan ke sumbu kedua. **Kalau sebuah komponen
sudah pernah mengajari "ini WAJIB lewat prop", periksa properti lain yang
masih dititipkan lewat `className`.** Sekarang `ukuran` satu angka; bentuk &
ukuran inisial diturunkan darinya.

Tangga bentuk: `lg(8) · xl(12) · 2xl(16) · 3xl(24) · full`. Tak ada `md`(6) —
selisih 2px dari lg bukan bentuk, cuma kebisingan. Untuk tile PERSEGI radius
DITURUNKAN dari sisinya (±30%): 28–44px → xl · 48–72px → 2xl · >=76px → 3xl.
`rounded-full` selalu lolos: itu keputusan "benda ini bulat" (avatar, titik,
pil), bukan keputusan radius. Waktu aturan ini pertama dijalankan, tile 44px
di app ternyata punya TIGA radius berbeda. Dijaga `npm run audit:bentuk`.

Tangga gerak: `0.12 · 0.16 · 0.24 · 0.40 · 0.60s` — dari 24 durasi, ENAM di
antaranya di dalam rentang 60ms (0.12/0.14/0.15/0.16/0.17/0.18). Mata tak bisa
membedakannya; yang hilang bukan ketelitian tapi TEMPO. Aturan: **KELUAR
selalu satu anak tangga di bawah MASUK.** >= 0.9s (shimmer, sheen, blob,
konfeti) sengaja BEBAS — itu suasana, bukan umpan balik atas perbuatan warga,
jadi bukan tempo.

Dua tuas, dan keduanya MENIMPA bukan menambah: `--dur-*` di `:root` untuk
animasi CSS, dan `theme.transitionDuration` (DI LUAR `extend`) untuk utility
Tailwind. Selama `duration-150/200/300/700` masih ada, tak ada yang mencegah
durasi ke-25 lahir minggu depan — persis cara 24 yang pertama lahir.

Perubahan yang PALING terasa dari sesi ini bukan radius: `.rise` (animasi
baris daftar) turun 0.5s → 0.24s. Dengan stagger 10 × 0.035s, baris terakhir
dulu selesai di 0.85s. Itu bukan "halus", itu lambat.


Yang ke-28 (26 Agu 2026, sesudah tangga tipografi) — **spasi yang "hampir sama"
lebih merusak daripada spasi yang salah.** App ini punya 29 nilai jarak berbeda:
`gap-1.5` di satu baris, `gap-2` di baris sebelahnya, `p-3.5`/`p-4`/`p-5` untuk
tiga kartu yang perannya identik. Tak satu pun sapuan lama peduli — semuanya
muat, semuanya bisa disentuh, `audit:potong` hijau. Yang rusak justru yang
dilihat mata: selisih 2px TIDAK terbaca sebagai hierarki, ia terbaca sebagai
kebisingan. Itu sebagian besar dari "kok masih terasa biasa saja".

Tangga spasi: `0.5 · 1 · 2 · 3 · 4 · 5 · 6 · 8` (2/4/8/12/16/20/24/32px).
Sengaja tak ada 1.5 / 2.5 / 3.5 / 7. Yang di antara dua anak tangga DINAIKKAN,
bukan diturunkan — app premium lebih lapang, bukan lebih rapat.

TIGA GOLONGAN, dan cuma yang pertama diatur — ini bagian yang paling mudah
salah: **memaksa golongan dua & tiga ke tangga irama itu perusakan, bukan
kerapian.** (1) IRAMA: jarak antar-isi nyata, wajib di tangga. (2) FUNGSIONAL:
angka yang lahir dari ukuran komponen lain — ruang bebas bottom-nav, inset ikon
di dalam input, safe-area. (3) GAMBAR: geometri ilustrasi dekoratif
(`AbsensiArt`, `TarikanArt`, kerangka indikator) — membulatkan itu sama saja
dengan membulatkan titik path SVG. Dari 28 "nilai arbitrer" yang terlihat di
grep pertama, 15 ternyata golongan tiga. **Hitung dulu, baru vonis.**

Dijaga `npm run audit:spasi` (statis, ikut `periksa`). Pola yang sama dengan
tangga tipografi: nilai di luar tangga dibikin MUSTAHIL, bukan dijanjikan
tidak dipakai.

NILAI TERIKAT yang wajib ikut bergeser saat bantalan baris berubah —
ketiganya tak dijaga sapuan mana pun, jadi harus diingat: `[--di-l:*]` /
`[--di-r:*]` (inset garis pemisah; meleset = garis tak sejajar isi),
`[contain-intrinsic-block-size:auto_*px]` (tinggi cadangan), dan bantalan
KERANGKA yang harus mencerminkan baris aslinya (beda = `audit:lompat`).

Baris daftar padat memakai anak tangga RINGKAS (`p-3`), bukan anak tangga
kartu (`p-5`). Waktu p-3.5 dinaikkan ke p-4 di Jadwal, dua nama warga
terpotong 10–14px @390px — bukti bahwa "lebih lapang" bukan aturan buta:
kartu lega, baris padat.

Satu temuan `audit:potong` yang TIDAK berasal dari sesi ini: 6 label bulan di
Kas RT terpotong pada teks 200%. Diverifikasi dengan `git stash` + build
ulang — jumlahnya identik sebelum & sesudah. **Ambang itu di ATAS AA (bukan
syarat WCAG); dibiarkan terbuka, bukan diam-diam dianggap milik sesi ini.**


Yang ke-27 (26 Agu 2026) — **DEPLOY TIDAK OTOMATIS. `git push` TIDAK men-deploy
apa pun.** Catatan lama (termasuk di skill rt-dev) menulis "auto-deploy via
GitHub push ke main". Itu TIDAK BENAR untuk proyek ini: integrasi Git Vercel
tak tersambung, dan `vercel ls` menunjukkan SELURUH deployment dibuat manual
lewat CLI. Produksi tertinggal DUA HARI sementara tiga perubahan besar (Login,
Beranda, palet) sudah dilaporkan "live" berdasarkan push yang sukses.

Deploy yang benar: `vercel --prod --yes` dari akar repo.

Pelajaran yang lebih besar dari satu perintah: **"push berhasil" bukan bukti
"live".** Bukti live cuma satu — MENGAMBIL produksi lalu memeriksa isinya:

    curl -s "https://hadiran-rt.vercel.app/?v=$(date +%s)" | grep -oE '#E4ECE7|assets/index-[A-Za-z0-9_-]+\.js'

Bandingkan hash aset & nilai kanvasnya dengan `dist/index.html` lokal. Kelas
yang sama dengan cacat ke-23 & ke-25: melaporkan hijau dari langkah yang tak
pernah benar-benar diperiksa. Vonis WAJIB dari keadaan produksi yang TERLIHAT,
bukan dari exit code perintah sebelumnya.

Verifikasi itu juga yang menemukan tiga nilai kanvas yang tak ikut pindah saat
palet berganti — `theme-color` statis (#FAFBFC, bahkan tak pernah sama dengan
kanvas mana pun), `theme-color` mode gelap (#030712), dan PNG splash iOS yang
DI-BAKE pada tone lama. **Daftar "kanvas WAJIB sama di sini" belum lengkap
kalau berhenti di CSS**: ia mencakup dua meta theme-color dan aset yang
di-bake. Regen splash lewat `node scripts/gen-splash.mjs`, lalu verifikasi
PIKSEL-nya — jangan percaya baris "ok →" milik generatornya sendiri.



Yang ke-31 (30 Agu 2026) — **shell luring TAK PERNAH masuk cache di kunjungan
pertama, dan sapuan yang seharusnya menjaganya melaporkan hijau selama itu.**

Mekanismenya deterministik, bukan sesekali. `index.html` meminta entry chunk +
vendor-react + CSS pada **+180 ms**; service worker baru mengontrol halaman
**~+250 ms** — ia didaftarkan dari React (`PwaUpdatePrompt`), jadi SELALU
sesudah ketiganya. Ketiganya lewat tanpa dicegat dan tak pernah masuk cache,
sementara `APP_SHELL` TULISAN TANGAN tak mungkin menyebutnya: nama chunk
ber-hash isi berubah tiap build. Warga yang memasang app lalu kehilangan sinyal
sebelum kunjungan kedua mendapat **splash yang tak pernah hilang**.

**Pelajaran alat, dan ini yang paling mahal: uji luring yang MENGEMULASI luring
bukan uji luring.** `ctx.setOffline(true)` tidak memutus fetch milik service
worker. Probe pertamaku dengan patuh melaporkan "shell BOOT" — lima run
berturut-turut — dan aku sempat mengatakannya. Yang membongkarnya satu angka
yang tak bisa dijelaskan: **cache tumbuh 0 → 16 aset selama fase "luring"**.
Menambah 16 berkas segar tanpa jaringan itu mustahil, jadi yang bohong alatnya.
Begitu servernya benar-benar DIBUNUH, vonisnya berbalik: GAGAL BOOT, 3/3.
**Kalau sebuah angka dalam laporanmu sendiri mustahil, itu bukan detail — itu
vonisnya.**

Perbaikannya, dan tiap bagiannya menutup jebakan yang berbeda:
- **SHELL & VERSI disuntik saat BUILD** (`swManifest` di vite.config.ts). Kalau
  kaitnya tak ketemu, build **MELEDAK** — daftar kosong yang lolos diam-diam
  mengembalikan persis bug ini (pelajaran ke-24: kait yang hilang harus meledak).
- **Apa yang dipracache ditentukan STRUKTUR, bukan ambang karangan**: graf impor
  statis entry + dynamic import **KEDALAMAN-1** (halaman, dari `lazy()` router).
  Chunk berat di-`import()` dari DALAM halaman, satu tingkat lebih dalam — jadi
  "yang dibutuhkan untuk MEMAKAI app" dan "fitur ekspor yang boleh menunggu
  sinyal" terpisah sendirinya, tanpa mencocokkan nama berkas. 40 berkas/733 kB;
  exceljs (941 kB), PDF triwulan (399 kB), html2canvas (201 kB) tetap di luar.
  Percobaan pertama cuma memracache graf STATIS: shell memang boot, lalu app
  langsung jatuh ke ErrorBoundary — 12 chunk halaman hilang, 3/3 run.
- **Navigasi TIDAK boleh menyimpan balasan jaringan.** Dulu `put('/index.html')`
  tiap navigasi online: sesudah deploy, SW LAMA (masih menunggu konfirmasi user)
  menerima index.html BARU lalu menaruhnya di cache LAMA — shell tersimpan jadi
  merujuk chunk yang tak pernah ada di cache itu. Shell hanya boleh datang dari
  install, sehingga index.html & chunk di satu cache selalu sezaman.
- **`ignoreVary` di tiap `caches.match`.** Aset disimpan lewat `addAll` (fetch
  dari dalam SW, TANPA header `Origin`), sedangkan permintaan modul
  ber-`crossorigin` MEMBAWA `Origin`, dan `vite preview` membalas `Vary: Origin`.
  Tanpa opsi ini shell yang SUDAH ADA di cache tetap tak tersaji — 3/3 run mati
  di splash walau `entry ADA di cache: true`. **Mengujinya lewat
  `new Request(url)` MENIPU**: konstruktor tak memasang `Origin`, jadi ia cocok
  padahal permintaan sungguhan tidak. (Vercel TIDAK mengirim `Vary: Origin` —
  jebakan ini nyata di lokal, dan itu membuat sapuan lokal lebih ketat daripada
  produksi, bukan sebaliknya.)

**Sapuan yang memblokir service worker BUTA terhadap biaya install.**
`audit:muat` memakai `serviceWorkers: 'block'`, jadi angkanya tak mengatakan
apa pun tentang pracache; melaporkannya sbg "tak ada regresi" akan jadi
kepercayaan palsu. Diukur terpisah dgn SW HIDUP (400 kbps, CPU 4×):
FCP 528 → 532 ms · siap-pakai 3049 → 3047 ms · shell siap-luring 5,6 → 6,6 dtk.
Yang 5,6 dtk itu shell LAMA yang "siap" tanpa satu pun skrip di dalamnya.

**BATAS BUKTI, diakui:** bukti dijalankan lawan `vite preview`, yang membalas
`Cache-Control: no-cache` sehingga cache HTTP tak bisa menyelamatkan apa pun —
itulah yang membuat kegagalannya telanjang. Produksi membalas
`immutable, max-age=31536000` untuk aset ber-hash, jadi di sana cache HTTP bisa
IKUT menutupi kegagalan selama entrinya belum dibuang. Yang diperbaiki mengubah
"selamat karena keberuntungan cache HTTP" jadi "selamat karena dirancang".

**Sapuan yang dikunci `chmod a-w` TIDAK dibuka diam-diam.** `audit-luring.mjs`
salah satu dari 13 sapuan read-only; detektornya dipasang sbg sapuan BARU
(`audit:luring-pertama`), bukan dgn membuka kunci yang dipasang sengaja.



Yang ke-32 (30 Agu 2026) — **"kurang nendang" ternyata bukan soal KONTRAS,
tapi soal WARNA. Tuas yang benar KROMA, bukan L.**

Keluhan kalimat yang sama datang untuk KETIGA kalinya (16 Jun, 26 Agu, 30 Agu).
Dua jawaban pertama sama-sama menggeser L — `#DCE1EA→#D4DAE4`, lalu langkah
nada 2,75% → 6,3% — dan pelajaran ke-26 bahkan menuliskannya sbg nasihat untuk
kejadian berikutnya. Nasihat itu diikuti, dan keluhannya tetap kembali.

Yang belum pernah diukur sampai hari ini:

    kanvas  L*90,3%  C=0,0134
    hero             C=0,0883      ← 6,6× lebih berwarna

Layarnya satu blok hijau pekat berdiri di padang abu. Warga tidak sedang
mengeluh kartunya menempel di kanvas; ia mengeluh layarnya PUCAT. Dua hal itu
terdengar sama di telinga dan menuntut tuas yang berbeda.

Kanvas `#D8E2DC` → `#CFE6D8`: kroma 0,0134 → 0,0308 (2,3×), **L & rona
DIKUNCI** di OKLab. Karena L terkunci, tak ada satu pun rasio yang turun —
`#005044` 7,10 → 7,16 · `#75320B` 7,14 → 7,20 · `#34453B` 7,68 → 7,75. Itu
seluruh alasan memilih tuas ini: ia menambah "hidup" tanpa membelanjakan
kontras sepeser pun.

**Bandingkan varian yang TIDAK dipilih**, karena di situ pelajarannya: varian
"langkah nada 13%" menjatuhkan `#34453B` di kanvas ke **6,64** — di bawah
ambang AAA app — dan **tak satu pun sapuan akan protes**, karena
`audit:kontras` menjaga AA 4,5. Pelajaran ke-30 mau terulang, dan kali ini
ketahuan SEBELUM dikerjakan justru karena tiap varian diukur dulu, bukan
digambar lalu dipilih dengan rasa saja.

**Gamut itu batas nyata, bukan formalitas.** Nilai gelap yang pertama dirender
(`#001A09`, C diminta 0,055) terpotong sRGB dan ronanya melenceng 157,8° →
153,4°. Yang dipakai `#00190B`: C 0,0446, rona bergeser 0,6°. **Sesudah
mengonversi OKLab→sRGB, periksa apakah hasilnya terpotong** — kalau ya, rona
yang tadi "dikunci" sebenarnya sudah lepas.

**TITIK SINKRON KANVAS — sepuluh, dan berhenti di CSS berarti gagal**
(pelajaran ke-27): `body` · `.app-bg` · token `sunken` · `warnaCetak.ts`
(dikunci `warnaCetak.test.ts`) · `manifest.background_color` ·
`landing.html --canvas` & `--alt-bg` · `index.html` theme-color statis ·
splash inline · `gen-splash.mjs` BG · `useTheme` (gelap). Splash PNG di-BAKE
pada tone kanvas, jadi WAJIB diregenerasi & **pikselnya diperiksa** — bukan
dipercaya dari baris "ok →" milik generatornya.

**DITUTUP 30 Agu 2026** (`9d83587`) — dan penutupannya membatalkan targetnya
sendiri. Mengejar 12 % lewat KARTU mendaratkannya 0,8 % L dari sheet (hierarki
kanvas<kartu<sheet runtuh) DAN menjatuhkan `gray-400` ke 5,22; lewat KANVAS ia
menabrak gamut sRGB (rona melenceng 157,2° → 152,9°), yaitu membayar dgn kroma
yang baru saja dipilih. Yang dikerjakan dua tuas yang tak menyentuh kartu:
kanvas `#00190B` → `#001709` (langkah 7,6 % → 8,3 %, setara sisi terang) + ring
kartu gelap `.10` → `.16` (tepi lawan kanvas 1,63 → 2,01:1). Nol rasio bergerak
turun. **Pelajarannya: angka target yang diwarisi dari catatan WAJIB diuji
kelayakannya dulu — 12 % itu tak pernah bisa dicapai, dan mengejarnya buta akan
merusak dua hal sekaligus.** Catatan aslinya di bawah ini dipertahankan.

**(ASAL TEMUAN) langkah nada GELAP tak sesuai catatan.** Pelajaran ke-26
mencatat langkah nada gelap dinaikkan ke **12,0 % L**. Angka itu benar untuk
`#22342A`, tapi kartu tidak memakai nilai itu: `gray-900` = `#192920`, dan
langkah aslinya **7,6 % L** — lebih KECIL daripada sisi terang (8,4 %).
Perbaikannya (varian "C") sengaja TIDAK dikerjakan bersama pass ini karena ia
punya biaya sendiri: teks sekunder `gray-400` di kartu gelap sudah **6,06:1**
hari ini (di bawah AAA), dan menaikkan permukaan kartu menurunkannya lagi ke
5,07–5,22. **Kalau dikerjakan, tintanya WAJIB ikut naik** — pelajaran ke-30
lagi: mengubah permukaan membatalkan tiap angka di atasnya.



Yang ke-33 (30 Agu 2026) — **ambang AAA app tak pernah DIUKUR, dan itu sebab
tiga pelajaran sebelumnya bisa terjadi diam-diam.**

Seluruh sapuan kontras memvonis `need = large ? 3 : 4.5` — murni WCAG AA —
sementara app menyatakan ambangnya sendiri **AAA 7:1** sejak 4 Agu. Ambang yang
tak dijaga alat sama dengan ambang yang tak ada. Biayanya sudah dibayar: ke-25
(alpha `/55` pindah permukaan → 4,13), ke-30 (SELURUH tabel remap gugur waktu
kartu gelap naik, `gray-400` 8,85 → 6,58), dan dua kali nyaris hari ini.

Datanya SUDAH ada sejak dulu — tiap sampel membawa rasionya. Yang tak ada cuma
yang mencetaknya. Jadi obatnya penambahan PELAPORAN, bukan mesin sampling baru.
Dilaporkan TERPISAH & tak menggagalkan rantai (disiplin sama dgn bagian 200% di
`audit:potong`), dan judulnya sengaja bukan `=== … ===` supaya ringkasan
`sapu-semua` tetap vonis AA.

**GARIS DASAR PERTAMA** (lokal): warga **12/1214**, bendahara **7/2199**.
**TUJUH dari 12 temuan warga ada di layar LOGIN** — terburuk **4,77**
("Bendahara lupa password?"), lalu 5,99 · 6,29 ("atau") · 6,42 · 6,68 · 6,99.
Login jadi permukaan TERLEMAH app menurut ukurannya sendiri, dan itu tak pernah
terlihat sebelum ada yang mencetaknya. Sisanya berdempet di 6,55–6,95: pil rose
"belum bayar" di gelap, chip WARGA & BENDAHARA.

**Pelajaran yang lebih besar dari satu seksi laporan: kalau app menetapkan
ambang yang LEBIH KETAT dari standar, ambang itu wajib punya alat yang
mencetaknya — kalau tidak, ia cuma niat, dan niat tak menahan regresi.**


Yang ke-34 (2 Sep 2026) — **`audit:gerak` bagian D melaporkan temuan PALSU,
dan ia melakukannya SEPARUH waktu.** Empat kali dijalankan di build & mesin
yang sama: merah, hijau, merah, hijau. Temuannya selalu di tab BERDATA
(`warga/Hadiran`), selalu berbunyi `NYANGKUT sesudah tenang: … opacity 0.86
geser 1.4px`.

Sebabnya bukan appnya. Sifat D memvonis pada satu titik waktu TETAP —
`ms + 500` sesudah ketukan tab. Fetch Kas Hadiran kadang mendarat SESUDAH
jendela itu, daftar dirender ulang, dan `.rise` MULAI tepat saat probe
memotret. Layarnya tak pernah tenang; **probenya yang mengaku begitu.**

Kelas yang sudah dibayar cacat ke-23 (`audit:gestur`: jeda TETAP cukup untuk
localhost, tidak untuk isi nyata) — tapi di sana gejalanya sapuan yang
MELEWATKAN populasi, di sini sapuan yang MENGARANG temuan. **Sapuan yang
merah separuh waktu lebih berbahaya daripada sapuan yang tak ada: ia melatih
pembacanya mengabaikan merah.** Itu satu-satunya jenis kerusakan yang bisa
mematikan SELURUH rantai kepercayaan repo ini sekaligus.

Obatnya `tungguDiam()`: **TENANG itu KEADAAN, bukan JEDA** — dua bacaan
berturut-turut identik & nol skeleton. Giginya SENGAJA tak dilemahkan; elemen
yang benar-benar nyangkut (fill-mode `both` menahan `transform` selamanya)
nilainya tak pernah berubah, jadi ia justru memenuhi syarat "diam" lebih cepat
dan tetap dilaporkan. Yang hilang cuma elemen yang sedang BERGERAK — dan itu
memang bukan temuan sifat D.

Dan begitu vonisnya berubah jadi "tunggu sampai diam", hijau tanpa mutasi
berhenti membuktikan apa pun: **probe yang menunggu selamanya juga hijau.**
Sifat D tak pernah punya mutasi sama sekali (`MUTASI=1` menyasar sifat R),
jadi lahir `MUTASI=2` yang membekukan `.rise` di tengah jalan. Sesudahnya:
4 dari 4 jalan hijau tanpa mutasi, merah di 3 tab dgn `MUTASI=2`.
**Setiap kali sebuah probe diubah dari "potret" jadi "tunggu", ia WAJIB dapat
mutasi baru di saat yang sama** — kalau tidak, yang ditukar bukan cacat
melainkan siapa yang menyembunyikannya.

**Stack back-dismiss memuat entri TAB, dan itu BUKAN lapisan.** App
mendaftarkan `activeTab !== 'beranda'` ke `useBackDismiss` supaya Back kembali
ke Beranda — entri sah, tapi tak ada yang menutupi layar. Penjaga gestur yang
membaca `stack.length > 0` mentah-mentah karena itu mematikan swipe ganti-tab
& pull-to-refresh di SEMUA tab selain Beranda: gestur berhenti bekerja justru
di halaman tempat warga paling sering memakainya. Terjadi 23 Agu dan sempat
TER-DEPLOY (`b019ccd`) — uji kontrol G1 lolos karena ia cuma berjalan di
Beranda, satu-satunya tab yang stack-nya kosong. Kini pendaftar wajib
menyatakan dirinya lapisan atau bukan (`useBackDismiss(active, onClose,
{ lapisan: false })`), `adaLapisanTerbuka()` menghitung yang `lapisan` saja,
dan `audit:gestur` menjalankan G1 DUA KALI — di Beranda dan di tab non-Beranda.
**Pelajaran: uji kontrol hanya sekuat KEADAAN tempat ia dijalankan.** Kontrol
yang selalu jalan di keadaan paling bersih akan meluluskan regresi yang cuma
muncul di keadaan lain.

**`backdrop-filter` = stacking context.** Input berkaca (`backdrop-blur-sm`) tercat DI ATAS
ikon `absolute` yang z-index-nya auto, walau ikonnya lebih dulu di DOM. Tiga ikon dalam-kolom
Login tenggelam di balik kaca putih/70 (gembok warga 1,06:1 terang / 1,54:1 gelap). Mengganti
WARNA ikon tak menolong sama sekali (1,06 → 1,14) — yang salah urutan cat. Obatnya `z-10` +
`pointer-events-none` (tanpa yang kedua, ketukan di area ikon berhenti di ikon dan tak lagi
memfokuskan kolom). Diagnosa: `elementFromPoint` di TENGAH ikon menjawab `INPUT`, bukan `svg`.

**Memeriksa hasil deploy: baca ISI bundel, jangan bandingkan HASH.** Vercel membangun ulang
dari repo dan menghasilkan hash chunk yang BERBEDA dari `npm run build` lokal, jadi
"hash produksi ≠ hash lokal" bukan bukti apa pun — 4 Agu sempat dibaca sebagai "deploy belum
jalan" padahal sudah. Dua jebakan sekaligus di sini: `vercel.json` merewrite `/(.*)` ke
`/index.html`, sehingga **path aset yang tak ada tetap balas HTTP 200** berisi HTML. Cara yang
benar: ambil `index.html` produksi → cari nama chunk yang DIRUJUK → unduh chunk itu → grep
simbol yang memang berubah (mis. `pulihkan_backup` ada, `insertChunked` hilang).

**Sapuan wajib diarahkan ke produksi sekali sebelum dianggap benar**
(`CAP_URL=https://hadiran-rt.vercel.app npm run audit:xxx`): localhost instan
menyembunyikan seluruh kelas bug balapan-hidrasi.

Sampai 19 Agu 2026 baris di atas **tidak bekerja seperti yang tertulis**: tiap
skrip audit di `package.json` menyetel `CAP_URL=http://localhost:5199` sendiri,
dan itu MENIMPA env dari pemanggil — jadi `CAP_URL=https://… npm run audit:masuk`
dengan patuh menguji localhost lalu melaporkan "0 bermasalah". Kepercayaan palsu,
persis kelas yang paling dihindari repo ini: sapuan hijau yang tak menguji apa
yang dikira penguji. Kini semua skrip memakai `${CAP_URL:-http://localhost:5199}`
sehingga env pemanggil menang, dan default lokalnya tetap sama.

**Jebakan jaringan menggantung:** `fetch` yang MENGGANTUNG tidak pernah reject sendiri, dan
`try/finally` tak menolong — `finally` tak pernah tercapai. Dua penjaga, jangan dilepas:
`buatFetchBerbatas()` di `src/lib/fetchBerbatas.ts` dipasang di klien Supabase (menjaga SEMUA
baca & tulis, termasuk kode yang belum ditulis), dan `batasWaktu()` di `src/lib/authSesi.ts`
untuk jalur auth yang berjalan SEBELUM klien itu ada. "Keluar" wajib membuang sesi lokal
tanpa syarat.

**Jebakan Supabase yang berulang:** `.select()` TIDAK melempar saat gagal — ia mengembalikan
`{data: null, error}`. Tiap `?? []` tanpa cek `res.error` mengubah kegagalan jadi "tidak ada
data". Cek di halaman TIDAK cukup; helper di `src/lib/` juga wajib melempar.

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).
