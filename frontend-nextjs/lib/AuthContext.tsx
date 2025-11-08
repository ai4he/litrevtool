'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authAPI } from './api';
import { User, setToken, removeToken, getToken } from './auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (googleToken: string) => Promise<boolean>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = getToken();
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      removeToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (googleToken: string) => {
    try {
      const response = await authAPI.googleLogin(googleToken);
      const { access_token } = response.data;
      setToken(access_token);
      await fetchUser();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};
