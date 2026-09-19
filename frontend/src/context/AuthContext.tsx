"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { getToken, removeToken } from "@/lib/auth";

interface User {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  login: () => {},
  logout: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = getToken();
    Promise.resolve().then(() => {
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);

      try {
        const raw = token.includes(".") ? token.split(".")[1] : token;
        const payload = JSON.parse(atob(raw));
        setUser({
          id: payload.sub || payload.id || payload.userId,
          name: payload.name,
          email: payload.email,
          role: payload.role,
        });
      } catch {
        // Token exists but is not decodable — session flag stays, user is null.
      }
    });
  }, []);

  const logout = () => {
    removeToken();
    setIsLoggedIn(false);
    setUser(null);
  };

  const login = (nextUser: User) => {
    setIsLoggedIn(true);
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};