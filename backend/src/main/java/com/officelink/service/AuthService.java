package com.officelink.service;

import com.officelink.dto.*;
import com.officelink.entity.BookingStatus;
import com.officelink.entity.User;
import com.officelink.entity.UserRole;
import com.officelink.exception.BadRequestException;
import com.officelink.exception.ResourceNotFoundException;
import com.officelink.repository.BookingRepository;
import com.officelink.repository.ResourceRepository;
import com.officelink.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;
    private final BookingRepository bookingRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository,
                       ResourceRepository resourceRepository,
                       BookingRepository bookingRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.resourceRepository = resourceRepository;
        this.bookingRepository = bookingRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ── User Management (Admin) ─────────────────────────────────────────────

    @Transactional
    public UserDto createUser(CreateUserRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("A user with this email already exists");
        }

        String id = "usr_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String hash = request.getPassword() != null
                ? passwordEncoder.encode(request.getPassword())
                : "";

        User user = new User(id, email, hash, request.getFullName().trim(), request.getRole());
        user = userRepository.save(user);
        return UserDto.fromEntity(user);
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAllByOrderByRoleAscFullNameAsc()
                .stream()
                .map(UserDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserDto updateUserRole(String userId, UserRole role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        user.setRole(role);
        user = userRepository.save(user);
        return UserDto.fromEntity(user);
    }

    @Transactional
    public void deleteUser(String targetUserId, String currentUserId) {
        if (targetUserId.equals(currentUserId)) {
            throw new BadRequestException("You cannot delete your own account");
        }
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));
        userRepository.delete(user);
    }

    // ── Admin Stats ─────────────────────────────────────────────────────────

    public AdminStatsResponse getAdminStats() {
        long totalUsers = userRepository.count();
        long totalResources = resourceRepository.countByIsActiveTrue();
        long totalBookings = bookingRepository.countByStatus(BookingStatus.CONFIRMED);

        Instant now = Instant.now();
        Instant todayStart = now.truncatedTo(ChronoUnit.DAYS);
        Instant todayEnd = todayStart.plus(1, ChronoUnit.DAYS).minusMillis(1);

        long todayBookings = bookingRepository.countByStatusAndStartTimeBetween(BookingStatus.CONFIRMED, todayStart, todayEnd);
        long activeNow = bookingRepository.countActiveNow(now);

        List<Object[]> rawTop = bookingRepository.findTopBookedResources(
                org.springframework.data.domain.PageRequest.of(0, 5));
        List<AdminStatsResponse.TopResourceDto> topResources = new ArrayList<>();
        for (Object[] row : rawTop) {
            String name = (String) row[0];
            String type = String.valueOf(row[1]);
            long count = ((Number) row[2]).longValue();
            topResources.add(new AdminStatsResponse.TopResourceDto(name, type, count));
        }

        return new AdminStatsResponse(totalUsers, totalResources, totalBookings, todayBookings, activeNow, topResources);
    }
}
