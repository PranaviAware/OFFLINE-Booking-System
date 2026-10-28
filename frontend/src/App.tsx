import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { OidcClient } from 'oidc-client-ts';
import { Navbar } from './components/Navbar';
import { CatalogPage } from './pages/CatalogPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { Toast } from './components/Toast';
import { oidcConfig, KEYCLOAK_BASE, CLIENT_ID } from './auth/oidcConfig';

export const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const oidc = useOidcAuth();
  const [currentTab, setCurrentTab] = useState<'catalog' | 'my-bookings' | 'admin'>('catalog');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  /**
   * Detect post-registration landing (?registered=true).
   * Keycloak redirects here after terminating the registration session.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('registered') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      setRegistrationSuccess(true);
    }
  }, []);

  /**
   * After the user registers on Keycloak and returns with the authorization code:
   * 1. The code exchange finishes so the user is provisioned.
   * 2. We immediately sign out of Keycloak server-side so the user is NOT auto-logged in.
   * 3. Keycloak redirects back to /?registered=true, showing the sign-in form.
   */
  useEffect(() => {
    if (oidc.isAuthenticated && sessionStorage.getItem('kc_new_registration') === '1') {
      sessionStorage.removeItem('kc_new_registration');
      const idToken = oidc.user?.id_token;
      const targetUri = `${window.location.origin}/?registered=true`;

      void oidc.signoutRedirect({
        post_logout_redirect_uri: targetUri,
        id_token_hint: idToken,
      }).catch(err => {
        console.warn('signoutRedirect fallback:', err);
        const postLogoutUri = encodeURIComponent(targetUri);
        let logoutUrl = `${KEYCLOAK_BASE}/protocol/openid-connect/logout?client_id=${CLIENT_ID}&post_logout_redirect_uri=${postLogoutUri}`;
        if (idToken) {
          logoutUrl += `&id_token_hint=${encodeURIComponent(idToken)}`;
        }
        window.location.href = logoutUrl;
      });
    }
  }, [oidc.isAuthenticated, oidc]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  /**
   * Navigate directly to Keycloak's registration page with PKCE + state.
   */
  const handleRegister = async () => {
    setRegisterLoading(true);
    try {
      sessionStorage.setItem('kc_new_registration', '1');

      const client = new OidcClient(oidcConfig);

      // Generate PKCE code challenge + state with request_type: "si:r"
      const request = await client.createSigninRequest({
        request_type: 'si:r',
      });

      // Direct to Keycloak's registration endpoint
      const registrationUrl = request.url.replace(
        '/protocol/openid-connect/auth',
        '/protocol/openid-connect/registrations'
      );

      window.location.href = registrationUrl;
    } catch (err) {
      console.error('Failed to create registration request:', err);
      sessionStorage.removeItem('kc_new_registration');
      setRegisterLoading(false);
    }
  };

  /**
   * Clears Keycloak's server-side session cookie on localhost:8080 and returns to app.
   */
  const handleClearKeycloakSession = () => {
    sessionStorage.clear();
    const logoutUrl = `${KEYCLOAK_BASE}/protocol/openid-connect/logout?client_id=${CLIENT_ID}&post_logout_redirect_uri=${encodeURIComponent(window.location.origin + '/')}`;
    window.location.href = logoutUrl;
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (oidc.isLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Connecting to Keycloak...</p>
      </div>
    );
  }

  // ── OIDC error state ──────────────────────────────────────────────────────
  if (oidc.error) {
    const handleClearAndReset = () => {
      sessionStorage.clear();
      window.history.replaceState({}, '', '/');
      window.location.replace('/');
    };

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-red-400 text-5xl">⚠️</div>
        <h2 className="text-white text-xl font-bold">Authentication Error</h2>
        <p className="text-slate-400 text-sm max-w-md">{oidc.error.message}</p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleClearAndReset}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            Back to Sign In
          </button>
          <button
            onClick={handleClearKeycloakSession}
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-semibold text-sm transition-colors border border-slate-600"
          >
            Sign Out of Keycloak
          </button>
        </div>
      </div>
    );
  }

  // ── Not authenticated — Sign In / Sign Up screen ──────────────────────────
  if (!oidc.isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6 text-center px-4">

        {/* Logo + branding */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            OL
          </div>
          <h1 className="text-white text-2xl font-bold mt-2">Office Link</h1>
          <p className="text-slate-400 text-sm">Resource Reservation Platform · KPIT Technologies</p>
        </div>

        {/* Auth card */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-xl space-y-4">

          {/* Registration success banner */}
          {registrationSuccess && (
            <div className="flex items-start gap-3 bg-emerald-900/50 border border-emerald-700 rounded-lg px-4 py-3 text-left">
              <span className="text-emerald-400 text-lg mt-0.5">✓</span>
              <div>
                <p className="text-emerald-300 font-semibold text-sm">Account created successfully!</p>
                <p className="text-emerald-400/80 text-xs mt-0.5">Please sign in with your credentials below.</p>
              </div>
            </div>
          )}

          <p className="text-slate-300 text-sm">
            Use your KPIT Keycloak account to access the resource booking system.
          </p>

          {/* Sign In */}
          <button
            id="keycloak-login-btn"
            onClick={() => {
              void oidc.signinRedirect().catch(err => {
                console.error('Login redirect failed:', err);
              });
            }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors shadow flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
            </svg>
            Sign In with Keycloak
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <hr className="flex-1 border-slate-700" />
            <span className="text-slate-500 text-xs">or</span>
            <hr className="flex-1 border-slate-700" />
          </div>

          {/* Create Account */}
          <button
            id="keycloak-register-btn"
            onClick={() => { void handleRegister(); }}
            disabled={registerLoading}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white rounded-lg font-semibold transition-colors border border-slate-600 flex items-center justify-center gap-2"
          >
            {registerLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            )}
            {registerLoading ? 'Redirecting...' : 'Create Account'}
          </button>

          <p className="text-slate-500 text-xs">
            New employee? Click Create Account to register with Keycloak.
          </p>

          {/* Option to clear existing session */}
          <div className="pt-2 border-t border-slate-700/60">
            <button
              onClick={handleClearKeycloakSession}
              className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors"
            >
              Sign out of active Keycloak session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated app shell ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {currentTab === 'catalog' && <CatalogPage onNotify={showNotification} />}
        {currentTab === 'my-bookings' && <MyBookingsPage onNotify={showNotification} />}
        {currentTab === 'admin' && <AdminDashboardPage onNotify={showNotification} />}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Office Link — Resource Reservation System (KPIT Technologies) · Secured by Keycloak OIDC
      </footer>
    </div>
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <MainApp />
  </AuthProvider>
);

export default App;
