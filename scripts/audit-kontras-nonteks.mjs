/* Audit kontras NON-TEKS — WCAG 2.1 §1.4.11 + indikator fokus §2.4.7/2.4.13.
 *
 * Kenapa ada: `audit:kontras` dan `audit-kontras-deep` cuma menyampel TEKS.
 * Ikon tanpa label, garis batas kolom isian, dan ring fokus tak pernah diukur
 * sekali pun — persis pola blind-spot yang sudah 7x kejadian di repo ini
 * ("audit jalan lawan keadaan yang tak pernah dirender").
 *
 * Empat pemeriksaan, ambang 3:1 semua:
 *   A. IKON BERMAKNA  — ikon di kontrol yang TIDAK punya label teks terlihat.
 *   B. BATAS KONTROL  — input/select/textarea: batas ATAU fill harus 3:1 vs latar.
 *   C. RING FOKUS     — indikator :focus-visible asli (lewat Tab) vs latar sebelah.
 *   D. TANDA GRAFIK   — garis tren, bar, dot legenda (opt-in `data-grafik`).
 *   E. GLYPH NATIVE   — ikon yang digambar BROWSER di dalam kontrol native
 *                       (panah `select`, tombol picker `input[type=date]`).
 *
 * ── Kenapa E ada (24 Agu 2026) ────────────────────────────────────────────
 * A–D semuanya memungut populasinya lewat `querySelectorAll`. Glyph kontrol
 * native BUKAN simpul DOM — ia pseudo-element shadow UA
 * (`::-webkit-calendar-picker-indicator`) atau digambar langsung oleh mesin
 * render. Jadi 9 glyph (5 kolom tanggal + 4 select) tak pernah terukur sekali
 * pun, di sapuan mana pun, sepanjang umur repo ini. Kelas titik-buta yang SAMA
 * dgn Odometer di `audit:lebar` dan `::placeholder` di `audit:kontras`: apa pun
 * yang tak punya simpul DOM hilang dari populasi berbasis selektor.
 *
 * Karena tak ada elemen untuk dibaca `getComputedStyle`-nya, E menilai lewat
 * PIKSEL: band di tepi KANAN kontrol, latar = modus, tinta = piksel terjauh
 * dari latar. Bandnya tidak ditebak — dipetakan lebih dulu di build sungguhan:
 *   input[type=date]  teks berhenti 56px dari kanan · glyph 12..38px
 *   select            teks berhenti 53px dari kanan · glyph  7..13px
 * Band 6..40px dari tepi kanan karena itu memuat glyph KEDUANYA & tak pernah
 * menyentuh teks (yang akan menang jadi "piksel terjauh" lalu MENYEMBUNYIKAN
 * panah abu yang gagal). Inset 6px juga menjauhkannya dari garis batas —
 * aturan anti-FP no.1 di atas.
 *
 * Band yang TIDAK menemukan tinta dihitung `tak terukur`, BUKAN lulus.
 *
 * ── ATURAN ANTI-FALSE-POSITIVE (jangan dilonggarkan tanpa bukti) ───────────
 * 1. JANGAN PERNAH menyampel piksel garis 1–2px. Itu sumber tunggal 33 FP di
 *    audit teks dulu. Di sini warna garis diambil dari CSS (computed), lalu
 *    di-blend ke atas piksel tetangga yang disampel di LUAR elemen.
 * 2. Ikon dekoratif dikecualikan: aria-hidden, atau kontrolnya sudah punya
 *    teks terlihat. §1.4.11 hanya menuntut grafis yang DIPERLUKAN untuk paham.
 *
 *    KATUP `data-penanda` (2 Sep 2026) — dan ini menutup lubang yang sudah
 *    memakan satu cacat nyata. Klausa "kontrolnya sudah punya teks terlihat"
 *    benar untuk ikon yang MENGULANG labelnya (ikon unduh di sebelah kata
 *    "Ekspor"), tapi SALAH untuk ikon yang membawa informasi yang tak ada di
 *    label mana pun. Chevron baris Riwayat Aktivitas persis itu: labelnya
 *    berbunyi "Pelunasan talangan · Talangan lunas — …", dan tak satu kata pun
 *    mengatakan baris ini BISA DIBUKA. Ia satu-satunya penanda yang mengatakan
 *    itu — dan ia hidup di 1,47:1 (terang) & 2,04:1 (gelap) selama berbulan-
 *    bulan sementara sapuan ini dengan patuh mencetak "0 gagal", karena
 *    klausa itu membuangnya dari populasi sebelum sempat diukur.
 *
 *    Populasinya OPT-IN, bukan tebakan selektor — preseden `data-grafik`
 *    (bagian D) & `data-ptr` di `audit:gestur`: tak ada ciri STRUKTURAL yang
 *    membedakan "chevron yang menyatakan bisa-dibuka" dari "ikon yang cuma
 *    mengulang labelnya". Keduanya svg di dalam button berlabel. Jadi
 *    call-site yang menyatakannya, dan penanda itu MENANG atas klausa
 *    label-terlihat (bukan atas aria-hidden — grafis yang sengaja
 *    disembunyikan dari a11y tree tetap di luar).
 *
 *    Ikon BARU yang menyatakan sesuatu yang tak tertulis di labelnya WAJIB
 *    memasang `data-penanda` — kalau tidak, ia tak terukur.
 * 3. `.sr-only` bukan teks terlihat — dideteksi lewat rect ≤1px, bukan innerText.
 * 4. Kontrol nonaktif dikecualikan (pengecualian eksplisit di §1.4.11).
 * 5. Kontrol LOLOS bila salah satu penanda cukup: batas ≥3:1 ATAU fill ≥3:1.
 * 6. Ring fokus dinilai sebagai SATU KESATUAN: outline + tiap lapis box-shadow
 *    dihitung, diambil yang terbaik. Ring putih offset tidak boleh menjatuhkan
 *    ring berwarna di belakangnya.
 * 7. :focus-visible harus ASLI — hanya lewat Tab keyboard, bukan el.focus().
 *    Screenshot diambil PER elemen fokus supaya rect & piksel sezaman
 *    (tab bisa menggulir halaman; baseline tunggal akan meleset).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  ratio, blend, parseColor, modusBg, samplePixels,
  newCtx, loginWarga, gotoTab, closeLayer, openMenuItem,
} from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5174';
const OUT = process.env.OUT_DIR || '.audit-kontras-nonteks';
const ONLY = process.env.ONLY; // 'warga' | 'bendahara' | 'landing'
mkdirSync(OUT, { recursive: true });

const NEED = 3;                // §1.4.11 & §2.4.13 sama-sama 3:1
const results = [];
const goyah = []; // rect tak sezaman dgn piksel — tak terukur, bukan lulus
const seen = new Set();
/* Band glyph yang tak menemukan tinta. Dicetak terpisah — sapuan tak boleh
   menyempitkan populasinya sendiri tanpa mengaku (pelajaran cacat ke-17/18). */
