import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (fullName: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check if existing token is valid on app start
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

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('officelink_token', data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || 'Invalid email or password' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.register(fullName, email, password);
      localStorage.setItem('officelink_token', data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('officelink_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
