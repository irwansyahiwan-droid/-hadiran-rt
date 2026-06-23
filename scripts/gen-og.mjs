// Render kartu preview link (Open Graph) 1200x630 untuk share WhatsApp/Telegram.
// Output: public/og-hadiran.png. Jalankan: node scripts/gen-og.mjs
import { chromium } from 'playwright';

const html = `<!doctype html><html><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@500;600&display=swap" rel="stylesheet"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;font-family:'Inter',sans-serif;overflow:hidden}
  .card{position:relative;width:1200px;height:630px;color:#fff;overflow:hidden;
    background:radial-gradient(120% 95% at 100% 0%, rgba(45,212,150,.32) 0%, rgba(45,212,150,0) 55%),
      linear-gradient(150deg,#0A4E2E 0%,#15824C 56%,#1FA862 100%);
    display:flex;align-items:center;padding:0 84px}
  .card::after{content:"";position:absolute;inset:0;opacity:.05;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E")}
  .glow{position:absolute;width:520px;height:520px;border-radius:50%;right:-140px;top:-160px;
    background:radial-gradient(circle,rgba(110,240,168,.30),transparent 65%)}
  .coin{flex:0 0 280px;width:280px;height:280px;border-radius:56px;overflow:hidden;
    box-shadow:0 30px 70px -20px rgba(0,0,0,.55), 0 0 0 2px rgba(255,255,255,.14);position:relative;z-index:2}
  .coin svg{display:block;width:100%;height:100%}
  .txt{position:relative;z-index:2;margin-left:64px}
  .badge{display:inline-flex;align-items:center;gap:11px;background:rgba(255,255,255,.14);
    border:1px solid rgba(255,255,255,.24);padding:11px 22px;border-radius:999px;
    font-size:21px;font-weight:600;color:#EAFBF1;margin-bottom:30px}
  .dot{width:11px;height:11px;border-radius:50%;background:#6EF0A8;box-shadow:0 0 12px #6EF0A8}
  h1{font-family:'Sora',sans-serif;font-weight:800;font-size:78px;line-height:1.04;letter-spacing:-.02em;margin-bottom:22px}
  h1 .g{color:#FFE08A}
  p{font-size:30px;color:#DCF3E6;line-height:1.4;max-width:560px;margin-bottom:34px}
  .pills{display:flex;gap:13px;flex-wrap:wrap;max-width:600px}
  .pill{background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);
    padding:11px 20px;border-radius:14px;font-size:22px;font-weight:600;color:#EAFBF1}
  .url{position:absolute;bottom:46px;right:84px;z-index:2;font-family:'Sora',sans-serif;
    font-weight:600;font-size:24px;color:#BFF0D3;letter-spacing:.01em}
</style></head>
<body>
  <div class="card">
    <div class="glow"></div>
    <div class="coin">
      <svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F9D451"/><stop offset=".55" stop-color="#F4C20D"/><stop offset="1" stop-color="#E3A500"/></linearGradient>
          <radialGradient id="s" cx=".5" cy=".28" r=".72"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="640" height="640" fill="url(#g)"/><rect width="640" height="640" fill="url(#s)"/>
        <circle cx="320" cy="320" r="252" fill="none" stroke="#0F6B2E" stroke-width="16"/>
        <circle cx="320" cy="320" r="230" fill="#fff"/>
        <text x="321" y="430" fill="#0F6B2E" font-family="'Helvetica Neue',Arial,sans-serif" font-weight="900" font-size="300" letter-spacing="-6" text-anchor="middle">46</text>
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
await page.locator('.card').screenshot({ path: 'public/og-hadiran.jpg', type: 'jpeg', quality: 82 });
await browser.close();
console.log('ok → public/og-hadiran.jpg');
