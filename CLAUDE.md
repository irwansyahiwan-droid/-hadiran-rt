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
npm run periksa      # typecheck + lint + 95 test
```

Sapuan browser (butuh build produksi hidup: `npm run build && npx vite preview --port 5199`):

```
npm run audit        # keadaan + sheet + publik + masuk (49 pemeriksaan)
```

| Perintah | Yang diperiksa | Kenapa ada |
|---|---|---|
| `audit:keadaan` | Layar saat data KOSONG & saat muat GAGAL (warga + bendahara + overlay) | Semua audit lain jalan lawan DB penuh, jadi EmptyState/ErrorState tak pernah dirender. **App kas dilarang menyatakan nominal saat gagal muat.** |
| `audit:sheet` | Geometri sheet/modal/popover di 360px | Form di dalam bottom-sheet tak pernah diukur; kontrol bisa meluber keluar panel |
| `audit:publik` | landing / warta / nobar / panduan-install, light+dark | HTML statis di `public/` tak tersentuh audit app, padahal wajah pertama |
| `audit:kontras` | Kontras piksel-nyata (sampel screenshot) | Token tak bisa dipercaya; warna final = hasil blend |
| `audit:lebar` | Nominal "Rp" terpotong/meluber di 360px | `<span>` inline punya clientWidth 0 → scrollWidth buta |
| `audit:muat` | FCP & siap-pakai (CPU 4× lambat, 400 kbps) | Warga pakai Android kelas bawah, sinyal seadanya |
| `audit:masuk` | Gerbang masuk & keluar saat jaringan busuk (chunk gagal, request menggantung, logout luring) | Semua audit lain menguji layar SESUDAH masuk. **Tombol "Masuk" yang terkunci tak menyisakan jalan lain sama sekali**, dan kegagalan jaringan yang dilaporkan sebagai "password salah" bikin bendahara mengganti sandi yang sudah benar |

**Aturan alat:** kalau sapuan melaporkan temuan yang ternyata palsu, **betulkan ALATNYA**,
bukan kodenya. Sudah terjadi 7×: sampel kena border 1px, aturan dialog dikenakan ke halaman
penuh, probe mengambil dialog di belakang sheet, `.sr-only` terbaca "terpotong", pola rute
`supabase-*.js` meleset dari nama asli `vendor-supabase-*.js` (sapuan diam-diam menguji jalur
ONLINE lalu "lolos"), klik ditolak karena panel collapse masih beranimasi, dan klik pembuka
panel mendarat SEBELUM hidrasi lalu tak berbuat apa-apa. Karena itu tiap gangguan jaringan di
`audit-masuk.mjs` menghitung berapa kali benar-benar terpasang, dan tiap prasyarat UI ditunggu
sampai MENGAKU tercapai (`aria-expanded="true"`), bukan diasumsikan dari satu klik.

**Sapuan wajib diarahkan ke produksi sekali sebelum dianggap benar** (`CAP_URL=https://hadiran-rt.vercel.app`):
localhost instan menyembunyikan seluruh kelas bug balapan-hidrasi.

**Jebakan auth:** `fetch` yang MENGGANTUNG tidak pernah reject sendiri. `await` telanjang di
jalur auth = spinner abadi; semua panggilan auth wajib lewat `batasWaktu()` di
`src/lib/authSesi.ts`, dan "Keluar" wajib membuang sesi lokal tanpa syarat.

**Jebakan Supabase yang berulang:** `.select()` TIDAK melempar saat gagal — ia mengembalikan
`{data: null, error}`. Tiap `?? []` tanpa cek `res.error` mengubah kegagalan jadi "tidak ada
data". Cek di halaman TIDAK cukup; helper di `src/lib/` juga wajib melempar.
