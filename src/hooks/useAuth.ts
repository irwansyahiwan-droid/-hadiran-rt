import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Role = 'bendahara' | 'warga';

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: Role | null;
  loading: boolean;
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
    supabase.auth.getSession().then(({ data }) => {
      setState({
        user: data.session?.user ?? null,
        session: data.session,
        role: resolveRole(data.session?.user ?? null),
        loading: false,
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        role: resolveRole(session?.user ?? null),
        loading: false,
      });
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { ...state, signIn, signOut };
}
