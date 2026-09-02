import { chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab, samplePixels } from './scripts/lib/audit-harness.mjs';
const OUT = '/private/tmp/claude-501/-Users-irwansyah-yongky-Projects-hadiran-rt/e4d88b29-046e-49b3-9de8-174702d0c53a/scratchpad';
const browser = await chromium.launch();
for (const tema of ['light', 'dark']) {
  const { ctx, page } = await newCtx(browser, tema);
  await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded' });
  await loginWarga(page);
  await gotoTab(page, 'Kas RT');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/sesudah-${tema}.png` });
  const box = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.lift')].find((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 200 && r.top > 100 && r.bottom < innerHeight - 100;
    });
    const r = el.getBoundingClientRect();
    return { x: r.x, w: r.width, bottom: r.bottom };
  });
  const kanvas = await page.evaluate(() => getComputedStyle(document.querySelector('.app-bg')).backgroundColor).then((c) => c.match(/\d+/g).map(Number));
  const shot = (await page.screenshot()).toString('base64');
  const cx = Math.round(box.x + box.w / 2);
  const px = await samplePixels(page, shot, [1, 8, 16, 28].map((d) => [cx, Math.round(box.bottom + d)]));
  console.log(`${tema.padEnd(6)} selokan (delta kanal R dari kanvas ${kanvas[0]}): ` +
    px.map((p, i) => `${[1, 8, 16, 28][i]}px +${kanvas[0] - p[0]}`).join(' · '));
  await ctx.close();
}
await browser.close();
