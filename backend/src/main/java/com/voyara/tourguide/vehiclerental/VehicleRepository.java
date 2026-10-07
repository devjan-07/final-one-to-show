package com.voyara.tourguide.vehiclerental;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select r from Vehicle r where r.id = :id")
    java.util.Optional<Vehicle> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);

    List<Vehicle> findByStatusIgnoreCase(String status);
    List<Vehicle> findByOwnerIdOrderByIdDesc(Long ownerUserId);
    boolean existsByPlateIgnoreCase(String plate);
    boolean existsByPlateIgnoreCaseAndIdNot(String plate, Long id);
}
