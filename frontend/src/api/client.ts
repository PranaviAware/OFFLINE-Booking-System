import axios from 'axios';
import { Resource, Booking, ResourceType } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token from localStorage to every outgoing request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('officelink_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  demoLogin: async (persona: 'admin' | 'user1' | 'user2') => {
    const res = await apiClient.post('/auth/demo-login', { persona });
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  // Resources
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

  // Bookings
  checkAvailability: async (resourceId: string, startTime: string, endTime: string) => {
    const res = await apiClient.get<{ available: boolean; conflictReason?: string }>('/bookings/availability', {
      params: { resourceId, startTime, endTime }
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
  }
};
