package com.voyara.tourguide.bookings;

import java.util.List;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<Booking, String> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select b from Booking b where b.id = :id")
    java.util.Optional<Booking> findLockedById(@org.springframework.data.repository.query.Param("id") String id);

    @org.springframework.data.jpa.repository.Query("select b from Booking b where lower(b.status) <> 'cancelled' and b.checkIn < :end and b.checkOut > :start")
    List<Booking> findOverlapping(@org.springframework.data.repository.query.Param("start") java.time.LocalDate start,
                                 @org.springframework.data.repository.query.Param("end") java.time.LocalDate end);

    List<Booking> findByEmailIgnoreCaseOrderByCreatedAtDesc(String email);

    List<Booking> findByTouristIdOrderByCreatedAtDesc(Long touristId);

    List<Booking> findByTouristIsNullAndEmailIgnoreCase(String email);

    List<Booking> findByTouristId(Long touristId);

    boolean existsByIdAndTouristId(String id, Long touristId);

    List<Booking> findByAccommodationResourceOwnerIdOrderByCreatedAtDesc(Long ownerUserId);
    List<Booking> findByVehicleResourceOwnerIdOrderByCreatedAtDesc(Long ownerUserId);

    boolean existsByTourPackageId(Long packageId);

    boolean existsByTourGuideId(Long guideId);

    boolean existsByAccommodationResourceId(Long accommodationId);

    boolean existsByVehicleResourceId(Long vehicleId);

    @org.springframework.data.jpa.repository.Query("""
            select count(b) > 0 from Booking b
            where b.accommodationResource.id = :accommodationId
              and lower(b.status) <> lower(:status)
              and b.checkOut > :date
            """)
    boolean existsUpcomingForAccommodation(@org.springframework.data.repository.query.Param("accommodationId") Long accommodationId,
                                           @org.springframework.data.repository.query.Param("status") String status,
                                           @org.springframework.data.repository.query.Param("date") java.time.LocalDate date);
}
