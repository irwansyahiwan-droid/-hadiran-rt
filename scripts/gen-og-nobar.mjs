// Render kartu preview link (Open Graph) 1200x630 utk undangan /nobar.
// Output: public/og-nobar.jpg. Jalankan: node scripts/gen-og-nobar.mjs
import { chromium } from 'playwright';

const html = `<!doctype html><html><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@500;600;700&display=swap" rel="stylesheet"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;font-family:'Inter',sans-serif;overflow:hidden;color:#F3F6FB}
  .card{position:relative;width:1200px;height:630px;overflow:hidden;text-align:center;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;
    background:
      radial-gradient(56% 34% at 10% 0%, rgba(214,230,255,.12), transparent 60%),
      radial-gradient(56% 34% at 90% 0%, rgba(214,230,255,.10), transparent 60%),
      radial-gradient(130% 46% at 50% 112%, rgba(34,197,94,.26), transparent 62%),
      #060B14}
  .card::after{content:"";position:absolute;inset:0;opacity:.05;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
  .badge{display:inline-flex;align-items:center;gap:12px;background:rgba(255,255,255,.07);
    border:1.5px solid rgba(255,255,255,.16);padding:12px 26px;border-radius:999px;
    font-size:21px;font-weight:600;color:#C2CDDC;letter-spacing:.04em}
  .dot{width:12px;height:12px;border-radius:50%;background:#2FD575}
  .cup{font-family:'Sora',sans-serif;font-size:24px;font-weight:800;letter-spacing:.4em;text-indent:.4em;
    text-transform:uppercase;color:#F0C24B}
  h1{font-family:'Sora',sans-serif;font-size:104px;font-weight:800;line-height:.92;letter-spacing:-.03em}
  .semi{font-family:'Sora',sans-serif;font-size:30px;font-weight:700;letter-spacing:.32em;text-indent:.32em;
    text-transform:uppercase;color:#C2CDDC}
  .match{display:flex;align-items:center;gap:34px}
  .flag{width:104px;height:70px;border-radius:14px;overflow:hidden;
    box-shadow:0 16px 34px -12px rgba(0,0,0,.75), inset 0 0 0 1.5px rgba(255,255,255,.2)}
  .flag svg{display:block;width:100%;height:100%}
  .team{display:flex;align-items:center;gap:20px;font-family:'Sora',sans-serif;font-size:40px;font-weight:800;
    text-transform:uppercase;letter-spacing:.02em}
  .vs{font-family:'Sora',sans-serif;font-size:34px;font-weight:800;font-style:italic;color:#F0C24B}
  .meta{font-size:23px;font-weight:600;color:#C2CDDC}
  .meta b{color:#F3F6FB}
</style></head><body>
<div class="card">
  <span class="badge"><i class="dot"></i>Undangan Warga RT 004/006</span>
  <div>
    <p class="cup">World Cup 2026</p>
    <h1>NOBAR</h1>
    <p class="semi" style="margin-top:14px">Semi Final 1</p>
  </div>
  <div class="match">
    <span class="team"><span class="flag"><svg viewBox="0 0 3 2"><rect width="1" height="2" fill="#0055A4"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#EF4135"/></svg></span>Prancis</span>
    <span class="vs">VS</span>
    <span class="team">Spanyol<span class="flag"><svg viewBox="0 0 3 2"><rect width="3" height="2" fill="#AA151B"/><rect y="0.5" width="3" height="1" fill="#F1BF00"/></svg></span></span>
  </div>
  <p class="meta">Selasa <b>14 Juli 2026</b> · <b>21.00</b> sampai kelar · Tribun Utara <b>Lapangan Bacanglona</b></p>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: 'public/og-nobar.jpg', type: 'jpeg', quality: 88 });
await browser.close();
console.log('ok public/og-nobar.jpg');
