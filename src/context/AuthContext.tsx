import { createContext, useContext } from 'react';
import type { AuthState } from '../hooks/useAuth';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  isBendahara: boolean;
  isWargaMode: boolean;
  exitWargaMode: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
