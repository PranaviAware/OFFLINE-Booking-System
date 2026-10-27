import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  loginAs: (persona: 'admin' | 'user1' | 'user2') => Promise<void>;
  setCustomToken: (token: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('officelink_token'));
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize or fetch current verified profile
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch {
          // Token invalid or expired, log in as default user1
          await loginAs('user1');
        }
      } else {
        // Default to Bob Employee (standard user) on first visit
        await loginAs('user1');
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('officelink_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true, message: data.message };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed';
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const loginAs = async (persona: 'admin' | 'user1' | 'user2') => {
    setLoading(true);
    try {
      const data = await api.demoLogin(persona);
      localStorage.setItem('officelink_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      console.error('Failed to log in:', err);
    } finally {
      setLoading(false);
    }
  };

  const setCustomToken = async (customToken: string): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    try {
      localStorage.setItem('officelink_token', customToken);
      setToken(customToken);
      const res = await api.getMe();
      setUser(res.user);
      return { success: true, message: 'Custom JWT token verified successfully' };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Token verification failed';
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('officelink_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginAs, setCustomToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
