package com.officelink.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.officelink.entity.User;
import com.officelink.entity.UserRole;

import java.time.Instant;

public class UserDto {
    private String id;
    private String email;
    private String name;
    private UserRole role;

    @JsonProperty("created_at")
    private String createdAt;

    public UserDto() {
    }

    public UserDto(String id, String email, String name, UserRole role, Instant createdAt) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.role = role;
        this.createdAt = createdAt != null ? createdAt.toString() : null;
    }

    public static UserDto fromEntity(User user) {
        if (user == null) return null;
        return new UserDto(
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.getRole(),
            user.getCreatedAt()
        );
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
