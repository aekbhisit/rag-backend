"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'buyer' | 'seller' | 'admin';
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  joinDate: string;
  preferences?: {
    currency: string;
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: 'buyer' | 'seller';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock users for demo
  const mockUsers: Record<string, User & { password: string }> = {
    'john@example.com': {
      id: '1',
      email: 'john@example.com',
      password: 'password123',
      name: 'John Doe',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      role: 'buyer',
      rating: 4.8,
      reviewCount: 127,
      isVerified: true,
      joinDate: '2023-01-15',
      preferences: {
        currency: 'USD',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      }
    },
    'sarah@example.com': {
      id: '2',
      email: 'sarah@example.com',
      password: 'password123',
      name: 'Sarah Wilson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      role: 'seller',
      rating: 4.9,
      reviewCount: 245,
      isVerified: true,
      joinDate: '2022-08-20',
      preferences: {
        currency: 'USD',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: true
        }
      }
    }
  };

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser = mockUsers[email.toLowerCase()];
    
    if (!mockUser || mockUser.password !== password) {
      setIsLoading(false);
      return { success: false, error: 'Invalid email or password' };
    }
    
    const { password: _, ...userWithoutPassword } = mockUser;
    setUser(userWithoutPassword);
    localStorage.setItem('user', JSON.stringify(userWithoutPassword));
    
    setIsLoading(false);
    return { success: true };
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check if user already exists
    if (mockUsers[userData.email.toLowerCase()]) {
      setIsLoading(false);
      return { success: false, error: 'User with this email already exists' };
    }
    
    // Create new user
    const newUser: User = {
      id: Date.now().toString(),
      email: userData.email,
      name: userData.name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name}`,
      role: userData.role,
      rating: 0,
      reviewCount: 0,
      isVerified: false,
      joinDate: new Date().toISOString(),
      preferences: {
        currency: 'USD',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      }
    };
    
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
    
    setIsLoading(false);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    setIsLoading(false);
    return { success: true };
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};