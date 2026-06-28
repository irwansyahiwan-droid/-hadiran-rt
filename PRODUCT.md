# Product

## Register

product

## Users

Dua tipe pengguna, satu kanal: **HP, browser, koneksi seadanya.**

- **Warga (view-only)** — ~79 KK aktif dari ~300 KK dan terus tumbuh (RT 004/006, Tanah Baru, Beji, Depok). Mayoritas awam teknologi, sebagian usia lanjut, sering membuka di bawah sinar matahari. Konteks: ingin cepat tahu "saldo kas berapa, kapan giliran tarikan saya, apakah saya punya tunggakan/talangan" tanpa berpikir keras.
- **Bendahara (admin penuh)** — efektif 1 orang yang memegang semua uang (struktur pengurus: bendahara aktif, sekretaris, pak RT non-aktif). Konteks: mengelola arisan, mencatat absensi tarikan, menandai talangan lunas, memindahkan setoran ke Kas RT, dan mencetak laporan pertanggungjawaban. Setiap aksinya menyangkut uang nyata milik warga, jadi tidak boleh ambigu dan harus bisa dipertanggungjawabkan.

## Product Purpose

Aplikasi manajemen **arisan & kas RT** yang menggantikan buku catatan manual: jadwal tarikan per Sohibul Bait, absensi & talangan, Kas Hadiran (kas per arisan), dan Kas RT (kas besar) dengan kategori pertanggungjawaban, plus cetak laporan PDF/Excel.

Alasan keberadaannya: **uang komunitas harus terlihat jelas dan jujur.** Sukses = warga percaya pada angka tanpa harus bertanya, dan bendahara bisa menutup laporan triwulan dengan jejak yang rapi. Bukan "app keuangan canggih" — tapi sumber kebenaran tunggal yang dipercaya satu RT.

## Brand Personality

**Modern, tegas, bersih.** Suara: lugas, ramah, bahasa Indonesia warga sehari-hari — bukan jargon perbankan, bukan formalitas birokrasi. Nominal dan angka adalah bintang utama; UI menyingkir agar data tampil tegas. Terasa terpercaya seperti app keuangan kelas atas, tapi tetap milik kampung sendiri (sentuhan identitas lokal songket/peci yang disengaja dan terkendali, bukan ornamen ramai).

Emosi yang dituju: **kepercayaan & transparansi.** Setiap layar harus membuat warga merasa "ini jujur dan jelas."

## Anti-references

- **Glassmorphism / glow / noise sebagai dekorasi.** Tim secara eksplisit menolak permukaan kaca, cahaya berpendar, dan tekstur noise. Permukaan harus **flat & tegas ala BYOND**: gradient pekat, hairline, bayangan netral, teks near-putih di permukaan gelap. (Pengecualian sah: efek kaca/gerak yang benar-benar fungsional, dipakai hemat.)
- **Emas/gold sebagai aksen umum.** "No gold" berlaku app-wide. Satu-satunya pengecualian disengaja: motif songket `--gold-songket` yang bersifat DEKORATIF-only pada kartu saldo & sorot giliran Sohibul Bait — jangan perlakukan ini sebagai pelanggaran, dan jangan perluas gold ke tempat lain.
- **Formalitas birokrasi / tampilan aplikasi pemerintahan yang kaku.** Bukan ini — meski mengurus uang resmi, nuansanya tetap hangat dan manusiawi.
- **Estetika "template AI generik."** Card grid seragam tanpa hierarki, eyebrow uppercase di tiap section, hero-metric kosong tanpa makna.

## Design Principles

1. **Transparansi adalah fitur.** Angka, saldo, dan jejak transaksi harus terbaca jelas dan tak bisa disalahartikan. Kalau saldo minus (talangan ditutup dari kas), tampilkan apa adanya — kejujuran di atas estetika.
2. **Warga awam dulu.** Sekali pandang harus paham. Istilah arisan (talangan, Sohibul Bait, tarikan) selalu punya jalan penjelasan (InfoTip/WelcomeSheet). Tidak ada layar yang menuntut pengguna "belajar dulu."
3. **Aksi uang harus dapat dipertanggungjawabkan.** Aksi destruktif (mis. batalkan hasil tarikan) jelas konsekuensinya, terlindungi, dan punya jejak audit — karena recovery menyandar pada kertas hadiran + audit transaksi, bukan ingatan.
4. **Data tegas, UI menyingkir.** Permukaan flat dan tenang; tipografi & nominal yang bekerja keras. Dekorasi hanya bila ia memberi makna atau identitas lokal yang disengaja.
5. **Konsisten satu sumber.** Satu rumus, satu helper, satu komponen per peran (mis. `hitungSaldoHadiran()`, `ringkasAbsensi()`, `useDialog`). Jangan bercabang diam-diam.

## Accessibility & Inclusion

- **Target WCAG 2.1 AA.** Prioritas tertinggi yang dikonfirmasi: **teks besar & kontras tinggi** — banyak pengguna usia lanjut dan membaca di HP di bawah sinar matahari. Body text ≥4.5:1, jangan pakai abu-abu muda "demi elegan."
- **Reduced motion** dihormati (`prefers-reduced-motion`) sebagai baseline.
- **Bahasa sederhana** + istilah yang dijelaskan in-app untuk warga awam.
- **Target sentuh nyaman jempol** di HP, zona jempol untuk aksi utama (FAB).
- Sudah jadi baseline: anti-zoom iOS, focus-visible, safe-area, theme-color adaptif. Jangan turunkan.
