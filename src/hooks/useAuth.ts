import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import {
  BATAS_MASUK_MS, adaSesiTersimpan, batasWaktu, hapusSesiLokal, pesanLogin,
} from '../lib/authSesi';

export type Role = 'bendahara' | 'warga';

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: Role | null;
  loading: boolean;
}

const KELUAR: AuthState = { user: null, session: null, role: null, loading: false };

/** Murni — di luar komponen supaya `pasangListener` bisa stabil seumur hook. */
function resolveRole(user: User | null): Role | null {
  if (!user) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (meta?.role === 'bendahara') return 'bendahara';
  return 'warga';
}

function sesiKe(session: Session | null): AuthState {
  return {
    user: session?.user ?? null,
    session,
    role: resolveRole(session?.user ?? null),
    loading: false,
  };
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

  // Satu listener saja, seumur hidup hook. Tanpa ini, tiap `signIn` menambah
  // satu langganan baru yang tak pernah dicabut — keluar-masuk berulang dalam
  // satu sesi halaman membuat setiap perubahan sesi memicu N kali setState.
  const lepasRef = useRef<(() => void) | null>(null);

  const pasangListener = useCallback((supabase: SupabaseClient) => {
    lepasRef.current?.();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState(sesiKe(session)));
    lepasRef.current = () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let batal = false;

    // Tak ada sesi tersimpan → jawabannya sudah pasti "belum login". Selesaikan
    // boot SEKARANG dan jangan sentuh klien Supabase; ia ikut termuat sendiri
    // bersama chunk halaman begitu warga melewati gate.
    if (!adaSesiTersimpan()) {
      setState(KELUAR);
      return;
    }

    (async () => {
      const { supabase } = await import('../lib/supabase');
      if (batal) return;
      const { data } = await supabase.auth.getSession();
      if (batal) return;
      setState(sesiKe(data.session));
      pasangListener(supabase);
    })().catch(() => {
      // Gagal memuat klien (chunk basi / jaringan putus) — JANGAN biarkan app
      // tertahan di splash selamanya; jatuhkan ke layar Login.
      if (!batal) setState(KELUAR);
    });

    return () => { batal = true; lepasRef.current?.(); lepasRef.current = null; };
  }, [pasangListener]);

  async function prosesMasuk(email: string, password: string): Promise<string | null> {
    // Jalur bendahara: di sinilah klien Supabase pertama kali dibutuhkan bila
    // belum ada sesi. Sesudah sukses, pasang listener supaya perubahan sesi
    // berikutnya (refresh token, logout dari tab lain) tetap tersalur.
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return pesanLogin(error);
    const { data } = await supabase.auth.getSession();
    setState(sesiKe(data.session));
    pasangListener(supabase);
    return null;
  }

  /**
   * Kontrak: SELALU selesai — kembalikan `null` bila sukses, atau kalimat siap
   * tampil bila gagal. Tidak pernah melempar dan tidak pernah menggantung, agar
   * pemanggil bisa mematikan status "Memproses…" tanpa syarat.
   */
  async function signIn(email: string, password: string): Promise<string | null> {
    try {
      return await batasWaktu(prosesMasuk(email, password), BATAS_MASUK_MS);
    } catch (e) {
      // Chunk klien gagal diunduh, jaringan putus, atau lewat batas sabar —
      // sama seperti jalur boot di atas, kegagalan ini tak boleh menggantung UI.
      return pesanLogin(e);
    }
  }

  /**
   * "Keluar" HARUS selalu berhasil dari sisi HP. Kalau klien gagal dimuat atau
   * server tak terjangkau, sesi lokal tetap dibuang manual: bendahara yang
   * menekan Keluar lalu ditinggali token aktif di HP-nya adalah kegagalan yang
   * jauh lebih buruk daripada token yang belum dicabut di sisi server.
   */
  async function signOut() {
    try {
      const { supabase } = await import('../lib/supabase');
      await batasWaktu(supabase.auth.signOut(), BATAS_MASUK_MS);
    } catch { /* chunk gagal / jaringan putus / batas sabar — lanjut ke finally */ }
    finally {
      // Tanpa syarat, bukan hanya di jalur gagal: `signOut()` sendiri bisa
      // mengembalikan `{error}` tanpa melempar. Menghapus kunci yang sudah
      // terhapus itu no-op, jadi murah dan menghilangkan seluruh keraguan.
      hapusSesiLokal();
      lepasRef.current?.();
      lepasRef.current = null;
      setState(KELUAR);
    }
  }

  return { ...state, signIn, signOut };
}
