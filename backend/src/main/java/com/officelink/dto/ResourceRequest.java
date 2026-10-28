package com.officelink.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.officelink.entity.ResourceType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ResourceRequest {

    @NotBlank(message = "Resource name is required")
    @Size(min = 2, max = 100, message = "Resource name must be between 2 and 100 characters")
    private String name;

    @NotNull(message = "Resource type is required (DESK, MEETING_ROOM, EQUIPMENT)")
    private ResourceType type;

    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity = 1;

    @NotBlank(message = "Resource location is required")
    @Size(min = 2, max = 100, message = "Resource location must be between 2 and 100 characters")
    private String location;
    private String description;

    @JsonProperty("is_active")
    private Integer isActive;

    public ResourceRequest() {
    }

    public ResourceRequest(String name, ResourceType type, Integer capacity, String location, String description) {
        this.name = name;
        this.type = type;
        this.capacity = capacity;
        this.location = location;
        this.description = description;
    }

    public ResourceRequest(String name, ResourceType type, Integer capacity, String location, String description, Integer isActive) {
        this.name = name;
        this.type = type;
        this.capacity = capacity;
        this.location = location;
        this.description = description;
        this.isActive = isActive;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ResourceType getType() {
        return type;
    }

    public void setType(ResourceType type) {
        this.type = type;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getIsActive() {
        return isActive;
    }

    public void setIsActive(Integer isActive) {
        this.isActive = isActive;
    }
}