const glyphButa = [];

const push = (row) => {
  const key = `${row.jenis}|${row.ctx}|${row.nama}|${row.fg}|${row.bg}`;
  if (seen.has(key)) return;
  seen.add(key);
  results.push(row);
};

/* Titik sampel di LUAR kotak elemen. `gap` harus melampaui tebal garis +
   outline-offset, kalau tidak yang terbaca justru garisnya sendiri (aturan 1). */
const outsidePoints = (r, gap) => {
  const pts = [];
  for (const f of [0.25, 0.5, 0.75]) {
    pts.push([r.x + r.w * f, r.y - gap], [r.x + r.w * f, r.y + r.h + gap]);
  }
  for (const f of [0.35, 0.65]) {
    pts.push([r.x - gap, r.y + r.h * f], [r.x + r.w + gap, r.y + r.h * f]);
  }
  return pts;
};

/* Titik sampel latar untuk TANDA GRAFIK — sengaja hanya di ATAS & BAWAH.
   `outsidePoints` juga menyampel kiri & kanan, dan di grafik bar tetangga
   sebelah persis ada bar LAIN berjarak ~4px: warnanya beda jauh dari tanda yang
   diukur sehingga lolos saringan `avoid` di `modusBg`, lalu ikut jadi kandidat
   "latar" — bar masuk akan diadu lawan bar keluar, bukan lawan kartu. Di atas
   bar tertinggi & di bawah garis dasar selalu permukaan kartu. */
const chartBgPoints = (r, gap) => {
  const pts = [];
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    pts.push([r.x + r.w * f, r.y - gap], [r.x + r.w * f, r.y + r.h + gap]);
  }
  return pts;
};

/* Titik sampel di DALAM kotak, jauh dari tepi (tak kena garis) — untuk fill. */
/* Band glyph: tepi KANAN kontrol, 6..40px dari tepi, inset 6px vertikal.
   Langkah 1px mendatar — panah `select` cuma selebar ~6px & bergaris tipis;
   langkah 2px bisa mendarat di antara goresan lalu cuma memungut piksel
   antialias, dan itu melahirkan kegagalan palsu (pelajaran 33 FP audit teks). */
const glyphPoints = (r) => {
  const pts = [];
  const x1 = r.x + r.w - 6;
  const x0 = Math.max(r.x + 2, r.x + r.w - 40);
  const y0 = r.y + 6, y1 = r.y + r.h - 6;
  if (x1 <= x0 || y1 <= y0) return pts;
  for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 2) pts.push([x, y]);
  return pts;
};

const insidePoints = (r, inset) => {
  const pts = [];
  const ix = Math.min(inset, Math.max(1, r.w / 2 - 1));
  const iy = Math.min(inset, Math.max(1, r.h / 2 - 1));
  for (let i = 0; i <= 4; i++) {
    const x = r.x + ix + (i * (r.w - 2 * ix)) / 4;
    pts.push([x, r.y + iy], [x, r.y + r.h - iy], [x, r.y + r.h / 2]);
  }
  return pts;
};

const clamp = (pts) => pts.map(([x, y]) => [Math.max(0, Math.min(389, x)), Math.max(0, Math.min(843, y))]);

