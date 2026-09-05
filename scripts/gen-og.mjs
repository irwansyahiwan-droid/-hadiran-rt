// Render kartu pratayang link (Open Graph) 1200x630 untuk share WhatsApp/Telegram.
// Output: public/og-hadiran.jpg. Jalankan: node scripts/gen-og.mjs
//
// ── Palet: SATU sumber dgn app (5 Sep 2026) ───────────────────────────────
// Sampai hari ini berkas ini memaku 18 hex sendiri, dan itu terukur mahal:
// gradiennya `#0A4E2E → #15824C → #1FA862` berangkat dari nilai hero app
// (L38,9) lalu naik ke L64,8 — 26 anak tangga L lebih terang dari stop paling
// terang hero app, hijau yang tak ada di mana pun dalam produk. Glow-nya
// `rgba(45,212,150,.32)` adalah nilai yang app sendiri sudah turunkan ke
// .18/.05 di pass kontras maksimal (4 Agu). Teksnya duduk di 4,4–5,7:1
// sementara seluruh permukaan keluaran lain sengaja diangkat ke >= 7.
//
// Ini gambar yang muncul di TIAP pratayang link WhatsApp — wajah luar yang
// paling sering dilihat — dan tak satu pun dari 34 sapuan bisa melihatnya:
// semuanya membaca DOM, sedangkan JPEG tak punya DOM.
//
// Kini permukaannya BUKAN gradient karangan melainkan `.hero-emerald` app itu
// sendiri: `heroScrim` + `heroRamp`, dibaca dari `warnaCetak.ts` lewat
// `scripts/lib/palet.mjs`. Arah 150deg dipertahankan apa adanya — itu yang
// menaruh stop paling GELAP (#032A17, 15,6:1 lawan putih) tepat di pojok
// kanan-bawah tempat URL duduk, dan stop paling terang di balik koin.
//
//   OUT=path.jpg   (default public/og-hadiran.jpg)
import { chromium } from 'playwright';
import { CETAK, rgba } from './lib/palet.mjs';

const [T0, T1, T2] = CETAK.heroRamp;
const [sr, sg, sb, sa] = CETAK.heroScrim;

/* Permukaannya BUKAN gradient karangan melainkan `.hero-emerald` app itu
   sendiri — `heroScrim` + `heroRamp`, nilai & sudut sama persis.

   Tiga arah sempat dirender & DIUKUR (150deg cermin app · 115deg mendatar ·
   dibalik terang-di-kanan). Rentang hero app sempit (L38,8 → L25,2), jadi
   ketiganya nyaris tak bisa dibedakan mata dan ketiganya lolos jauh di atas
   ambang AAA app. Karena tak ada beda RASA yang nyata, tak ada varian yang
   disimpan: apa pun selain cermin persis adalah penyimpangan dari app, dan
   penyimpangan tanpa alasan justru yang membuat berkas ini melenceng dulu. */
const PERMUKAAN = `radial-gradient(130% 72% at 0% 0%, rgba(${sr}, ${sg}, ${sb}, ${sa}), transparent 55%),
      linear-gradient(150deg, ${T0} 0%, ${T1} 52%, ${T2} 100%)`;

const OUT = process.env.OUT || 'public/og-hadiran.jpg';

/* Gold koin — diambil dari stop gradient koin di bawah, BUKAN hex baru.
   Aksen "RT" wajib menggemakan lambang, bukan memperkenalkan warna. */
const GOLD = '#FFD22B';

