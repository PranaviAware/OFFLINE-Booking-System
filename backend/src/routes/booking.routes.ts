import { Router } from 'express';
import { z } from 'zod';
import { bookingService } from '../services/booking.service';
import { authenticateJWT } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

export const bookingRouter = Router();

const createBookingSchema = z.object({
  resourceId: z.string().min(1, 'resourceId is required'),
  startTime: z.string().datetime({ message: 'startTime must be a valid ISO-8601 UTC timestamp' }),
  endTime: z.string().datetime({ message: 'endTime must be a valid ISO-8601 UTC timestamp' }),
  purpose: z.string().max(255).optional()
});

const availabilityQuerySchema = z.object({
  resourceId: z.string().min(1, 'resourceId is required'),
  startTime: z.string().datetime({ message: 'startTime must be ISO-8601 UTC' }),
  endTime: z.string().datetime({ message: 'endTime must be ISO-8601 UTC' })
});

/**
 * GET /api/v1/bookings/availability
 * Real-time pre-flight conflict check
 */
bookingRouter.get('/availability', authenticateJWT, (req, res, next) => {
  try {
    const validated = availabilityQuerySchema.parse(req.query);
    const result = bookingService.checkAvailability(
      validated.resourceId,
      validated.startTime,
      validated.endTime
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/bookings
 * Commit atomic booking with immediate serialized transaction & conflict prevention
 */
bookingRouter.post('/', authenticateJWT, (req, res, next) => {
  try {
    const validated = createBookingSchema.parse(req.body);
    const booking = bookingService.createBooking(
      req.user!.id,
      validated.resourceId,
      validated.startTime,
      validated.endTime,
      validated.purpose
    );
    res.status(201).json({
      message: 'Booking created successfully',
      data: booking
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/bookings/my
 * Retrieve all reservations made by the authenticated user
 */
bookingRouter.get('/my', authenticateJWT, (req, res, next) => {
  try {
    const bookings = bookingService.getUserBookings(req.user!.id);
    res.json({ count: bookings.length, data: bookings });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/bookings/:id/cancel
 * Cancel a booking:
 * - Users can only cancel their own reservations
 * - Admins can cancel any reservation
 */
bookingRouter.patch('/:id/cancel', authenticateJWT, (req, res, next) => {
  try {
    const cancelled = bookingService.cancelBooking(req.params.id, {
      id: req.user!.id,
      role: req.user!.role
    });
    res.json({
      message: 'Booking cancelled successfully',
      data: cancelled
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/bookings/admin/all
 * Admin only: View all reservations across the company
 */
bookingRouter.get('/admin/all', authenticateJWT, requireAdmin, (req, res, next) => {
  try {
    const { status, resourceId } = req.query;
    const bookings = bookingService.getAllBookings({
      status: status as string,
      resourceId: resourceId as string
    });
    res.json({ count: bookings.length, data: bookings });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/bookings/admin/:id
 * Admin only: Modify or reschedule any reservation
 */
bookingRouter.put('/admin/:id', authenticateJWT, requireAdmin, (req, res, next) => {
  try {
    const updateSchema = z.object({
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      resourceId: z.string().optional(),
      purpose: z.string().optional()
    });

    const validated = updateSchema.parse(req.body);
    const updated = bookingService.adminUpdateBooking(req.params.id, {
      startTimeUTC: validated.startTime,
      endTimeUTC: validated.endTime,
      resourceId: validated.resourceId,
      purpose: validated.purpose
    });

    res.json({
      message: 'Booking updated successfully by administrator',
      data: updated
    });
  } catch (err) {
    next(err);
  }
});
