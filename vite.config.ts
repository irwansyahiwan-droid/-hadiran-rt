import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Stylesheet utama dilepas dari jalur render-blocking.
 *
 * Splash pra-React (#app-splash di index.html) sengaja ber-style INLINE supaya
 * tercat di paint pertama — tapi `<link rel=stylesheet>` yang disuntik Vite
 * menyandera paint itu. Diukur di CPU 4× lambat + 400 kbps/400 ms: FCP 2328 ms,
 * dan 524 ms ketika CSS-nya diblokir. Jadi splash yang seharusnya instan datang
 * ~1,8 detik terlambat.
 *
 * Pola `media="print"` + onload→`all` membuat unduhannya tetap jalan tapi tak
 * memblokir paint; `<noscript>` menjaga pengguna tanpa JS. Agar TAK ADA kilatan
 * konten tanpa gaya, onload juga menyalakan penanda `__cssReady` + event
 * `css-siap`, dan App.tsx menahan pembuangan splash sampai penanda itu menyala
 * (lihat efek "Fade + hapus splash"). CSS (±14 KB brotli) selalu mendarat jauh
 * sebelum bundel JS (±100 KB) selesai, jadi waktu siap-pakai tak melar.
 */
function cssNonBlocking(): Plugin {
  return {
    name: 'css-non-blocking',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet"([^>]*?)href="([^"]+)"([^>]*)>/g,
        (_m, pre: string, href: string, post: string) =>
          `<link rel="stylesheet"${pre}href="${href}"${post} media="print" ` +
          `onload="this.media='all';window.__cssReady=true;document.dispatchEvent(new Event('css-siap'))">` +
          `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
      );
    },
  };
}


/**
 * Menyuntik SHELL ber-hash & VERSI ke `dist/sw.js` saat BUILD.
 *
 * Kenapa ada: sampai 30 Agu 2026 `sw.js` memegang daftar shell TULISAN TANGAN
 * berisi lima path tanpa satu pun JS/CSS — dan tak mungkin ditulis tangan,
 * karena nama chunk ber-hash isi berubah tiap build. Akibatnya terukur dan
 * DETERMINISTIK (3/3 run): pada kunjungan PERTAMA, `index.html` meminta entry
 * chunk + vendor-react + CSS pada +180 ms, sedangkan SW baru mengontrol halaman
 * ~+250 ms (ia didaftarkan dari React, jadi selalu SESUDAH ketiganya). Ketiganya
 * lewat tanpa dicegat, tak pernah masuk cache, dan begitu warga kehilangan
 * sinyal sebelum kunjungan kedua app-nya MATI di splash.
 *
 * Yang dipracache = graf impor STATIS milik entry (yang dirujuk `index.html`),
 * BUKAN semua aset. Diukur di dist: shell 302 kB, sedangkan chunk ekspor
 * (exceljs 920 kB + PDF triwulan 390 kB + html2canvas 198 kB) 1,75 MB — memaksa
 * warga bersinyal 400 kbps mengunduh itu saat install demi fitur bendahara yang
 * bisa menunggu sinyal. Chunk lazy tetap stale-while-revalidate spt sebelumnya.
 *
 * VERSI = hash daftar itu, jadi nama cache berubah HANYA kalau shell berubah,
 * dan `activate` membuang cache versi lain — inilah yang menutup jebakan chunk
 * basi sesudah deploy.
 */
function swManifest(): Plugin {
  let outDir = 'dist';
  let shell: string[] = [];
  return {
    name: 'sw-manifest',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    generateBundle(_opts, bundle) {
      const entry = Object.values(bundle).find((b) => b.type === 'chunk' && b.isEntry);
      if (!entry || entry.type !== 'chunk') this.error('sw-manifest: entry chunk tak ketemu');
      const set = new Set<string>();
      /* Impor STATIS saja — `dynamicImports` justru yang sengaja dibiarkan lazy. */
      const walk = (nama: string) => {
        if (set.has(nama)) return;
        set.add(nama);
        const c = bundle[nama];
        if (!c || c.type !== 'chunk') return;
        for (const css of c.viteMetadata?.importedCss ?? []) set.add(css);
        for (const imp of c.imports) walk(imp);
      };
      const nEntry = (entry as { fileName: string }).fileName;
      walk(nEntry);
      /* HALAMAN = dynamic import KEDALAMAN-1 dari entry. Itu bukan ambang
         karangan melainkan bentuk app-nya: router memanggil `lazy()` di entry,
         sedangkan chunk berat (exceljs, jspdf, html2canvas) di-`import()` dari
         DALAM halaman — satu tingkat lebih dalam. Jadi "yang dibutuhkan untuk
         MEMAKAI app" dan "fitur ekspor yang boleh menunggu sinyal" terpisah
         secara struktural, tanpa perlu mencocokkan nama berkas.
         Tanpa ini shell memang boot tapi langsung jatuh ke ErrorBoundary:
         terukur 3/3 run, 12 chunk gagal (Beranda, CrossFade, Odometer, …). */
      const eChunk = bundle[nEntry];
      if (eChunk && eChunk.type === 'chunk') for (const d of eChunk.dynamicImports) walk(d);
      /* FONT — dipungut dari CSS yang sudah masuk `set`, BUKAN dari graf impor.
         Sampai 5 Sep 2026 inilah lubangnya: shell berisi 40 entri dan NOL font,
         walau `main.tsx` menyatakan "ke-cache service worker → font tetap ada
         saat offline". Sebabnya struktural, bukan kelalaian — pemetanya
         berjalan di sisi IMPOR, sedangkan font dirujuk `url()` dari DALAM CSS,
         jadi tak ada satu pun sisi impor yang menuju ke sana. Kelas pelajaran
         ke-31 (shell tak pernah ke-cache di kunjungan pertama) yang tersisa.
         Akibatnya terukur, 3 kunjungan berturut-turut: cache 40 entri / 0 font
         di kunjungan 1, baru 44/2 di kunjungan 2 — warga yang memasang app lalu
         kehilangan sinyal mendapat app yang boot berhuruf sistem.
         Dipungut dgn membaca isi CSS-nya, jadi ia mengikuti apa pun yang benar-
         benar dirujuk; kalau nanti ada gambar/ikon ber-`url()` ia ikut sendiri. */
      const fontDariCss = new Set<string>();
      for (const nama of set) {
        if (!nama.endsWith('.css')) continue;
        const src = (bundle[nama] as { source?: string | Uint8Array })?.source;
        if (typeof src !== 'string') continue;
        for (const m of src.matchAll(/url\(\s*["']?\/?([^"')\s]+\.woff2)["']?\s*\)/g)) {
          fontDariCss.add(m[1].replace(/^\/+/, ''));
        }
      }
      /* Kalau app memang memakai webfont tapi tak satu pun terpungut, yang
         rusak PEMUNGUTNYA — dan shell yang diam-diam kehilangan font persis
         bug yang blok ini ada untuk menutupnya. Meledak, jangan dilewati. */
      const adaFont = Object.keys(bundle).some((f) => f.endsWith('.woff2'));
      if (adaFont && fontDariCss.size === 0) this.error('sw-manifest: ada .woff2 di bundel tapi nol terpungut dari CSS');
      for (const f of fontDariCss) set.add(f);
      shell = [
        '/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png',
        ...[...set].sort().map((f) => '/' + f),
      ];
      const byte = [...set].reduce((n, f) => n + ((bundle[f] as { code?: string; source?: string })?.code?.length ?? (bundle[f] as { source?: string })?.source?.length ?? 0), 0);
      this.info?.(`sw-manifest: shell ${Math.round(byte / 1024)} kB`);
    },
    closeBundle() {
      const p = resolve(outDir, 'sw.js');
      const src = readFileSync(p, 'utf8');
      const versi = createHash('sha256').update(shell.join('|')).digest('hex').slice(0, 8);
      /* Kalau kaitnya tak ketemu, MELEDAK — daftar kosong yang lolos diam-diam
         mengembalikan persis bug yang plugin ini ada untuk menutupnya. */
      let out = src;
      for (const [pola, ganti, nama] of [
        [/const VERSI = 'dev';/, `const VERSI = '${versi}';`, 'VERSI'],
        [/const SHELL = \[\];/, `const SHELL = ${JSON.stringify(shell)};`, 'SHELL'],
      ] as [RegExp, string, string][]) {
        if (!pola.test(out)) this.error(`sw-manifest: kait ${nama} tak ada di dist/sw.js`);
        out = out.replace(pola, ganti);
      }
      writeFileSync(p, out);
      this.info?.(`sw-manifest: ${shell.length} berkas shell · versi ${versi}`);
    },
  };
}

// https://vitejs.dev/config/

/**
 * Menyuntik `<link rel="preload">` untuk font BODY (Inter) ke index.html.
 *
 * Kenapa plugin dan bukan satu baris di index.html: namanya ber-hash isi, jadi
 * berubah tiap kali fontnya berubah. Baris tulisan tangan akan menunjuk berkas
 * yang tak ada — dan `preload` yang meleset GAGAL DIAM-DIAM (peramban cuma
 * memuat yang benar belakangan, tanpa satu pun galat).
 *
 * Kenapa perlu sama sekali: `cssNonBlocking` melepas stylesheet dari jalur
 * render, dan konsekuensinya font baru DITEMUKAN sesudah CSS diunduh & di-
 * parse. Terukur 400 kbps / CPU 4x: tombol Masuk terlihat 2760 ms sementara
 * Inter baru tiba 3603 ms — jadi selama 843 ms warga membaca layar berhuruf
 * sistem, lalu SELURUH kartu bergeser ~24px saat huruf aslinya masuk. Preload
 * memulai unduhannya saat HTML masih di-parse: Inter tiba 209 ms SEBELUM
 * tombolnya muncul, nol geseran.
 *
 * HANYA Inter. Sora (judul & wordmark) sengaja TIDAK di-preload — diukur, ia
 * memundurkan tombol Masuk 3291 -> 3762 ms, dan 471 ms itu dibayar untuk
 * typeface yang cuma menyentuh judul. Sora dipasang `font-display: optional`
 * di index.css: ia tak pernah menukar glyph, jadi ketiadaannya di kunjungan
 * pertama BUKAN kedip melainkan pilihan — judul dirender Inter (pasangan
 * fallback yang memang sudah ditulis di `--font-display`), dan mulai kunjungan
 * kedua Sora langsung dipakai. Yang membuat itu aman adalah `swManifest`:
 * Sora ikut dipracache saat install, jadi ia SUDAH ADA di kunjungan kedua
 * sekalipun peramban memutuskan tak mengunduhnya di kunjungan pertama (yang
 * memang boleh dilakukan untuk `optional` di jaringan lambat).
 */
function preloadFontBody(): Plugin {
  return {
    name: 'preload-font-body',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const nama = Object.keys(ctx.bundle ?? {}).find((f) => /inter-latin-[^/]*\.woff2$/.test(f));
        /* Kait yang hilang harus MELEDAK (pelajaran ke-24). `preload` yang
           diam-diam tak tersuntik mengembalikan persis 843 ms kedip yang
           plugin ini ada untuk menutupnya, dan tak ada yang akan tahu. */
        if (!nama) throw new Error('preload-font-body: berkas inter-latin-*.woff2 tak ada di bundel');
        return html.replace(
          '</head>',
          `  <link rel="preload" href="/${nama}" as="font" type="font/woff2" crossorigin>\n  </head>`,
        );
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), cssNonBlocking(), preloadFontBody(), swManifest()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // exceljs & html2canvas adalah chunk lazy (hanya dimuat saat ekspor) —
    // wajar besar; naikkan ambang agar warning tidak menutupi masalah nyata.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Pisah vendor stabil (React, Supabase) dari kode app → hash-nya jarang
        // berubah, jadi saat deploy ulang warga yang sudah pernah buka memakai
        // ulang cache vendor (repeat-load PWA lebih ringan). Lib berat lain
        // (jspdf/exceljs/html2canvas) tetap lazy lewat dynamic import.
        /* Bentuk FUNGSI, bukan objek. Dgn bentuk objek, Rollup menaruh helper
           `__vitePreload` (modul virtual milik Vite) ke dalam chunk
           `vendor-supabase` — dan karena entry meng-import helper itu SECARA
           STATIS, seluruh 34 KB klien Supabase ikut terseret ke jalur kritis
           boot walaupun kodenya sudah dipanggil lewat `import()` dinamis.
           Terukur 400 kbps/CPU 4×: chunk itu selesai di 3369 ms dari 4138 ms
           sampai kolom sandi bisa dipakai. Bentuk fungsi hanya memindahkan
           paket node_modules yang disebut, sehingga modul virtual tetap di
           entry dan Supabase benar-benar jadi lazy. */
        /* Gabungkan chunk remah. Terukur 31 Jul di 400 kbps/latensi 400 ms:
           sesudah gate warga, 25 chunk JS diunduh — 21 di antaranya ≤2 KB dan
           totalnya cuma 22 KB. Yang mahal BUKAN byte-nya melainkan 21 perjalanan
           bolak-balik; tiap ikon lucide jadi berkas sendiri. Rollup menyatukan
           chunk di bawah ambang ini ke tetangganya. */
        experimentalMinChunkSize: 12_000,
        manualChunks(id) {
          /* Helper `__vitePreload` (modul VIRTUAL Vite) dipakai entry secara
             STATIS. Kalau Rollup membiarkannya menumpang di chunk lain, chunk
             itu ikut jadi wajib-boot. Dipaksa ke vendor-react — satu-satunya
             vendor yang memang dibutuhkan sejak paint pertama. */
          if (id.includes('preload-helper')) return 'vendor-react';
          if (id.includes('/node_modules/@supabase/')) return 'vendor-supabase';
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
});
