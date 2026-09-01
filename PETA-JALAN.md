# Peta jalan sesudah tangga nada — menuju "app kelas dunia"

Tujuh prompt, berurutan. Tempel satu per satu di Claude Code, jangan diborong.
Tiap prompt sudah memuat cara kerja & cara verifikasinya sendiri.

Sebelum mulai, satu hal jujur soal urutan: **tiga fase pertama menutup sisa
pekerjaan SISTEM, dan itu terbatas — akan habis.** Sesudah itu yang memisahkan
app rapi dari app kelas dunia bukan konsistensi lagi, melainkan **kata-kata,
momen, dan keadaan pinggir**. Fase 4–6 justru bagian yang paling jarang
dikerjakan orang, dan paling terasa.

---

## Fase 1 — Tangga bayangan (elevasi)

Kenapa: kedalaman adalah satu-satunya sumbu visual yang belum punya peran
bertingkat. `--shadow-card`, `.lift`, `.float` lahir di waktu berbeda dan tak
pernah disusun sebagai satu tangga.

```
Lanjut ke tangga BAYANGAN, cara kerja sama persis seperti tangga spasi & bentuk.

Inventaris dulu: semua box-shadow di src/ (CSS token maupun kelas Tailwind
shadow-*), lalu kelompokkan per PERAN, bukan per nilai. Dugaan saya perannya
cuma tiga — kartu diam, benda terangkat (FAB/toast/popover), dan lapisan
(sheet/dialog) — tapi buktikan dengan hitungan, jangan diasumsikan.

Aturan yang saya mau ditegakkan: satu peran = satu bayangan, dan bayangan
HARUS berpasangan dengan tinggi-angkatnya. Bayangan terang & gelap dinilai
terpisah: di mode gelap bayangan hampir tak terlihat, jadi separasi datang
dari ring cahaya — pastikan keduanya menyampaikan tingkat yang SAMA.

Render sebelum/sesudah tiga permukaan berdampingan supaya saya bisa memilih.
Lalu penjaga statis `npm run audit:bayangan` dengan pola tiga golongan yang
sama (irama / fungsional / gambar), masukkan ke `periksa`.

Sesudah saya setuju: periksa → sapuan visual → commit → vercel --prod --yes →
buktikan dari isi CSS produksi.
```

## Fase 2 — Tangga tebal huruf & ikon

Kenapa: tebal huruf dan ikon adalah dua sumbu terakhir yang masih "kebiasaan",
bukan aturan. Ikon terutama — `strokeWidth` di app ini dipakai mulai 1,8 sampai
3,5 dan ukurannya campur antara kelas skala dan nilai arbitrer.

```
Dua tangga terakhir: TEBAL HURUF dan IKON.

Tebal huruf — hitung pemakaian font-medium/semibold/bold/extrabold, lalu ikat
ke peran tipografi yang sudah ada (display/title/subtitle/body/caption/micro/
overline). Aturannya: satu peran tipografi = satu tebal baku. Kalau ada peran
yang dipakai dengan dua tebal berbeda, itu temuan.

Ikon — hitung sebaran strokeWidth DAN ukuran. Ikon harus punya hubungan tetap
dengan teks di sebelahnya: ikon sebaris teks = tinggi baris teks itu, stroke
menyesuaikan ukuran (makin kecil ikon, makin tebal stroke relatifnya, kalau
tidak ia hilang). Tetapkan 3–4 ukuran ikon berperan, bukan sepuluh.

Ingat golongan GAMBAR: ikon DI DALAM ilustrasi dekoratif bukan bagian tangga.

Verifikasi & deploy seperti biasa; tambahkan penjaganya ke `periksa`.
```

## Fase 3 — Melihat seluruh app sekaligus

Kenapa: selama ini saya menilai satu layar per waktu. Perusahaan besar menilai
**semua layar berdampingan** — di situ ketidakselarasan langsung kelihatan,
padahal tak satu pun layar terasa salah kalau dilihat sendiri-sendiri.

```
Buatkan alat `npm run lembar-kontak`: potret SETIAP layar app —
mode warga & bendahara, tema terang & gelap, plus keadaan kosong dan keadaan
memuat — lalu susun jadi SATU lembar kontak PNG besar berlabel.

Pakai harness sapuan yang sudah ada (scripts/lib/audit-harness.mjs), jangan
tulis login sendiri — pelajaran ke-24 di CLAUDE.md.

Sesudah lembarnya jadi, JANGAN langsung memperbaiki. Tunjukkan ke saya, lalu
beri daftar ketidakselarasan yang cuma terlihat kalau semua layar disandingkan
— urut dari yang paling mencolok. Saya yang memilih mana yang dikerjakan.
```

## Fase 4 — Kata-kata

Kenapa: ini sumbu yang **belum pernah disentuh sama sekali**, dan menurut saya
sekarang jadi jarak terbesar yang tersisa. App murah bilang "Data berhasil
disimpan!". App mahal bilang "Tarikan #18 tersimpan". Kata-kata itu desain.

