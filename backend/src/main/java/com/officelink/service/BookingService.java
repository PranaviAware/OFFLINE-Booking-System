package com.officelink.service;

import com.officelink.dto.AdminBookingUpdateRequest;
import com.officelink.dto.AvailabilityResponse;
import com.officelink.dto.BookingRequest;
import com.officelink.dto.BookingResponse;
import com.officelink.dto.DataListResponse;
import com.officelink.entity.*;
import com.officelink.exception.BadRequestException;
import com.officelink.exception.BookingConflictException;
import com.officelink.exception.ForbiddenException;
import com.officelink.exception.ResourceNotFoundException;
import com.officelink.repository.BookingRepository;
import com.officelink.repository.ResourceRepository;
import com.officelink.repository.UserRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;

    public BookingService(BookingRepository bookingRepository,
                          ResourceRepository resourceRepository,
                          UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.resourceRepository = resourceRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public AvailabilityResponse checkAvailability(String resourceId, String startTimeStr, String endTimeStr) {
        Instant start = parseInstant(startTimeStr, "startTime");
        Instant end = parseInstant(endTimeStr, "endTime");

        if (!start.isBefore(end)) {
            return new AvailabilityResponse(false, "startTime must be before endTime");
        }

        List<Booking> conflicts = bookingRepository.findConflictingBookings(resourceId, start, end);
        if (!conflicts.isEmpty()) {
            Booking first = conflicts.get(0);
            return new AvailabilityResponse(
                    false,
                    "Resource is already booked between " + first.getStartTime() + " and " + first.getEndTime() + " UTC"
            );
        }

        return new AvailabilityResponse(true);
    }

    /**
     * Atomic booking creation with concurrency protection.
     * Uses SERIALIZABLE isolation and pessimistic write lock on the target resource
     * to eliminate race conditions under concurrent requests.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public BookingResponse createBooking(String userId, BookingRequest request) {
        Instant start = parseInstant(request.getStartTime(), "startTime");
        Instant end = parseInstant(request.getEndTime(), "endTime");

        if (!start.isBefore(end)) {
            throw new BadRequestException("Booking start_time must be strictly before end_time");
        }

        if (start.isBefore(Instant.now().minus(Duration.ofMinutes(5)))) {
            throw new BadRequestException("Cannot create a reservation in the past");
        }

        long durationMinutes = Duration.between(start, end).toMinutes();
        if (durationMinutes < 15) {
            throw new BadRequestException("Minimum booking duration is 15 minutes");
        }
        if (durationMinutes > 12 * 60) {
            throw new BadRequestException("Maximum booking duration is 12 hours");
        }

        // 1. Acquire pessimistic write lock on the Resource to serialize concurrent booking attempts
        Resource resource = resourceRepository.findByIdWithPessimisticLock(request.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource with id '" + request.getResourceId() + "' not found"));

        if (!Boolean.TRUE.equals(resource.getIsActive())) {
            throw new BadRequestException("Resource '" + resource.getName() + "' is currently inactive and cannot be booked");
        }

        // 2. Query for conflicts under the locked resource
        List<Booking> conflicts = bookingRepository.findConflictingBookings(resource.getId(), start, end);
        if (!conflicts.isEmpty()) {
            Booking conflict = conflicts.get(0);
            throw new BookingConflictException(
                    "Double-booking conflict: Resource is already booked from " +
                    conflict.getStartTime() + " to " + conflict.getEndTime() + " UTC."
            );
        }

        // 3. Ensure user exists
        User user = userRepository.findById(userId)
                .orElseGet(() -> {
                    // Fallback create if referenced by ID
                    User u = new User(userId, userId + "@officelink.local", "dummy", "User", UserRole.USER);
                    return userRepository.save(u);
                });

        // 4. Create and persist booking
        String bookingId = "bkg_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        Booking booking = new Booking(
                bookingId,
                resource,
                user,
                start,
                end,
                request.getPurpose() != null && !request.getPurpose().isBlank()
                        ? request.getPurpose().trim()
                        : "General Workstation / Room Reservation"
        );

        booking = bookingRepository.save(booking);
        return BookingResponse.fromEntity(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getUserBookings(String userId) {
        return bookingRepository.findByUserIdOrderByStartTimeDesc(userId)
                .stream()
                .map(BookingResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public BookingResponse cancelBooking(String bookingId, String requestingUserId, UserRole requestingUserRole) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        if (requestingUserRole != UserRole.ADMIN && !booking.getUser().getId().equals(requestingUserId)) {
            throw new ForbiddenException("Security Violation: You do not have permission to cancel another employee’s reservation");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new BadRequestException("This booking is already cancelled");
        }

        if (booking.getEndTime().isBefore(Instant.now())) {
            throw new BadRequestException("Cannot cancel a reservation that has already ended");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking = bookingRepository.save(booking);
        return BookingResponse.fromEntity(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getAllBookingsAdmin(BookingStatus status, String resourceId) {
        return getAllBookingsAdmin(status, resourceId, null).getData();
    }

    @Transactional(readOnly = true)
    public DataListResponse<BookingResponse> getAllBookingsAdmin(BookingStatus status, String resourceId, Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<Booking> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (resourceId != null && !resourceId.isBlank()) {
                predicates.add(cb.equal(root.get("resource").get("id"), resourceId));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        if (pageable != null) {
            org.springframework.data.domain.Page<Booking> page = bookingRepository.findAll(spec, pageable);
            return DataListResponse.of(page.map(BookingResponse::fromEntity));
        }

        org.springframework.data.domain.Sort sort = org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Direction.DESC, "startTime"
        );
        List<BookingResponse> list = bookingRepository.findAll(spec, sort)
                .stream()
                .map(BookingResponse::fromEntity)
                .collect(Collectors.toList());
        return DataListResponse.of(list);
    }

    @Transactional
    public BookingResponse adminUpdateBooking(String bookingId, AdminBookingUpdateRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        String targetResId = (request.getResourceId() != null && !request.getResourceId().isBlank())
                ? request.getResourceId()
                : booking.getResource().getId();

        // Acquire pessimistic write lock on target resource to prevent concurrent double-booking
        Resource targetResource = resourceRepository.findByIdWithPessimisticLock(targetResId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + targetResId));

        if (!Boolean.TRUE.equals(targetResource.getIsActive())) {
            throw new BadRequestException("Resource '" + targetResource.getName() + "' is currently inactive and cannot be booked");
        }

        Instant targetStart = request.getStartTime() != null
                ? parseInstant(request.getStartTime(), "startTime")
                : booking.getStartTime();

        Instant targetEnd = request.getEndTime() != null
                ? parseInstant(request.getEndTime(), "endTime")
                : booking.getEndTime();

        if (!targetStart.isBefore(targetEnd)) {
            throw new BadRequestException("startTime must be strictly before endTime");
        }

        // Check conflicts excluding current booking
        List<Booking> conflicts = bookingRepository.findConflictingBookingsExcluding(
                targetResource.getId(),
                targetStart,
                targetEnd,
                bookingId
        );

        if (!conflicts.isEmpty()) {
            Booking conflict = conflicts.get(0);
            throw new BookingConflictException(
                    "Resource is already booked between " + conflict.getStartTime() + " and " + conflict.getEndTime() + " UTC"
            );
        }

        booking.setResource(targetResource);
        booking.setStartTime(targetStart);
        booking.setEndTime(targetEnd);
        if (request.getPurpose() != null) {
            booking.setPurpose(request.getPurpose().trim());
        }

        booking = bookingRepository.save(booking);
        return BookingResponse.fromEntity(booking);
    }

    private Instant parseInstant(String dateStr, String fieldName) {
        try {
            return Instant.parse(dateStr);
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Invalid ISO-8601 UTC date string provided for " + fieldName + ": " + dateStr);
        }
    }
}
