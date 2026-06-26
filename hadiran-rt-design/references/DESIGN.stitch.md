# Design System: Hadiran RT — Stitch Prompt Brief

> **Tujuan file ini:** brief siap-tempel untuk **Google Stitch** agar layar yang
> di-generate cocok dengan app nyata. Sumber kebenaran tetap
> `../tailwind.config.js` + `../src/index.css`; doc naratif lengkap ada di
> [`DESIGN.md`](./DESIGN.md). **Jika konflik, kode menang.**
>
> **PENTING — 3 pengecualian sengaja terhadap default "anti-slop" generik.**
> Stitch JANGAN "memperbaiki" hal berikut; semuanya keputusan desain terdokumentasi:
> 1. **Inter TIDAK dilarang di sini.** App pakai **dua font**: Inter (body) + Sora (display). Jangan paksa satu grotesk eksotis.
> 2. **Emas songket (#E8B651) DIIZINKAN** sebagai aksen *dekoratif kultural* (motif anyaman + sorot "Giliran berikutnya"). Bukan aksen UI kedua, bukan warna uang/status.
> 3. Ini **app mobile**, bukan landing page. **Hero terpusat-vertikal & single-column WAJIB.** Aturan "no centered hero / asymmetric split" tidak berlaku.

---

## 1. Visual Theme & Atmosphere

Antarmuka **mobile-first** untuk warga RT (dibuka via browser HP), bernuansa
*fintech-tenang* ala Apple/Linear/Revolut — bersih, lapang, percaya diri, tapi
hangat dan lokal. **Light dan dark mode setara** (bukan dark-first).

Kanvas light `#E6EAF1` (abu netral sejuk). Kartu putih **"pop" lewat step tonal
+ bayangan crisp berlapis**, BUKAN glow/aurora/neon. "Makin sedikit trik, makin
mahal kelihatannya." Satu sentuhan identitas lokal: **motif anyaman ketupat
(songket) benang emas** di kartu saldo — sinyal "ini kampung kita", bukan dompet
bank generik.

- **Density:** Daily-app balanced (5/10) — kompak tapi tidak sesak, grid 4px.
- **Variance:** Predictable, rapi, kolom tunggal (3/10) — app, bukan poster.
- **Motion:** Fluid spring-physics (6/10) — staggered reveal, shimmer skeleton, sheet slide-up; taat `prefers-reduced-motion` & `prefers-reduced-transparency`.

---

## 2. Color Palette & Roles

Satu aksen interaktif: **emerald/hijau brand**. Saturasi terkendali, tanpa
purple/neon. Biru & amber adalah **sinyal**, bukan aksen kedua.

### Aksen brand (HIJAU — bukan amber, bukan biru)
- **Brand Deep** (`#0F4C2E`) — fill chip aktif, judul kuat
- **Brand 600 / 500** (`#145D39` / `#1B7249`) — step gradient · accent native · focus ring · caret
- **Brand Link** (`#0D6B5E`) — tautan "Lihat semua" (teal-green)
- **Brand Link Dark** (`#1A9B86`) — pasangan dark: tab aktif + tautan

### Semantik nominal (SATU hijau, SATU merah, SATU amber — jangan dicampur)
- **Positif / Uang Masuk** (`#047857`, emerald-700)
- **Negatif / Uang Keluar** (`#E11D48`, rose-600)
- **Perhatian / Tunggakan** (`#B45309`, amber-700)

### Status setor (HANYA hero "Kas Hadiran sudah disetor" — bukan aksen kedua)
- **Setor Deep / Via / To** (`#1E40AF` / `#2563EB` / `#3B82F6`)

### Permukaan & garis
- **Surface** (`#FFFFFF`) — kartu/panel
- **Sunken / Canvas** (`#E6EAF1`) — kanvas app (= body, manifest); dark `#030712`
- **Line** (`#CFD5DF`) — divider tipis (hairline)
- **Control** (`#E2E8F0`) — border input/tombol

### Teks (semua lolos kontras AA di atas putih)
- **Ink** (`#0B1220`) — judul / nominal utama (near-black, BUKAN `#000000`)
- **Ink Sub** (`#374151`) — teks sekunder
- **Ink Faint** (`#475569`) — tanggal / caption

### Aksen dekoratif kultural (pengecualian sengaja)
- **Gold Songket** (`#E8B651`) — HANYA motif anyaman kartu saldo (`mix-blend: soft-light`, di-mask ke sudut kanan-atas) + sorot "Giliran berikutnya" Sohibul Bait (mahkota + cincin avatar). **Tidak pernah** menyentuh uang/status/nav.

### Hero gradient (kartu saldo)
- `linear-gradient(135deg, #0D5B36 0%, #15824C 50%, #1C9A5C 100%)` + glow emerald lembut + grain 6% + sheen. Teks putih (`#ECFDF5`) lolos kontras di kiri-atas yang deep.

**Banned:** purple/blue AI-neon glow, oversaturated accent, pure black `#000000`,
mencampur red/rose dengan green/emerald di satu layar, emas sebagai warna uang/CTA.

---

## 3. Typography Rules — DUA font (sengaja)

- **Display: Sora** — judul section/halaman & nominal hero. `letter-spacing: -0.018em`, hierarki lewat weight + warna, bukan ukuran raksasa.
- **Body: Inter Variable** — keterbacaan maksimal, leading santai. *(Inter sengaja dipakai di sini — abaikan larangan Inter generik.)*
- **Angka:** `font-variant-numeric: tabular-nums` app-wide → digit rupiah tak goyang. Count-up pakai Odometer.

### Type ramp (mobile — font-size saja)
- **Micro** 11px — badge, nomor, label uppercase mungil
- **Caption** 13px — tanggal, caption, teks sekunder
- **Body** 15px — body utama list/baris
- **Amount** 17px — nominal menonjol
- Heading besar: skala Tailwind `text-lg/xl/2xl/5xl` dengan Sora.

**Aturan:** input efektif **≥16px** (anti auto-zoom iOS). Maks 3–4 ukuran per
layar; hierarki sekunder lewat warna (`ink-sub`/`ink-faint`), bukan ukuran baru.
**Banned:** serif generik di UI; menyatukan semuanya jadi Inter polos tanpa Sora.

---

## 4. Component Stylings

- **Tombol primer (`.btn-brand`):** gradient emerald hidup + glow brand + glossy top-edge, `rounded-xl`, **spring-press scale 0.97**. Teks putih lolos AA. Tanpa outer-glow neon.
- **Tombol sekunder (`.btn-secondary`):** border `control`, hover bg netral, spring-press. Untuk Batal/Tutup.
- **Kartu:** `bg-white` + `.lift` (inset top-highlight + ring tepi crisp 1px + contact + key + ambient float, spread negatif → melayang TERKONTAIN, bukan fog). Radius 16–24px. Top-light glass `#FFFFFF→#F4F7FC`.
- **Input (`.field` / `.field-search`):** label di atas, fokus = ring emerald `#10B981`. Tinggi efektif ≥16px. Tanpa floating label.
- **Loading:** **shimmer skeleton** sesuai dimensi layout (`.skeleton`), cross-fade ke konten. **Tanpa spinner bulat generik.**
- **Empty state:** komposisi ber-ilustrasi yang "bernapas" (pop + bob halus), bukan teks "No data".
- **Sheet/Modal:** slide-up dari bawah + backdrop fade; WAJIB pola dialog (role=dialog + fokus trap + Escape).
- **Nav:** bottom-nav **kapsul melayang** (floating glass), ikon aktif solid, touch target ≥44px.

---

## 5. Layout Principles

- **Base unit 4px.** Skala: 4, 8, 12, 16, 20, 24, 28, 32.
- **Radius:** 6 / 8 / 12 / 16 / 24px. Pill = `rounded-full`.
- **Mobile-first single-column.** Konten dibatasi (`max-w-lg` untuk sheet). Grid `grid-cols-2/3/4` untuk statistik bento.
- **Touch target ≥44px** untuk semua elemen interaktif.
- **Safe-area** dihormati; tinggi penuh pakai `min-h-dvh` (BUKAN `h-screen`/`vh` — cegah lompatan iOS Safari).
- Spacing: 4–8px (dalam grup) · 12–16px (antar grup) · 24–32px (antar section).

---

## 6. Motion & Interaction

- **Easing:** spring `cubic-bezier(0.34,1.4,0.5,1)` (elemen hidup: pill nav, count-up) & out-expo `cubic-bezier(0.16,1,0.3,1)` (default).
- **Staggered reveal** untuk list (`.rise`, delay per item) — jangan mount serentak.
- **Exit lebih cepat dari enter** (sistem merespons, bukan menunda). Micro 150–300ms, transisi halaman 300–500ms.
- Animasi via `transform`/`opacity` saja. Grain/noise di pseudo-element fixed.
- **Wajib** taat `prefers-reduced-motion` **dan** `prefers-reduced-transparency` (matikan backdrop-filter, padatkan kaca jadi solid).

---

## 7. Anti-Patterns (Banned)

- **Tanpa** emoji di UI.
- **Tanpa** purple/blue AI-neon, outer-glow neon, oversaturated accent.
- **Tanpa** pure black `#000000` (pakai `#0B1220`).
- **Tanpa** spinner bulat generik (pakai shimmer skeleton).
- **Tanpa** mencampur red/rose & green/emerald dalam satu layar.
- **Tanpa** menjadikan amber (tunggakan) atau biru (status setor) sebagai aksen utama.
- **Tanpa** emas songket pada uang/status/nav/CTA — dekoratif kultural saja.
- **Tanpa** klise copy AI ("Elevate", "Seamless", "Next-Gen") — **UI berbahasa Indonesia**, ringkas & manusiawi.
- **Tanpa** data/metrik fiktif — pakai placeholder `[nominal]` bila data nyata tak ada.
- **Tanpa** nama generik ("John Doe", "Acme") — konteks RT: nama Sohibul Bait, "RT 004/006".
- **Tanpa** broken Unsplash link — pakai SVG/avatar.
- **Tanpa** `h-screen` (pakai `min-h-dvh`).

### Pengecualian sah (JANGAN dianggap pelanggaran)
- **Inter** sebagai body font (berpasangan dengan Sora display).
- **Gold songket `#E8B651`** sebagai motif/sorot dekoratif kultural.
- **Hero terpusat & layout single-column** (ini app mobile, bukan landing page).
