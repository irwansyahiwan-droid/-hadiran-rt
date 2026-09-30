import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowRight, ChevronDown } from 'lucide-react';
import logoRt from '../assets/logo-rt.svg';
import { haptic } from '../lib/utils';
import { useGalatKolom } from '../hooks/useGalatKolom';
import GalatKolom from '../components/GalatKolom';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onWargaMode: () => void;
}

/**
 * Login = hero TERBESAR di app ini, bukan kartu putih yang mengambang di atas
 * latar pastel.
 *
 * Kenapa digambar ulang (24 Agu 2026): layar ini satu-satunya permukaan yang
 * memakai bahasa visualnya SENDIRI — `login-bg` mint, tiga aurora blob, dan
 * `login-card` kaca putih. Hasilnya beda terang antara kartu dan latar tipis
 * sekali, jadi tak ada satu pun titik jangkar mata, dan kesan pertama app
 * terbaca lembut/pastel padahal SELURUH isi app (hero saldo, hero Jadwal,
 * halaman /info) berbicara hijau tua yang tegas.
 *
 * Tak ada token baru yang dilahirkan di sini. Semuanya milik app yang sudah
 * ada: `--hero-glow` + `--hero-gradient` (otomatis bertukar di `.dark`),
 * `.hero-noise`, `.songket-weave`, `--gold-songket`.
 *
 * Gerbang "ketik: warga" DIBUANG. Ia mengumumkan sandinya sendiri di layar
 * yang sama, lengkap dengan tombol isi-otomatis — friksi tanpa perlindungan.
 * Mode warga tetap lihat-saja; yang menjaganya RLS di database, bukan kata
 * yang tercetak di layarnya.
 *
 * Cincin fokus SENGAJA emas, bukan emerald: `--hero-*` itu hijau, dan cincin
 * hijau di atas hijau = 1,26:1 (cacat yang sudah dibayar `audit:kontras-nonteks`).
 * Emas #E8B651 di atas #0A5230 jauh di atas ambang 3:1 §1.4.11.
 */
