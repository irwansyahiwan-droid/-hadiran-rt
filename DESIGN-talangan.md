---
name: Hadiran RT — Layar "Talangan"
description: Spec desain semantik layar Talangan (tunggakan warga) untuk polish & regenerasi screen — turunan DESIGN.md induk, di-ground ke kode nyata.
status: Material-flat. Sumber kebenaran = tailwind.config.js + src/index.css + src/pages/Talangan.tsx. Dibuat 13 Jul 2026.
parent: DESIGN.md
scope: src/pages/Talangan.tsx (tab "Talangan"; disembunyikan dari nav Mode Warga, dibuka dari Beranda dgn tombol Kembali)
---

# Design System: Layar "Talangan"

> Scope **DESIGN.md induk** ke satu layar. Bila konflik: **kode > DESIGN.md
> induk > dokumen ini**. Arah Material-flat final — polish = celah nyata,
> bukan churn token. Anatomi bersama (hero, sheet, chips, skeleton) sudah
> dirinci di `DESIGN-kas-hadiran.md`; dokumen ini fokus yang khas Talangan.

## 1. Visual Theme & Atmosphere

**Buku tunggakan yang tegas tapi tidak mempermalukan.** Layar ini menagih:
total talangan belum lunas memimpin di hero, warga dikelompokkan per nama
dengan nominal tunggakan amber, dan bendahara bisa menandai lunas atau
mengingatkan via WhatsApp. Nada visual tetap tenang — amber `warn` sebagai
perhatian, bukan merah yang menghakimi; merah hanya untuk konfirmasi
destruktif. Density 5, variance 3, motion 4 (sama keluarga dgn Kas Hadiran).

## 2. Color Palette & Roles

Mengikuti palet induk penuh. Yang khas layar ini:

