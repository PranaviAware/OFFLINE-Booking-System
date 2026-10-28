import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import App from './App';
import { oidcConfig } from './auth/oidcConfig';
import './index.css';

/**
 * Called by react-oidc-context after every successful OIDC code exchange.
 * Cleans the query parameters (?code=...&state=...) from the browser URL
 * without triggering a page reload.
 */
function onSigninCallback(): void {
  window.history.replaceState({}, document.title, window.location.pathname);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
    <App />
  </AuthProvider>
);
