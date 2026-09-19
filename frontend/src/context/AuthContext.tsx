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

const USER_KEY = "mednoviai-user";

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
    const savedUser = localStorage.getItem(USER_KEY);

    if (token) {
      setIsLoggedIn(true);
    }

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
  }, []);

  const logout = () => {
    removeToken();
    localStorage.removeItem(USER_KEY);
    setIsLoggedIn(false);
    setUser(null);
  };

  const login = (nextUser: User) => {
    setIsLoggedIn(true);
    setUser(nextUser);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};