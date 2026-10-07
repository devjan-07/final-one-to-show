package com.voyara.tourguide.tourguides;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TourGuideRepository extends JpaRepository<TourGuide, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select r from TourGuide r where r.id = :id")
    java.util.Optional<TourGuide> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);

    Optional<TourGuide> findByUserId(Long userId);
}