// ── pengumpul di dalam halaman ────────────────────────────────────────────
const PAGE_HELPERS = `
  const CTRL_SEL = 'button,a,[role="button"],[role="tab"],[role="menuitem"],[role="switch"],[role="checkbox"],summary,label';
  /* Opacity TIDAK diwariskan ke computed style anak: svg di dalam pembungkus
     ber-'opacity:0' tetap melaporkan opacity 1. Tanpa memanjat leluhur, kontrol
     yang sedang DISEMBUNYIKAN masuk populasi — terukur 29 Agu 2026: FAB
     'useScrollHide' dipungut saat pembungkusnya opacity 0, lalu pikselnya
     disampel di tempat FAB sudah tak ada → "ikon putih di atas kanvas" 1,33:1.
     Cacat ALAT, bukan cacat app: ikonnya duduk di rgb(10,86,50) padat. */
  const opacityEfektif = (el) => {
    let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const v = +getComputedStyle(n).opacity;
      if (!Number.isNaN(v)) o *= v;
      if (o < 0.4) return o;
    }
    return o;
  };
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || opacityEfektif(el) < 0.4) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  const mati = (el) => !!(el.disabled || el.closest('[disabled],[aria-disabled="true"]'));
  /* Teks TERLIHAT: .sr-only punya rect <=1px → bukan label yang dilihat warga.
     Jangan pakai innerText (sr-only ikut terbaca — jebakan lama repo ini). */
  const labelTerlihat = (ctrl) => {
    let t = '';
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) { t += c.textContent; continue; }
        if (c.nodeType !== 1) continue;
        const cs = getComputedStyle(c);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = c.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) continue;
        walk(c);
      }
    };
    walk(ctrl);
    return t.trim();
  };
  const takTerhalang = (el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(
      Math.min(innerWidth - 1, Math.max(0, r.x + r.width / 2)),
      Math.min(innerHeight - 1, Math.max(0, r.y + r.height / 2)),
    );
    return !!hit && (el.contains(hit) || hit.contains(el));
  };
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const jejak = (el) => el.tagName.toLowerCase() +
    (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
`;

async function collectIcons(page) {
  return page.evaluate(`(() => {
    ${PAGE_HELPERS}
    const out = [];
    /* Penanda LAMA wajib dibuang: indeks di-reset tiap tampilan sedangkan
       halaman di belakang overlay tak di-unmount, jadi atribut sisa membuat
       'data-nt-ikon="3"' menunjuk elemen tampilan SEBELUMNYA — penjaga
       sezaman lalu membandingkan dua elemen berbeda. */
    for (const n of document.querySelectorAll('[data-nt-ikon]')) n.removeAttribute('data-nt-ikon');
    for (const svg of document.querySelectorAll('svg')) {
      const el2 = svg;
      if (!vis(svg) || mati(svg)) continue;
      if (svg.closest('[aria-hidden="true"]') && !svg.matches('[role="img"]')) continue;
      const r = svg.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      const ctrl = svg.closest(CTRL_SEL);
      const mandiri = svg.matches('[role="img"]') || svg.hasAttribute('aria-label');
      /* Katup opt-in: call-site menyatakan "ikon ini membawa info yang TAK ada
         di label" (aturan 2). Menang atas klausa label-terlihat di bawah, TIDAK
         atas saringan aria-hidden di atas. */
      const penanda = !!svg.closest('[data-penanda]');
      // Dekoratif: tak ada kontrol induk, atau kontrolnya sudah punya label teks.
      if (!mandiri && !penanda) {
        if (!ctrl) continue;
        if (labelTerlihat(ctrl)) continue;
      }
      if (!takTerhalang(svg)) continue;
      const cs = getComputedStyle(svg);
      const stroke = cs.stroke && cs.stroke !== 'none' ? cs.stroke : null;
      const fill = cs.fill && cs.fill !== 'none' ? cs.fill : null;
      el2.setAttribute('data-nt-ikon', String(out.length));
      out.push({
        nama: (ctrl && (ctrl.getAttribute('aria-label') || labelTerlihat(ctrl))) || svg.getAttribute('aria-label') || jejak(svg),
        warna: stroke || fill || cs.color,
        opacity: +cs.opacity || 1,
        rect: rectOf(svg),
        tag: jejak(ctrl || svg),
      });
    }
    return out;
  })()`);
}

/* D. TANDA GRAFIK — garis tren, bar, dot legenda.
 *
 * Ditambahkan 4 Agu 2026. Pemeriksaan A (ikon) sengaja MELEWATI svg ber-leluhur
 * `aria-hidden` (aturan 2: grafis dekoratif tak dituntut §1.4.11), dan seluruh
 * grafik app justru aria-hidden — ringkasannya sudah dibacakan lewat teks di
 * `role="img"`. Akibatnya tanda grafik tak pernah terukur sekali pun, dan garis
 * "Tren Saldo" bertahan di 2,28:1 di mode gelap (hex `#0F6039` yang disetel
 * untuk kartu PUTIH, tanpa pasangan gelap sama sekali) sampai ditemukan lewat
 * mata, bukan lewat alat.
 *
 * Populasinya OPT-IN lewat `data-grafik`, bukan tebakan selektor: bar adalah
 * `div` biasa, garisnya `path` — keduanya tak punya ciri struktural yang bisa
 * dibedakan dari elemen tata letak. Selektor tebakan di repo ini sudah 10x
 * mengambil populasi yang salah; di sini penandanya eksplisit di call-site.
 *
 * Warna diambil dari CSS lalu di-blend ke piksel LUAR elemen (aturan 1) —
 * garis 2px tak boleh disampel pikselnya sendiri. `nilaiIkon` dipakai ulang
 * apa adanya: matematikanya memang identik (tanda vs latar sekitarnya). */
