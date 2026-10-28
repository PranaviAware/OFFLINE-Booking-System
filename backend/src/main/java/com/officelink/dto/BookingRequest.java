package com.officelink.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class BookingRequest {

    @NotBlank(message = "resourceId is required")
    @JsonAlias({"resourceId", "resource_id"})
    private String resourceId;

    @NotBlank(message = "startTime is required and must be ISO-8601 UTC")
    @JsonAlias({"startTime", "start_time"})
    private String startTime;

    @NotBlank(message = "endTime is required and must be ISO-8601 UTC")
    @JsonAlias({"endTime", "end_time"})
    private String endTime;

    @Size(max = 255, message = "Purpose cannot exceed 255 characters")
    private String purpose;

    public BookingRequest() {
    }

    public BookingRequest(String resourceId, String startTime, String endTime, String purpose) {
        this.resourceId = resourceId;
        this.startTime = startTime;
        this.endTime = endTime;
        this.purpose = purpose;
    }

    public String getResourceId() {
        return resourceId;
    }

    public void setResourceId(String resourceId) {
        this.resourceId = resourceId;
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

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }
}
