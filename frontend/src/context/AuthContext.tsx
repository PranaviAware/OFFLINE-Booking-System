import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  loginQuick: (role: 'admin' | 'user') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check if token exists in localStorage on startup
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('officelink_token');
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch {
          localStorage.removeItem('officelink_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkToken();
  }, []);

  const login = async (email: string, password?: string) => {
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('officelink_token', data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const loginQuick = async (role: 'admin' | 'user') => {
    setLoading(true);
    try {
      const persona = role === 'admin' ? 'admin' : 'user1';
      const data = await api.demoLogin(persona);
      localStorage.setItem('officelink_token', data.token);
      setUser(data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('officelink_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginQuick, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