const html = `<!doctype html><html><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@500;600&display=swap" rel="stylesheet"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;font-family:'Inter',sans-serif;overflow:hidden}
  .card{position:relative;width:1200px;height:630px;color:#fff;overflow:hidden;
    -webkit-font-smoothing:antialiased;
    background-image:${PERMUKAAN};
    display:flex;align-items:center;padding:0 84px}
  .card::after{content:"";position:absolute;inset:0;opacity:.05;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E")}
  .coin{flex:0 0 280px;width:280px;height:280px;border-radius:56px;overflow:hidden;
    box-shadow:0 30px 70px -20px rgba(0,0,0,.55), 0 0 0 2px rgba(255,255,255,.14);position:relative;z-index:2}
  .coin svg{display:block;width:100%;height:100%}
  .txt{position:relative;z-index:2;margin-left:64px}
  /* Teks hero app = putih & putih-beralfa, bukan tangga mint karangan
     (#EAFBF1/#DCF3E6/#BFF0D3 dulu di sini tak punya padanan di app). */
  .badge{display:inline-flex;align-items:center;gap:11px;background:rgba(255,255,255,.14);
    border:1px solid rgba(255,255,255,.24);padding:11px 22px;border-radius:999px;
    font-size:21px;font-weight:600;color:#fff;margin-bottom:30px}
  .dot{width:11px;height:11px;border-radius:50%;background:${GOLD};box-shadow:0 0 12px ${rgba(GOLD, 0.55)}}
  h1{font-family:'Sora',sans-serif;font-weight:800;font-size:78px;line-height:1.04;letter-spacing:-.02em;margin-bottom:22px}
  h1 .g{color:${GOLD}}
  p{font-size:30px;color:rgba(255,255,255,.86);line-height:1.4;max-width:560px;margin-bottom:34px}
  .pills{display:flex;gap:13px;flex-wrap:wrap;max-width:600px}
  .pill{background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);
    padding:11px 20px;border-radius:14px;font-size:22px;font-weight:600;color:#fff}
  .url{position:absolute;bottom:46px;right:84px;z-index:2;font-family:'Sora',sans-serif;
    font-weight:600;font-size:24px;color:rgba(255,255,255,.88);letter-spacing:.01em}
</style></head>
<body>
  <div class="card">
    <div class="coin">
      <svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD}"/><stop offset=".52" stop-color="#FAC200"/><stop offset="1" stop-color="#E7A300"/></linearGradient>
          <radialGradient id="sh" cx=".5" cy=".20" r=".92"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
          <radialGradient id="vg" cx=".5" cy=".94" r=".95"><stop offset=".5" stop-color="#8C6300" stop-opacity="0"/><stop offset="1" stop-color="#8C6300" stop-opacity=".30"/></radialGradient>
          <linearGradient id="dc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#EDEFF3"/></linearGradient>
          <linearGradient id="rm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/></linearGradient>
          <linearGradient id="nm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C7C3A"/><stop offset="1" stop-color="#0D4E22"/></linearGradient>
          <filter id="ds" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="11" stdDeviation="16" flood-color="#6A4900" flood-opacity=".34"/></filter>
          <filter id="ns" x="-25%" y="-25%" width="150%" height="170%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#053A16" flood-opacity=".32"/></filter>
        </defs>
        <rect width="640" height="640" fill="url(#bg)"/><rect width="640" height="640" fill="url(#sh)"/><rect width="640" height="640" fill="url(#vg)"/>
        <g filter="url(#ds)"><circle cx="320" cy="320" r="232" fill="url(#dc)"/></g>
        <circle cx="320" cy="320" r="232" fill="none" stroke="#C58B00" stroke-opacity=".22" stroke-width="2"/>
        <circle cx="320" cy="320" r="229" fill="none" stroke="url(#rm)" stroke-width="6"/>
        <g filter="url(#ns)"><text x="322" y="433" fill="url(#nm)" font-family="'Helvetica Neue',Arial,sans-serif" font-weight="900" font-size="300" letter-spacing="-6" text-anchor="middle">46</text></g>
      </svg>
    </div>
    <div class="txt">
      <span class="badge"><span class="dot"></span>Aplikasi Resmi Warga RT 004/006</span>
      <h1>Hadiran <span class="g">RT</span></h1>
      <p>Hadiran, kas &amp; talangan warga — transparan dalam genggaman.</p>
      <div class="pills">
        <span class="pill">Jadwal</span><span class="pill">Absensi</span><span class="pill">Talangan</span><span class="pill">Kas RT</span><span class="pill">Laporan PDF</span>
      </div>
    </div>
    <div class="url">hadiran-rt.vercel.app</div>
  </div>
</body></html>`;

const browser = await chromium.launch();
// dpr 1.6 → render tajam (~1920px) tapi file tetap ringan setelah kompresi JPEG;
// WhatsApp menolak/melewati gambar besar, jadi JPEG q80 jauh lebih aman dari PNG.
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1.6 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(600); // pastikan webfont selesai dimuat
await page.locator('.card').screenshot({ path: OUT, type: 'jpeg', quality: 82 });
await browser.close();
console.log(`ok → ${OUT}  (ramp ${T0}→${T1}→${T2} dari warnaCetak.ts)`);
