package com.voyara.tourguide.accommodations;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccommodationRepository extends JpaRepository<Accommodation, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select r from Accommodation r where r.id = :id")
    java.util.Optional<Accommodation> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);

    List<Accommodation> findByDestinationId(Long destinationId);

    List<Accommodation> findByLocationContainingIgnoreCase(String location);

    List<Accommodation> findByStatusIgnoreCase(String status);

    List<Accommodation> findByOwnerIdOrderByIdDesc(Long ownerUserId);

    boolean existsByDestinationId(Long destinationId);
}
