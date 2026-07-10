import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, Users, Sparkles, ArrowRight, ChevronDown, Info } from 'lucide-react';
import logoRt from '../assets/logo-rt.svg';
import { haptic } from '../lib/utils';

// Pagar ringan untuk Mode Warga — BUKAN kredensial rahasia, hanya agar warga
// sadar sedang masuk ke mode lihat-saja. Ganti nilainya di sini bila perlu.
const WARGA_PASSWORD = 'warga';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onWargaMode: () => void;
}

export default function Login({ onLogin, onWargaMode }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Warga = pintu utama (selalu tampil). Bendahara = sekunder (collapse).
  const [wargaPassword, setWargaPassword] = useState('');
  const [showWargaPassword, setShowWargaPassword] = useState(false);
  const [wargaError, setWargaError] = useState('');
  const [bendaharaOpen, setBendaharaOpen] = useState(false);

  function handleWargaSubmit() {
    haptic(12);
    if (wargaPassword.trim().toLowerCase() === WARGA_PASSWORD) {
      setWargaError('');
      onWargaMode();
    } else {
      // Jangan reset field, biarkan warga memperbaiki ketikannya
      setWargaError('Password warga salah. Silakan ketik: warga');
    }
  }

  // Bantu warga yang bingung: satu ketukan mengisi kata kunci otomatis.
  function isiOtomatis() {
    haptic(8);
    setWargaPassword(WARGA_PASSWORD);
    setWargaError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    haptic(12);
    setError('');
    setLoading(true);
    const err = await onLogin(email.trim(), password);
    if (err) setError('Email atau password salah.');
    setLoading(false);
  }

  return (
    <main className="login-bg login-grain relative min-h-dvh flex flex-col items-center justify-center px-6 py-10 overflow-hidden">

      {/* ── Aurora blobs — animasi mengambang halus (branded exception per DESIGN.md §381) ── */}
      <div
        aria-hidden="true"
        className="login-blob-a pointer-events-none absolute -top-24 -right-20 w-[360px] h-[360px] rounded-full
                   bg-emerald-300/40 dark:bg-emerald-800/40 blur-[80px]"
      />
      <div
        aria-hidden="true"
        className="login-blob-b pointer-events-none absolute -bottom-28 -left-20 w-[300px] h-[300px] rounded-full
                   bg-teal-300/35 dark:bg-teal-900/50 blur-[70px]"
      />
      {/* Accent blob tengah — memberi depth ketiga */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[200px] h-[200px] rounded-full
                   bg-emerald-200/30 dark:bg-emerald-900/30 blur-[60px]"
      />

      {/* ── Hero area ── */}
      <div className="relative mb-7 text-center z-10">
        {/* Logo dengan pop spring entrance */}
        <div className="pop relative mx-auto mb-5 w-[5.5rem] h-[5.5rem]">
          {/* Halo cincin di belakang logo */}
          <span
            aria-hidden="true"
            className="absolute inset-0 -m-2 rounded-[28px]
                       bg-white/50 dark:bg-white/10 blur-sm"
          />
          <img
            src={logoRt}
            alt="Logo RT 004/006"
            className="relative w-[5.5rem] h-[5.5rem] rounded-3xl object-cover
                       ring-2 ring-white/80 dark:ring-white/20
                       shadow-[0_4px_20px_-4px_rgba(11,80,50,0.35)]"
          />
        </div>

        {/* Wordmark */}
        <h1
          className="rise font-display text-[1.85rem] font-bold tracking-tight
                     text-gray-900 dark:text-gray-50 drop-shadow-sm"
          style={{ animationDelay: '0.08s' }}
        >
          Hadiran RT
        </h1>
        <p
          className="rise mt-1.5 text-[0.8125rem] font-semibold
                     text-emerald-700/90 dark:text-emerald-300/80
                     drop-shadow-sm"
          style={{ animationDelay: '0.14s' }}
        >
          RT 004/006 · Tanah Baru Beji · Depok
        </p>

        {/* Tagline — bikin momen brand */}
        <p
          className="rise mt-2 text-xs text-emerald-800/60 dark:text-emerald-200/50 font-medium"
          style={{ animationDelay: '0.18s' }}
        >
          Transparansi kas &amp; kehadiran warga
        </p>
      </div>

      {/* ── Glassmorphism Card — branded exception DESIGN.md §381 ── */}
      <div
        className="rise login-card relative w-full max-w-sm rounded-3xl p-6 z-10"
        style={{ animationDelay: '0.22s' }}
      >
        <h2 className="font-display text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-0.5">
          Selamat Datang
        </h2>
        <p className="text-[0.8125rem] text-gray-500 dark:text-gray-400 mb-5">
          Warga RT 004/006 — silakan masuk
        </p>

        {/* ── WARGA — pintu utama (istimewa) ──────────────────────── */}
        <div className="login-warga-tint relative rounded-2xl p-4">
          {/* badge sudut */}
          <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[0.6875rem] font-bold uppercase tracking-wide shadow-sm">
            <Sparkles className="w-2.5 h-2.5" /> Akses Cepat
          </span>

          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500 text-white shrink-0 shadow-sm">
              <Users className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">Masuk sebagai Warga</p>
              <p className="text-[0.75rem] text-emerald-700/90 dark:text-emerald-300/80 font-medium">
                Lihat saldo, jadwal, absensi &amp; talangan
              </p>
            </div>
          </div>

          {/* Petunjuk */}
          <div className="flex items-start gap-2 mb-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-700/30 px-3 py-2.5">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-[0.75rem] text-emerald-800 dark:text-emerald-200 leading-snug">
              Tanpa daftar. Cukup ketik kata{' '}
              <button
                type="button"
                onClick={isiOtomatis}
                className="font-bold underline decoration-emerald-400 underline-offset-2 active:opacity-70"
              >
                warga
              </button>
              {' '}di kolom bawah, lalu tekan <span className="font-semibold">Masuk Sekarang</span>.
            </p>
          </div>

          <label htmlFor="warga-password" className="sr-only">Password Warga</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/70" />
            <input
              id="warga-password"
              type={showWargaPassword ? 'text' : 'password'}
              value={wargaPassword}
              onChange={(e) => setWargaPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleWargaSubmit();
                }
              }}
              placeholder="Ketik: warga"
              className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/70 dark:bg-black/20
                         border border-emerald-200/80 dark:border-emerald-700/40
                         text-sm text-gray-900 dark:text-gray-100
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
                         transition backdrop-blur-sm"
            />
            <button
              type="button"
              onClick={() => setShowWargaPassword((p) => !p)}
              aria-label={showWargaPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              className="press-icon absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              {showWargaPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {wargaError && (
            <div role="alert" className="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-xl px-4 py-2.5 mt-2">
              <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{wargaError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleWargaSubmit}
            className="btn-brand w-full mt-3 min-h-[48px] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            Masuk Sekarang <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Pemisah */}
        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          <span className="text-[0.6875rem] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">atau</span>
          <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        </div>

        {/* ── BENDAHARA — sekunder (collapse) ─────────────────────── */}
        <button
          type="button"
          onClick={() => { haptic(); setBendaharaOpen((o) => !o); }}
          aria-expanded={bendaharaOpen}
          className="press w-full flex items-center justify-between px-1 py-1.5 text-sm font-semibold text-gray-600 dark:text-gray-300"
        >
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" /> Masuk sebagai Bendahara
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${bendaharaOpen ? 'rotate-180' : ''}`} />
        </button>

        <div
          className={`grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-out ${bendaharaOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}
          // Collapse = tinggi 0, tapi email/password/submit di dalam TETAP fokusabel
          // via Tab & terbaca screen reader. `inert` mengeluarkannya dari tab-order
          // sekaligus a11y tree sampai panel dibuka. (React 18 belum punya tipe
          // `inert`, jadi di-spread sebagai atribut.)
          {...(!bendaharaOpen ? ({ inert: '' } as Record<string, string>) : {})}
        >
          <div className="overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/60 dark:bg-black/20
                               border border-gray-200/80 dark:border-gray-700
                               text-sm text-gray-900 dark:text-gray-100
                               placeholder-gray-400 dark:placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
                               transition backdrop-blur-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required={bendaharaOpen}
                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/60 dark:bg-black/20
                               border border-gray-200/80 dark:border-gray-700
                               text-sm text-gray-900 dark:text-gray-100
                               placeholder-gray-400 dark:placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
                               transition backdrop-blur-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="press-icon absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div role="alert" className="bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-xl px-4 py-2.5">
                  <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="press w-full py-3 rounded-xl bg-gray-900/90 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Memproses…' : 'Masuk sebagai Bendahara'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className="rise relative z-10 text-xs text-emerald-800/50 dark:text-emerald-200/40 mt-5 text-center" style={{ animationDelay: '0.32s' }}>
        Bendahara lupa password? Hubungi pengurus RT
      </p>
    </main>
  );
}
