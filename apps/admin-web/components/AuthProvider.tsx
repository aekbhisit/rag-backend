"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, getTenantId } from "./config";

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  login: (email: string, token?: string) => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const status = localStorage.getItem('isAuthenticated');
      const email = localStorage.getItem('userEmail');
      return status === 'true' && !!email;
    } catch {
      return false;
    }
  });
  const [userEmail, setUserEmail] = React.useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const status = localStorage.getItem('isAuthenticated');
      const email = localStorage.getItem('userEmail');
      return status === 'true' && email ? email : null;
    } catch {
      return null;
    }
  });

  const login = (email: string, token?: string) => {
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userEmail", email);
    if (token) localStorage.setItem("authToken", token);
    setIsAuthenticated(true);
    setUserEmail(email);
  };

  const logout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("authToken");
    setIsAuthenticated(false);
    setUserEmail(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userEmail, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