async function collectGrafik(page) {
  return page.evaluate(`(() => {
    ${PAGE_HELPERS}
    const out = [];
    /* Penanda LAMA wajib dibuang: indeks di-reset tiap tampilan sedangkan
       halaman di belakang overlay tak di-unmount, jadi atribut sisa membuat
       'data-nt-grafik="3"' menunjuk elemen tampilan SEBELUMNYA — penjaga
       sezaman lalu membandingkan dua elemen berbeda. */
    for (const n of document.querySelectorAll('[data-nt-grafik]')) n.removeAttribute('data-nt-grafik');
    for (const el of document.querySelectorAll('[data-grafik]')) {
      const el2 = el;
      if (!vis(el) || mati(el)) continue;
      const r = el.getBoundingClientRect();
      /* Bar yang nilainya nyaris nol tetap dirender setinggi <1px. Ia tak
         membawa informasi yang bisa dibaca siapa pun, dan rect setipis itu
         membuat titik sampel "luar" jatuh di dalam dirinya sendiri. */
      if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el);
      const isSvg = el.ownerSVGElement || el.tagName.toLowerCase() === 'path';
      const stroke = isSvg && cs.stroke && cs.stroke !== 'none' ? cs.stroke : null;
      const isi = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : null;
      const warna = stroke || isi || (isSvg ? cs.fill : null);
      if (!warna || warna === 'none') continue;
      el2.setAttribute('data-nt-grafik', String(out.length));
      out.push({
        nama: el.getAttribute('data-grafik'),
        warna,
        opacity: +cs.opacity || 1,
        rect: rectOf(el),
        tag: jejak(el),
      });
    }
    return out;
  })()`);
}

async function collectFields(page) {
  return page.evaluate(`(() => {
    ${PAGE_HELPERS}
    const out = [];
    /* Penanda LAMA wajib dibuang: indeks di-reset tiap tampilan sedangkan
       halaman di belakang overlay tak di-unmount, jadi atribut sisa membuat
       'data-nt-field="3"' menunjuk elemen tampilan SEBELUMNYA — penjaga
       sezaman lalu membandingkan dua elemen berbeda. */
    for (const n of document.querySelectorAll('[data-nt-field]')) n.removeAttribute('data-nt-field');
    const sel = 'input:not([type="hidden"]):not([type="file"]):not([type="range"]),select,textarea,[role="switch"],[role="checkbox"]';
    for (const el of document.querySelectorAll(sel)) {
      const el2 = el;
      if (!vis(el) || mati(el)) continue;
      if (el.type === 'checkbox' || el.type === 'radio') continue; // dirender UA, dikecualikan §1.4.11
      if (!takTerhalang(el)) continue;
      const cs = getComputedStyle(el);
      const sisi = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({
        w: parseFloat(cs['border' + s + 'Width']) || 0,
        c: cs['border' + s + 'Color'],
      })).filter((s) => s.w >= 0.5);
      el2.setAttribute('data-nt-field', String(out.length));
      out.push({
        nama: el.id || el.name || el.getAttribute('placeholder') || el.getAttribute('aria-label') || jejak(el),
        garis: sisi.map((s) => s.c),
        isi: cs.backgroundColor,
        rect: rectOf(el),
        tag: jejak(el),
      });
    }
    return out;
  })()`);
}

/** Kontrol yang glyph-nya digambar BROWSER, bukan oleh app. */
async function collectGlyphNative(page) {
  return page.evaluate(`(() => {
    ${PAGE_HELPERS}
    const out = [];
    /* Penanda LAMA wajib dibuang: indeks di-reset tiap tampilan sedangkan
       halaman di belakang overlay tak di-unmount, jadi atribut sisa membuat
       'data-nt-glyph="3"' menunjuk elemen tampilan SEBELUMNYA — penjaga
       sezaman lalu membandingkan dua elemen berbeda. */
    for (const n of document.querySelectorAll('[data-nt-glyph]')) n.removeAttribute('data-nt-glyph');
    for (const el of document.querySelectorAll('select,input[type="date"],input[type="time"]')) {
      const el2 = el;
      if (!vis(el) || mati(el)) continue;   // nonaktif = pengecualian eksplisit §1.4.11
      if (!takTerhalang(el)) continue;
      const r = rectOf(el);
      if (r.w < 48 || r.h < 20) continue;   // terlalu sempit utk punya band glyph
      el2.setAttribute('data-nt-glyph', String(out.length));
      out.push({
        nama: el.id || el.name || el.getAttribute('aria-label') || jejak(el),
        jenisKontrol: el.tagName.toLowerCase() + (el.type ? '[' + el.type + ']' : ''),
        rect: r,
        tag: jejak(el),
      });
    }
    return out;
  })()`);
}

