import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, register, loading } = useAuth();
  const [isRegister, setIsRegister] = useState<boolean>(false);

  // Form states
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('admin@kpit.com');
  const [password, setPassword] = useState<string>('Admin@123');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!fullName.trim()) {
        setError('Please enter your full name');
        return;
      }
      const res = await register(fullName, email, password);
      if (!res.success) {
        setError(res.message || 'Registration failed');
      }
    } else {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message || 'Invalid email or password');
      }
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setIsRegister(false);
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
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
          <p className="text-xs text-slate-500">Resource Reservation Platform (KPIT Technologies)</p>
        </div>

        {/* Tab switch between Sign In and Register */}
        <div className="flex border-b border-slate-200 mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(null); }}
            className={`pb-2.5 flex-1 text-center transition-colors border-b-2 ${
              !isRegister
                ? 'border-kpit-green text-kpit-green font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(null); }}
            className={`pb-2.5 flex-1 text-center transition-colors border-b-2 ${
              isRegister
                ? 'border-kpit-green text-kpit-green font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Employee Registration
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-kpit-green"
                placeholder="e.g. John Doe"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-kpit-green"
              placeholder="name@kpit.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-kpit-green font-mono"
              placeholder="••••••••"
            />
          </div>

          {isRegister && (
            <p className="text-[11px] text-slate-400">
              * Note: New registrations are created with standard <strong>USER</strong> role. Only administrators can assign Admin privileges.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-kpit-green hover:bg-kpit-greenHover text-white font-semibold text-xs transition-colors shadow-sm mt-2"
          >
            {loading ? 'Authenticating with Backend...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        {/* Quick Fill Credentials Helper for testing */}
        {!isRegister && (
          <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <span className="block text-[11px] text-slate-400 mb-2 font-medium">Quick Credentials for Testing:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@kpit.com', 'Admin@123')}
                className="p-2 border border-purple-200 bg-purple-50 text-kpit-purple rounded-md text-[11px] font-semibold text-left hover:bg-purple-100"
              >
                <span className="block font-bold">Admin Account</span>
                <span className="text-[10px] text-slate-500 font-mono">admin@kpit.com</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('bob@kpit.com', 'User@123')}
                className="p-2 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-md text-[11px] font-semibold text-left hover:bg-emerald-100"
              >
                <span className="block font-bold">Standard User</span>
                <span className="text-[10px] text-slate-500 font-mono">bob@kpit.com</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
