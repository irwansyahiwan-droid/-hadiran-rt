import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowRight, ChevronDown } from 'lucide-react';
import logoRt from '../assets/logo-rt.svg';
import { haptic } from '../lib/utils';

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
    setLoading(true);
    try {
      // Pesan datang matang dari useAuth — jangan ratakan lagi jadi "password
      // salah", sebab sebab jaringan dan sebab kredensial butuh tindakan beda.
      const err = await onLogin(email.trim(), password);
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
     ulang; jangan salin alpha antar permukaan. */
  const field =
    'w-full pl-11 pr-4 py-4 rounded-xl bg-black/25 backdrop-blur-sm ' +
    'border border-white/45 text-body text-white placeholder-white/75 ' +
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
          <span
            className="inline-flex items-center px-4 py-2 rounded-full
                       bg-black/25 border border-[var(--gold-songket)]/40
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
                         ring-1 ring-[var(--gold-songket)]/50
                         shadow-[0_16px_38px_-12px_rgba(0,0,0,0.6)]"
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
                       shadow-[0_12px_32px_-12px_rgba(0,0,0,0.65)]"
          >
            Masuk sebagai Warga
            <ArrowRight className="w-[1.125rem] h-[1.125rem]" />
          </button>
          <p className="mt-3 text-center text-caption text-white/70">
            Lihat saldo, jadwal, absensi &amp; talangan
          </p>
        </div>

        {/* ── Pemisah ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 my-8">
          <span className="h-px flex-1 bg-white/20" />
          {/* /55 → /75: `audit:kontras` mengukur 4,13:1 di atas hijau hero —
              di bawah AA 4,5 untuk teks 11px/600. Nilai /55 warisan pass
              pertama layar ini, tak pernah diukur di permukaan HIJAU. */}
          <span className="text-overline font-semibold uppercase text-white/75">
            atau
          </span>
          <span className="h-px flex-1 bg-white/20" />
        </div>

        {/* ── Bendahara — sekunder, tetap di permukaan yang sama ───── */}
        <button
          type="button"
          onClick={() => { haptic(); setBendaharaOpen((o) => !o); }}
          aria-expanded={bendaharaOpen}
          /* /20 → /45, satu bahasa dgn batas kolom isian di bawahnya — ia
             batas KONTROL juga, dan tunduk pada ambang 3:1 yang sama. */
          className="press w-full min-h-[52px] px-5 rounded-xl bg-black/20 border border-white/45
                     flex items-center justify-between text-body font-semibold text-white"
        >
          <span className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-[var(--gold-songket)]" />
            Masuk sebagai Bendahara
          </span>
          <ChevronDown
            className={`w-4 h-4 text-white/70 transition-transform duration-ketuk ${bendaharaOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <div
          // Shake dipasang di panel, BUKAN di tiap field: field-nya `w-full` di
          // dalam wrapper `overflow-hidden` (mesin collapse), jadi geseran 4px
          // terpotong di tepi. Satu goyangan utuh lebih terbaca.
          className={`grid transition-[grid-template-rows,opacity,margin-top] duration-masuk ease-out ${bendaharaOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'} ${shakeAdmin ? 'shake' : ''}`}
          onAnimationEnd={() => setShakeAdmin(false)}
          // Collapse = tinggi 0, tapi email/password/submit di dalam TETAP fokusabel
          // via Tab & terbaca screen reader. `inert` mengeluarkannya dari tab-order
          // sekaligus a11y tree sampai panel dibuka. (React 18 belum punya tipe
          // `inert`, jadi di-spread sebagai atribut.)
          {...(!bendaharaOpen ? ({ inert: '' } as Record<string, string>) : {})}
        >
          <div className="overflow-hidden">
            <div className="rounded-2xl bg-black/25 backdrop-blur-sm border border-white/12 p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block mb-2 text-caption font-semibold text-white/75">
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
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contoh@email.com"
                      required={bendaharaOpen}
                      className={field}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="block mb-2 text-caption font-semibold text-white/75">
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
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required={bendaharaOpen}
                      className={`${field} pr-12`}
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
                    pasangan warna TERUKUR (#0A3520 pada #C2A052) memberi 5,47:1.
                    Selisih itu belum dijelaskan — dan justru karena itu yang
                    dipakai VONIS ALATNYA, bukan hitungan di atas kertas: alat
                    membaca piksel yang benar-benar tercat, hitungan membaca
                    angka yang kita KIRA tercat. Diberi margin lebar (rumus
                    ~7,4:1) lalu diverifikasi ulang dgn alat yang sama. */}
                <button
                  type="submit"
                  disabled={loading}
                  className="press w-full min-h-[50px] rounded-xl font-bold text-body
                             bg-[var(--gold-songket)] text-[#063A21]
                             disabled:bg-[#C2A052] disabled:text-[#04180E]
                             transition-colors"
                >
                  {loading ? 'Memproses…' : 'Masuk'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-caption text-white/60">
          Bendahara lupa password? Hubungi pengurus RT
        </p>
      </div>
    </main>
  );
}
