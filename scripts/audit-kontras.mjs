// Audit kontras piksel-nyata: Playwright 390px, light+dark, semua tab nav warga.
// FG = computed color; BG = sampel piksel screenshot di perimeter bbox (bukan token).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = process.env.CAP_URL || 'http://localhost:5174';
const OUT = process.env.OUT_DIR || '.audit-kontras';
mkdirSync(OUT, { recursive: true });

function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

async function collectTexts(page) {
  // elemen dgn text node langsung, visible, dalam viewport
  return page.evaluate(() => {
    const out = [];
    const walk = (el) => {
      for (const child of el.children) walk(child);
      let txt = '';
      for (const n of el.childNodes) if (n.nodeType === 3) txt += n.textContent;
      txt = txt.trim();
      if (!txt) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.4) return;
      if (el.closest('[aria-hidden="true"]')) return;
      if (el.disabled || el.closest('[disabled],[aria-disabled="true"]')) return;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 8) return;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
      // occlusion: titik tengah harus milik elemen ini (bukan kartu/sheet lain di atasnya)
      const hit = document.elementFromPoint(
        Math.min(innerWidth - 1, Math.max(0, r.x + r.width / 2)),
        Math.min(innerHeight - 1, Math.max(0, r.y + r.height / 2)),
      );
      if (!hit || (!el.contains(hit) && !hit.contains(el))) return;
      const m = cs.color.match(/[\d.]+/g).map(Number);
      el.setAttribute('data-audit-k', String(out.length)); // dipakai uji occlusion per-TITIK
      out.push({
        text: txt.slice(0, 60),
        color: m.slice(0, 3),
        alpha: m.length > 3 ? m[3] : 1,
        size: parseFloat(cs.fontSize),
        weight: +cs.fontWeight || 400,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 3).join('.') : ''),
      });
    };
    walk(document.body);

    /* ::placeholder — teks yang TAK punya text node, jadi walk() di atas buta
       terhadapnya sejak hari pertama. 16 placeholder di app ("Cari nama
       warga…", "contoh@email.com") tak pernah terukur sekali pun, padahal ia
       teks biasa di mata WCAG 1.4.3 dan justru yang dibaca warga lansia saat
       mencari namanya. Latar = fill field (disampel piksel spt biasa), warna =
       computed `::placeholder`, BUKAN warna teks nilainya. */
    for (const el of document.querySelectorAll('input[placeholder], textarea[placeholder]')) {
      if (el.value) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.4) continue;
      if (el.disabled || el.closest('[disabled],[aria-disabled="true"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 8) continue;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const hit = document.elementFromPoint(
        Math.min(innerWidth - 1, Math.max(0, r.x + r.width / 2)),
        Math.min(innerHeight - 1, Math.max(0, r.y + r.height / 2)),
      );
      if (!hit || (!el.contains(hit) && !hit.contains(el))) continue;
      const ph = getComputedStyle(el, '::placeholder');
      const m = (ph.color || cs.color).match(/[\d.]+/g).map(Number);
      el.setAttribute('data-audit-k', String(out.length));
      out.push({
        text: el.getAttribute('placeholder').slice(0, 60),
        color: m.slice(0, 3),
        alpha: m.length > 3 ? m[3] : 1,
        size: parseFloat(ph.fontSize) || parseFloat(cs.fontSize),
        weight: +ph.fontWeight || +cs.fontWeight || 400,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        tag: el.tagName.toLowerCase() + '::placeholder',
      });
    }
    return out;
  });
}

/* Uji occlusion PER TITIK, bukan cuma titik tengah elemen.
   FP ke-11 (6 Agu): bar nav dok `fixed` menutup 70px terbawah layar (top=774 di
   viewport 844). Teks yang tergulir masuk ke bawahnya tetap lolos uji-tengah —
   tengahnya masih di atas bar — tapi baris sampel tepi-BAWAH mendarat di
   hairline atas bar (`line` #B8C4D3). Karena latar dipilih lewat MODUS, 7 titik
   hairline menang atas fill kartu putih yang tersisa, dan nominal Beranda
   ("Rp600.000") terbaca 5,13:1 padahal latar aslinya banner amber-50 (≈9:1).
   Ukurannya benar; LATARnya yang bukan miliknya. Sama seperti audit:sentuh,
   jawabannya hit-test — dan hit-test itu harus mengenai TIAP titik yang
   benar-benar disampel, bukan cuma titik tengah.

   Hit-test saja TIDAK cukup, dan ini bagian yang bikin percobaan pertama cuma
   menyembuhkan separuh: kotak bar nav mulai di y=774, tapi hairline-nya dicat di
   y=773 — DI LUAR border-box-nya (bayangan/`::before`, bukan `border-top`).
   `elementFromPoint(x, 773)` dengan patuh menjawab "itu paragrafnya", sementara
   piksel di sana 184,196,211. Jadi ada penjaga kedua: buang titik yang jatuh di
   PITA 2px tepat di luar kotak elemen `position:fixed`. Sengaja pita tepi, bukan
   seluruh kotak — lapisan `fixed inset-0` (scrim/latar app) akan menelan semua
   titik kalau kotak penuhnya dipakai, dan bagian dalam kotak sudah dijaga
   hit-test. Overlay yang MEMUAT elemennya dilewati: label bar nav sendiri juga
   ikut disapu dan titik-titiknya memang duduk di dalam bar. */
