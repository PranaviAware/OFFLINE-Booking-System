package com.officelink.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Converts a Keycloak-issued JWT into a Spring Security Authentication.
 *
 * Keycloak encodes roles in two locations:
 *   1. realm_access.roles        — realm-level roles (e.g. "admin", "user")
 *   2. resource_access.<client>.roles — client-level roles
 *
 * Both are extracted and mapped to Spring's ROLE_* convention.
 */
@Component
public class KeycloakJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Value("${officelink.keycloak.client-id:officelink-frontend}")
    private String clientId;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = Stream
                .concat(extractRealmRoles(jwt).stream(), extractClientRoles(jwt).stream())
                .collect(Collectors.toSet());

        // Use 'sub' (Keycloak user UUID) as the principal name
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }

    /**
     * Extract realm-level roles from: realm_access.roles
     */
    @SuppressWarnings("unchecked")
    private Collection<GrantedAuthority> extractRealmRoles(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess == null) return Collections.emptyList();

        List<String> roles = (List<String>) realmAccess.getOrDefault("roles", Collections.emptyList());
        return mapRoles(roles);
    }

    /**
     * Extract client-level roles from: resource_access.<clientId>.roles
     */
    @SuppressWarnings("unchecked")
    private Collection<GrantedAuthority> extractClientRoles(Jwt jwt) {
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess == null) return Collections.emptyList();

        Map<String, Object> clientAccess = (Map<String, Object>) resourceAccess.get(clientId);
        if (clientAccess == null) return Collections.emptyList();

        List<String> roles = (List<String>) clientAccess.getOrDefault("roles", Collections.emptyList());
        return mapRoles(roles);
    }

    /**
     * Map Keycloak role strings to Spring Security GrantedAuthority (ROLE_ prefix).
     * "admin" → ROLE_ADMIN, "user" → ROLE_USER
     */
    private Collection<GrantedAuthority> mapRoles(List<String> roles) {
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                .collect(Collectors.toList());
    }
}
