'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { getToken, setToken, removeToken, getUser, setUser, removeUser, logout as logoutUtil } from './auth';
import { initMobile, isMobileApp } from './mobile';
import { isElectron } from './electron';

interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize mobile features if on mobile platform
    if (typeof window !== 'undefined') {
      if (isMobileApp()) {
        console.log('Running in mobile app');
        initMobile();
      } else if (isElectron()) {
        console.log('Running in Electron app');
      } else {
        console.log('Running in web browser');
      }

      // Load auth state from storage
      const storedToken = getToken();
      const storedUser = getUser();

      if (storedToken && storedUser) {
        setTokenState(storedToken);
        setUserState(storedUser);
      }

      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    setTokenState(newToken);
    setUserState(userData);
  };

  const logout = () => {
    logoutUtil();
    setTokenState(null);
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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
