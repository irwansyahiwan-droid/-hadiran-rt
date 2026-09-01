# Penutup — empat prompt terakhir

Peta jalan sudah habis. Yang tersisa cuma tiga hal yang Claude Code tinggalkan
terbuka, plus satu pemeriksaan yang belum pernah dilakukan sama sekali.

Urutannya sudah diprioritaskan. Kalau jatah minggu ini terbatas, **kerjakan
nomor 1 dan 3 saja** — dua itu yang benar-benar menentukan.

---

## 1. Keputusan `sw.js` — kerjakan, ini bukan soal visual tapi menghancurkan visual

Alasannya begini: seluruh sesi ini dibangun di atas satu premis — app harus
terlihat mahal. **Tidak ada warna, spasi, atau gerak yang bisa menyelamatkan
app yang gagal terbuka.** Layar putih adalah hal paling murah yang bisa
dialami seseorang, dan sekali terjadi ke satu warga, seluruh kesan yang
dibangun berbulan-bulan hilang. Jadi ini tetap pada sumbu saya.

```
Kerjakan temuan sw.js yang kamu tinggalkan terbuka: APP_SHELL cuma memuat /,
index.html, manifest, dan dua ikon — JS & CSS ber-hash tak pernah ikut
precache, jadi boot luring bergantung pada HTTP cache peramban.

BUKTIKAN DULU sebelum memperbaiki. Simulasikan skenario yang kamu sebut
sendiri: kunjungan pertama → service worker terpasang tapi belum mengontrol →
offline → buka lagi. Tunjukkan ke saya apakah shell-nya benar-benar gagal
boot. Kalau ternyata tidak, bilang begitu dan berhenti.

Kalau memang gagal, perbaiki dengan syarat: daftar aset ber-hash disuntikkan
saat BUILD (bukan ditulis tangan — nama file berubah tiap build), nama cache
diikat ke versi build, dan cache lama dibersihkan saat activate. Dua jebakan
yang harus kamu tutup sekaligus: (a) kunjungan pertama SW belum mengontrol
halaman, (b) chunk basi sesudah deploy — ini yang dulu bikin saya menolak
menyentuh sw.js sama sekali.

Verifikasi pakai audit:luring dan audit:muat, lalu deploy dan buktikan dari
produksi seperti biasa. Tulis pelajarannya ke CLAUDE.md.
```

## 2. Empat ketidakselarasan Fase 3 yang belum saya pilih

Ini murah — saya cuma perlu memutuskan. Tapi jangan diputuskan Claude Code
sendiri; tiga dari empat kemungkinan besar memang disengaja.

```
Kembali ke empat ketidakselarasan Fase 3 yang belum saya pilih: hero kelima
di luar HeroSaldo · bendahara·Jadwal tanpa hero · layar kosong dua suara ·
subjudul tanggal.

Untuk MASING-MASING, tunjukkan dua potret berdampingan — keadaan sekarang dan
usulanmu — plus satu kalimat kenapa keadaan sekarang mungkin justru DISENGAJA.
Saya curiga sebagian memang begitu. Jangan mengubah apa pun sebelum saya
memilih satu per satu.
```

## 3. Uji di HP sungguhan — ini yang belum pernah dilakukan sama sekali

Seluruh penilaian sepanjang proyek ini dilakukan di Chromium headless pada
390px. Itu bukan HP. Yang tak pernah terlihat: rendering font asli, safe-area
& poni, mode standalone PWA, pantulan gulir iOS, pergantian tema mengikuti
sistem, dan bagaimana app terasa dipegang satu tangan.

**App dinilai mahal atau murah di HP, bukan di simulator.**

```
Saya mau menguji app ini di HP sungguhan — sesuatu yang belum pernah kita
lakukan; semua penilaian selama ini di Chromium headless 390px.

Buatkan saya DAFTAR PERIKSA yang bisa saya jalankan sendiri sambil memegang
HP: apa yang harus saya buka, apa yang harus saya perhatikan, dan apa yang
dianggap gagal. Fokus ke hal yang MUSTAHIL terlihat di headless — rendering
font asli, safe-area & poni, mode standalone sesudah dipasang ke home screen,
pantulan gulir iOS, pergantian tema ikut sistem, dan rasa app dipegang satu
tangan.

Susun berurutan supaya sekali jalan selesai, maksimal 20 butir, tiap butir
satu kalimat. Sediakan tempat saya menuliskan temuan, lalu saya bawa balik ke
kamu untuk diperbaiki.
```

## 4. Celah alat pengumpul kata

Kecil, tapi artinya aturan Fase 4 baru terperiksa sebagian.

```
Kolektor kata di Fase 4 melewatkan tombol yang labelnya template literal, jadi
aturan "tombol menyebut akibatnya" baru terperiksa sebagian. Perbaiki
kolektornya supaya menangkap itu juga, jalankan ulang, dan tunjukkan hanya
temuan BARU yang belum pernah saya nilai.
```

---

## Sesudah ini

Sumbu visual app ini habis — bukan karena sempurna, tapi karena tiap perubahan
berikutnya jadi selera, bukan perbaikan.

Yang menaikkan kelas app ini sekarang bukan sesi kedelapan, melainkan **70
kepala keluarga yang memakainya**. Satu prompt terakhir, dipakai nanti setelah
app dipakai sungguhan:

```
Ini keluhan & pertanyaan nyata dari warga yang memakai app:
[tempel di sini]

Kelompokkan: mana yang cacat, mana yang salah paham (artinya cacat DESAIN,
bukan cacat warga), dan mana yang permintaan fitur. Urutkan dari yang paling
sering disebut. Untuk tiap salah paham, tunjukkan layar penyebabnya.
```

Umpan balik semacam itu tak bisa dihasilkan sapuan mana pun, dan hampir selalu
menunjuk hal yang tak pernah ada di daftar mana pun.
