import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, Users, Sparkles, ArrowRight, ChevronDown, Info } from 'lucide-react';
import logoRt from '../assets/logo-rt.jpg';
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
    <div className="login-bg relative min-h-dvh flex flex-col items-center justify-center px-6 overflow-hidden">

      {/* Aurora background — blob mengambang lembut (diredam di dark agar tidak menyilaukan) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="blob absolute -top-24 -left-20 w-72 h-72 rounded-full opacity-50 dark:opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #34d399 0%, transparent 70%)' }} />
        <div className="blob absolute top-1/3 -right-24 w-80 h-80 rounded-full opacity-40 dark:opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', animationDelay: '-5s' }} />
        <div className="blob absolute -bottom-28 left-1/4 w-72 h-72 rounded-full opacity-40 dark:opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6ee7b7 0%, transparent 70%)', animationDelay: '-9s' }} />
      </div>

      {/* Logo area */}
      <div className="relative mb-8 text-center">
        <img
          src={logoRt}
          alt="Logo RT 004/006"
          className="pop w-20 h-20 rounded-3xl object-cover mx-auto mb-4 shadow-xl shadow-emerald-300/60 ring-1 ring-white/60"
        />
        <h1 className="rise text-2xl font-bold text-gray-900 dark:text-gray-100" style={{ animationDelay: '0.1s' }}>Hadiran RT</h1>
        <p className="rise text-[13px] text-gray-500 dark:text-gray-400 mt-1" style={{ animationDelay: '0.16s' }}>RT 004/006 · Tanah Baru Beji · Depok</p>
      </div>

      {/* Card */}
      <div className="rise relative w-full max-w-sm bg-white/80 dark:bg-gray-900 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-200/50 border border-white/80 dark:border-gray-700 p-6"
        style={{ animationDelay: '0.22s' }}>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Selamat Datang</h2>
        <p className="text-sm text-ink-faint dark:text-gray-400 mb-5">Warga RT 004/006 — silakan masuk</p>

        {/* ── WARGA — pintu utama (istimewa) ───────────────────── */}
        <div className="relative rounded-2xl p-4 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-gray-900 border border-emerald-200/80 dark:border-emerald-800/40 shadow-[0_8px_28px_-14px_rgba(16,185,129,0.55)]">
          {/* badge sudut */}
          <span className="absolute -top-2 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wide shadow-sm shadow-emerald-400/50">
            <Sparkles className="w-2.5 h-2.5" /> Akses Cepat
          </span>

          <div className="flex items-center gap-2.5 mb-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-400/50 shrink-0">
              <Users className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">Masuk sebagai Warga</p>
              <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 font-medium">Lihat saldo, jadwal, absensi &amp; talangan</p>
            </div>
          </div>

          {/* Petunjuk jelas — warga cukup ketik kata "warga"; ketuk kata di bawah utk isi otomatis */}
          <div className="flex items-start gap-2 mb-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/25 border border-emerald-200/70 dark:border-emerald-800/40 px-3 py-2.5">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-[12px] text-emerald-800 dark:text-emerald-200 leading-snug">
              Tanpa daftar. Cukup ketik kata{' '}
              <button type="button" onClick={isiOtomatis} className="font-bold underline decoration-emerald-400 underline-offset-2 active:opacity-70">warga</button>
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
              className="w-full pl-10 pr-12 py-3 rounded-xl bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowWargaPassword((p) => !p)}
              aria-label={showWargaPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showWargaPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {wargaError && (
            <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5 mt-2">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{wargaError}</p>
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
          <div className="h-px flex-1 bg-line dark:bg-gray-800" />
          <span className="text-[11px] font-semibold text-ink-faint dark:text-gray-400 uppercase tracking-wide">atau</span>
          <div className="h-px flex-1 bg-line dark:bg-gray-800" />
        </div>

        {/* ── BENDAHARA — sekunder (collapse) ──────────────────── */}
        <button
          type="button"
          onClick={() => { haptic(); setBendaharaOpen((o) => !o); }}
          aria-expanded={bendaharaOpen}
          className="press w-full flex items-center justify-between px-1 py-1.5 text-sm font-semibold text-gray-600 dark:text-gray-300"
        >
          <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-gray-400" /> Masuk sebagai Bendahara</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${bendaharaOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className={`grid transition-all duration-300 ease-out ${bendaharaOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contoh@email.com"
                    required={bendaharaOpen}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-control dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required={bendaharaOpen}
                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-control dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="press w-full py-3 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 text-white font-semibold text-sm shadow-lg shadow-gray-400/30 hover:from-gray-900 hover:to-black transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Memproses...' : 'Masuk sebagai Bendahara'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <p className="text-xs text-ink-faint dark:text-gray-400 mt-6 text-center">
        Bendahara lupa password? Hubungi pengurus RT
      </p>
    </div>
  );
}