/** Kandidat fokus + gaya SEBELUM difokus (pembanding "tak ada indikator"). */
async function stampFocusables(page) {
  return page.evaluate(`(() => {
    ${PAGE_HELPERS}
    const sel = 'button,a[href],input:not([type="hidden"]),select,textarea,summary,[tabindex]:not([tabindex="-1"])';
    let i = 0;
    const out = [];
    for (const el of document.querySelectorAll(sel)) {
      if (!vis(el) || mati(el)) continue;
      if (!takTerhalang(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      el.setAttribute('data-nk', String(i));
      const cs = getComputedStyle(el);
      out.push({
        nk: i, nama: el.getAttribute('aria-label') || labelTerlihat(el).slice(0, 40) || jejak(el),
        diam: { outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, shadow: cs.boxShadow, bg: cs.backgroundColor, border: cs.borderTopColor },
        tag: jejak(el),
      });
      i++;
      if (i >= 24) break; // cukup untuk mewakili satu layar; hemat screenshot
    }
    return out;
  })()`);
}

/** Gaya elemen yang SEDANG fokus (dipanggil setelah Tab asli). */
async function focusedStyle(page) {
  return page.evaluate(`(() => {
    ${PAGE_HELPERS}
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      nk: el.getAttribute('data-nk'),
      nama: el.getAttribute('aria-label') || labelTerlihat(el).slice(0, 40) || jejak(el),
      tag: jejak(el),
      outlineStyle: cs.outlineStyle,
      outlineWidth: parseFloat(cs.outlineWidth) || 0,
      outlineOffset: parseFloat(cs.outlineOffset) || 0,
      outlineColor: cs.outlineColor,
      shadow: cs.boxShadow,
      bg: cs.backgroundColor,
      border: cs.borderTopColor,
      rect: rectOf(el),
      dalamViewport: r.top >= 0 && r.bottom <= innerHeight,
    };
  })()`);
}

// ── penilaian ─────────────────────────────────────────────────────────────
function nilaiIkon(el, samples) {
  const cand = parseColor(el.warna);
  if (!cand) return null;
  const bgs = modusBg(samples, cand.rgb, 55);
  if (!bgs) return null;
  let worst = Infinity, worstBg = null;
  for (const bg of bgs) {
    const fg = blend(cand.rgb, cand.a * el.opacity, bg);
    const r = ratio(fg, bg);
    if (r < worst) { worst = r; worstBg = bg; }
  }
  return { ratio: worst, bg: worstBg, fg: cand.rgb };
}

/* Glyph native dinilai MURNI dari piksel — tak ada elemen yang bisa dibaca
   `getComputedStyle`-nya. Latar = modus band; tinta = piksel TERJAUH dari
   latar (inti goresan, bukan tepi antialias-nya).

   `null` = tak ada tinta di band → dilaporkan `tak terukur`, BUKAN lulus.
   Sapuan yang menghitung band kosong sebagai lulus akan mencetak angka yang
   sama untuk "glyph-nya bagus" dan "aku tak menemukan glyph apa pun". */
const AMBANG_TINTA = 30;   // jarak RGB minimum agar dianggap tinta, bukan noise

function nilaiGlyph(samples) {
  if (!samples || samples.length < 20) return null;
  const cnt = new Map();
  for (const c of samples) { const k = c.join(','); cnt.set(k, (cnt.get(k) || 0) + 1); }
  const bg = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
  let ink = null, dmax = -1;
  for (const c of samples) {
    const d = Math.hypot(c[0] - bg[0], c[1] - bg[1], c[2] - bg[2]);
    if (d > dmax) { dmax = d; ink = c; }
  }
  if (dmax < AMBANG_TINTA) return null;
  return { ratio: ratio(ink, bg), fg: ink, bg };
}

function nilaiField(el, luar, dalam) {
  const bgs = modusBg(luar, null);
  if (!bgs) return null;
  const bg = bgs[0];
  const isiRaw = parseColor(el.isi);
  const isi = isiRaw && isiRaw.a > 0 ? blend(isiRaw.rgb, isiRaw.a, bg) : (modusBg(dalam, null)?.[0] ?? bg);
  let best = ratio(isi, bg), lewat = 'fill', fg = isi;
  for (const g of el.garis) {
    const c = parseColor(g);
    if (!c || c.a === 0) continue;
    const garis = blend(c.rgb, c.a, bg);
    const r = ratio(garis, bg);
    if (r > best) { best = r; lewat = 'batas'; fg = garis; }
  }
  return { ratio: best, lewat, bg, fg };
}

/** Semua lapis indikator (outline + tiap box-shadow) → rasio terbaik. */
function nilaiFokus(st, bg) {
  const lapis = [];
  if (st.outlineStyle !== 'none' && st.outlineWidth >= 1) {
    const c = parseColor(st.outlineColor);
    if (c && c.a > 0) lapis.push({ asal: 'outline', ...c });
  }
  if (st.shadow && st.shadow !== 'none') {
    for (const m of st.shadow.matchAll(/rgba?\([^)]+\)/g)) {
      const c = parseColor(m[0]);
      if (c && c.a > 0) lapis.push({ asal: 'ring', ...c });
    }
  }
  if (!lapis.length) return { ratio: 0, asal: 'TIDAK ADA', fg: null };
  let best = 0, asal = '', fg = null;
  for (const l of lapis) {
    const v = blend(l.rgb, l.a, bg);
    const r = ratio(v, bg);
    if (r > best) { best = r; asal = l.asal; fg = v; }
  }
  return { ratio: best, asal, fg };
}

