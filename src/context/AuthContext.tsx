"use client";

import {
  createContext,
  useCallback,
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

interface AuthContextType {
  isLoggedIn: boolean;
  isInitializing: boolean;
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isInitializing: true,
  user: null,
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

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;

      const nextUser = userFromSession(session);

      setUser(nextUser);
      setIsLoggedIn(!!nextUser);
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      const nextUser = userFromSession(session);

      setUser(nextUser);
      setIsLoggedIn(!!nextUser);
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
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, isInitializing, user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};