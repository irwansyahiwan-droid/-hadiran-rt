import { chromium } from 'playwright';
import { newCtx, gotoTab, samplePixels } from './lib/audit-harness.mjs';
const b = await chromium.launch();
const { ctx, page: p } = await newCtx(b,'light',{bendahara:true});
await p.goto(process.env.CAP_URL||'http://localhost:5199',{waitUntil:'networkidle'});
await p.waitForTimeout(3000); await gotoTab(p,'Kas RT');
await p.locator('button[aria-label*="Tambah"], button[aria-label*="tambah"]').first().click();
await p.waitForTimeout(1500);
const shot=(await p.screenshot()).toString('base64');
for (const sel of ['input[type="date"]','select']) {
  const info=await p.evaluate((s)=>{const e=document.querySelector(s);const r=e.getBoundingClientRect();
    const cs=getComputedStyle(e);
    return {x:r.x,y:r.y,w:r.width,h:r.height,padR:parseFloat(cs.paddingRight),padL:parseFloat(cs.paddingLeft)}},sel);
  const pts=[]; const cols=[];
  for(let dx=5; dx<info.w-5; dx+=2){ cols.push(dx);
    for(let dy=6; dy<info.h-6; dy+=2) pts.push([info.x+dx, info.y+dy]); }
  const px=await samplePixels(p,shot,pts);
  const perCol=info.h>12?Math.ceil((info.h-12)/2):1;
  const cnt={}; px.forEach(c=>{const k=c.join(',');cnt[k]=(cnt[k]||0)+1});
  const bg=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0].split(',').map(Number);
  // kolom mana yang punya tinta
  const berTinta=[];
  cols.forEach((dx,i)=>{ const sl=px.slice(i*perCol,(i+1)*perCol);
    const d=Math.max(...sl.map(c=>Math.hypot(c[0]-bg[0],c[1]-bg[1],c[2]-bg[2])));
    if(d>30) berTinta.push(dx); });
  // ringkas jadi rentang bersambung
  const rentang=[]; let a=null,prev=null;
  berTinta.forEach(dx=>{ if(a===null){a=dx;prev=dx;return;} if(dx-prev<=6){prev=dx;return;} rentang.push([a,prev]); a=dx; prev=dx; });
  if(a!==null) rentang.push([a,prev]);
  console.log(sel, JSON.stringify({ lebar:+info.w.toFixed(0), padR:info.padR,
    rentangTinta: rentang.map(([x,y])=>`${x}-${y}`),
    dariKanan: rentang.map(([x,y])=>`${+(info.w-y).toFixed(0)}..${+(info.w-x).toFixed(0)}`) }));
}
await ctx.close(); await b.close();
