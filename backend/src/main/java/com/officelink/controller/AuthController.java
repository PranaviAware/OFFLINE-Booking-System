package com.officelink.controller;

import com.officelink.dto.*;
import com.officelink.entity.User;
import com.officelink.entity.UserRole;
import com.officelink.exception.UnauthorizedException;
import com.officelink.repository.UserRepository;
import com.officelink.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/v1/auth/me
     *
     * Returns the current user's profile.
     * The Keycloak JWT has already been validated by Spring's OAuth2 Resource Server
     * filter before this method is called.
     *
     * On first login, if the user doesn't exist in our DB yet (JIT provisioning),
     * we create a local shadow record using the claims from the Keycloak token.
     */
    @GetMapping("/me")
    @Transactional
    public ResponseEntity<Map<String, Object>> getMe(JwtAuthenticationToken token) {
        if (token == null) {
            throw new UnauthorizedException("Not authenticated");
        }

        String keycloakSub = token.getName(); // Keycloak user UUID (sub claim)
        String email = token.getToken().getClaimAsString("email");
        String name  = token.getToken().getClaimAsString("name");
        if (name == null || name.isBlank()) {
            name = token.getToken().getClaimAsString("preferred_username");
        }

        // Determine role from Keycloak authorities
        boolean isAdmin = token.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        UserRole role = isAdmin ? UserRole.ADMIN : UserRole.USER;

        // JIT Provisioning: create local user record on first login if not present.
        // @Transactional on this method prevents duplicate-key errors from concurrent
        // requests by two tabs opening simultaneously for the same new user.
        final String finalName = (name != null && !name.isBlank()) ? name : email;
        User user;
        try {
            user = userRepository.findById(keycloakSub).orElseGet(() ->
                // Also check by email (in case admin pre-created user in local DB)
                userRepository.findByEmailIgnoreCase(email).map(existing -> {
                    // Update the existing record's ID to match the Keycloak sub
                    // (handles the case where email was pre-seeded with a different ID)
                    if (!existing.getId().equals(keycloakSub)) {
                        existing.setId(keycloakSub);
                    }
                    return existing;
                }).orElseGet(() -> {
                    User newUser = new User(keycloakSub, email, null, finalName, role);
                    return userRepository.save(newUser);
                })
            );
        } catch (Exception e) {
            // Race condition: another request already created the user; just fetch it
            user = userRepository.findById(keycloakSub)
                    .orElseGet(() -> userRepository.findByEmailIgnoreCase(email)
                    .orElseThrow(() -> new UnauthorizedException("User provisioning failed")));
        }

        // Sync role from Keycloak on every login
        if (user.getRole() != role) {
            user.setRole(role);
            userRepository.save(user);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("user", UserDto.fromEntity(user));
        response.put("message", "Keycloak JWT validated. User provisioned via OIDC.");
        return ResponseEntity.ok(response);
    }

    // ── Admin User Management ───────────────────────────────────────────────

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DataListResponse<UserDto>> getAllUsers() {
        List<UserDto> users = authService.getAllUsers();
        return ResponseEntity.ok(DataListResponse.of(users));
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserDto created = authService.createUser(request);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "User created successfully with role " + created.getRole());
        response.put("user", created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updateUserRole(@PathVariable("id") String id,
                                                              @Valid @RequestBody RoleUpdateRequest request) {
        UserDto updated = authService.updateUserRole(id, request.getRole());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "User role updated to " + request.getRole());
        response.put("user", updated);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable("id") String id,
                                                        JwtAuthenticationToken token) {
        authService.deleteUser(id, token.getName());
        return ResponseEntity.ok(new ApiResponse<>("User deleted successfully"));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminStatsResponse> getAdminStats() {
        return ResponseEntity.ok(authService.getAdminStats());
    }
}
