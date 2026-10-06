import { createContext, useContext } from 'react';
import type { AuthUser } from '../lib/types';

export interface AuthContextValue {
  user: AuthUser | null;
  /** true enquanto valida o token salvo ao abrir o painel. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
