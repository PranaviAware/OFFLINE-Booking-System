package com.officelink.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.officelink.entity.Booking;
import com.officelink.entity.BookingStatus;
import com.officelink.entity.ResourceType;

import java.time.Instant;

public class BookingResponse {

    private String id;

    @JsonProperty("resource_id")
    private String resourceId;

    @JsonProperty("resource_name")
    private String resourceName;

    @JsonProperty("resource_type")
    private ResourceType resourceType;

    @JsonProperty("resource_location")
    private String resourceLocation;

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("user_name")
    private String userName;

    @JsonProperty("user_email")
    private String userEmail;

    @JsonProperty("start_time")
    private String startTime;

    @JsonProperty("end_time")
    private String endTime;

    private BookingStatus status;
    private String purpose;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("updated_at")
    private String updatedAt;

    public BookingResponse() {
    }

    public static BookingResponse fromEntity(Booking b) {
        if (b == null) return null;
        BookingResponse dto = new BookingResponse();
        dto.setId(b.getId());
        if (b.getResource() != null) {
            dto.setResourceId(b.getResource().getId());
            dto.setResourceName(b.getResource().getName());
            dto.setResourceType(b.getResource().getType());
            dto.setResourceLocation(b.getResource().getLocation());
        }
        if (b.getUser() != null) {
            dto.setUserId(b.getUser().getId());
            dto.setUserName(b.getUser().getFullName());
            dto.setUserEmail(b.getUser().getEmail());
        }
        dto.setStartTime(b.getStartTime() != null ? b.getStartTime().toString() : null);
        dto.setEndTime(b.getEndTime() != null ? b.getEndTime().toString() : null);
        dto.setStatus(b.getStatus());
        dto.setPurpose(b.getPurpose());
        dto.setCreatedAt(b.getCreatedAt() != null ? b.getCreatedAt().toString() : Instant.now().toString());
        dto.setUpdatedAt(b.getUpdatedAt() != null ? b.getUpdatedAt().toString() : Instant.now().toString());
        return dto;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getResourceId() {
        return resourceId;
    }

    public void setResourceId(String resourceId) {
        this.resourceId = resourceId;
    }

    public String getResourceName() {
        return resourceName;
    }

    public void setResourceName(String resourceName) {
        this.resourceName = resourceName;
    }

    public ResourceType getResourceType() {
        return resourceType;
    }

    public void setResourceType(ResourceType resourceType) {
        this.resourceType = resourceType;
    }

    public String getResourceLocation() {
        return resourceLocation;
    }

    public void setResourceLocation(String resourceLocation) {
        this.resourceLocation = resourceLocation;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public BookingStatus getStatus() {
        return status;
    }

    public void setStatus(BookingStatus status) {
        this.status = status;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
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