// ── sapuan satu tampilan ──────────────────────────────────────────────────
async function auditView(page, ctxName, { fokus = false } = {}) {
  const [ikon, field, grafik, glyph] = await Promise.all([collectIcons(page), collectFields(page), collectGrafik(page), collectGlyphNative(page)]);

  if (ikon.length || field.length || grafik.length || glyph.length) {
    const shot = (await page.screenshot()).toString('base64');
    /* SEZAMAN: rect dibaca SEBELUM screenshot; kalau elemennya bergerak atau
       menghilang di antara keduanya, titik sampel menunjuk tempat yang sudah
       kosong dan sapuan melaporkan latar milik HALAMAN, bukan milik kontrol.
       Terukur 29 Agu 2026: FAB `useScrollHide` bergeser 84px di celah itu →
       dua "ikon gagal 1,33:1" yang sepenuhnya palsu (ikonnya duduk di
       rgb(10,86,50)). Yang bergeser dihitung `goyah`, BUKAN lulus & bukan
       gagal — sapuan tak boleh menyempitkan populasinya sendiri diam-diam. */
    const rectKini = await page.evaluate(() => {
      const baca = (attr) => {
        const out = {};
        for (const el of document.querySelectorAll('[' + attr + ']')) {
          const r = el.getBoundingClientRect();
          let o = 1;
          for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= (+getComputedStyle(n).opacity || 0);
          out[el.getAttribute(attr)] = { x: r.x, y: r.y, o };
        }
        return out;
      };
      return { ikon: baca('data-nt-ikon'), field: baca('data-nt-field'), grafik: baca('data-nt-grafik'), glyph: baca('data-nt-glyph') };
    });
    const sezaman = (jenis, i, e) => {
      const k = rectKini[jenis] && rectKini[jenis][String(i)];
      if (!k) { goyah.push(`${ctxName} ${jenis}#${i} ${e.nama}`); return false; }
      if (k.o < 0.4 || Math.abs(k.x - e.rect.x) > 1 || Math.abs(k.y - e.rect.y) > 1) {
        goyah.push(`${ctxName} ${jenis} "${e.nama}" geser ${Math.round(Math.hypot(k.x - e.rect.x, k.y - e.rect.y))}px / opacity ${k.o.toFixed(2)}`);
        return false;
      }
      return true;
    };
    const ptsIkon = ikon.map((e) => clamp(insidePoints(e.rect, 1).concat(outsidePoints(e.rect, 3))));
    const ptsLuar = field.map((e) => clamp(outsidePoints(e.rect, 3)));
    const ptsDalam = field.map((e) => clamp(insidePoints(e.rect, 6)));
    const ptsGrafik = grafik.map((e) => clamp(chartBgPoints(e.rect, 6)));
    const ptsGlyph = glyph.map((e) => clamp(glyphPoints(e.rect)));
    const flat = [...ptsIkon.flat(), ...ptsLuar.flat(), ...ptsDalam.flat(), ...ptsGrafik.flat(), ...ptsGlyph.flat()];
    const px = await samplePixels(page, shot, flat);

    /* Pemotong blok eksplisit — aritmetika offset manual sudah pernah bikin
       sapuan lain menguji titik milik elemen tetangga. */
    const potong = (grup, mulai) => {
      let o = mulai;
      return grup.map((g) => { const s = px.slice(o, o + g.length); o += g.length; return s; });
    };
    const nIkon = ptsIkon.flat().length;
    const nLuar = ptsLuar.flat().length;
    const nDalam = ptsDalam.flat().length;
    const sIkon = potong(ptsIkon, 0);
    const sLuar = potong(ptsLuar, nIkon);
    const sDalam = potong(ptsDalam, nIkon + nLuar);
    const sGrafik = potong(ptsGrafik, nIkon + nLuar + nDalam);
    const sGlyph = potong(ptsGlyph, nIkon + nLuar + nDalam + ptsGrafik.flat().length);

    ikon.forEach((e, i) => {
      if (!sezaman('ikon', i, e)) return;
      const res = nilaiIkon(e, sIkon[i]);
      if (!res) return;
      push({ jenis: 'ikon', ctx: ctxName, nama: e.nama, tag: e.tag, fg: res.fg.join(), bg: res.bg.join(), ratio: +res.ratio.toFixed(2), need: NEED, pass: res.ratio >= NEED });
    });
    field.forEach((e, i) => {
      if (!sezaman('field', i, e)) return;
      const res = nilaiField(e, sLuar[i], sDalam[i]);
      if (!res) return;
      push({ jenis: 'batas-kontrol', ctx: ctxName, nama: e.nama, tag: e.tag, lewat: res.lewat, fg: res.fg.join(), bg: res.bg.join(), ratio: +res.ratio.toFixed(2), need: NEED, pass: res.ratio >= NEED });
    });
    grafik.forEach((e, i) => {
      if (!sezaman('grafik', i, e)) return;
      const res = nilaiIkon(e, sGrafik[i]);
      if (!res) return;
      push({ jenis: 'grafik', ctx: ctxName, nama: e.nama, tag: e.tag, fg: res.fg.join(), bg: res.bg.join(), ratio: +res.ratio.toFixed(2), need: NEED, pass: res.ratio >= NEED });
    });
    glyph.forEach((e, i) => {
      if (!sezaman('glyph', i, e)) return;
      const res = nilaiGlyph(sGlyph[i]);
      if (!res) { glyphButa.push(`[${ctxName}] ${e.jenisKontrol} "${e.nama}"`); return; }
      push({ jenis: 'glyph-native', ctx: ctxName, nama: `${e.nama} (${e.jenisKontrol})`, tag: e.tag, fg: res.fg.join(), bg: res.bg.join(), ratio: +res.ratio.toFixed(2), need: NEED, pass: res.ratio >= NEED });
    });
  }

  if (fokus) await auditFokus(page, ctxName);
}

