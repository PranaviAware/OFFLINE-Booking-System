import axios from 'axios';
import { Resource, Booking, ResourceType } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Token provider — injected by AuthContext so the API client always reads
 * the live, expiry-checked token from the React context rather than raw
 * sessionStorage (which can serve stale tokens during renewal windows).
 *
 * Call setTokenProvider() once from AuthContext's initialization.
 */
let _tokenProvider: (() => string | null) | null = null;

export function setTokenProvider(fn: () => string | null) {
  _tokenProvider = fn;
}

/** Inject the current access token on every outgoing request */
apiClient.interceptors.request.use((config) => {
  const token = _tokenProvider?.() ?? null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Fallback: read directly from sessionStorage (covers edge cases before
    // AuthContext has registered the provider, e.g. during initial load).
    const oidcKey = Object.keys(sessionStorage).find(k => k.startsWith('oidc.user:'));
    if (oidcKey) {
      try {
        const stored = JSON.parse(sessionStorage.getItem(oidcKey) || '{}');
        const nowSec = Math.floor(Date.now() / 1000);
        // Only use if token is not expired
        if (stored.access_token && (stored.expires_at === 0 || stored.expires_at > nowSec)) {
          config.headers.Authorization = `Bearer ${stored.access_token}`;
        }
      } catch {
        // ignore
      }
    }
  }
  return config;
});

/** On 401: clear the URL cleanly and let the app re-authenticate */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.replace('/');
    }
    return Promise.reject(error);
  }
);

// ── Type definitions ─────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalResources: number;
  totalBookings: number;
  todayBookings: number;
  activeNow: number;
  topResources: { name: string; type: string; booking_count: number }[];
}

// ── API methods ───────────────────────────────────────────────────────────────

export const api = {
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  getUsers: async () => {
    const res = await apiClient.get<{ count: number; data: Array<{ id: string; email: string; name: string; role: 'ADMIN' | 'USER'; created_at: string }> }>('/auth/users');
    return res.data.data;
  },
  createUser: async (data: { fullName: string; email: string; password?: string; role: 'ADMIN' | 'USER' }) => {
    const res = await apiClient.post('/auth/users', data);
    return res.data;
  },
  updateUserRole: async (userId: string, role: 'ADMIN' | 'USER') => {
    const res = await apiClient.patch(`/auth/users/${userId}/role`, { role });
    return res.data;
  },
  deleteUser: async (userId: string) => {
    const res = await apiClient.delete(`/auth/users/${userId}`);
    return res.data;
  },
  getAdminStats: async (): Promise<AdminStats> => {
    const res = await apiClient.get<AdminStats>('/auth/stats');
    return res.data;
  },

  getResources: async (params?: { type?: ResourceType; search?: string; all?: boolean }) => {
    const res = await apiClient.get<{ count: number; data: Resource[] }>('/resources', { params });
    return res.data.data;
  },
  getResourceById: async (id: string) => {
    const res = await apiClient.get<Resource>(`/resources/${id}`);
    return res.data;
  },
  createResource: async (data: Partial<Resource>) => {
    const res = await apiClient.post('/resources', data);
    return res.data;
  },
  updateResource: async (id: string, data: Partial<Resource>) => {
    const res = await apiClient.put(`/resources/${id}`, data);
    return res.data;
  },
  deleteResource: async (id: string) => {
    const res = await apiClient.delete(`/resources/${id}`);
    return res.data;
  },

  checkAvailability: async (resourceId: string, startTime: string, endTime: string) => {
    const res = await apiClient.get<{ available: boolean; conflictReason?: string }>('/bookings/availability', {
      params: { resourceId, startTime, endTime },
    });
    return res.data;
  },
  createBooking: async (data: { resourceId: string; startTime: string; endTime: string; purpose?: string }) => {
    const res = await apiClient.post<{ message: string; data: Booking }>('/bookings', data);
    return res.data.data;
  },
  getMyBookings: async () => {
    const res = await apiClient.get<{ count: number; data: Booking[] }>('/bookings/my');
    return res.data.data;
  },
  cancelBooking: async (bookingId: string) => {
    const res = await apiClient.patch<{ message: string; data: Booking }>(`/bookings/${bookingId}/cancel`);
    return res.data.data;
  },
  getAllBookingsAdmin: async (params?: { status?: string; resourceId?: string }) => {
    const res = await apiClient.get<{ count: number; data: Booking[] }>('/bookings/admin/all', { params });
    return res.data.data;
  },
  adminUpdateBooking: async (bookingId: string, data: { startTime?: string; endTime?: string; resourceId?: string; purpose?: string }) => {
    const res = await apiClient.put<{ message: string; data: Booking }>(`/bookings/admin/${bookingId}`, data);
    return res.data.data;
  },
};
