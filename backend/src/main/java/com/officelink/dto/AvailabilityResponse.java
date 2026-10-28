package com.officelink.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class AvailabilityResponse {

    private boolean available;
    private String conflictReason;

    public AvailabilityResponse() {
    }

    public AvailabilityResponse(boolean available) {
        this.available = available;
    }

    public AvailabilityResponse(boolean available, String conflictReason) {
        this.available = available;
        this.conflictReason = conflictReason;
    }

    public boolean isAvailable() {
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }

    public String getConflictReason() {
        return conflictReason;
    }

    public void setConflictReason(String conflictReason) {
        this.conflictReason = conflictReason;
    }
}
