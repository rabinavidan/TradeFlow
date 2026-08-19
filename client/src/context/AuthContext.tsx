import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentUser, loginRequest, registerRequest } from '../api/auth.api';
import { TOKEN_STORAGE_KEY } from '../api/client';
import type { LoginPayload, RegisterPayload } from '../api/auth.api';
import type { User } from '../types/auth';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)));

  // Server state: "who am I" derived from the stored token. TanStack Query
  // owns loading/error/caching here instead of a manual useEffect+useState.
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    enabled: hasToken,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await loginRequest(payload);
      localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
      queryClient.setQueryData(['auth', 'me'], res.user);
      setHasToken(true);
    },
    [queryClient],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await registerRequest(payload);
      localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
      queryClient.setQueryData(['auth', 'me'], res.user);
      setHasToken(true);
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    queryClient.removeQueries({ queryKey: ['auth', 'me'] });
    setHasToken(false);
  }, [queryClient]);

  const value = useMemo(
    () => ({ user: user ?? null, isLoading: hasToken && isLoading, login, register, logout }),
    [user, hasToken, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
