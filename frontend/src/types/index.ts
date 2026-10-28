export type ResourceType = 'DESK' | 'MEETING_ROOM' | 'EQUIPMENT';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at?: string;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  location: string;
  description?: string;
  is_active: number;
  is_currently_available?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  resource_id: string;
  resource_name?: string;
  resource_type?: ResourceType;
  resource_location?: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  start_time: string; // ISO 8601 UTC
  end_time: string;   // ISO 8601 UTC
  status: BookingStatus;
  purpose?: string;
  created_at: string;
  updated_at: string;
}
