import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, loginQuick, loading } = useAuth();
  const [email, setEmail] = useState('bob.user@officelink.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await login(email, password);
    if (!res.success) {
      setError(res.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md border border-slate-200 max-w-md w-full p-6">
        
        {/* Brand Header with KPIT Colors */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="w-4 h-4 rounded-full bg-kpit-green"></span>
            <span className="text-2xl font-bold text-kpit-purple tracking-tight">Office Link</span>
          </div>
          <p className="text-sm text-slate-500">Resource Reservation Platform</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Simple Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-kpit-green"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-kpit-green"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-kpit-green hover:bg-kpit-greenHover text-white font-semibold text-sm transition-colors shadow-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="my-5 border-t border-slate-200 text-center relative">
          <span className="bg-white px-3 text-xs text-slate-400 absolute -top-2 left-1/2 -translate-x-1/2">
            OR TEST WITH
          </span>
        </div>

        {/* Quick Login Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => loginQuick('user')}
            disabled={loading}
            className="py-2 px-3 border border-slate-300 hover:border-kpit-green rounded-lg text-xs font-semibold text-slate-700 hover:bg-kpit-greenLight transition-colors text-center"
          >
            Login as User (Bob)
          </button>

          <button
            type="button"
            onClick={() => loginQuick('admin')}
            disabled={loading}
            className="py-2 px-3 border border-purple-300 hover:border-kpit-purple rounded-lg text-xs font-semibold text-kpit-purple hover:bg-kpit-purpleLight transition-colors text-center"
          >
            Login as Admin (Alice)
          </button>
        </div>

      </div>
    </div>
  );
};