const BLEED = 2;

async function keepVisible(page, ptsPerEl) {
  return page.evaluate(({ groups, bleed }) => {
    const fixedEls = [...document.querySelectorAll('*')]
      .filter((e) => getComputedStyle(e).position === 'fixed')
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0);
    return groups.map((pts, i) => {
      const el = document.querySelector(`[data-audit-k="${i}"]`);
      if (!el) return pts.map(() => false);
      const overlays = fixedEls.filter(({ e }) => !e.contains(el)).map(({ r }) => r);
      return pts.map(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        if (!hit || (!el.contains(hit) && !hit.contains(el))) return false;
        for (const r of overlays) {
          const inBox = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
          const inBand = x >= r.left - bleed && x <= r.right + bleed
            && y >= r.top - bleed && y <= r.bottom + bleed;
          if (inBand && !inBox) return false;
        }
        return true;
      });
    });
  }, { groups: ptsPerEl, bleed: BLEED });
}

async function samplePixels(page, shotB64, points) {
  // decode PNG di canvas browser, ambil piksel di titik-titik
  return page.evaluate(async ({ b64, pts }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const scale = img.width / innerWidth;
    return pts.map(([x, y]) => {
      const px = Math.min(img.width - 1, Math.max(0, Math.round(x * scale)));
      const py = Math.min(img.height - 1, Math.max(0, Math.round(y * scale)));
      const d = g.getImageData(px, py, 1, 1).data;
      return [d[0], d[1], d[2]];
    });
  }, { b64: shotB64, pts: points });
}

/* INSET wajib: sampel lama menempel 1–2px dari tepi elemen, jadi yang terbaca
   justru BORDER/RING 1px-nya, bukan fill di belakang teks. Itu sumber tunggal
   false-positive menahun audit ini — chip filter gelap dilaporkan 4,06:1 (sampel
   border gray-700) padahal fill-nya gray-800 = 5,74:1, pil "WARGA" 4,3–4,47
   (sampel ring biru), Tag 4,07 (ring rose), btn-secondary 4,27 (border-control).
   Tim sempat "memperbaiki" chip-nya sekali dan DITOLAK user karena silau — yang
   salah memang alatnya. Border di app ini ≤2px, jadi inset 3px sudah keluar dari
   zona border DAN dari zona `ring-inset`, tapi masih di dalam fill. */
const INSET = 3;
/* Viewport sapuan — dipakai membuang titik sampel yang jatuh di luar layar. */
const VW = 390, VH = 844;

function perimeterPoints(r, fontSize) {
  // Sampel di KETINGGIAN BARIS TEKS (mid-y) — fair utk gradient vertikal
  // (teks tombol duduk di tengah, bukan di tepi atas fill).
  const my = r.y + r.h / 2;
  const inX = Math.min(INSET, Math.max(1, r.w / 2 - 1));   // elemen sempit: jangan lewat tengah
  const inY = Math.min(INSET, Math.max(1, r.h / 2 - 1));
  const pts = [
    [r.x + inX, my], [r.x + inX + 1, my], [r.x + r.w - inX, my], [r.x + r.w - inX - 1, my],
    [r.x + inX, my - 3], [r.x + r.w - inX, my - 3], [r.x + inX, my + 3], [r.x + r.w - inX, my + 3],
  ];
  // elemen pendek (± satu baris): tepi atas/bawah masih di zona teks
  if (r.h < fontSize * 2.2) {
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const x = r.x + inX + (i * (r.w - 2 * inX)) / n;
      pts.push([x, r.y + inY], [x, r.y + r.h - inY]);
    }
  }
  /* DIBUANG, bukan di-CLAMP. FP ke-12 (6 Agu): clamp `Math.min(843, y)`
     memindahkan titik yang jatuh di luar layar ke TEPI BAWAH — dan untuk elemen
     dua baris yang menggantung di bawah lipatan, SELURUH baris sampel mid-y
     menumpuk di y=843, tepat di tengah barisan glyph. Piksel tepi-antialias
     (138,142,150) lolos saringan "mirip warna teks" (jarak 175), jadi ia jadi
     MODUS dan dilaporkan sebagai "latar": baris Kas RT terbaca 2,99:1 padahal
     latarnya kartu gray-900 (≈15:1). Titik di luar viewport bukan sampel yang
     dipindahkan — ia sampel yang TIDAK ADA. Kalau semua titik elemen jatuh ke
     luar, ia masuk hitungan `tak terukur` dan mengaku, bukan mengarang. */
  return pts.filter(([x, y]) => x >= 0 && x <= VW - 1 && y >= 0 && y <= VH - 1);
}

