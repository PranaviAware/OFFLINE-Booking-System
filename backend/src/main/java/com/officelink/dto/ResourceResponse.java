package com.officelink.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.officelink.entity.Resource;
import com.officelink.entity.ResourceType;

import java.time.Instant;

public class ResourceResponse {

    private String id;
    private String name;
    private ResourceType type;
    private Integer capacity;
    private String location;
    private String description;

    @JsonProperty("is_active")
    private Integer isActive;

    @JsonProperty("is_currently_available")
    private Boolean isCurrentlyAvailable;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("updated_at")
    private String updatedAt;

    public ResourceResponse() {
    }

    public static ResourceResponse fromEntity(Resource resource, Boolean isCurrentlyAvailable) {
        if (resource == null) return null;
        ResourceResponse res = new ResourceResponse();
        res.setId(resource.getId());
        res.setName(resource.getName());
        res.setType(resource.getType());
        res.setCapacity(resource.getCapacity());
        res.setLocation(resource.getLocation());
        res.setDescription(resource.getDescription());
        res.setIsActive(Boolean.TRUE.equals(resource.getIsActive()) ? 1 : 0);
        res.setIsCurrentlyAvailable(isCurrentlyAvailable != null ? isCurrentlyAvailable : true);
        res.setCreatedAt(resource.getCreatedAt() != null ? resource.getCreatedAt().toString() : Instant.now().toString());
        res.setUpdatedAt(resource.getUpdatedAt() != null ? resource.getUpdatedAt().toString() : Instant.now().toString());
        return res;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public Boolean getIsCurrentlyAvailable() {
        return isCurrentlyAvailable;
    }

    public void setIsCurrentlyAvailable(Boolean currentlyAvailable) {
        isCurrentlyAvailable = currentlyAvailable;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
