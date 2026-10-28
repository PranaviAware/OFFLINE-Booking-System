package com.officelink.service;

import com.officelink.dto.AvailabilityResponse;
import com.officelink.dto.BookingRequest;
import com.officelink.dto.BookingResponse;
import com.officelink.entity.*;
import com.officelink.exception.BadRequestException;
import com.officelink.exception.BookingConflictException;
import com.officelink.exception.ForbiddenException;
import com.officelink.repository.BookingRepository;
import com.officelink.repository.ResourceRepository;
import com.officelink.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private BookingService bookingService;

    private Resource sampleResource;
    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleResource = new Resource("res_1", "Meeting Room A", ResourceType.MEETING_ROOM, 10, "Floor 2", "Test room");
        sampleUser = new User("usr_1", "alice@example.com", "pass", "Alice Smith", UserRole.USER);
    }

    @Test
    @DisplayName("Successfully creates a valid booking")
    void createBooking_Success() {
        Instant start = Instant.now().plus(Duration.ofHours(2));
        Instant end = start.plus(Duration.ofHours(1));
        BookingRequest request = new BookingRequest("res_1", start.toString(), end.toString(), "Team Sync");

        when(resourceRepository.findByIdWithPessimisticLock("res_1")).thenReturn(Optional.of(sampleResource));
        when(bookingRepository.findConflictingBookings(eq("res_1"), any(Instant.class), any(Instant.class)))
                .thenReturn(Collections.emptyList());
        when(userRepository.findById("usr_1")).thenReturn(Optional.of(sampleUser));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BookingResponse response = bookingService.createBooking("usr_1", request);

        assertThat(response).isNotNull();
        assertThat(response.getResourceId()).isEqualTo("res_1");
        assertThat(response.getUserId()).isEqualTo("usr_1");
        assertThat(response.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(response.getPurpose()).isEqualTo("Team Sync");
        verify(bookingRepository, times(1)).save(any(Booking.class));
    }

    @Test
    @DisplayName("Rejects booking when start time is in the past")
    void createBooking_FailsWhenStartTimeInPast() {
        Instant pastStart = Instant.now().minus(Duration.ofMinutes(15));
        Instant end = pastStart.plus(Duration.ofHours(1));
        BookingRequest request = new BookingRequest("res_1", pastStart.toString(), end.toString(), "Past Booking");

        assertThatThrownBy(() -> bookingService.createBooking("usr_1", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot create a reservation in the past");

        verifyNoInteractions(resourceRepository);
    }

    @Test
    @DisplayName("Rejects booking when end time is before start time")
    void createBooking_FailsWhenEndBeforeStart() {
        Instant start = Instant.now().plus(Duration.ofHours(2));
        Instant end = start.minus(Duration.ofMinutes(30));
        BookingRequest request = new BookingRequest("res_1", start.toString(), end.toString(), "Invalid times");

        assertThatThrownBy(() -> bookingService.createBooking("usr_1", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("start_time must be strictly before end_time");
    }

    @Test
    @DisplayName("Rejects booking when duration is shorter than 15 minutes")
    void createBooking_FailsWhenDurationTooShort() {
        Instant start = Instant.now().plus(Duration.ofHours(2));
        Instant end = start.plus(Duration.ofMinutes(10));
        BookingRequest request = new BookingRequest("res_1", start.toString(), end.toString(), "Too short");

        assertThatThrownBy(() -> bookingService.createBooking("usr_1", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Minimum booking duration is 15 minutes");
    }

    @Test
    @DisplayName("Rejects booking when duration exceeds 12 hours")
    void createBooking_FailsWhenDurationTooLong() {
        Instant start = Instant.now().plus(Duration.ofHours(2));
        Instant end = start.plus(Duration.ofHours(14));
        BookingRequest request = new BookingRequest("res_1", start.toString(), end.toString(), "Too long");

        assertThatThrownBy(() -> bookingService.createBooking("usr_1", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Maximum booking duration is 12 hours");
    }

    @Test
    @DisplayName("Rejects booking when resource is inactive")
    void createBooking_FailsWhenResourceInactive() {
        sampleResource.setIsActive(false);
        Instant start = Instant.now().plus(Duration.ofHours(2));
        Instant end = start.plus(Duration.ofHours(1));
        BookingRequest request = new BookingRequest("res_1", start.toString(), end.toString(), "Sync");

        when(resourceRepository.findByIdWithPessimisticLock("res_1")).thenReturn(Optional.of(sampleResource));

        assertThatThrownBy(() -> bookingService.createBooking("usr_1", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("is currently inactive and cannot be booked");
    }

    @Test
    @DisplayName("Rejects booking when a double-booking conflict exists")
    void createBooking_FailsOnConflict() {
        Instant start = Instant.now().plus(Duration.ofHours(2));
        Instant end = start.plus(Duration.ofHours(1));
        BookingRequest request = new BookingRequest("res_1", start.toString(), end.toString(), "Sync");

        Booking existing = new Booking("bkg_existing", sampleResource, sampleUser, start, end, "Existing");

        when(resourceRepository.findByIdWithPessimisticLock("res_1")).thenReturn(Optional.of(sampleResource));
        when(bookingRepository.findConflictingBookings(eq("res_1"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(existing));

        assertThatThrownBy(() -> bookingService.createBooking("usr_1", request))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("Double-booking conflict");

        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    @DisplayName("User can cancel their own active booking")
    void cancelBooking_UserCancelsOwn_Success() {
        Instant start = Instant.now().plus(Duration.ofHours(1));
        Instant end = start.plus(Duration.ofHours(1));
        Booking booking = new Booking("bkg_1", sampleResource, sampleUser, start, end, "Standup");

        when(bookingRepository.findById("bkg_1")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BookingResponse response = bookingService.cancelBooking("bkg_1", "usr_1", UserRole.USER);

        assertThat(response.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        verify(bookingRepository, times(1)).save(booking);
    }

    @Test
    @DisplayName("Admin can cancel any employee's booking")
    void cancelBooking_AdminCancelsOtherUser_Success() {
        Instant start = Instant.now().plus(Duration.ofHours(1));
        Instant end = start.plus(Duration.ofHours(1));
        Booking booking = new Booking("bkg_1", sampleResource, sampleUser, start, end, "Standup");

        when(bookingRepository.findById("bkg_1")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BookingResponse response = bookingService.cancelBooking("bkg_1", "admin_999", UserRole.ADMIN);

        assertThat(response.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        verify(bookingRepository, times(1)).save(booking);
    }

    @Test
    @DisplayName("Normal user cannot cancel another user's booking")
    void cancelBooking_UserCannotCancelOther_Forbidden() {
        Instant start = Instant.now().plus(Duration.ofHours(1));
        Instant end = start.plus(Duration.ofHours(1));
        Booking booking = new Booking("bkg_1", sampleResource, sampleUser, start, end, "Standup");

        when(bookingRepository.findById("bkg_1")).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancelBooking("bkg_1", "usr_other", UserRole.USER))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Security Violation: You do not have permission to cancel another employee’s reservation");

        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    @DisplayName("Cannot cancel a booking that has already ended")
    void cancelBooking_FailsWhenAlreadyEnded() {
        Instant start = Instant.now().minus(Duration.ofHours(3));
        Instant end = Instant.now().minus(Duration.ofHours(1));
        Booking booking = new Booking("bkg_1", sampleResource, sampleUser, start, end, "Past meeting");

        when(bookingRepository.findById("bkg_1")).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancelBooking("bkg_1", "usr_1", UserRole.USER))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot cancel a reservation that has already ended");
    }

    @Test
    @DisplayName("checkAvailability returns correct status for free and conflicting slots")
    void checkAvailability_FreeAndConflicted() {
        Instant start = Instant.now().plus(Duration.ofHours(1));
        Instant end = start.plus(Duration.ofHours(1));

        // When free
        when(bookingRepository.findConflictingBookings("res_1", start, end)).thenReturn(Collections.emptyList());
        AvailabilityResponse respFree = bookingService.checkAvailability("res_1", start.toString(), end.toString());
        assertThat(respFree.isAvailable()).isTrue();

        // When occupied
        Booking conflict = new Booking("bkg_c", sampleResource, sampleUser, start, end, "Conflicted");
        when(bookingRepository.findConflictingBookings("res_1", start, end)).thenReturn(List.of(conflict));
        AvailabilityResponse respOcc = bookingService.checkAvailability("res_1", start.toString(), end.toString());
        assertThat(respOcc.isAvailable()).isFalse();
        assertThat(respOcc.getConflictReason()).contains("Resource is already booked");
    }
}