```
Sesi KATA-KATA. Kumpulkan setiap teks yang dibaca warga: label tombol, judul,
keadaan kosong, pesan galat, dialog konfirmasi, toast, teks bantuan,
placeholder. Tampilkan sebagai satu tabel — saya mau melihat SUARA app ini
sekaligus, bukan satu layar per waktu.

Nilai dengan tiga aturan, dan tunjukkan usulan perbaikannya berdampingan:
1. Tombol menyebut AKIBATNYA, bukan perintah umum. Yang muncul sesudahnya
   memakai kata yang sama.
2. Galat menjelaskan apa yang terjadi DAN apa yang bisa dilakukan warga.
   Tanpa minta maaf, tanpa istilah teknis, tanpa kode.
3. Sebut benda yang nyata: nomor tarikan, nama sohibul bait, tanggal — bukan
   "data", "item", "berhasil".

Bahasanya Indonesia yang dipakai bapak-bapak RT sehari-hari — bukan bahasa
korporat, bukan bahasa anak startup. Jangan ada emoji.

Saya yang menyetujui tiap perubahan kata sebelum ditulis ke kode.
```

## Fase 5 — Angka

Kenapa: ini app kas. Angka **adalah** produknya. Kalau angka terbaca meyakinkan,
seluruh app terasa bisa dipercaya.

```
Sesi ANGKA. Periksa setiap tempat nominal rupiah & jumlah muncul, lalu
tegakkan satu aturan:

- Angka yang berjejer ke bawah WAJIB tabular-nums dan rata kanan. Kolom yang
  digitnya bergoyang membuat seluruh laporan terasa amatir.
- Negatif punya satu cara baca di seluruh app — jangan campur tanda minus,
  warna merah, dan kata "Defisit" sesuka tempat.
- Nominal besar dan nominal kecil punya peran tipografi yang berbeda dan
  konsisten (mana `display`, mana `amount`, mana `body`).
- Angka yang sedang berubah (Odometer) harus berhenti di posisi yang sama
  persis dengan angka diam — ukur, jangan dikira.

Ukur dulu sebarannya, tunjukkan temuan, baru perbaiki setelah saya setuju.
```

## Fase 6 — Keadaan pinggir

Kenapa: app terasa murah paling cepat justru di layar kosong, gagal, dan
offline — dan itu layar yang paling jarang dilihat pembuatnya.

```
Sesi KEADAAN PINGGIR. Untuk SETIAP layar, potret empat keadaan: kosong,
memuat, gagal, dan offline. Banyak yang mungkin belum pernah saya lihat sendiri.

Nilai tiga hal:
1. Keadaan kosong menjelaskan apa yang akan muncul di sini dan bagaimana cara
   mengisinya — bukan cuma gambar dan kata "Belum ada data".
2. Kerangka (skeleton) berbentuk seperti isi yang akan menggantikannya. Kalau
   bentuknya beda, mata melihat dua objek, bukan satu transformasi.
3. Gagal & offline menawarkan jalan keluar, dan tidak membuat warga merasa
   merusak sesuatu.

`audit:luring` dan `audit:keadaan` sudah ada — pakai, jangan bikin baru.
Tunjukkan lembar potretnya dulu sebelum mengusulkan perubahan.
```

## Fase 7 — Kunci sistemnya

Kenapa: sistem yang tak tertulis akan luntur pelan-pelan. Enam tangga ini
tak boleh bergantung pada ingatan sesi berikutnya.

```
Kunci sistem desain app ini jadi satu skill Claude Code di
`.claude/skills/hadiran-desain/SKILL.md`, supaya tiap sesi berikutnya
mematuhinya tanpa saya harus menjelaskan ulang.

Isinya: enam tangga (warna, tipografi, spasi, bentuk, gerak, bayangan),
tiga golongan yang sengaja tidak diatur, daftar penjaga beserta perintahnya,
dan jebakan deploy. Ringkas dan bisa ditindak — bukan salinan CLAUDE.md.

Lalu tambahkan satu perintah `npm run sapu-semua` yang menjalankan seluruh
sapuan berurutan dan mencetak satu ringkasan hijau/merah, supaya sebelum
deploy saya cukup melihat satu layar.
```

---

## Kapan berhenti

Ini bagian yang jujur. Sesudah fase 6, sumbu visual app ini **habis** — bukan
karena sempurna, tapi karena tiap perubahan berikutnya jadi selera, bukan
perbaikan. Tandanya gampang dikenali: kalau sebuah sesi tak bisa lagi
menunjukkan ANGKA yang membaik atau ketidakselarasan yang hilang, dan cuma
bisa bilang "ini terasa lebih enak", itu bukan lagi peningkatan.

Di titik itu yang paling menaikkan kelas app ini bukan sesi ketujuh —
melainkan 70 kepala keluarga yang benar-benar memakainya, lalu satu-dua hal
yang mereka keluhkan. Umpan balik seperti itu tak bisa dihasilkan sapuan mana
pun, dan biasanya menunjuk hal yang tak pernah ada di daftar ini.
