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
npm run periksa      # typecheck + lint + 185 test
```

Sapuan browser (butuh build produksi hidup: `npm run build && npx vite preview --port 5199`):

```
npm run audit        # keadaan + sheet + publik + masuk + tulis + potong + respon + kembali
```

| Perintah | Yang diperiksa | Kenapa ada |
|---|---|---|
| `audit:keadaan` | Layar saat data KOSONG & saat muat GAGAL (warga + bendahara + overlay) | Semua audit lain jalan lawan DB penuh, jadi EmptyState/ErrorState tak pernah dirender. **App kas dilarang menyatakan nominal saat gagal muat.** |
| `audit:sheet` | Geometri sheet/modal/popover di 360px | Form di dalam bottom-sheet tak pernah diukur; kontrol bisa meluber keluar panel |
| `audit:publik` | landing / warta / nobar / panduan-install, light+dark | HTML statis di `public/` tak tersentuh audit app, padahal wajah pertama |
| `audit:kontras` | Kontras piksel-nyata TEKS, **tab WARGA saja** (sampel screenshot) — termasuk `::placeholder` | Token tak bisa dipercaya; warna final = hasil blend. **Bagian placeholder (6 Agu)** ada karena pemungut teks berjalan lewat TEXT NODE, dan placeholder tak punya satu pun — 16 placeholder app tak pernah terukur sekali pun meski ia teks biasa di mata §1.4.3, dan justru itu yang dibaca warga lansia saat mencari namanya. Warna diambil dari computed `::placeholder`, BUKAN warna teks nilainya |
| `audit:kontras-deep` | Kontras TEKS di permukaan yang TAK disentuh `audit:kontras`: sheet/modal warga, SELURUH permukaan bendahara (5 tab + form FAB + overlay admin), landing /info | Populasinya justru yang TERBESAR — 2.174 dari 3.410 sampel. Sampai 6 Agu skripnya ada tapi tak terdaftar di `package.json`, jadi cuma jalan kalau seseorang ingat mengetik path-nya; sekarang bisa dipanggil dgn nama. Bendahara di-MOCK 3 lapis aman (sesi palsu di localStorage + rest/v1 dipaksa anon + method tulis DIBLOKIR Playwright) — jangan pernah pakai kredensial asli atau klik Simpan/Hapus di data produksi |
| `audit:kontras-nonteks` | Kontras NON-teks: ikon tanpa label, batas kolom isian, ring `:focus-visible`, **tanda grafik** (§1.4.11 & §2.4.13, ambang 3:1) | `audit:kontras` cuma menyampel TEKS. Ring fokus tak pernah diukur sekali pun — ternyata ring hijau di atas hero HIJAU = 1,26:1 (praktis hilang bagi pengguna papan ketik) dan ring `.field` beralpha 30% gagal di SEMUA input. Fokus di-Tab beneran, screenshot per elemen (rect & piksel wajib sezaman). **Bagian grafik (4 Agu)** ada karena pemeriksaan ikon SENGAJA melewati svg ber-leluhur `aria-hidden` — dan semua grafik app memang aria-hidden, jadi garis "Tren Saldo" bertahan 2,33:1 di mode gelap tanpa satu pun sapuan menyentuhnya. Populasinya OPT-IN lewat `data-grafik` di call-site, bukan tebakan selektor: bar = `div`, garis = `path`, tak ada ciri struktural yang bisa dibedakan dari elemen tata letak. **Tanda grafik baru WAJIB memasang `data-grafik`** — kalau tidak, ia tak terukur |
| `audit:potong` | TEKS TERPOTONG (`truncate`/`line-clamp` yang isinya tak muat) di TIGA lebar: **390px** acuan HP, **320px** WAJIB §1.4.10, dan **teks dasar 200%** (ambang APP, di atas AA — laporkan terpisah, JANGAN sebut "gagal WCAG", disiplin sama dgn `audit:reflow`). Warga + SELURUH permukaan bendahara, 16 layar | Tak satu pun sapuan lain melihatnya: `audit:lebar` mencari nominal yang MELUBER keluar kotak, `audit:reflow` mencari halaman yang geser samping — teks terpotong tak melakukan keduanya, ia PATUH pada kotaknya dan cuma kehilangan isinya, jadi semua sapuan geometri melaporkannya sehat. **Ambang probe 0, bukan 1px** — percobaan pertama menyaring `> clientWidth+1` demi menghindari subpiksel dan justru menelan temuan yang meleset TEPAT 1,0px; lebar teks asli diukur lewat `Range`, bukan `scrollWidth` yang dibulatkan ke integer. **Lingkup = lapisan TERATAS saja**: halaman di belakang overlay tak di-unmount, jadi memungut se-dokumen membuat baris Kas RT yang sama terhitung ulang di tiap overlay (4 overlay melaporkan item identik — populasi salah, bukan temuan). Bendahara lewat `newCtx({bendahara})` harness bersama; mock TIDAK disalin supaya tak melenceng. Divalidasi MUTASI (`MUTASI=1` menyempitkan kolom 40px → 0 harus melonjak ratusan). **Bagian 200% memakai CDP `Page.setFontSizes`, BUKAN suntikan `html{font-size:32px}`** — media query `em` mengacu ke font BAWAAN BROWSER, bukan ke `font-size` root yang ditulis CSS, jadi suntikan CSS melaporkan komponen ber-ambang em (`.potong-lentur`) sebagai "masih gagal" padahal di browser warga ia bekerja. `audit:reflow` masih pakai suntikan CSS — sah untuk yang ia ukur (tekanan padding/gap rem), tapi ia TIDAK melihat adaptasi berbasis em |
| `audit:papan-ketik` | **A.** Apakah tiap kontrol yang TERLIHAT & aktif tergapai Tab (§2.1.1, warga + bendahara, 9 layar). **B.** Disiplin fokus LAPISAN (§2.4.3): fokus masuk saat dibuka, berperilaku benar saat Tab, kembali ke pemicu saat ditutup | Tak satu pun sapuan lain menekan Tab. `audit:sentuh` mengukur luas area JEMPOL; `audit:kontras-nonteks` memang mem-Tab, tapi hanya untuk mengambil WARNA ring fokus — ia tak pernah bertanya apakah ada kontrol yang gilirannya tak pernah datang. **Ambang 100%, tak dinegosiasikan** (§2.1.1). Kelas ini bukan hipotesis: dua cacat ketemu di hari yang sama (19 Agu) — menu Header yang fokusnya tak pernah masuk (`useExitAnim` menunda mount satu commit → Escape/panah mati), dan **FAB yang TIDAK PERNAH tergapai Tab sama sekali**: Tab MENGGULIR, gulir menyalakan `useScrollHide`, dan itu dulu memasang `tabIndex={-1}` — FAB duduk di ekor DOM jadi gilirannya selalu datang sesudah ia pergi. Aksi-BUAT utama tiga halaman, dan bendahara-lah yang paling mungkin memakai papan ketik karena dialah yang mengetik transaksi. Obatnya bukan melepas "menyingkir saat gulir" (itu ada supaya FAB tak menutupi nominal) tapi **fokus memunculkannya kembali**, pola skip-link; `aria-hidden` wrapper ikut dibuang karena subtree `aria-hidden` DILARANG memuat elemen yang bisa difokus. Populasi menyaring `aria-hidden`/`disabled`/`.sr-only`/`tabindex=-1` di LUAR `[role=menu]` (roving tabindex itu sah). **Bagian B memakai aturan BERBEDA PER PERAN, dan itu bukan kelonggaran**: `role=dialog` WAJIB memerangkap Tab; `role=menu` WAJIB DITUTUP oleh Tab lalu fokus melanjutkan (pola WAI-ARIA menu button). Memberlakukan aturan dialog di menu = alat berteriak palsu — percobaan pertama melakukan persis itu dan melaporkan dua menu yang justru sudah benar. Cacat menu yang SEBENARNYA: fokus keluar sementara menunya MASIH TERBUKA → pengguna menyusuri halaman di BELAKANG scrim (tak bisa diklik, scrim menangkap pointer) dan Escape ikut mati karena handler menempel di wadah yang sudah ditinggalkan fokus. Temuan B (19 Agu): **ExportMenu mengulang PERSIS jebakan menu Header** — `useExitAnim` menunda mount satu commit → `menuRef.current` null → `?.focus()` menelannya → panah/Home/End mati total; dari tiga pemakai `useExitAnim` hanya FilterChips yang aman (tak menyentuh DOM anaknya). Divalidasi MUTASI dua-duanya: A menyala 8 dari 9 layar (React memiliki atribut `tabindex`, render-ulang bisa memulihkannya — jangan dibaca "1 layar kebal"), B menyala 6 dari 6 (fokus bukan atribut yang dirender React, jadi tak bisa dipulihkan) |
| `audit:lompat` | TATA LETAK MELOMPAT (layout shift) saat skeleton berganti isi nyata — warga + bendahara, 9 layar, CPU 4x & 400 kbps | Semua sapuan geometri lain memotret SATU keadaan DIAM: mereka mengukur layar yang sudah tenang, jadi perpindahan skeleton → data terjadi SEBELUM pengukuran dan tak terlihat oleh satu pun; `audit:muat` mengukur KAPAN app tercat, bukan apakah isinya melompat sesudah itu. **Dua angka dilaporkan terpisah**: `tanpa-input` (definisi CLS Google) dan `total`. Yang kedua bukan pelengkap — pindah tab itu ketukan, jadi SELURUH perpindahan skeleton→isi sesudahnya ditandai `hadRecentInput` dan hilang dari CLS resmi, padahal justru itu yang kena jempol warga. Temuan pertama (19 Agu): dua blok Kas RT (`TargetKasRT` yang `return null` selama fetch-nya SENDIRI, + SmartInsight yang syaratnya dihitung dari list kosong) muncul dari NOL — bukan skeleton yang tingginya meleset — mendorong grafik & rekap turun ~175px; dan JadwalWarga satu-satunya halaman ber-early-return `if (loading)` sehingga PageHeader-nya lepas dari alur (0,186 di 360px). Bahwa penyebabnya tukar-skeleton dan BUKAN CrossFade dibuktikan lewat kunjungan KEDUA ke tab yang sama: data ter-cache, skeleton tak muncul, skor 0,000. Divalidasi MUTASI (`MUTASI=1` menyuntik pita yang tumbuh 120px → sapuan WAJIB merah) |
| `audit:lebar` | Nominal "Rp" terpotong/meluber di 360px | `<span>` inline punya clientWidth 0 → scrollWidth buta |
| `audit:reflow` | Halaman geser samping di 320px (§1.4.10, WAJIB) + saat font dasar browser 200% (di atas AA) | Yang WAJIB cuma 320px dan itu bersih. Bagian 200% sengaja dipisah supaya tak dilaporkan sebagai "gagal WCAG" — ia ambang app sendiri untuk warga lansia. Probe WAJIB menyaring elemen ber-leluhur `position:fixed`: isi bottom-nav tak menciptakan scroll dokumen, dan melaporkannya = menyuruh orang membetulkan yang bukan penyebab |
| `audit:sentuh` | Luas area sentuh tiap kontrol di 360px (§2.5.8 min 24px, ambang app 44px) | Warga pakai jempol, sebagian lansia. **Diukur lewat hit-test `elementFromPoint`, BUKAN geometri CSS**: percobaan pertama membaca `cs.insetTop` (properti yang tak ada — yang benar `top/right/bottom/left`) sehingga semua pelebaran `before:-inset-*` terbaca nol dan 19 kontrol dilaporkan gagal padahal semuanya sudah 44px. Tiap kontrol WAJIB di-`scrollIntoView` dulu sebelum diukur — kalau tidak, kontrol yang kebetulan separuh di bawah Header sticky terukur separuh tinggi |
| `audit:muat` | FCP & siap-pakai (CPU 4× lambat, 400 kbps) | Warga pakai Android kelas bawah, sinyal seadanya |
| `audit:masuk` | Gerbang masuk & keluar saat jaringan busuk (chunk gagal, request menggantung, logout luring) + **RELOAD di tengah sesi** & gate sesi baru | Semua audit lain menguji layar SESUDAH masuk. **Tombol "Masuk" yang terkunci tak menyisakan jalan lain sama sekali**, dan kegagalan jaringan yang dilaporkan sebagai "password salah" bikin bendahara mengganti sandi yang sudah benar. **Bagian reload (19 Agu)** ada karena SEMUA sapuan repo memuat halaman SEKALI lalu berinteraksi — tak satu pun pernah MEMUAT ULANG, dan di situlah cacat nyata bersembunyi: `wargaMode` cuma state React, jadi reload melempar warga ke Login. Bukan skenario langka — `PwaUpdatePrompt` MEMANGGIL `location.reload()` saat warga menekan "Muat ulang" pada toast versi baru, jadi tiap deploy = satu lemparan (dan 4 deploy dalam sehari = keluhan "mental terus balik ke login"). Diuji EMPAT sifat sekaligus, karena memperbaiki "bertahan" gampang diam-diam MEMBUKA PINTU: bertahan saat reload · tab aktif ikut pulih · Back sesudah pemulihan kembali ke Beranda (bukan keluar app) · **sesi/tab BARU tetap minta sandi**. Divalidasi MUTASI (kembalikan `useState(false)` → sapuan wajib merah dgn pesan yang tepat) |
| `audit:luring` | App dibuka & dipakai saat TAK ADA SINYAL sama sekali (service worker AKTIF) | `audit:keadaan` memaksa SERVER membalas gagal, `audit:masuk` menguji auth saat jaringan busuk — keduanya tetap PUNYA jaringan. Tak satu pun pernah MEMATIKANNYA, dan semua sapuan lain memakai `serviceWorkers: 'block'` demi hasil stabil; justru karena itu jalur luring tak pernah terlihat oleh satu pun dari mereka. Padahal itu KODE BERBEDA: shell dari cache, chunk dari stale-while-revalidate, sementara Supabase sengaja DILEWATI `sw.js` sehingga tiap request data gagal keras. Warga app ini pakai Android kelas bawah bersinyal seadanya — "dibuka tanpa sinyal" bukan kasus tepi. Empat sifat: shell tetap terbuka · TIDAK terlempar ke Login (gate warga bertahan tanpa jaringan) · app MENGAKU tanpa sinyal (angka basi dilarang tampil seolah angka sekarang) · pindah tab tetap bekerja dari cache. **Jebakan localhost:** `@vercel/analytics` & `@vercel/speed-insights` menyuntik `/_vercel/*/script.js`; path itu HANYA ada di Vercel, di `vite preview` ia 404 lalu dibalas index.html oleh fallback SPA → console memuntahkan "Unexpected token '<'". Artefak lokal, BUKAN cacat — di produksi keduanya balas `application/javascript` (diverifikasi 22 Agu 2026), jadi sapuan MENYARING `_vercel/`. Odometer juga dikecualikan dari deteksi "Rp0": ia merender pita digit `0 1 2 3 4 5 6 7 8 9`. Divalidasi MUTASI (cabut service worker + hapus cache → layar kosong saat luring, sapuan WAJIB merah) |
| `audit:kembali` | Data di layar sesudah app DITINGGAL lalu dibuka lagi — sesi yang TETAP HIDUP, bukan reload | 17 sapuan lain menguji satu kunjungan yang berjalan terus; `audit:masuk` satu-satunya yang pernah memuat ULANG (dan itu reload penuh — state React lahir baru). Tak satu pun menguji cara app ini benar-benar dipakai: buka Hadiran RT, pindah ke WhatsApp membalas grup, kembali. Halaman tak dimuat ulang, `useEffect` mount tak jalan lagi, dan halaman utama TIDAK memasang realtime (`useRealtime` cuma di Riwayat Aktivitas) — terukur 20 Agu: **ditinggal 65 dtk → nol GET**, di kedua peran. Saldo lama yang tampak persis seperti saldo sekarang bukan soal rasa; itu pernyataan keliru tentang UANG. Diuji TIGA sifat sekaligus karena memperbaiki yang pertama gampang merusak sisanya: (1) pergi lama → ambil ulang; (2) pergi SEBENTAR → JANGAN (warga menyentuh notifikasi lalu balik 3 dtk = badai request di paket Supabase GRATIS + baterai HP kelas bawah); (3) penyegarannya DIAM-DIAM — skeleton tak boleh muncul lagi, layar yang berkedip balik ke abu terasa lebih murah daripada data basi yang diam. Obatnya `useKembaliDariLatar()` di `src/lib/hooks.ts`, dipasang di 6 halaman berdata. **BATAS SAPUAN, diakui:** Chromium harness tak bisa benar-benar disembunyikan (`Emulation.setPageVisibilityOverride` sudah tak ada di protokol, `Page.setWebLifecycleState('hidden')` ditolak, tab kedua yang dibawa ke depan TIDAK menyembunyikan tab pertama — diuji headless MAUPUN headed), jadi transisinya DISUNTIK: getter `visibilityState`/`hidden` ditimpa lalu `visibilitychange` dikirim. Yang diuji = handler app terhadap kontrak peramban, bukan peramban. Jedanya TIDAK dipalsukan — sapuan menunggu betulan. Divalidasi MUTASI dua arah (ambang ∞ → sifat 1 merah; ambang 0 → sifat 2 merah) |
| `audit:respon` | **A.** Ketukan → cat, **B.** ketikan → cat (Event Timing/INP, CPU 4×), **C.** bingkai panjang saat gulir (LoAF), **D.** AKSI BERAT: ekspor/cetak/bagikan | Semua sapuan lain memotret layar yang SUDAH TENANG; tak satu pun punya angka soal jarak antara jempol menyentuh dan layar berubah. `audit:muat` mengukur KAPAN app tercat, `audit:lompat` apakah isinya melompat sesudah itu, `audit:papan-ketik` apakah kontrolnya TERGAPAI — bukan seberapa cepat ia menjawab. Hasil A–C: 34 interaksi, terburuk **56 ms** — app memang sudah cepat, dan justru itu yang membuat bagian D menonjol. **Bagian D (20 Agu)** menguji satu-satunya jeda berdetik-detik yang tersisa: tiap "Cetak PDF"/"Ekspor Excel"/"Bagikan" mengunduh chunk-nya SAAT diketuk (Excel 941 kB, PDF triwulan 399 kB, html2canvas 201 kB) lalu merender di main thread. Terukur di Kas RT, 400 kbps + CPU 4×: **6.247 ms tanpa satu pun perubahan di layar** — nol pemintal, nol tombol nonaktif, nol kata tunggu. Tiga cacat sekaligus, semuanya di luar jangkauan sapuan lain: (1) app tak mengaku menerima ketukan; (2) ketukan ganda menghasilkan **DUA berkas identik** — `audit:tulis` menjaga jalur TULIS dari ini, jalur ekspor tak pernah kebagian; (3) chunk yang gagal diunduh berakhir **diam selamanya** — dan itu bukan skenario karangan, `vercel.json` merewrite semua path ke index.html sehingga chunk basi pasca-deploy dibalas HTTP 200 berisi HTML dan `import()` menolak dgn galat MIME (jalur Excel bahkan tak punya `catch` sama sekali). Obatnya `useAksiBerat()` di `src/lib/hooks.ts` — latch sinkron + keadaan sibuk anti-kedip + penerjemah galat, dipasang di 11 call-site. **Jalur ekspor/berbagi BARU wajib memakainya.** Divalidasi MUTASI (tunda-sibuk ∞ + latch dilepas + catch dibisukan → sapuan WAJIB merah di D1, D2, D3) |
| `audit:mundur` | **Tombol Back HP** pada tiap lapisan yang bisa ditutup — **A1** terdaftar di back-stack · **A2** Back menutup lapisan (bukan app, bukan tab) · **B** saat bertumpuk yang tertutup cuma yang TERATAS · **C** tutup lewat UI tak meninggalkan entri nyangkut · **D** sesudah RELOAD-dengan-lapisan-terbuka, Back pertama masih menghasilkan perubahan yang TERLIHAT | `audit:papan-ketik` bagian B menguji disiplin fokus lapisan dan menekan ESCAPE, lalu melaporkan enam lapisan sehat. Laporannya benar — dan justru itu titik butanya: **warga app ini membuka Hadiran RT dari Android dan tak satu pun punya tombol Escape.** Jalan keluar yang benar-benar mereka pakai tak pernah ditekan oleh satu pun dari 19 sapuan lain; `audit:masuk` paling dekat (Back SEKALI sesudah reload, di layar tanpa lapisan terbuka). Kanon repo sebenarnya sudah tertulis di harness (`closeLayer`: "Escape → jaring Back HP"), yang tak pernah ada cuma alat yang memeriksa apakah itu masih benar. **Ternyata tidak:** `useDialog` (Escape) dan `useBackDismiss` (back-stack) dipasang dari dua daftar call-site BERBEDA, dan selisihnya — 6 lapisan — tak terlihat dari satu berkas pun. Taruhan tertingginya **ConfirmDestruktif**, gerbang pengaman satu-satunya untuk aksi merusak uang: ia dibuka DI ATAS sheet aksi yang tetap hidup (`setHapusRow(row)` tanpa mengosongkan `selectedRow`), jadi Back memanggil close milik SHEET — terukur `[Aksi transaksi + Hapus transaksi ini?]` → Back → `[Hapus transaksi ini?]`: sheet lenyap, dialog merah bertahan sendirian, dan gerakan yang di seluruh Android berarti "batal" tak membatalkan apa pun; tekan sekali lagi (stack sudah kosong) dan **app KELUAR sementara konfirmasi hapus masih terpampang**. Lima lapisan lain melempar keluar app dalam SATU ketukan (menu Header, menu Ekspor, popover InfoTip, popover urutan FilterChips, panduan pasang iOS). Garis dasar & deteksi "terlempar keluar" pakai **SENTINEL** — singgah di `/landing.html` dulu baru ke app — supaya Back yang lolos mendarat di halaman NYATA yang bisa dikenali, bukan about:blank yang ambigu (dan bukan no-op diam kalau app kebetulan entri pertama tab). Divalidasi MUTASI (`MUTASI=1` mematikan `pushState`+`history.back` di halaman → 14 lapisan, 27 temuan; tanpa mutasi & sebelum perbaikan: 15 temuan dgn seluruh sheet ber-`useBackDismiss` HIJAU sbg kontrol). **Lapisan baru WAJIB memasang `useBackDismiss` berdampingan dgn `useDialog` — Escape saja meninggalkan seluruh warga tanpa jalan keluar.** **Bagian D (22 Agu)** ditambahkan di TEPI bagian A–C: ketiganya berjalan di SATU page life, warisan batas 18 sapuan lain (cuma `audit:masuk` yang pernah memuat ULANG, dan itu di layar tanpa lapisan terbuka). Padahal entri history SELAMAT dari reload sementara `stack` lapisan lahir KOSONG — app lalu duduk di atas entri yang tak dimiliki siapa pun, dan ketukan Back PERTAMA warga terbakar percuma: traversal mendarat, tak ada yang ditutup, tab tetap, app tak keluar, **NOL yang bisa dilihat**; baru ketukan kedua bekerja. Bukan skenario karangan — `PwaUpdatePrompt` memanggil `location.reload()` saat warga menekan "Muat ulang" pada toast versi baru, jadi tiap deploy satu putaran. Terukur di kedua peran. **Jebakannya: menonton `history.state` MENIPU** — state memang berubah tiap entri yatim dikonsumsi, jadi sapuan yang menilai dari state akan melaporkan "Back bekerja" untuk ketukan yang di mata warga tak melakukan apa pun; vonisnya WAJIB dari perubahan yang TERLIHAT (tab / jumlah lapisan / keluar app). Obatnya `sapuEntriYatim()` di `useBackDismiss.ts`, dijalankan saat MODUL diimpor — sengaja BUKAN dari `registerBack`: `init()` selama ini lazy dan di Beranda tak satu lapisan pun mendaftar, jadi penyapu yang menumpang di sana takkan pernah jalan justru di layar tempat Back paling sering ditekan. Menyapu di BOOT, bukan saat Back ditekan: memundurkan satu entri lagi dari dalam handler popstate tetap menyisakan ketukan yang tak terlihat efeknya — yang harus hilang entrinya, bukan gejalanya. `jaringSapu` 1 dtk WAJIB ada: `history.back()` di entri PERTAMA tab tak menghasilkan traversal & popstate tak pernah datang, dan tanpa jaring itu SELURUH pendaftaran lapisan sesudahnya terantri selamanya — obat yang mematikan back-stack yang mau diperbaiki. Validasi D = sebelum/sesudah (merah di 2 peran → 0), BUKAN `MUTASI=1` (mutasi itu menyasar mekanisme push/back bagian A–C). **BATAS SAPUAN, diakui:** Back BERUNTUN cepat & Back di tengah animasi keluar belum diuji — probe tangan tak konklusif, dan menambah uji setengah matang untuk kelas balapan justru melahirkan alarm palsu. |
| `audit:tulis` | Tombol simpan saat request tulis MENGGANTUNG (Kas RT + Kelola Anggota + **Absensi "Simpan & Hitung Iuran"**) + **KETUKAN GANDA** (satu niat tercatat berapa kali) | `audit:keadaan` menguji BACA gagal, `audit:masuk` menguji auth — jalur TULIS, satu-satunya tempat uang benar-benar dicatat, tak tersentuh keduanya. **`try/finally` ada di semua jalur tulis tapi tak menolong: `finally` tak pernah tercapai kalau janjinya tak pernah selesai**. Jalur Absensi (16 Agu) ditambahkan karena dua jalur lama sama-sama SATU insert, jadi tak satu pun menguji rantai `simpanTarikanSelesai` — 4 tabel berurutan; yang digantung = tulis PERTAMA (absensi delete), keadaan terburuk: nol tabel berubah tapi layar sudah bilang "Menghitung…". Form-nya baru ADA kalau ada tarikan, jadi `siapkan()` kini bisa menyuntik isi GET palsu (`bacaan`); tanpa itu semua GET dijawab `[]` dan editor absensi tak pernah bisa dibuka. **Bagian ketukan ganda (19 Agu)** menguji hal yang SAMA SEKALI BERBEDA dari bagian menggantung: bukan "apa yang dilihat bendahara saat jaringan busuk", tapi "apakah satu niat bisa tercatat DUA KALI". `disabled={saving}` tak menjawabnya — itu penjaga UI yang baru berlaku SETELAH React me-render, sedangkan dua ketukan di TASK YANG SAMA (ghost-click iOS/Android, atau warga menekan lagi karena HP terasa tak merespons) masuk ke handler sebelum render itu. Terukur: **dua `POST kas_rt` untuk satu ketukan ganda** — dua transaksi untuk satu niat, dan di app kas itu uang. Obatnya `useSaving()` di `src/lib/hooks.ts`: latch `useRef` yang berubah SEKARANG JUGA, dipasang satu baris (`if (… || sedangSimpan()) return;`) di 9 handler tulis + jalur merusak `batalkan()`. **Jalur tulis BARU wajib memakainya** — `useState(false)` polos akan lolos semua sapuan lain. Dua jebakan alat saat membangunnya: `dispatchEvent` Playwright TAK memicu submit bawaan (nol request, terbaca "aman"), dan dua `.click()` Playwright terpisah selalu beda task sehingga React sempat render & celahnya tak pernah terlihat — kliknya WAJIB dari dalam halaman & sinkron. Yang dihitung hanya **POST**: percobaan pertama menghitung semua method dan melaporkan "DOBEL" untuk satu simpan sehat (satu POST memang diikuti PATCH hitung-ulang saldo) |
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
