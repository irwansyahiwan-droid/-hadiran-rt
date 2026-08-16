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
npm run audit        # keadaan + sheet + publik + masuk + tulis (51 pemeriksaan)
```

| Perintah | Yang diperiksa | Kenapa ada |
|---|---|---|
| `audit:keadaan` | Layar saat data KOSONG & saat muat GAGAL (warga + bendahara + overlay) | Semua audit lain jalan lawan DB penuh, jadi EmptyState/ErrorState tak pernah dirender. **App kas dilarang menyatakan nominal saat gagal muat.** |
| `audit:sheet` | Geometri sheet/modal/popover di 360px | Form di dalam bottom-sheet tak pernah diukur; kontrol bisa meluber keluar panel |
| `audit:publik` | landing / warta / nobar / panduan-install, light+dark | HTML statis di `public/` tak tersentuh audit app, padahal wajah pertama |
| `audit:kontras` | Kontras piksel-nyata TEKS, **tab WARGA saja** (sampel screenshot) — termasuk `::placeholder` | Token tak bisa dipercaya; warna final = hasil blend. **Bagian placeholder (6 Agu)** ada karena pemungut teks berjalan lewat TEXT NODE, dan placeholder tak punya satu pun — 16 placeholder app tak pernah terukur sekali pun meski ia teks biasa di mata §1.4.3, dan justru itu yang dibaca warga lansia saat mencari namanya. Warna diambil dari computed `::placeholder`, BUKAN warna teks nilainya |
| `audit:kontras-deep` | Kontras TEKS di permukaan yang TAK disentuh `audit:kontras`: sheet/modal warga, SELURUH permukaan bendahara (5 tab + form FAB + overlay admin), landing /info | Populasinya justru yang TERBESAR — 2.174 dari 3.410 sampel. Sampai 6 Agu skripnya ada tapi tak terdaftar di `package.json`, jadi cuma jalan kalau seseorang ingat mengetik path-nya; sekarang bisa dipanggil dgn nama. Bendahara di-MOCK 3 lapis aman (sesi palsu di localStorage + rest/v1 dipaksa anon + method tulis DIBLOKIR Playwright) — jangan pernah pakai kredensial asli atau klik Simpan/Hapus di data produksi |
| `audit:kontras-nonteks` | Kontras NON-teks: ikon tanpa label, batas kolom isian, ring `:focus-visible`, **tanda grafik** (§1.4.11 & §2.4.13, ambang 3:1) | `audit:kontras` cuma menyampel TEKS. Ring fokus tak pernah diukur sekali pun — ternyata ring hijau di atas hero HIJAU = 1,26:1 (praktis hilang bagi pengguna papan ketik) dan ring `.field` beralpha 30% gagal di SEMUA input. Fokus di-Tab beneran, screenshot per elemen (rect & piksel wajib sezaman). **Bagian grafik (4 Agu)** ada karena pemeriksaan ikon SENGAJA melewati svg ber-leluhur `aria-hidden` — dan semua grafik app memang aria-hidden, jadi garis "Tren Saldo" bertahan 2,33:1 di mode gelap tanpa satu pun sapuan menyentuhnya. Populasinya OPT-IN lewat `data-grafik` di call-site, bukan tebakan selektor: bar = `div`, garis = `path`, tak ada ciri struktural yang bisa dibedakan dari elemen tata letak. **Tanda grafik baru WAJIB memasang `data-grafik`** — kalau tidak, ia tak terukur |
| `audit:lebar` | Nominal "Rp" terpotong/meluber di 360px | `<span>` inline punya clientWidth 0 → scrollWidth buta |
| `audit:reflow` | Halaman geser samping di 320px (§1.4.10, WAJIB) + saat font dasar browser 200% (di atas AA) | Yang WAJIB cuma 320px dan itu bersih. Bagian 200% sengaja dipisah supaya tak dilaporkan sebagai "gagal WCAG" — ia ambang app sendiri untuk warga lansia. Probe WAJIB menyaring elemen ber-leluhur `position:fixed`: isi bottom-nav tak menciptakan scroll dokumen, dan melaporkannya = menyuruh orang membetulkan yang bukan penyebab |
| `audit:sentuh` | Luas area sentuh tiap kontrol di 360px (§2.5.8 min 24px, ambang app 44px) | Warga pakai jempol, sebagian lansia. **Diukur lewat hit-test `elementFromPoint`, BUKAN geometri CSS**: percobaan pertama membaca `cs.insetTop` (properti yang tak ada — yang benar `top/right/bottom/left`) sehingga semua pelebaran `before:-inset-*` terbaca nol dan 19 kontrol dilaporkan gagal padahal semuanya sudah 44px. Tiap kontrol WAJIB di-`scrollIntoView` dulu sebelum diukur — kalau tidak, kontrol yang kebetulan separuh di bawah Header sticky terukur separuh tinggi |
| `audit:muat` | FCP & siap-pakai (CPU 4× lambat, 400 kbps) | Warga pakai Android kelas bawah, sinyal seadanya |
| `audit:masuk` | Gerbang masuk & keluar saat jaringan busuk (chunk gagal, request menggantung, logout luring) | Semua audit lain menguji layar SESUDAH masuk. **Tombol "Masuk" yang terkunci tak menyisakan jalan lain sama sekali**, dan kegagalan jaringan yang dilaporkan sebagai "password salah" bikin bendahara mengganti sandi yang sudah benar |
| `audit:tulis` | Tombol simpan saat request tulis MENGGANTUNG (Kas RT + Kelola Anggota + **Absensi "Simpan & Hitung Iuran"**) | `audit:keadaan` menguji BACA gagal, `audit:masuk` menguji auth — jalur TULIS, satu-satunya tempat uang benar-benar dicatat, tak tersentuh keduanya. **`try/finally` ada di semua jalur tulis tapi tak menolong: `finally` tak pernah tercapai kalau janjinya tak pernah selesai**. Jalur Absensi (16 Agu) ditambahkan karena dua jalur lama sama-sama SATU insert, jadi tak satu pun menguji rantai `simpanTarikanSelesai` — 4 tabel berurutan; yang digantung = tulis PERTAMA (absensi delete), keadaan terburuk: nol tabel berubah tapi layar sudah bilang "Menghitung…". Form-nya baru ADA kalau ada tarikan, jadi `siapkan()` kini bisa menyuntik isi GET palsu (`bacaan`); tanpa itu semua GET dijawab `[]` dan editor absensi tak pernah bisa dibuka |
| `audit:mati` | Keterbacaan label tombol saat `disabled` (terang+gelap, warga+bendahara) | Kedua audit kontras MELEWATI kontrol nonaktif secara eksplisit — sah, karena WCAG 1.4.3 mengecualikannya. Tapi "tak wajib" bukan "boleh tak terbaca", dan pengecualian itu berarti keadaan nonaktif **tak pernah diukur sekali pun**. Yang tersembunyi di baliknya: tombol masuk bendahara 3,79:1 saat "Memproses…", 3 tombol teks Kas Hadiran 2,2–2,7:1, dan perbaikan `.btn-brand:disabled` yang ternyata cuma dihitung untuk mode TERANG (4,32:1 di gelap). Ambang dilaporkan sebagai ambang APP, bukan "gagal WCAG" — disiplin yang sama dgn bagian teks-200% di `audit:reflow` |

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

**Sapuan wajib diarahkan ke produksi sekali sebelum dianggap benar** (`CAP_URL=https://hadiran-rt.vercel.app`):
localhost instan menyembunyikan seluruh kelas bug balapan-hidrasi.

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