async function auditFokus(page, ctxName) {
  const kandidat = await stampFocusables(page);
  if (!kandidat.length) return;
  const diam = new Map(kandidat.map((k) => [String(k.nk), k.diam]));

  await page.evaluate(() => document.body.focus?.());
  await page.keyboard.press('Tab'); // Tab pertama: masuk ke dokumen
  const dilihat = new Set();
  for (let i = 0; i < kandidat.length + 6; i++) {
    const st = await focusedStyle(page);
    if (st && st.nk != null && !dilihat.has(st.nk)) {
      dilihat.add(st.nk);
      if (st.dalamViewport) {
        // Screenshot PER elemen: ring sedang tampil, rect & piksel sezaman.
        const shot = (await page.screenshot()).toString('base64');
        const gap = Math.ceil(st.outlineWidth + Math.max(0, st.outlineOffset)) + 4;
        const px = await samplePixels(page, shot, clamp(outsidePoints(st.rect, gap)));
        const bgs = modusBg(px, null);
        if (bgs) {
          const bg = bgs[0];
          const res = nilaiFokus(st, bg);
          const sama = diam.get(st.nk) &&
            diam.get(st.nk).outline === `${st.outlineStyle} ${st.outlineWidth}px ${st.outlineColor}` &&
            diam.get(st.nk).shadow === st.shadow && diam.get(st.nk).bg === st.bg && diam.get(st.nk).border === st.border;
          push({
            jenis: 'ring-fokus', ctx: ctxName, nama: st.nama, tag: st.tag,
            asal: sama ? 'TAK BERUBAH saat fokus' : res.asal,
            fg: res.fg ? res.fg.join() : '-', bg: bg.join(),
            ratio: sama ? 0 : +res.ratio.toFixed(2), need: NEED,
            pass: !sama && res.ratio >= NEED,
          });
        }
      }
    }
    await page.keyboard.press('Tab');
  }
}

async function auditPage(page, name, opsi) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 640) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(350);
    await auditView(page, name, y === 0 ? opsi : undefined);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

// ── jalankan ──────────────────────────────────────────────────────────────
const browser = await chromium.launch();

