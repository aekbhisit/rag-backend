"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, getTenantId } from "./config";

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  userTimezone: string;
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
  const [userTimezone, setUserTimezone] = React.useState<string>(() => {
    if (typeof window === 'undefined') return 'UTC';
    try {
      const stored = localStorage.getItem('userTimezone');
      if (stored) return stored;
      
      const appSettings = localStorage.getItem('appSettings');
      if (appSettings) {
        try {
          const parsed = JSON.parse(appSettings);
          if (parsed.timezone) return parsed.timezone;
        } catch {}
      }
      return 'UTC';
    } catch {
      return 'UTC';
    }
  });

  const login = async (email: string, token?: string) => {
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userEmail", email);
    if (token) localStorage.setItem("authToken", token);
    setIsAuthenticated(true);
    setUserEmail(email);
    
    // Fetch user profile to get timezone
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users?email=${encodeURIComponent(email)}`, {
        headers: { 'X-Tenant-ID': getTenantId() }
      });
      if (response.ok) {
        const data = await response.json();
        const user = data.items?.find((u: any) => u.email === email);
        if (user?.timezone) {
          setUserTimezone(user.timezone);
          localStorage.setItem('userTimezone', user.timezone);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch user timezone:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userTimezone");
    setIsAuthenticated(false);
    setUserEmail(null);
    setUserTimezone('UTC');
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userEmail, userTimezone, login, logout }}>
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
