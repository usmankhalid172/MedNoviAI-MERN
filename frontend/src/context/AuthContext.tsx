"use client"; // Next.js mein context hamesha client side par chalta hai

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

// 1. Types define kar rahe hain
interface AuthContextType {
  token: string | null;
  login: (newToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// 2. Context create kar rahe hain
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Provider Component jo poori app ko wrap karega
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  // Jab app load ho toh check karein ke kya pehle se token save hai?
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Login function: Token ko save karega
  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    // Login hone ke baad Dashboard par bhej dein
    router.push("/doctor/dashboard"); 
  };

  // Logout function: Token ko delete karega
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

// 4. Custom hook taake kisi bhi page mein asani se use ho sake
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}