for (const theme of ['light', 'dark']) {
  if (!ONLY || ONLY === 'warga') {
    const { ctx, page } = await newCtx(browser, theme);
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await auditPage(page, `${theme}/login`, { fokus: true });
    if (!(await loginWarga(page))) { console.log('GAGAL login warga', theme); await ctx.close(); continue; }
    await page.waitForTimeout(3000);
    const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
    console.log(`[${theme}] tab warga:`, JSON.stringify(tabs));
    for (const t of tabs) {
      await gotoTab(page, t);
      await auditPage(page, `${theme}/w-${t}`, { fokus: t === tabs[0] });
    }
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.waitForTimeout(700);
    await auditView(page, `${theme}/w-menu`, { fokus: true });
    await closeLayer(page);
    await ctx.close();
  }

  if (!ONLY || ONLY === 'bendahara') {
    const { ctx, page } = await newCtx(browser, theme, { bendahara: true });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    if (!(await page.locator('nav button').count())) { console.log(`GAGAL mock bendahara (${theme})`); await ctx.close(); continue; }
    const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
    console.log(`[${theme}] tab bendahara:`, JSON.stringify(tabs));
    for (const t of tabs) {
      await gotoTab(page, t);
      await auditPage(page, `${theme}/b-${t}`, { fokus: t === tabs[0] });
    }
    // Sheet berisi kolom isian — inti pemeriksaan B & C
    for (const [tab, aria, name] of [
      ['Hadiran', 'Setor ke Kas RT', 'b-sheet-setor'],
      ['Kas RT', 'Tambah transaksi Kas RT', 'b-sheet-form-kasrt'],
    ]) {
      await gotoTab(page, tab);
      const fab = page.getByRole('button', { name: aria });
      if (!(await fab.count())) continue;
      await fab.click();
      await page.waitForTimeout(1000);
      if (await page.locator('[role="dialog"]').count()) {
        await auditView(page, `${theme}/${name}`, { fokus: true });
        await page.screenshot({ path: `${OUT}/${theme}_${name}.png` });
        await closeLayer(page);
      }
    }
    /* TIGA permukaan ber-KOLOM TANGGAL yang sampai 3 Sep 2026 tak pernah dibuka
       sapuan ini sekali pun. Bagian E menghitung 5 kolom `input[type=date]` di
       app; dua di antaranya (sheet FAB di atas) sudah terukur, tiga sisanya —
       target Kas RT, tambah jadwal, revisi jadwal — hidup di balik pemicu yang
       tak pernah diklik, jadi glyph pickernya tak pernah masuk populasi.
       Populasi yang tak pernah diukur adalah celah termahal di repo ini: kelas
       yang SAMA sudah menggigit sekali (ikon kalender jadi glyph PADAT milik OS
       di app yang tiap ikonnya lucide outline — 1,31:1, diperbaiki `70aadd9`),
       dan ia lolos justru karena pseudo shadow UA bukan simpul DOM.
       Pemicunya BERBEDA bentuk (satu tombol, satu FAB, satu di dalam sheet
       aksi), jadi tiap entri membawa pembukanya sendiri — bukan satu pola aria
       yang dipaksakan ke tiga bentuk yang berbeda. */
    for (const [tab, buka, name] of [
      ['Kas RT', async (pg) => {
        const ubah = pg.getByRole('button', { name: 'Ubah target' });
        if (await ubah.count()) { await ubah.click(); return true; }
        /* Belum ada target → pemicunya tombol putus-putus BERTEKS, bukan
           ber-aria-label. Dua wujud untuk satu aksi: pelajaran ke-13. */
        const tetap = pg.getByRole('button', { name: /Tetapkan Target/i });
        if (await tetap.count()) { await tetap.click(); return true; }
        return false;
      }, 'b-sheet-target'],
      ['Jadwal', async (pg) => {
        const b = pg.getByRole('button', { name: 'Tambah jadwal tarikan' });
        if (!(await b.count())) return false;
        await b.click(); return true;
      }, 'b-sheet-jadwal-tambah'],
      ['Jadwal', async (pg) => {
        const aksi = pg.getByRole('button', { name: /^Aksi lainnya tarikan/ }).first();
        if (!(await aksi.count())) return false;
        await aksi.click();
        await pg.waitForTimeout(800);
        const rev = pg.getByRole('button', { name: /Revisi jadwal/i }).first();
        if (!(await rev.count())) return false;
        await rev.click(); return true;
      }, 'b-sheet-jadwal-revisi'],
    ]) {
      await gotoTab(page, tab);
      await page.waitForTimeout(600);
      let ok = false;
      try { ok = await buka(page); } catch { ok = false; }
      if (!ok) { console.log(`  [${theme}] DILEWAT ${name} — pemicunya tak ada di data hari ini`); continue; }
      await page.waitForTimeout(1000);
      if (await page.locator('[role="dialog"]').count()) {
        await auditView(page, `${theme}/${name}`, { fokus: true });
        await page.screenshot({ path: `${OUT}/${theme}_${name}.png` });
      } else {
        console.log(`  [${theme}] DILEWAT ${name} — dialog tak terbuka`);
      }
      /* Sheet revisi dibuka DI ATAS sheet aksi → dua lapisan, dua kali tutup. */
      for (let i = 0; i < 2 && (await page.locator('[role="dialog"]').count()); i++) await closeLayer(page);
    }

    for (const [label, name] of [['Kelola Anggota', 'b-anggota'], ['Riwayat Aktivitas', 'b-riwayat']]) {
      if (await openMenuItem(page, label)) {
        await page.waitForTimeout(700);
        await auditView(page, `${theme}/${name}`, { fokus: true });
        await page.screenshot({ path: `${OUT}/${theme}_${name}.png` });
        await page.goBack();
        await page.waitForTimeout(900);
      }
    }
    await ctx.close();
  }

  if (!ONLY || ONLY === 'landing') {
    const { ctx, page } = await newCtx(browser, theme);
    await page.goto(`${URL}/landing.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await auditPage(page, `${theme}/landing`, { fokus: true });
    await ctx.close();
  }
}

await browser.close();
writeFileSync(`${OUT}/hasil.json`, JSON.stringify(results, null, 1));

const per = (j) => results.filter((r) => r.jenis === j);
const fails = results.filter((r) => !r.pass).sort((a, b) => a.ratio - b.ratio);
console.log('\n=== KONTRAS NON-TEKS (ambang 3:1) ===');
for (const j of ['ikon', 'batas-kontrol', 'ring-fokus', 'grafik', 'glyph-native']) {
  const s = per(j);
  console.log(`  ${j.padEnd(14)} ${String(s.length).padStart(4)} sampel, ${s.filter((r) => !r.pass).length} gagal`);
}
console.log(`  TOTAL          ${String(results.length).padStart(4)} sampel, ${fails.length} gagal`);
if (glyphButa.length) {
  console.log(`  glyph tak terukur (band tanpa tinta): ${glyphButa.length}`);
  if (process.env.SHOW_BUTA) glyphButa.forEach((g) => console.log(`    · ${g}`));
}
if (goyah.length) {
  console.log(`  tak terukur (rect tak sezaman dgn piksel — kontrol bergerak/menghilang): ${goyah.length}`);
  if (process.env.SHOW_BUTA) [...new Set(goyah)].forEach((g) => console.log(`    · ${g}`));
}
console.log('');
for (const f of fails) {
  console.log(`${String(f.ratio).padStart(5)} [${f.jenis}] [${f.ctx}] "${f.nama}" ${f.asal || f.lewat || ''} fg(${f.fg}) bg(${f.bg}) <${f.tag}>`);
}
process.exit(fails.length ? 1 : 0);
