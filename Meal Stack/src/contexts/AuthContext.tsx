import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/types';
import { AppApiError, authApi, tokenStore, type BackendRole, type BackendUser } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; role: BackendRole }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

function toAppUser(input: BackendUser): User {
  return {
    id: input._id,
    name: input.name,
    email: input.email,
    role: input.role,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = tokenStore.get();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const me = await authApi.getMe();
        if (!cancelled && me) {
          setUser(toAppUser(me));
        }
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (!res.token || !res.user) {
      throw new AppApiError({
        success: false,
        status: 500,
        code: 'AUTH_INVALID_RESPONSE',
        message: 'Login response is missing token or user',
      });
    }

    tokenStore.set(res.token);
    setUser(toAppUser(res.user));
  };

  const register = async (input: { name: string; email: string; password: string; role: BackendRole }) => {
    const res = await authApi.register(input);
    if (!res.token || !res.user) {
      throw new AppApiError({
        success: false,
        status: 500,
        code: 'AUTH_INVALID_RESPONSE',
        message: 'Register response is missing token or user',
      });
    }

    tokenStore.set(res.token);
    setUser(toAppUser(res.user));
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
