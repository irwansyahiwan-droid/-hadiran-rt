import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export type Role = 'bendahara' | 'warga';

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: Role | null;
  loading: boolean;
}

/**
 * Apakah ADA sesi bendahara tersimpan? Dibaca langsung dari localStorage
 * (Supabase menyimpannya di kunci `sb-<ref>-auth-token`) supaya pertanyaan
 * "sudah login atau belum" bisa dijawab TANPA memuat klien Supabase.
 *
 * Kenapa penting: klien Supabase 34 KB gzip, dan sebelum ini ia duduk di jalur
 * KRITIS boot — diukur di 400 kbps/CPU 4×, chunk-nya baru selesai di 3369 ms
 * dari 4138 ms total sampai kolom sandi bisa dipakai. Padahal gate warga
 * sepenuhnya lokal, dan hampir semua pengguna app ini adalah warga: mereka
 * menunggu unduhan yang tak pernah mereka perlukan di layar itu. Bendahara
 * (yang punya sesi tersimpan) tetap memuatnya seperti biasa.
 */
function adaSesiTersimpan(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sb-.+-auth-token$/.test(k)) return true;
    }
  } catch { /* storage diblokir → anggap tak ada */ }
  return false;
}

export function useAuth(): AuthState & {
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true,
  });

  function resolveRole(user: User | null): Role | null {
    if (!user) return null;
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    if (meta?.role === 'bendahara') return 'bendahara';
    return 'warga';
  }

  useEffect(() => {
    let batal = false;
    let lepas: (() => void) | undefined;

    // Tak ada sesi tersimpan → jawabannya sudah pasti "belum login". Selesaikan
    // boot SEKARANG dan jangan sentuh klien Supabase; ia ikut termuat sendiri
    // bersama chunk halaman begitu warga melewati gate.
    if (!adaSesiTersimpan()) {
      setState({ user: null, session: null, role: null, loading: false });
      return;
    }

    (async () => {
      const { supabase } = await import('../lib/supabase');
      if (batal) return;
      const { data } = await supabase.auth.getSession();
      if (batal) return;
      setState({
        user: data.session?.user ?? null,
        session: data.session,
        role: resolveRole(data.session?.user ?? null),
        loading: false,
      });
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setState({
          user: session?.user ?? null,
          session,
          role: resolveRole(session?.user ?? null),
          loading: false,
        });
      });
      lepas = () => listener.subscription.unsubscribe();
    })().catch(() => {
      // Gagal memuat klien (chunk basi / jaringan putus) — JANGAN biarkan app
      // tertahan di splash selamanya; jatuhkan ke layar Login.
      if (!batal) setState({ user: null, session: null, role: null, loading: false });
    });

    return () => { batal = true; lepas?.(); };
  }, []);

  async function signIn(email: string, password: string): Promise<string | null> {
    // Jalur bendahara: di sinilah klien Supabase pertama kali dibutuhkan bila
    // belum ada sesi. Sesudah sukses, pasang listener supaya perubahan sesi
    // berikutnya (refresh token, logout dari tab lain) tetap tersalur.
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    const { data } = await supabase.auth.getSession();
    setState({
      user: data.session?.user ?? null,
      session: data.session,
      role: resolveRole(data.session?.user ?? null),
      loading: false,
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        role: resolveRole(session?.user ?? null),
        loading: false,
      });
    });
    return null;
  }

  async function signOut() {
    const { supabase } = await import('../lib/supabase');
    await supabase.auth.signOut();
  }

  return { ...state, signIn, signOut };
}
