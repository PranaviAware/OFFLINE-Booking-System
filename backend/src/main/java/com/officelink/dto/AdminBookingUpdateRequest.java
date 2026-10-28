package com.officelink.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Size;

public class AdminBookingUpdateRequest {

    @JsonAlias({"resourceId", "resource_id"})
    private String resourceId;

    @JsonAlias({"startTime", "start_time"})
    private String startTime;

    @JsonAlias({"endTime", "end_time"})
    private String endTime;

    @Size(max = 255, message = "Purpose cannot exceed 255 characters")
    private String purpose;

    public AdminBookingUpdateRequest() {
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
