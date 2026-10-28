package com.officelink.dto;

import com.officelink.entity.UserRole;
import jakarta.validation.constraints.NotNull;

public class RoleUpdateRequest {

    @NotNull(message = "Role must be USER or ADMIN")
    private UserRole role;

    public RoleUpdateRequest() {
    }

    public RoleUpdateRequest(UserRole role) {
        this.role = role;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }
}
