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
 *
 * ── ATURAN ANTI-FALSE-POSITIVE (jangan dilonggarkan tanpa bukti) ───────────
 * 1. JANGAN PERNAH menyampel piksel garis 1–2px. Itu sumber tunggal 33 FP di
 *    audit teks dulu. Di sini warna garis diambil dari CSS (computed), lalu
 *    di-blend ke atas piksel tetangga yang disampel di LUAR elemen.
 * 2. Ikon dekoratif dikecualikan: aria-hidden, atau kontrolnya sudah punya
 *    teks terlihat. §1.4.11 hanya menuntut grafis yang DIPERLUKAN untuk paham.
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
const seen = new Set();

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
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.4) return false;
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
    for (const svg of document.querySelectorAll('svg')) {
      if (!vis(svg) || mati(svg)) continue;
      if (svg.closest('[aria-hidden="true"]') && !svg.matches('[role="img"]')) continue;
      const r = svg.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      const ctrl = svg.closest(CTRL_SEL);
      const mandiri = svg.matches('[role="img"]') || svg.hasAttribute('aria-label');
      // Dekoratif: tak ada kontrol induk, atau kontrolnya sudah punya label teks.
      if (!mandiri) {
        if (!ctrl) continue;
        if (labelTerlihat(ctrl)) continue;
      }
      if (!takTerhalang(svg)) continue;
      const cs = getComputedStyle(svg);
      const stroke = cs.stroke && cs.stroke !== 'none' ? cs.stroke : null;
      const fill = cs.fill && cs.fill !== 'none' ? cs.fill : null;
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
    for (const el of document.querySelectorAll('[data-grafik]')) {
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
    const sel = 'input:not([type="hidden"]):not([type="file"]):not([type="range"]),select,textarea,[role="switch"],[role="checkbox"]';
    for (const el of document.querySelectorAll(sel)) {
      if (!vis(el) || mati(el)) continue;
      if (el.type === 'checkbox' || el.type === 'radio') continue; // dirender UA, dikecualikan §1.4.11
      if (!takTerhalang(el)) continue;
      const cs = getComputedStyle(el);
      const sisi = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({
        w: parseFloat(cs['border' + s + 'Width']) || 0,
        c: cs['border' + s + 'Color'],
      })).filter((s) => s.w >= 0.5);
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
  const [ikon, field, grafik] = await Promise.all([collectIcons(page), collectFields(page), collectGrafik(page)]);

  if (ikon.length || field.length || grafik.length) {
    const shot = (await page.screenshot()).toString('base64');
    const ptsIkon = ikon.map((e) => clamp(insidePoints(e.rect, 1).concat(outsidePoints(e.rect, 3))));
    const ptsLuar = field.map((e) => clamp(outsidePoints(e.rect, 3)));
    const ptsDalam = field.map((e) => clamp(insidePoints(e.rect, 6)));
    const ptsGrafik = grafik.map((e) => clamp(chartBgPoints(e.rect, 6)));
    const flat = [...ptsIkon.flat(), ...ptsLuar.flat(), ...ptsDalam.flat(), ...ptsGrafik.flat()];
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

    ikon.forEach((e, i) => {
      const res = nilaiIkon(e, sIkon[i]);
      if (!res) return;
      push({ jenis: 'ikon', ctx: ctxName, nama: e.nama, tag: e.tag, fg: res.fg.join(), bg: res.bg.join(), ratio: +res.ratio.toFixed(2), need: NEED, pass: res.ratio >= NEED });
    });
    field.forEach((e, i) => {
      const res = nilaiField(e, sLuar[i], sDalam[i]);
      if (!res) return;
      push({ jenis: 'batas-kontrol', ctx: ctxName, nama: e.nama, tag: e.tag, lewat: res.lewat, fg: res.fg.join(), bg: res.bg.join(), ratio: +res.ratio.toFixed(2), need: NEED, pass: res.ratio >= NEED });
    });
    grafik.forEach((e, i) => {
      const res = nilaiIkon(e, sGrafik[i]);
      if (!res) return;
      push({ jenis: 'grafik', ctx: ctxName, nama: e.nama, tag: e.tag, fg: res.fg.join(), bg: res.bg.join(), ratio: +res.ratio.toFixed(2), need: NEED, pass: res.ratio >= NEED });
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
for (const j of ['ikon', 'batas-kontrol', 'ring-fokus', 'grafik']) {
  const s = per(j);
  console.log(`  ${j.padEnd(14)} ${String(s.length).padStart(4)} sampel, ${s.filter((r) => !r.pass).length} gagal`);
}
console.log(`  TOTAL          ${String(results.length).padStart(4)} sampel, ${fails.length} gagal\n`);
for (const f of fails) {
  console.log(`${String(f.ratio).padStart(5)} [${f.jenis}] [${f.ctx}] "${f.nama}" ${f.asal || f.lewat || ''} fg(${f.fg}) bg(${f.bg}) <${f.tag}>`);
}
process.exit(fails.length ? 1 : 0);
