package com.officelink.repository;

import com.officelink.entity.Booking;
import com.officelink.entity.BookingStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Repository
public interface BookingRepository extends JpaRepository<Booking, String>, JpaSpecificationExecutor<Booking> {

    @Query("SELECT DISTINCT b.resource.id FROM Booking b WHERE b.status = com.officelink.entity.BookingStatus.CONFIRMED " +
           "AND b.startTime <= :now AND b.endTime > :now")
    Set<String> findCurrentlyBookedResourceIds(@Param("now") Instant now);

    @Query("SELECT b FROM Booking b WHERE b.resource.id = :resourceId " +
           "AND b.status = com.officelink.entity.BookingStatus.CONFIRMED " +
           "AND (b.startTime < :endTime AND b.endTime > :startTime)")
    List<Booking> findConflictingBookings(@Param("resourceId") String resourceId,
                                         @Param("startTime") Instant startTime,
                                         @Param("endTime") Instant endTime);

    @Query("SELECT b FROM Booking b WHERE b.resource.id = :resourceId " +
           "AND b.status = com.officelink.entity.BookingStatus.CONFIRMED " +
           "AND (b.startTime < :endTime AND b.endTime > :startTime) " +
           "AND b.id != :excludeBookingId")
    List<Booking> findConflictingBookingsExcluding(@Param("resourceId") String resourceId,
                                                  @Param("startTime") Instant startTime,
                                                  @Param("endTime") Instant endTime,
                                                  @Param("excludeBookingId") String excludeBookingId);

    @Query("SELECT b FROM Booking b WHERE b.user.id = :userId ORDER BY b.startTime DESC")
    List<Booking> findByUserIdOrderByStartTimeDesc(@Param("userId") String userId);

    long countByStatus(BookingStatus status);

    long countByStatusAndStartTimeBetween(BookingStatus status, Instant start, Instant end);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.status = com.officelink.entity.BookingStatus.CONFIRMED " +
           "AND b.startTime <= :now AND b.endTime > :now")
    long countActiveNow(@Param("now") Instant now);

    @Query("SELECT b.resource.name as name, b.resource.type as type, COUNT(b) as count " +
           "FROM Booking b WHERE b.status = com.officelink.entity.BookingStatus.CONFIRMED " +
           "GROUP BY b.resource.name, b.resource.type " +
           "ORDER BY COUNT(b) DESC")
    List<Object[]> findTopBookedResources(Pageable pageable);

    @Query("SELECT COUNT(b) > 0 FROM Booking b WHERE b.resource.id = :resourceId " +
           "AND b.status = com.officelink.entity.BookingStatus.CONFIRMED " +
           "AND b.startTime <= :now AND b.endTime > :now")
    boolean isResourceCurrentlyBooked(@Param("resourceId") String resourceId, @Param("now") Instant now);

    @Query("DELETE FROM Booking b WHERE b.user.id = :userId")
    @org.springframework.data.jpa.repository.Modifying
    void deleteByUserId(@Param("userId") String userId);
}
