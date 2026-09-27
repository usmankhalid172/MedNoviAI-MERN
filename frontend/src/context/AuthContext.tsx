"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

// 1. Types define kar rahe hain (user aur loading add kiya gaya hai)
interface User {
  name: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (newToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// 2. Context create kar rahe hain
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Provider Component jo poori app ko wrap karega
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Default loading true rakhi hai
  const router = useRouter();

  // Jab app load ho toh check karein ke kya pehle se token save hai?
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      // Dummy user add kiya taake Dashboard chal sake
      setUser({ name: "Doctor", role: "doctor" });
    }
    setLoading(false); // Check complete hone ke baad loading false
  }, []);

  // Login function: Token ko save karega
  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser({ name: "Doctor", role: "doctor" });
    // Login hone ke baad Dashboard par bhej dein
    router.push("/doctor/dashboard");
  };

  // Logout function: Token ko delete karega
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, isAuthenticated: !!token }}>
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