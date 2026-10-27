import { db } from '../config/database';
import { randomUUID } from 'crypto';
import { resourceService } from './resource.service';

export interface Booking {
  id: string;
  resource_id: string;
  resource_name?: string;
  resource_type?: string;
  resource_location?: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  start_time: string; // ISO 8601 UTC
  end_time: string;   // ISO 8601 UTC
  status: 'CONFIRMED' | 'CANCELLED';
  purpose?: string;
  created_at: string;
  updated_at: string;
}

export class BookingService {
  /**
   * Real-time conflict pre-check
   * Returns true if slot is available; false if already booked.
   * Time overlap algorithm: (start_time < requested_end AND end_time > requested_start)
   */
  checkAvailability(
    resourceId: string,
    startTimeUTC: string,
    endTimeUTC: string,
    excludeBookingId?: string
  ): { available: boolean; conflictReason?: string } {
    let sql = `
      SELECT id, start_time, end_time
      FROM bookings
      WHERE resource_id = ?
        AND status = 'CONFIRMED'
        AND (start_time < ? AND end_time > ?)
    `;
    const params: any[] = [resourceId, endTimeUTC, startTimeUTC];

    if (excludeBookingId) {
      sql += ' AND id != ?';
      params.push(excludeBookingId);
    }

    const conflicts = db.prepare(sql).all(...params) as any[];

    if (conflicts.length > 0) {
      return {
        available: false,
        conflictReason: `Resource is already booked between ${conflicts[0].start_time} and ${conflicts[0].end_time} UTC`
      };
    }

    return { available: true };
  }

