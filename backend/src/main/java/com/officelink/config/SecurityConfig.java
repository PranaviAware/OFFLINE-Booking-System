package com.officelink.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.officelink.exception.ErrorResponse;
import com.officelink.security.KeycloakJwtConverter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final KeycloakJwtConverter keycloakJwtConverter;
    private final CorsConfigurationSource corsConfigurationSource;
    private final ObjectMapper objectMapper;

    public SecurityConfig(KeycloakJwtConverter keycloakJwtConverter,
                          CorsConfigurationSource corsConfigurationSource,
                          ObjectMapper objectMapper) {
        this.keycloakJwtConverter = keycloakJwtConverter;
        this.corsConfigurationSource = corsConfigurationSource;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ── OAuth2 Resource Server: validate JWTs issued by Keycloak ──────────
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakJwtConverter))
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    ErrorResponse error = new ErrorResponse(
                        "Unauthorized",
                        "Invalid or missing Keycloak token: " + authException.getMessage(),
                        401
                    );
                    response.getWriter().write(objectMapper.writeValueAsString(error));
                })
            )

            .exceptionHandling(ex -> ex
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    ErrorResponse error = new ErrorResponse("Forbidden", "Access denied: insufficient role", 403);
                    response.getWriter().write(objectMapper.writeValueAsString(error));
                })
            )

            .authorizeHttpRequests(auth -> auth
                // Keycloak OIDC discovery endpoints (proxied info)
                .requestMatchers("/api/v1/auth/.well-known/**").permitAll()
                // Public resource catalog browsing
                .requestMatchers(HttpMethod.GET, "/api/v1/resources", "/api/v1/resources/**").permitAll()
                // Admin-only management endpoints
                .requestMatchers("/api/v1/auth/users", "/api/v1/auth/users/**", "/api/v1/auth/stats").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/resources/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/resources/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/resources/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/bookings/admin/**").hasRole("ADMIN")
                // Authenticated user endpoints (valid Keycloak JWT required)
                .requestMatchers("/api/v1/auth/me").authenticated()
                .requestMatchers("/api/v1/bookings", "/api/v1/bookings/**").authenticated()
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated()
            );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
