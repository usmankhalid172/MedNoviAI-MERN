"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  specialty?: string;
}

export interface AuthContextType {
  isLoggedIn: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  session: Session | null;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isInitializing: true,
  isLoading: true,
  user: null,
  session: null,
  login: () => {},
  logout: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

function userFromSession(session: Session | null): AuthUser | null {
  const authUser = session?.user;

  if (!authUser) return null;

  const meta = (authUser.user_metadata ?? {}) as Record<
    string,
    string | undefined
  >;

  return {
    id: authUser.id,
    name: meta.name || authUser.email || "",
    email: authUser.email,
    role: meta.role || "patient",
    specialty: meta.specialty,
  };
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;

    if (!supabase) {
      setIsInitializing(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;

      const nextUser = userFromSession(session);

      setSession(session);
      setUser(nextUser);
      setIsLoggedIn(!!nextUser);
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      const nextUser = userFromSession(session);

      setSession(session);
      setUser(nextUser);
      setIsLoggedIn(!!nextUser);
      setIsInitializing(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback((nextUser: AuthUser) => {
    setIsLoggedIn(true);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsLoggedIn(false);
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isInitializing,
        isLoading: isInitializing,
        user,
        session,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}