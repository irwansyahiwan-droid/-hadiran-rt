// Audit MUAT AWAL di kondisi HP warga: CPU 4× lambat + 400 kbps / latensi 400 ms.
//
// Kenapa ada: "premium" bukan cuma piksel — 300 KK membuka app ini dari Android
// kelas bawah dengan sinyal seadanya. Yang diukur:
//   FCP        — kapan splash pra-React (#app-splash) benar-benar tercat
//   siap-pakai — kapan kolom sandi login bisa dipakai
//   Supabase   — kapan balasan data pertama datang (null = belum ada request;
//                gate warga itu lokal, jadi muat awal memang tak menyentuh DB)
//
// Temuan yang melahirkan skrip ini (30 Jul 2026): FCP 2296 ms padahal splash-nya
// inline. Penyebabnya `<link rel=stylesheet>` render-blocking — dibuktikan dengan
// memblokir CSS: FCP jatuh ke 524 ms. Sesudah stylesheet dibuat non-blocking
// (plugin css-non-blocking di vite.config.ts) FCP jadi 520 ms dan siap-pakai TAK
// berubah (3945 vs 3948 ms). Jangan menilai ini dari ukuran chunk: yang menentukan
// adalah round-trip + apa yang memblokir paint.
//
// Jalankan lawan build produksi, bukan dev server:
//   npx vite build && npx vite preview --port 5174
//   node scripts/audit-muat.mjs
//   APP_URL=https://hadiran-rt.vercel.app node scripts/audit-muat.mjs   (brotli nyata)
import { chromium } from 'playwright';

const APP = process.env.APP_URL || 'http://localhost:5174';
const RUNS = +(process.env.RUNS || 3);
const CPU = +(process.env.CPU || 4);
const KBPS = +(process.env.KBPS || 400);
const LATENCY = +(process.env.LATENCY || 400);

const br = await chromium.launch();
const hasil = [];

for (let run = 0; run < RUNS; run++) {
  // Konteks BARU tiap run = cache terpisah → tiap run benar-benar "muat pertama".
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    // Lewati WelcomeSheet biar tak menutupi layar; tema terang supaya konsisten.
    localStorage.setItem('hadiran-welcome-v2', '1');
    localStorage.setItem('hadiran-theme', 'light');
  });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (KBPS * 1024) / 8,
    uploadThroughput: (KBPS * 1024) / 8,
    latency: LATENCY,
  });

  const t0 = Date.now();
  let tSupa = null;
  p.on('response', (r) => { if (/supabase\.co/.test(r.url()) && tSupa === null) tSupa = Date.now() - t0; });

  await p.goto(APP, { waitUntil: 'domcontentloaded' });
  await p.locator('#masuk-warga').waitFor({ timeout: 60000 });
  const tSiap = Date.now() - t0;

  const fcp = await p.evaluate(() => {
    const e = performance.getEntriesByType('paint').find((x) => x.name === 'first-contentful-paint');
    return e ? Math.round(e.startTime) : 0;
  });
  hasil.push({ fcp, tSiap, tSupa });
  await ctx.close();
}

await br.close();

const med = (k) => {
  const v = hasil.map((h) => h[k]).filter((x) => x != null).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};
console.log(`${APP} · CPU ${CPU}× · ${KBPS} kbps · latensi ${LATENCY} ms · ${RUNS} run`);
console.log(JSON.stringify(hasil));
console.log(`MEDIAN → FCP ${med('fcp')} ms · siap-pakai ${med('tSiap')} ms · Supabase pertama ${med('tSupa') ?? '—'} ms`);