- **Amber Tunggakan** (`warn` #B45309, tampil `text-warn` / dark `amber-400`)
  — nominal tunggakan per warga & badge tile entri belum lunas
  (`bg-amber-100` + `text-amber-700`). SATU-satunya suara "perhatian".
- **Emerald Lunas** — caption "Lunas semua" `text-emerald-700`, tile entri
  lunas `bg-emerald-100` + `text-emerald-700`, Tag success "LUNAS".
- **Rose Konfirmasi** (`bg-rose-600` solid + teks putih) — HANYA wujud kedua
  tombol dua-ketuk ("Yakin batal?" / "Hapus?"). Bukan warna tunggakan.
- **Hero emerald** (`.hero-emerald`, ramp #157A45 → #0F7A47 → #064A2C) — total
  belum lunas; chip stat `bg-black/10` (ikon amber-300/emerald-300 dekoratif,
  makna dipikul label putih di sampingnya).
- **Kartu "Semua Talangan Lunas"** — kartu putih flat + hairline (BUKAN hero
  hijau) saat tunggakan nol: kabar baik bersuara pelan.

## 3. Typography Rules

Ikuti induk (Sora display/amount + Inter body, tabular-nums, final — jangan
ganti font). Khas layar ini:
- Total hero: FitAmount 30–48px putih.
- Nominal tunggakan grup: `font-display text-amount` (Sora 600 17px) amber.
- Nama warga: `text-body` 15px semibold, **line-clamp-2** (melipat, bukan
  terpotong — nama panjang tetap utuh).
- Subtitle grup: `text-caption` 13px ("2 belum lunas · 2× Rp50.000").

## 4. Component Stylings (anatomi per blok)

### Tombol Kembali (kondisional)
Hanya saat dibuka dari Beranda (mode warga): teks + panah kiri, 44px,
`text-ink-sub` hover ink. Tanpa header judul — konteks dari hero.

### Hero total tunggakan (dua wujud)
- **Ada tunggakan:** gradient `.hero-emerald` + `--hero-shadow` + `.hero-sheen`,
  padding 20px. Eyebrow micro putih + InfoTip `tone="onDark"`; tombol mata
  44px; FitAmount; dua chip stat `bg-black/10` radius 12px ("Belum Lunas" /
  "Sudah Lunas" + hitungan).
- **Lunas semua:** kartu putih flat `rounded-3xl` + hairline + `.lift`,
  ikon CheckCircle2 + dua baris teks tengah.
Keduanya dalam `CrossFade` — sebelum data siap jangan tampilkan klaim apa pun.

### Pencarian & filter
`.field-search` (bg putih, border `control`, ikon Search kiri, ClearButton
kanan saat terisi). FilterChips status (Semua/Belum Lunas/Lunas) + sort
siklus (Tunggakan ⇄ Nama).

### Kartu grup per warga (list utama)
Tiga section berjudul `SectionTitle`: **Tunggakan Berganda** (tone warn +
ikon segitiga, paling atas — prioritas tagih), **Daftar Talangan** (single),
**Sudah Lunas** (tone muted). Tiap section = satu kartu putih `rounded-3xl`
+ hairline + `.lift` + `list-inset`.

Baris grup (tappable, `aria-expanded`): AvatarPeci 44px, nama line-clamp-2,
subtitle hitungan; kanan nominal amber + chevron berputar 180° saat buka;
tombol WhatsApp 44px terpisah (emerald, bendahara saja, tunggakan > 0) —
pesan tagihan tersusun dari entri belum lunas.

Baris entri (saat expand, `list-inset`): tile 36px `#nomor` tint semantik
(amber belum / emerald lunas), "Tarikan #N" + tanggal, nominal, lalu aksi
bendahara — **Bayar** (`.btn-brand`, dua-ketuk "Yakin?"), **Batalkan**
(abu netral → `bg-rose-600` "Yakin batal?"), **Hapus** (ikon → "Hapus?"
rose; pola undo 5 dtk). Semua aksi min 44px.

### State
Loading = skeleton berbentuk baris (avatar + dua bar + nominal). Empty =
`EmptyState` kontekstual (beda pesan utk hasil cari kosong / filter kosong /
memang belum ada talangan) + aksi Reset filter. Error = `ErrorState` retry.

## 5–7. Layout, Motion, Anti-Patterns

Identik induk + `DESIGN-kas-hadiran.md`: satu kolom 390px, 44px tap target,
`transform`/`opacity` saja, chevron rotate 200ms, hormati reduced-motion;
larangan glass/glow, abu pudar, pure black, emoji, ganti font, sheet tanpa
`useDialog`. Khas layar ini: **jangan pakai merah untuk nominal tunggakan**
(amber = belum lunas; merah disimpan utk destruktif) dan **jangan ubah kartu
"Lunas semua" jadi hero hijau perayaan** — kabar baik tetap tenang.

## 8. Direktif Polish (celah nyata, urut prioritas)

1. **[SELESAI 13 Jul] Hero berbohong saat error load pertama.** Tanpa cache &
   fetch gagal, hero mengklaim "Semua Talangan Lunas". Kini di-guard
   `!(error && list.length === 0)` — area hero tak render, ErrorState bicara.
2. **[SELESAI 13 Jul] Kejujuran feedback Bayar/Batalkan.** `bayar()` &
   `batalkanBayar()` kini memeriksa `error` tiap langkah Supabase (client
   tidak melempar) + toast gagal via `pesanError`; langkah kedua gagal →
   `load()` agar layar menampilkan keadaan sebenarnya.
3. **[SELESAI 13 Jul] Skeleton hero polos & hardcoded.** `h-52` blok abu
   diganti skeleton BERBENTUK (kartu putih + hairline + `.lift`) + konstanta
   `HERO_MIN_H` (208): skeleton `height`, hero gradient `min-height`. Kartu
   "Lunas semua" sengaja tidak di-min-height (wujud pendek memang beda kartu).
4. **[SELESAI 13 Jul] Radius hero ikut token.** `rounded-2xl` → `rounded-3xl`
   (24px, seragam `--hero-radius` & keluarga hero).
