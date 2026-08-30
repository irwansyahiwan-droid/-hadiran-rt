// Service worker Hadiran RT — shell luring.
//
// SHELL & VERSI DISUNTIK SAAT BUILD (plugin `swManifest` di vite.config.ts).
// Nilai di bawah ini cuma nilai DEV yang aman; kalau plugin gagal menemukannya,
// build MELEDAK — bukan diam-diam mengirim daftar kosong. (Kait yang hilang
// harus meledak, pelajaran ke-24 di CLAUDE.md.)
const VERSI = 'dev';
const SHELL = [];

const CACHE = `hadiran-rt-${VERSI}`;
/* `ignoreVary` WAJIB, dan ini bukan kerapian. Aset disimpan lewat `addAll` —
   fetch dari dalam SW, TANPA header `Origin`. Permintaan asli halaman untuk
   modul ber-`crossorigin` MEMBAWA `Origin`, dan server (vite preview & Vercel)
   membalas `Vary: Origin`. Tanpa opsi ini pencocokan gagal, `caches.match`
   menjawab undefined, dan shell yang SUDAH ADA di cache tetap tak tersaji —
   terukur: 3/3 run tetap mati di splash walau `entry ADA di cache: true`.
   Menguji lewat `new Request(url)` MENIPU: konstruktor tak memasang `Origin`,
   jadi ia cocok padahal permintaan sungguhan tidak. */
const COCOK = { ignoreVary: true };
/* Aset ber-hash isi = IMUTABEL. Sekali ada di cache, ia tak perlu divalidasi
   ulang selamanya: nama berkasnya sendiri yang berubah kalau isinya berubah. */
const IMUTABEL = new Set(SHELL.filter((u) => u.startsWith('/assets/')));

self.addEventListener('install', (event) => {
  /* `addAll` ATOMIK & TANPA catch — sengaja. Shell separuh lebih buruk daripada
     tak terpasang: yang separuh MENGAKU siap luring lalu mati di chunk yang
     hilang, sedangkan install yang gagal cuma dicoba lagi kunjungan berikutnya. */
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  // Tidak auto-skipWaiting: tunggu konfirmasi user (update prompt) dulu.
});

// Aktifkan versi baru saat user menekan "Muat ulang".
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Lewati origin lain (Supabase, Google Fonts API, dsb) — biarkan jaringan.
  if (url.origin !== self.location.origin) return;

  /* Navigasi → network-first, fallback ke shell yang DIPRACACHE.
     Balasan jaringan SENGAJA TIDAK disimpan. Dulu ia `put('/index.html')`, dan
     itu jebakan chunk basi: sesudah deploy, SW LAMA (masih menunggu konfirmasi
     user) menerima index.html BARU lalu menaruhnya di cache LAMA — shell yang
     tersimpan jadi merujuk chunk yang tak pernah ada di cache itu, dan boot
     luring berikutnya mati. Shell hanya boleh datang dari install, sehingga
     index.html & chunk di dalam satu cache selalu sezaman. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html', COCOK).then((r) => r || caches.match('/', COCOK)))
    );
    return;
  }

  // Aset ber-hash → cache-only; tak ada gunanya memvalidasi yang imutabel.
  if (IMUTABEL.has(url.pathname)) {
    event.respondWith(caches.match(request, COCOK).then((r) => r || fetch(request)));
    return;
  }

  // Aset lain (chunk lazy, font, gambar) → stale-while-revalidate.
  event.respondWith(
    caches.match(request, COCOK).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
