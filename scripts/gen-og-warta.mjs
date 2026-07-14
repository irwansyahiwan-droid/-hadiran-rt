// Render kartu preview link (Open Graph) 1200x630 khusus halaman /warta.
// Bahasa visual "Warta Warga" (kertas/hijau/emas), SENGAJA beda dari og-hadiran.jpg
// milik landing /info. Output: public/og-warta.jpg. Jalankan: node scripts/gen-og-warta.mjs
import { chromium } from 'playwright';

const html = `<!doctype html><html><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,100..900;1,100..900&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;font-family:'Plus Jakarta Sans',sans-serif;overflow:hidden}
  .card{position:relative;width:1200px;height:630px;color:#17241B;overflow:hidden;
    background:
      repeating-linear-gradient(0deg, rgba(23,36,27,.022) 0 2px, transparent 2px 6px),
      repeating-linear-gradient(90deg, rgba(23,36,27,.018) 0 2px, transparent 2px 6px),
      #F6F0E2;
    display:flex;flex-direction:column;justify-content:center;padding:0 92px}
  /* Pita tumpal emas di atas & bawah, seperti tepi halaman /warta */
  .band{position:absolute;left:0;right:0;height:30px;background:#123F28}
  .band.atas{top:0}.band.bawah{bottom:0}
  .band::after{content:"";position:absolute;left:0;right:0;height:18px;
    background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='18'%3E%3Cpath d='M0 18 L18 2 L36 18 Z' fill='%23C8961E'/%3E%3C/svg%3E") repeat-x bottom / 36px 18px}
  .band.atas::after{top:100%;transform:scaleY(-1)}
  .band.bawah::after{bottom:100%}
  .eyebrow{font-size:23px;font-weight:800;letter-spacing:.26em;color:#77570C;margin-bottom:20px}
  .rule2{border-top:5px solid #17241B;border-bottom:2px solid #17241B;height:11px;width:100%;margin-bottom:34px}
  h1{font-family:'Fraunces',serif;font-weight:580;font-size:97px;line-height:1.04;
    letter-spacing:-.012em;max-width:760px;margin-bottom:26px}
  h1 em{font-style:italic;font-weight:470;color:#123F28}
  p{font-size:31px;color:#3C4A40;line-height:1.42;max-width:680px;margin-bottom:40px}
  .kaki{display:flex;align-items:baseline;gap:26px}
  .url{font-weight:800;font-size:26px;color:#123F28}
  .alamat{font-size:20px;font-weight:700;letter-spacing:.2em;color:#77570C}
  /* Stempel RESMI: tinta hijau, miring, menindih garis masthead */
  .stamp{position:absolute;right:64px;top:96px;width:320px;height:320px;color:#1B5A38;
    transform:rotate(-9deg);mix-blend-mode:multiply;opacity:.9}
</style></head>
<body>
  <div class="card">
    <div class="band atas"></div>
    <div class="band bawah"></div>
    <svg class="stamp" viewBox="0 0 120 120">
      <defs>
        <path id="sa" d="M18,60 a42,42 0 0,1 84,0"/>
        <path id="sb" d="M23,60 a37,37 0 0,0 74,0"/>
      </defs>
      <circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" stroke-width="2.6"/>
      <circle cx="60" cy="60" r="51" fill="none" stroke="currentColor" stroke-width="1"/>
      <circle cx="60" cy="60" r="29" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <text fill="currentColor" font-family="'Plus Jakarta Sans',sans-serif" font-size="10" font-weight="800" letter-spacing="1.6">
        <textPath href="#sa" startOffset="50%" text-anchor="middle">RT 004 · RW 006</textPath>
      </text>
      <text fill="currentColor" font-family="'Plus Jakarta Sans',sans-serif" font-size="9" font-weight="800" letter-spacing="1.6">
        <textPath href="#sb" startOffset="50%" text-anchor="middle">TANAH BARU</textPath>
      </text>
      <rect x="13" y="57" width="6" height="6" transform="rotate(45 16 60)" fill="currentColor"/>
      <rect x="101" y="57" width="6" height="6" transform="rotate(45 104 60)" fill="currentColor"/>
      <text x="60" y="58" fill="currentColor" text-anchor="middle" font-family="'Fraunces',serif" font-size="15" font-weight="700" letter-spacing="1">RESMI</text>
      <text x="60" y="71" fill="currentColor" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="7.5" font-weight="800" letter-spacing="2.4">TERBUKA</text>
    </svg>
    <div class="eyebrow">WARTA WARGA · EDISI DIGITAL</div>
    <div class="rule2"></div>
    <h1>Uang kas RT kini <em>terang.</em></h1>
    <p>Jadwal tarikan, absensi, talangan, dan kas RT. Terbuka dipantau semua warga dari HP.</p>
    <div class="kaki">
      <span class="url">hadiran-rt.vercel.app/warta</span>
      <span class="alamat">TANAH BARU · BEJI · DEPOK</span>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch();
// dpr 1.6 + JPEG q82: pola sama dgn gen-og.mjs (WhatsApp menolak gambar besar).
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1.6 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(600); // pastikan webfont selesai dimuat
await page.locator('.card').screenshot({ path: 'public/og-warta.jpg', type: 'jpeg', quality: 82 });
await browser.close();
console.log('ok → public/og-warta.jpg');