function analyse(el, samples) {
  // buang sampel mirip warna teks (glyph/antialias)
  const bgCands = samples.filter((p) => dist(p, el.color) > 60);
  if (!bgCands.length) return null;
  // kelompokkan (kuantisasi 12) → warna unik yg muncul >=2 kali
  const groups = new Map();
  for (const p of bgCands) {
    const k = p.map((v) => Math.round(v / 12)).join(',');
    const e = groups.get(k) || { c: p, n: 0 };
    e.n++; groups.set(k, e);
  }
  // MODUS: warna paling sering = latar sesungguhnya (worst-case perimeter
  // ketipu antialias tepi glyph & ikon/dot inline). Tie → ratio terkecil.
  const sorted = [...groups.values()].sort((a, b) => b.n - a.n);
  const topN = sorted[0].n;
  let worst = Infinity, worstBg = null;
  for (const { c: bg, n } of sorted) {
    if (n < topN) break;
    const fg = el.alpha < 1 ? el.color.map((c, i) => Math.round(c * el.alpha + bg[i] * (1 - el.alpha))) : el.color;
    const r = ratio(fg, bg);
    if (r < worst) { worst = r; worstBg = bg; }
  }
  return { ratio: worst, bg: worstBg };
}

async function auditCurrentView(page, ctxName, results, seen) {
  const els = await collectTexts(page);
  if (!els.length) return;
  const shot = (await page.screenshot()).toString('base64');
  const allPts = els.map((e) => perimeterPoints(e.rect, e.size));
  const flat = allPts.flat();
  const pixels = await samplePixels(page, shot, flat);
  const visible = await keepVisible(page, allPts);
  await page.evaluate(() => document.querySelectorAll('[data-audit-k]').forEach((e) => e.removeAttribute('data-audit-k')));
  let off = 0;
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    const samples = pixels.slice(off, off + allPts[i].length).filter((_, j) => visible[i][j]);
    off += allPts[i].length;
    /* Sapuan yang diam-diam menyempitkan populasinya = sapuan yang "lolos"
       karena tak melihat, bukan karena bersih. Yang habis titiknya dihitung
       dan dilaporkan, supaya penjaga occlusion di atas tak pernah jadi tempat
       temuan bersembunyi. */
    if (!samples.length) { buta.push(`${ctxName}|${el.text.slice(0, 40)}`); continue; }
    const res = analyse(el, samples);
    if (!res) continue;
    const large = el.size >= 24 || (el.size >= 18.66 && el.weight >= 700);
    const need = large ? 3 : 4.5;
    const key = `${ctxName}|${el.text}|${el.color.join()}|${res.bg.join()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ ctx: ctxName, ...el, bg: res.bg, ratio: +res.ratio.toFixed(2), need, pass: res.ratio >= need });
  }
}

async function auditPage(page, name, results, seen) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 640) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(350);
    await auditCurrentView(page, name, results, seen);
    if (y === 0) await page.screenshot({ path: `${OUT}/${name.replace(/[^\w-]/g, '_')}.png` });
  }
  /* Langkah 640px tak menjamin layar TERAKHIR utuh: baris paling bawah bisa
     selalu menggantung di bawah lipatan, dan sejak titik di luar viewport
     dibuang (bukan di-clamp) ia jadi benar-benar tak terukur — "Donasi Rawat
     Inap Bpk Nano" di Kas RT muncul 0× dari 1.243 sampel. Satu pas ke dasar
     halaman menutupnya. */
  await page.evaluate((t) => window.scrollTo(0, t), total);
  await page.waitForTimeout(350);
  await auditCurrentView(page, name, results, seen);
}

async function runTheme(theme, results, seen) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    serviceWorkers: 'block',
  });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('hadiran-theme', t);
      localStorage.setItem('hadiran-welcome-v2', '1'); // suppress WelcomeSheet (bug back-stack di dev StrictMode)
    } catch {}
  }, theme);
  const page = await ctx.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' }); // matikan animasi → sampel stabil
  page.on('pageerror', (e) => console.log(`  [pageerror ${theme}]`, e.message.slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') console.log(`  [console ${theme}]`, m.text().slice(0, 200)); });
  await page.goto(URL, { waitUntil: 'networkidle' });

  // halaman login dulu
  if (!process.env.SKIP_LOGIN_AUDIT) await auditPage(page, `${theme}/login`, results, seen);

  const pw = page.locator('#masuk-warga');
  await pw.waitFor({ timeout: 15000 });
  await pw.click();
  let entered = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(700);
    if ((await page.locator('nav button', { hasText: 'Beranda' }).count()) > 0 && (await page.locator('#masuk-warga').count()) === 0) { entered = true; break; }
  }
  if (!entered) { console.log(`GAGAL masuk warga (${theme})`); await browser.close(); return; }
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(4000);

  const tabs = await page.locator('nav button').allInnerTexts();
  console.log(`[${theme}] tab nav:`, JSON.stringify(tabs));
  for (const tab of tabs) {
    const label = tab.trim().split('\n')[0];
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.locator('nav button', { hasText: label }).first().click({ force: true, timeout: 10000 })
      .catch(() => page.locator('nav button', { hasText: label }).first().evaluate((el) => el.click()));
    await page.waitForTimeout(4500);
    await auditPage(page, `${theme}/${label}`, results, seen);
  }
  await browser.close();
}

const results = [];
const seen = new Set();
const buta = []; // elemen yang SEMUA titik sampelnya tertutup overlay — tak terukur
for (const theme of ['light', 'dark']) await runTheme(theme, results, seen);

writeFileSync(`${OUT}/hasil.json`, JSON.stringify(results, null, 1));
const fails = results.filter((r) => !r.pass).sort((a, b) => a.ratio - b.ratio);
console.log(`\n=== TOTAL sampel: ${results.length}, GAGAL AA: ${fails.length} ===`);
console.log(`tak terukur (semua titik tertutup overlay / di luar viewport): ${buta.length}`);
if (process.env.SHOW_BUTA) for (const b of [...new Set(buta)]) console.log('  buta:', b);
for (const f of fails) {
  console.log(`${f.ratio} (butuh ${f.need}) [${f.ctx}] "${f.text}" fg rgb(${f.color}) a=${f.alpha} bg rgb(${f.bg}) ${f.size}px/${f.weight} <${f.tag}>`);
}

/* ── AMBANG APP · AAA ─────────────────────────────────────────────────────
   Ditambahkan 30 Agu 2026. Sampai hari ini SELURUH sapuan kontras memvonis
   `need = large ? 3 : 4.5` — murni WCAG AA — sementara app ini menyatakan
   ambangnya sendiri AAA 7:1 sejak pass "KONTRAS MAKSIMAL" (4 Agu). Ambang yang
   tak dijaga alat sama dengan ambang yang tak ada, dan biayanya sudah dibayar
   tiga kali: pelajaran ke-25 (alpha /55 dipindah ke permukaan hijau lalu jatuh
   ke 4,13), ke-30 (SELURUH tabel remap gugur diam-diam waktu kartu gelap naik
   — `gray-400` 8,85 → 6,58 tanpa satu pun sapuan protes), dan dua kali nyaris
   hari ini (varian langkah-nada menjatuhkan `#34453B` ke 6,64; `text-white/90`
   di hero sempat dihitung 6,82 sebelum diukur ulang dari piksel).

   DILAPORKAN TERPISAH & TIDAK MENGGAGALKAN rantai — disiplin yang sama dgn
   bagian 200% di `audit:potong` & `audit:reflow`: ini ambang APP, bukan
   pelanggaran konformansi, dan menyebutnya "gagal WCAG" akan keliru.
   Judulnya sengaja BUKAN `=== … ===`: `sapu-semua` mengambil baris `===`
   TERAKHIR sebagai ringkasan, dan ringkasan sapuan ini harus tetap vonis AA.

   Yang sudah gagal AA tidak diulang di sini (`r.pass` menyaringnya) — ia sudah
   punya barisnya sendiri di atas. */
const perluAAA = (r) => (r.need === 3 ? 4.5 : 7);   // AAA: 4,5 teks besar · 7 teks normal
const aaa = results.filter((r) => r.pass && r.ratio < perluAAA(r)).sort((a, b) => a.ratio - b.ratio);
console.log(`\n── AMBANG APP · AAA (7:1 · teks besar 4,5:1) — DI ATAS AA, bukan pelanggaran WCAG ──`);
console.log(`   ${aaa.length} dari ${results.length} sampel lolos AA tapi DI BAWAH AAA`);
for (const f of aaa.slice(0, 12)) {
  console.log(`   ${f.ratio} (AAA butuh ${perluAAA(f)}) [${f.ctx}] "${String(f.text).slice(0, 34)}" fg rgb(${f.color}) bg rgb(${f.bg}) ${f.size}px/${f.weight}`);
}
if (aaa.length > 12) console.log(`   … ${aaa.length - 12} lagi — rinci lengkap di ${OUT}/hasil.json`);

