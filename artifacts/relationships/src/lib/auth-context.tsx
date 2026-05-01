import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, getToken, setToken } from "./api";
import type { PublicUser } from "./types";

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  setUser: (u: PublicUser | null) => void;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, displayName: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUserState(null);
      setLoading(false);
      return;
    }
    try {
      const r = await api.get<{ user: PublicUser }>("/auth/me");
      setUserState(r.user);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setToken(null);
      }
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const signIn = useCallback(async (username: string, password: string) => {
    const r = await api.post<{ token: string; user: PublicUser }>("/auth/login", { username, password });
    setToken(r.token);
    setUserState(r.user);
  }, []);

  const signUp = useCallback(async (username: string, displayName: string, password: string) => {
    const r = await api.post<{ token: string; user: PublicUser }>("/auth/signup", { username, displayName, password });
    setToken(r.token);
    setUserState(r.user);
  }, []);

  const signOut = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    setToken(null);
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser: setUserState, signIn, signUp, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
