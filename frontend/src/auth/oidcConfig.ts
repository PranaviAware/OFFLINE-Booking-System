import { WebStorageStateStore } from 'oidc-client-ts';

export const KEYCLOAK_BASE =
  import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080/realms/officelink';

export const CLIENT_ID =
  import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'officelink-frontend';

/** Shared State Store using sessionStorage for both login & registration flows */
export const sharedStateStore = new WebStorageStateStore({
  store: window.sessionStorage,
  prefix: 'oidc.',
});

/** Shared User Store using sessionStorage */
export const sharedUserStore = new WebStorageStateStore({
  store: window.sessionStorage,
  prefix: 'oidc.',
});

/**
 * Keycloak OIDC configuration for react-oidc-context.
 *
 * Keycloak Realm:  officelink
 * Keycloak Client: officelink-frontend (public, PKCE)
 */
export const oidcConfig = {
  authority: KEYCLOAK_BASE,
  client_id: CLIENT_ID,

  redirect_uri: import.meta.env.VITE_REDIRECT_URI ?? `${window.location.origin}/`,

  post_logout_redirect_uri:
    import.meta.env.VITE_POST_LOGOUT_URI ?? `${window.location.origin}/`,

  response_type: 'code',
  scope: 'openid profile email',

  automaticSilentRenew: true,
  silent_redirect_uri: `${window.location.origin}/silent-renew.html`,

  // Explicitly configure stateStore & userStore in sessionStorage
  stateStore: sharedStateStore,
  userStore: sharedUserStore,

  loadUserInfo: true,
  monitorAnonymousSession: true,
};
