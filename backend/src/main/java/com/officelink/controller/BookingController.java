package com.officelink.controller;

import com.officelink.dto.*;
import com.officelink.entity.BookingStatus;
import com.officelink.entity.UserRole;
import com.officelink.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping("/availability")
    public ResponseEntity<AvailabilityResponse> checkAvailability(
            @RequestParam("resourceId") String resourceId,
            @RequestParam("startTime") String startTime,
            @RequestParam("endTime") String endTime) {
        return ResponseEntity.ok(bookingService.checkAvailability(resourceId, startTime, endTime));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(
            JwtAuthenticationToken token,
            @Valid @RequestBody BookingRequest request) {
        String userId = token.getName(); // Keycloak sub (UUID)
        BookingResponse booking = bookingService.createBooking(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>("Booking created successfully", booking));
    }

    @GetMapping("/my")
    public ResponseEntity<DataListResponse<BookingResponse>> getMyBookings(JwtAuthenticationToken token) {
        String userId = token.getName();
        List<BookingResponse> bookings = bookingService.getUserBookings(userId);
        return ResponseEntity.ok(DataListResponse.of(bookings));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(
            @PathVariable("id") String id,
            JwtAuthenticationToken token) {
        String userId = token.getName();
        boolean isAdmin = token.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        UserRole role = isAdmin ? UserRole.ADMIN : UserRole.USER;
        BookingResponse cancelled = bookingService.cancelBooking(id, userId, role);
        return ResponseEntity.ok(new ApiResponse<>("Booking cancelled successfully", cancelled));
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DataListResponse<BookingResponse>> getAllBookingsAdmin(
            @RequestParam(value = "status", required = false) BookingStatus status,
            @RequestParam(value = "resourceId", required = false) String resourceId,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size) {
        Pageable pageable = null;
        if (page != null && size != null && size > 0) {
            pageable = PageRequest.of(Math.max(0, page), Math.min(size, 100), Sort.by(Sort.Direction.DESC, "startTime"));
        }
        DataListResponse<BookingResponse> bookings = bookingService.getAllBookingsAdmin(status, resourceId, pageable);
        return ResponseEntity.ok(bookings);
    }

    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BookingResponse>> adminUpdateBooking(
            @PathVariable("id") String id,
            @Valid @RequestBody AdminBookingUpdateRequest request) {
        BookingResponse updated = bookingService.adminUpdateBooking(id, request);
        return ResponseEntity.ok(new ApiResponse<>("Booking updated successfully by administrator", updated));
    }
}
