import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { User } from '../types';
import { api, setTokenProvider } from '../api/client';

/** Keycloak-specific claims not typed by oidc-client-ts */
interface KeycloakProfile {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  roles?: string[];
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Returns the current, non-expired access token, or null */
  getAccessToken: () => string | null;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const oidc = useOidcAuth();
  const [dbUser, setDbUser] = useState<User | null>(null);

  const initialUser: User | null = oidc.isAuthenticated && oidc.user
    ? mapOidcUserToAppUser(oidc.user.profile as KeycloakProfile, oidc.user.access_token)
    : null;

  const user = dbUser || initialUser;

  /**
   * Returns the current access token only if it is not expired.
   * oidc-client-ts stores `expires_at` (unix seconds) on the User object.
   * This prevents sending stale tokens in the rare window between expiry
   * and the next automatic silent renewal.
   */
  const getAccessToken = useCallback((): string | null => {
    if (!oidc.user?.access_token) return null;
    const expiresAt = oidc.user.expires_at ?? 0;
    const nowSec = Math.floor(Date.now() / 1000);
    if (expiresAt > 0 && nowSec >= expiresAt) {
      // Token is expired — silent renewal should fix this shortly
      return null;
    }
    return oidc.user.access_token;
  }, [oidc.user]);

  /** Initiates Keycloak redirect login (returns a Promise) */
  const login = useCallback((): Promise<void> => {
    return oidc.signinRedirect();
  }, [oidc]);

  const logout = useCallback(() => {
    oidc.signoutRedirect();
  }, [oidc]);

  // Register the live token getter with the API client so it always
  // uses an expiry-checked token from the React context, not raw storage.
  useEffect(() => {
    setTokenProvider(getAccessToken);
  }, [getAccessToken]);

  // Sync with backend JIT provisioning on login to guarantee canonical roles from database
  useEffect(() => {
    if (oidc.isAuthenticated && oidc.user?.access_token) {
      api.getMe()
        .then(res => {
          if (res?.user) {
            setDbUser(res.user);
          }
        })
        .catch(err => {
          console.warn('Backend JIT /me sync:', err);
        });
    } else {
      setDbUser(null);
    }
  }, [oidc.isAuthenticated, oidc.user?.access_token]);

  return (
    <AuthContext.Provider value={{
      user,
      loading: oidc.isLoading,
      isAuthenticated: oidc.isAuthenticated,
      getAccessToken,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractAllRoles(profile: KeycloakProfile, accessToken?: string): string[] {
  const roles: string[] = [];

  // 1. Direct roles claim in id_token (from Keycloak realm-roles mapper)
  if (Array.isArray(profile?.roles)) {
    roles.push(...profile.roles);
  }

  // 2. realm_access.roles in id_token profile
  if (Array.isArray(profile?.realm_access?.roles)) {
    roles.push(...profile.realm_access.roles);
  }

  // 3. resource_access roles in id_token profile
  if (profile?.resource_access) {
    Object.values(profile.resource_access).forEach((ra: any) => {
      if (Array.isArray(ra?.roles)) {
        roles.push(...ra.roles);
      }
    });
  }

  // 4. Access token JWT payload (Keycloak puts realm_access here by default)
  if (accessToken) {
    try {
      const parts = accessToken.split('.');
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(json);

        if (Array.isArray(payload?.realm_access?.roles)) {
          roles.push(...payload.realm_access.roles);
        }
        if (Array.isArray(payload?.roles)) {
          roles.push(...payload.roles);
        }
        if (payload?.resource_access) {
          Object.values(payload.resource_access).forEach((ra: any) => {
            if (Array.isArray(ra?.roles)) {
              roles.push(...ra.roles);
            }
          });
        }
      }
    } catch {
      // Ignore token parse error
    }
  }

  return roles;
}

function mapOidcUserToAppUser(profile: KeycloakProfile, accessToken?: string): User {
  const roles = extractAllRoles(profile, accessToken);
  const isAdmin = roles.some(r => r.toLowerCase() === 'admin');

  return {
    id: profile.sub,
    email: profile.email ?? '',
    name: profile.name ?? profile.preferred_username ?? profile.email ?? '',
    role: isAdmin ? 'ADMIN' : 'USER',
    created_at: new Date().toISOString(),
  };
}
