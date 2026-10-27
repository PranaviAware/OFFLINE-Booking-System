import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, KeyRound, Mail, Lock, UserCheck, ArrowRight, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, loginAs, setCustomToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'sso' | 'credentials' | 'jwt'>('sso');
  
  // Credentials state
  const [email, setEmail] = useState<string>('alice.admin@officelink.com');
  const [password, setPassword] = useState<string>('password123');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Custom JWT token state
  const [customJwt, setCustomJwt] = useState<string>('');

  if (!isOpen) return null;

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login(email, password);
      if (res.success) {
        onSuccess(res.message || `Welcome! Authenticated as ${email}`);
        onClose();
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleSsoLogin = async (persona: 'admin' | 'user1' | 'user2', label: string) => {
    setLoading(true);
    setError(null);
    try {
      await loginAs(persona);
      onSuccess(`Successfully logged in as ${label}`);
      onClose();
    } catch (err: any) {
      setError('Failed to complete SSO authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomJwtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customJwt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await setCustomToken(customJwt.trim());
      if (res.success) {
        onSuccess('Custom JWT verified and attached to session');
        onClose();
      } else {
        setError(res.message || 'Custom JWT rejected by backend');
      }
    } catch (err: any) {
      setError('Backend cryptographic token validation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Sign in to Office Link</h2>
              <p className="text-xs text-slate-500">OIDC / JWT Authentication & Role-Based Access</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 pt-3 gap-4 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('sso'); setError(null); }}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'sso'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Corporate SSO (1-Click)
          </button>

          <button
            onClick={() => { setActiveTab('credentials'); setError(null); }}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'credentials'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Work Email & Password
          </button>

          <button
            onClick={() => { setActiveTab('jwt'); setError(null); }}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'jwt'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Custom JWT
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: Corporate SSO */}
          {activeTab === 'sso' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Select a corporate persona to authenticate. The backend will issue an authentic cryptographically signed JWT with verified role claims:
              </p>

              {/* Alice Admin */}
              <button
                type="button"
                onClick={() => handleSsoLogin('admin', 'Alice Admin (ADMIN)')}
                disabled={loading}
                className="w-full text-left p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-300 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-purple-700">Alice Admin</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white">
                      ADMIN ROLE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">alice.admin@officelink.com • Global access, overrides & catalog management</p>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-600 transform group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Bob User */}
              <button
                type="button"
                onClick={() => handleSsoLogin('user1', 'Bob Employee (USER)')}
                disabled={loading}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-teal-50/50 hover:border-teal-200 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-teal-700">Bob Employee</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      USER ROLE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">bob.user@officelink.com • Book spaces, view & cancel own reservations</p>
                </div>
                <ArrowRight className="w-4 h-4 text-teal-600 transform group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Charlie User */}
              <button
                type="button"
                onClick={() => handleSsoLogin('user2', 'Charlie Employee (USER)')}
                disabled={loading}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-teal-50/50 hover:border-teal-200 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-teal-700">Charlie Employee</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      USER ROLE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">charlie.user@officelink.com • Test cross-user cancellation protection</p>
                </div>
                <ArrowRight className="w-4 h-4 text-teal-600 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* TAB 2: Credentials Login */}
          {activeTab === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-teal-600" />
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tip: Use <code>alice.admin@officelink.com</code> for Admin or any email for Standard User.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-teal-600" />
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating with Backend...' : 'Sign In with Password'}
              </button>
            </form>
          )}

          {/* TAB 3: Custom JWT */}
          {activeTab === 'jwt' && (
            <form onSubmit={handleCustomJwtSubmit} className="space-y-3 text-xs">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Paste an external Auth0 or Keycloak Bearer JWT token. The backend will verify its RS256/HS256 signature and audience:
              </p>
              <textarea
                rows={4}
                required
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={customJwt}
                onChange={(e) => setCustomJwt(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-[11px] focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !customJwt.trim()}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Validating Token on Backend...' : 'Verify & Set Custom Token'}
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