export default function Login({ onLogin, onWargaMode }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bendaharaOpen, setBendaharaOpen] = useState(false);
  const [shakeAdmin, setShakeAdmin] = useState(false);
  const galat = useGalatKolom();

  // Lepas dulu, pasang lagi di frame berikutnya — kalau kelas `shake` masih
  // menempel (dua kali salah beruntun) animasi tak akan restart sendiri.
  function goyang(set: (v: boolean) => void) {
    set(false);
    requestAnimationFrame(() => set(true));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    haptic(12);
    setError('');
    // Periksa di sini, bukan lewat `required` bawaan — gelembungnya berbahasa
    // peramban (di headless: "Please fill out this field.") dan menahan submit
    // sebelum handler ini sempat jalan. Pasangan `noValidate` di <form>.
    const surel = email.trim();
    if (!surel) return galat.tampilkan('login-email', 'Isi emailnya dulu.');
    if (!surel.includes('@')) return galat.tampilkan('login-email', 'Email belum lengkap — contoh: nama@email.com');
    if (!password) return galat.tampilkan('login-password', 'Isi password-nya dulu.');
    setLoading(true);
    try {
      // Pesan datang matang dari useAuth — jangan ratakan lagi jadi "password
      // salah", sebab sebab jaringan dan sebab kredensial butuh tindakan beda.
      const err = await onLogin(surel, password);
      if (err) {
        setError(err);
        goyang(setShakeAdmin);
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
      goyang(setShakeAdmin);
    } finally {
      // `finally`, bukan baris terakhir: tombol yang terkunci "Memproses…"
      // selamanya membuat bendahara buntu total — tak ada jalan selain tutup app.
      setLoading(false);
    }
  }

  /* Kolom isian bendahara: satu resep, dipakai dua kali. Kaca gelap di atas
     hijau — bukan `bg-white/60` warisan kartu terang, yang di atas hero pekat
     berubah jadi bidang keruh. */
  /* Batas kolom /25 → /45 (24 Agu 2026): `audit:kontras-nonteks` mengukur
     2,04–2,17:1 di atas hijau hero — jauh di bawah ambang 3:1 §1.4.11 untuk
     BATAS KONTROL. /45 = 3,45:1, bermargin. Sama seperti placeholder di bawah:
     nilai kaca ini lahir di atas kartu putih dan tak pernah diukur ulang
     setelah pindah ke permukaan hijau.
     placeholder /55 → /75 (24 Agu 2026): `audit:kontras` mengukur 4,32:1 di
     atas kaca gelap-di-atas-hijau — LOLOS di kartu putih tempat nilai ini
     lahir, GAGAL di permukaan hero. Permukaan berubah, angkanya wajib diukur
     ulang; jangan salin alpha antar permukaan.
     placeholder /85 → /70 (30 Sep 2026): di /85 contohnya nyaris seputih
     isian asli, jadi kolom KOSONG terbaca sudah terisi. /70 diukur piksel di
     kartu bendahara yang baru: 7,89:1 terang · 8,41:1 gelap (AAA app) — /65
     sudah jatuh ke 6,97. Titik-titik "••••••••" di kolom password dibuang:
     itu persis rupa password yang TERSIMPAN. */
  const field =
    'w-full pl-11 pr-4 py-4 rounded-xl bg-black/25 backdrop-blur-sm ' +
    'border border-white/45 text-body text-white placeholder-white/70 ' +
    'focus:outline-none focus:ring-2 focus:ring-[var(--gold-songket)] ' +
    'focus:border-[var(--gold-songket)] transition';

  return (
    <main
      /* `min-h-dvh` + `overflow-x-hidden`, BUKAN `h-dvh overflow-hidden`: begitu
         panel bendahara terbuka, isinya lebih tinggi dari layar HP pendek — dgn
         tinggi terkunci, tombol "Masuk" berada di luar kotak dan tak pernah bisa
         diketuk. Tinggi minimum membuat halaman tumbuh & menggulir seperlunya. */
      className="hero-noise relative min-h-dvh overflow-x-hidden flex flex-col"
      style={{ background: 'var(--hero-glow), var(--hero-gradient)' }}
    >
      {/* Motif anyaman ketupat — identitas RT.
          Mask & opacity bawaan `.songket-weave` disetel untuk KARTU saldo ~180px;
          dipasang polos di layar penuh 844px ia melebar ke dua pertiga layar dan
          terbaca seperti JARING, bukan kain — persis kegagalan yang sama sudah
          dibayar sekali saat opacity diturunkan 0,8 → 0,45. Di sini dipersempit
          lagi ke sudut kanan-atas saja: motifnya latar, wordmark yang memimpin. */}
      <div
        aria-hidden="true"
        className="songket-weave pointer-events-none absolute inset-0"
        style={{
          opacity: 0.26,
          WebkitMaskImage:
            'radial-gradient(88% 52% at 100% 0%, #000 0%, rgba(0,0,0,0.4) 38%, transparent 72%)',
          maskImage:
            'radial-gradient(88% 52% at 100% 0%, #000 0%, rgba(0,0,0,0.4) 38%, transparent 72%)',
        }}
      />

      {/* Vignette bawah — memberi kedalaman ketiga & mendudukkan tombol di
          permukaan, bukan mengambang di bidang hijau rata. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(125% 72% at 50% 118%, rgba(0,0,0,0.42) 0%, transparent 62%)',
        }}
      />

      <div
        className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-sm mx-auto
                   px-6 pt-[calc(env(safe-area-inset-top)+2rem)]
                   pb-[calc(env(safe-area-inset-bottom)+2rem)]"
      >
        {/* ── Identitas ────────────────────────────────────────────── */}
        <div className="rise text-center">
          {/* Emas beralfa ditulis `[color:rgb(232_182_81/…)]` = `--gold-songket`
              #E8B651. `border-[var(--gold-songket)]/40` TAK ter-compile — Tailwind
              tak bisa memberi alfa pada `var()` — dan diam-diam jatuh ke bingkai
              bawaan `gray-200` (30 Sep 2026; sama untuk cincin logo di bawah, yang
              jatuh ke BIRU bawaan `ring`). Petunjuk tipe `color:` WAJIB: tanpa itu
              `border-[rgb(…)]` pun tak dibangkitkan (bentrok tafsir lebar/warna),
              sementara `ring-[rgb(…)]` jadi — gagal diam-diam yang sama, sekali
              lagi. Periksa computed style-nya, jangan percaya kelasnya. */}
          <span
            className="inline-flex items-center px-4 py-2 rounded-full
                       bg-black/25 border border-[color:rgb(232_182_81/0.4)]
                       text-caption font-semibold text-[#F1E3C0]"
          >
            RT&nbsp;004/006 · Tanah Baru, Beji
          </span>

          <div className="pop relative mx-auto mt-8 w-[5.5rem] h-[5.5rem]">
            <img
              src={logoRt}
              alt="Logo RT 004/006"
              width={88}
              height={88}
              /* Aset paling atas-lipatan di layar pertama app — naikkan di antrean
                 fetch, jangan biarkan bersaing dgn request lain. */
              fetchPriority="high"
              className="w-[5.5rem] h-[5.5rem] rounded-3xl object-cover
                         ring-1 ring-[color:rgb(232_182_81/0.5)]
                         login-lift-logo"
            />
          </div>

          <h1 className="font-display mt-6 text-display font-extrabold text-white">
            Hadiran RT
          </h1>
          <p className="mt-3 text-body font-medium text-[#A7F3D0]">
            Transparansi kas &amp; kehadiran warga
          </p>

          {/* Benang emas + satu belah-ketupat — motif songket yang sama dgn latar,
              dikecilkan jadi satu detail. Justru detail sekecil ini yang terbaca
              "dikerjakan orang", bukan "keluaran generator". */}
          <span aria-hidden="true" className="mt-8 flex items-center justify-center gap-3">
            <span
              className="h-px w-14"
              style={{ background: 'linear-gradient(90deg, transparent, var(--gold-songket))' }}
            />
            <span
              className="w-[7px] h-[7px] rotate-45 border"
              style={{ borderColor: 'var(--gold-songket)' }}
            />
            <span
              className="h-px w-14"
              style={{ background: 'linear-gradient(90deg, var(--gold-songket), transparent)' }}
            />
          </span>
        </div>

        {/* ── Aksi utama — SATU ketukan, tanpa gerbang ─────────────── */}
        <div className="rise mt-8">
          <button
            type="button"
            /* `id` ini KONTRAK, bukan hiasan: seluruh sapuan audit masuk lewat
               sini. Sebelumnya kaitnya `#warga-password` — kolom sandi yang
               ikut terbuang saat gerbangnya dihapus, dan itu mematikan 20
               sapuan sekaligus. Jangan ganti/lepas tanpa mengubah
               `loginWarga()` di scripts/lib/audit-harness.mjs. */
            id="masuk-warga"
            onClick={() => { haptic(12); onWargaMode(); }}
            className="press w-full min-h-[56px] px-6 rounded-2xl bg-white text-[#063A21]
                       font-bold text-subtitle flex items-center justify-center gap-3
                       login-lift-cta"
          >
            Masuk sebagai Warga
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="mt-3 text-center text-caption text-white/80">
            Lihat saldo, jadwal, absensi &amp; talangan
          </p>
        </div>

        {/* ── Pemisah ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 my-8">
          <span className="h-px flex-1 bg-white/20" />
          {/* /55 → /75: `audit:kontras` mengukur 4,13:1 di atas hijau hero —
              di bawah AA 4,5 untuk teks 11px/600. Nilai /55 warisan pass
              pertama layar ini, tak pernah diukur di permukaan HIJAU. */}
          <span className="text-overline font-semibold uppercase text-white/85">
            atau
          </span>
          <span className="h-px flex-1 bg-white/20" />
        </div>

        {/* ── Bendahara — SATU kartu: kepalanya pemicu, badannya form ──
            (30 Sep 2026) Dulu dua kotak bertumpuk — tombol berbingkai, lalu
            panel berbingkai sendiri di bawahnya — dan bingkai panel itu
            `border-white/12`, nilai yang TAK ADA di skala opacity Tailwind:
            kelasnya tak pernah ter-compile, jadi yang tercat bingkai bawaan
            `gray-200` hampir pekat. Kini satu permukaan; batas /45 milik
            KARTU karena ia juga batas pemicu (kontrol → ambang 3:1 §1.4.11).
            Goyangan galat ikut di kartu: di wrapper collapse `overflow-hidden`
            geseran 4px terpotong di tepi. */}
        <div
          className={`rounded-2xl bg-black/20 border border-white/45 ${shakeAdmin ? 'shake' : ''}`}
          onAnimationEnd={() => setShakeAdmin(false)}
        >
          <button
            type="button"
            onClick={() => { haptic(); setBendaharaOpen((o) => !o); }}
            aria-expanded={bendaharaOpen}
            /* Tanpa `.press`: skala 0,97 menciutkan kepala DI DALAM bingkai
               kartu yang diam. Umpan baliknya lewat latar. `max-[359px]:px-3`
               — di 320px label 193px kurang 1px dari ruangnya dan patah dua
               baris; 12px menyisakan 7px. */
            className={`w-full min-h-[52px] px-4 max-[359px]:px-3 rounded-2xl ${bendaharaOpen ? 'rounded-b-none' : ''}
                       hover:bg-white/5 active:bg-white/10 transition-colors
                       flex items-center justify-between gap-2 text-body font-semibold text-white`}
          >
            <span className="flex items-center gap-2 min-w-0 text-left">
              <Lock className="w-4 h-4 shrink-0 text-[var(--gold-songket)]" />
              Masuk sebagai Bendahara
            </span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 text-white/70 transition-transform duration-ketuk ${bendaharaOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-masuk ease-out ${bendaharaOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            // Collapse = tinggi 0, tapi email/password/submit di dalam TETAP fokusabel
            // via Tab & terbaca screen reader. `inert` mengeluarkannya dari tab-order
            // sekaligus a11y tree sampai panel dibuka. (React 18 belum punya tipe
            // `inert`, jadi di-spread sebagai atribut.)
            {...(!bendaharaOpen ? ({ inert: '' } as Record<string, string>) : {})}
          >
            <div className="overflow-hidden">
              <div className="mx-4 max-[359px]:mx-3 border-t border-white/15 py-4">
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="login-email" className="block mb-2 text-caption font-semibold text-white/85">
                      Email
                    </label>
                    <div className="relative">
                      {/* `z-10 pointer-events-none`: input pakai `backdrop-blur`, dan
                          backdrop-filter MEMBUAT stacking context — tanpa z-10 ikon
                          `absolute` tenggelam di balik kacanya sendiri. */}
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none w-4 h-4 text-white/60" />
                      <input
                        id="login-email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="off"
                        spellCheck={false}
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); galat.hapus('login-email'); }}
                        placeholder="contoh@email.com"
                        required={bendaharaOpen}
                        className={field}
                        {...galat.aria('login-email')}
                      />
                    </div>
                    <GalatKolom id="login-email-galat" pesan={galat.pesan('login-email')} permukaan="hero" />
                  </div>

                  <div>
                    <label htmlFor="login-password" className="block mb-2 text-caption font-semibold text-white/85">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none w-4 h-4 text-white/60" />
                      <input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); galat.hapus('login-password'); }}
                        required={bendaharaOpen}
                        className={`${field} pr-12`}
                        {...galat.aria('login-password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        className="press-icon absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-white/65 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <GalatKolom id="login-password-galat" pesan={galat.pesan('login-password')} permukaan="hero" />
                  </div>

                  {error && (
                    <div role="alert" className="reveal rounded-xl bg-rose-950/70 border border-rose-400/40 px-4 py-3">
                      <p className="text-body font-medium text-rose-100">{error}</p>
                    </div>
                  )}

                  {/* Emas sbg aksi ADMIN: memisahkannya dari putih milik warga tanpa
                      melahirkan warna baru. Keadaan nonaktif dicat SOLID (bukan
                      opacity) supaya labelnya tetap terbaca — ambang `audit:mati`.

                      Label nonaktif #0A3520 → #04180E (26 Agu 2026). `audit:mati`
                      mengukur 3,45:1 (ambang 4,5) sementara rumus WCAG di atas
                      pasangan warna yang sama (#0A3520 pada #C2A052) memberi
                      5,47:1. Selisih itu TERJELASKAN 30 Sep 2026, dan yang salah
                      alatnya: teks tombol ini anak LANGSUNG <button>, jadi kotak
                      glyph `audit:mati` = seluruh tombol 278×50px dan ekor 2%
                      sampelnya jatuh di piksel antialias, bukan inti huruf. Waktu
                      itu pun #04180E terbaca 2,52:1 padahal ~7,5:1. Kini kotak
                      glyph diukur lewat `Range` → 7,39:1, cocok dgn rumus.
                      #04180E tetap dipakai: marginnya lebar dan terbaca jelas.

                      Label AKTIF #063A21 → #00351C (30 Sep 2026): 6,88 → 7,37:1,
                      di bawah ambang AAA app selama berbulan-bulan tanpa satu
                      laporan — `audit:kontras` memotret Login dgn panel TERTUTUP,
                      jadi tombol ini tak pernah masuk populasinya. Rona & kroma
                      dikunci di OKLab, cuma L turun 0,02 (tak terpotong gamut). */}
                  <button
                    type="submit"
                    /* KONTRAK, sepasang dgn `id="masuk-warga"` di atas — dan ini
                       lahir dari cacat yang sudah terjadi. `audit:masuk`
                       mengaitkan diri ke TEKS tombol (/Masuk sebagai Bendahara|
                       Memproses/) di dalam <form>; sesudah Login digambar ulang,
                       "Masuk sebagai Bendahara" pindah ke pemilih peran di LUAR
                       form dan submit ini tinggal berbunyi "Masuk" saat diam.
                       Sapuan itu lalu mati ~8 hari tanpa vonis — gerbang masuk &
                       keluar saat jaringan busuk tak terjaga selama itu.
                       Pelajaran ke-24, terulang di jalur yang dulu terlewat:
                       kait WAJIB `id`, JANGAN teks tombol — teks berubah di tiap
                       pass penyuntingan kata. Jangan ganti/lepas tanpa mengubah
                       scripts/audit-masuk.mjs. */
                    id="masuk-bendahara"
                    disabled={loading}
                    className="press w-full min-h-[50px] rounded-xl font-semibold text-body
                               bg-[var(--gold-songket)] text-[#00351C]
                               disabled:bg-[#C2A052] disabled:text-[#04180E]
                               transition-colors"
                  >
                    {loading ? 'Memproses…' : 'Masuk'}
                  </button>
                  {/* `text-balance`: di dalam kartu kalimat ini patah dua baris di
                      semua lebar HP, dan tanpa penyeimbang "RT" tertinggal sendirian. */}
                  <p className="text-center text-caption text-white/80 text-balance">
                    Bendahara lupa password? Hubungi pengurus RT
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