  /**
   * Create an atomic booking using BEGIN IMMEDIATE transaction.
   * Guarantees zero race conditions even under 100+ simultaneous requests.
   */
  createBooking(
    userId: string,
    resourceId: string,
    startTimeUTC: string,
    endTimeUTC: string,
    purpose?: string
  ): Booking {
    // Basic Temporal bounds validation
    const start = new Date(startTimeUTC).getTime();
    const end = new Date(endTimeUTC).getTime();

    if (isNaN(start) || isNaN(end)) {
      throw { statusCode: 400, message: 'Invalid ISO-8601 UTC date-time string provided' };
    }

    if (start >= end) {
      throw { statusCode: 400, message: 'Booking start_time must be strictly before end_time' };
    }

    // Minimum 15 min, max 12 hours check
    const durationMinutes = (end - start) / (1000 * 60);
    if (durationMinutes < 15) {
      throw { statusCode: 400, message: 'Minimum booking duration is 15 minutes' };
    }
    if (durationMinutes > 12 * 60) {
      throw { statusCode: 400, message: 'Maximum booking duration is 12 hours' };
    }

    // Define the atomic transaction
    const executeAtomicBooking = db.transaction(() => {
      // 1. Verify resource exists and is active
      const resource = resourceService.getById(resourceId);
      if (!resource) {
        throw { statusCode: 404, message: `Resource with id '${resourceId}' not found` };
      }
      if (!resource.is_active) {
        throw { statusCode: 400, message: `Resource '${resource.name}' is currently inactive and cannot be booked` };
      }

      // 2. Query for conflicts under the immediate transaction lock
      const conflictSql = `
        SELECT id, start_time, end_time
        FROM bookings
        WHERE resource_id = ?
          AND status = 'CONFIRMED'
          AND (start_time < ? AND end_time > ?)
      `;
      const conflict = db.prepare(conflictSql).get(resourceId, endTimeUTC, startTimeUTC) as any;

      if (conflict) {
        throw {
          statusCode: 409,
          name: 'ConflictError',
          message: `Double-booking conflict: Resource is already booked from ${conflict.start_time} to ${conflict.end_time} UTC.`
        };
      }

      // 3. Ensure user exists in users table (synchronize from JWT)
      const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
      if (!userExists) {
        db.prepare('INSERT OR IGNORE INTO users (id, email, full_name, role) VALUES (?, ?, ?, ?)')
          .run(userId, `${userId}@officelink.local`, 'User', 'USER');
      }

      // 4. Insert booking
      const bookingId = `bkg_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
      const now = new Date().toISOString();

      const insertStmt = db.prepare(`
        INSERT INTO bookings (id, resource_id, user_id, start_time, end_time, status, purpose, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?)
      `);

      insertStmt.run(
        bookingId,
        resourceId,
        userId,
        startTimeUTC,
        endTimeUTC,
        purpose || 'General Workstation / Room Reservation',
        now,
        now
      );

      return this.getBookingById(bookingId)!;
    });

    // Execute with immediate write lock
    return executeAtomicBooking.immediate();
  }

  /**
   * Fetch single booking by ID with joined resource & user data
   */
  getBookingById(id: string): Booking | undefined {
    const sql = `
      SELECT 
        b.id, b.resource_id, b.user_id, b.start_time, b.end_time, b.status, b.purpose, b.created_at, b.updated_at,
        r.name as resource_name, r.type as resource_type, r.location as resource_location,
        u.full_name as user_name, u.email as user_email
      FROM bookings b
      LEFT JOIN resources r ON b.resource_id = r.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `;
    return db.prepare(sql).get(id) as Booking | undefined;
  }

  /**
   * Fetch personal bookings for an authenticated user
   */
  getUserBookings(userId: string): Booking[] {
    const sql = `
      SELECT 
        b.id, b.resource_id, b.user_id, b.start_time, b.end_time, b.status, b.purpose, b.created_at, b.updated_at,
        r.name as resource_name, r.type as resource_type, r.location as resource_location,
        u.full_name as user_name, u.email as user_email
      FROM bookings b
      LEFT JOIN resources r ON b.resource_id = r.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.user_id = ?
      ORDER BY b.start_time DESC
    `;
    return db.prepare(sql).all(userId) as Booking[];
  }

  /**
   * Fetch all bookings across the enterprise (Admin only)
   */
  getAllBookings(filters?: { status?: string; resourceId?: string }): Booking[] {
    let sql = `
      SELECT 
        b.id, b.resource_id, b.user_id, b.start_time, b.end_time, b.status, b.purpose, b.created_at, b.updated_at,
        r.name as resource_name, r.type as resource_type, r.location as resource_location,
        u.full_name as user_name, u.email as user_email
      FROM bookings b
      LEFT JOIN resources r ON b.resource_id = r.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      sql += ' AND b.status = ?';
      params.push(filters.status.toUpperCase());
    }

    if (filters?.resourceId) {
      sql += ' AND b.resource_id = ?';
      params.push(filters.resourceId);
    }

    sql += ' ORDER BY b.start_time DESC';
    return db.prepare(sql).all(...params) as Booking[];
  }

  /**
   * Cancel booking with strict backend ownership enforcement:
   * Users can only cancel their own bookings.
   * Admins can cancel any booking.
   */
  cancelBooking(bookingId: string, requestingUser: { id: string; role: 'ADMIN' | 'USER' }): Booking {
    const booking = this.getBookingById(bookingId);
    if (!booking) {
      throw { statusCode: 404, message: 'Booking not found' };
    }

    // Role and ownership check
    if (requestingUser.role !== 'ADMIN' && booking.user_id !== requestingUser.id) {
      throw {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Security Violation: You do not have permission to cancel another employee’s reservation'
      };
    }

    if (booking.status === 'CANCELLED') {
      throw { statusCode: 400, message: 'This booking is already cancelled' };
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?');
    updateStmt.run('CANCELLED', now, bookingId);

    return this.getBookingById(bookingId)!;
  }

  /**
   * Modify/Reschedule a booking (Admin only)
   */
  adminUpdateBooking(
    bookingId: string,
    updates: { startTimeUTC?: string; endTimeUTC?: string; resourceId?: string; purpose?: string }
  ): Booking {
    const existing = this.getBookingById(bookingId);
    if (!existing) {
      throw { statusCode: 404, message: 'Booking not found' };
    }

    const targetResource = updates.resourceId || existing.resource_id;
    const targetStart = updates.startTimeUTC || existing.start_time;
    const targetEnd = updates.endTimeUTC || existing.end_time;
    const targetPurpose = updates.purpose !== undefined ? updates.purpose : existing.purpose;

    // Check conflict excluding this booking
    const check = this.checkAvailability(targetResource, targetStart, targetEnd, bookingId);
    if (!check.available) {
      throw { statusCode: 409, message: check.conflictReason };
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE bookings 
      SET resource_id = ?, start_time = ?, end_time = ?, purpose = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(targetResource, targetStart, targetEnd, targetPurpose, now, bookingId);

    return this.getBookingById(bookingId)!;
  }
}

export const bookingService = new BookingService();
