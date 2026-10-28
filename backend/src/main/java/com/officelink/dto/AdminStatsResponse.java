package com.officelink.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class AdminStatsResponse {

    private long totalUsers;
    private long totalResources;
    private long totalBookings;
    private long todayBookings;
    private long activeNow;
    private List<TopResourceDto> topResources;

    public AdminStatsResponse() {
    }

    public AdminStatsResponse(long totalUsers, long totalResources, long totalBookings,
                              long todayBookings, long activeNow, List<TopResourceDto> topResources) {
        this.totalUsers = totalUsers;
        this.totalResources = totalResources;
        this.totalBookings = totalBookings;
        this.todayBookings = todayBookings;
        this.activeNow = activeNow;
        this.topResources = topResources;
    }

    public static class TopResourceDto {
        private String name;
        private String type;

        @JsonProperty("booking_count")
        private long bookingCount;

        public TopResourceDto() {
        }

        public TopResourceDto(String name, String type, long bookingCount) {
            this.name = name;
            this.type = type;
            this.bookingCount = bookingCount;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public long getBookingCount() {
            return bookingCount;
        }

        public void setBookingCount(long bookingCount) {
            this.bookingCount = bookingCount;
        }
    }

    public long getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(long totalUsers) {
        this.totalUsers = totalUsers;
    }

    public long getTotalResources() {
        return totalResources;
    }

    public void setTotalResources(long totalResources) {
        this.totalResources = totalResources;
    }

    public long getTotalBookings() {
        return totalBookings;
    }

    public void setTotalBookings(long totalBookings) {
        this.totalBookings = totalBookings;
    }

    public long getTodayBookings() {
        return todayBookings;
    }

    public void setTodayBookings(long todayBookings) {
        this.todayBookings = todayBookings;
    }

    public long getActiveNow() {
        return activeNow;
    }

    public void setActiveNow(long activeNow) {
        this.activeNow = activeNow;
    }

    public List<TopResourceDto> getTopResources() {
        return topResources;
    }

    public void setTopResources(List<TopResourceDto> topResources) {
        this.topResources = topResources;
    }
}
