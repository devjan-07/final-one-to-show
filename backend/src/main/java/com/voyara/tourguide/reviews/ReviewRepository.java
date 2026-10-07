package com.voyara.tourguide.reviews;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByTouristIdOrderByCreatedAtDesc(Long touristId);
    List<Review> findByTouristId(Long touristId);
    void deleteByBookingId(String bookingId);
    @Query("""
            SELECT r FROM Review r
            WHERE r.targetType = :targetType
              AND r.targetId = :targetId
              AND EXISTS (
                  SELECT b.id FROM Booking b
                  WHERE b.id = r.bookingId AND LOWER(b.status) = 'completed'
              )
            ORDER BY r.createdAt DESC
            """)
    List<Review> findCompletedByTargetTypeAndTargetId(
            @Param("targetType") String targetType,
            @Param("targetId") Long targetId
    );

    @Query("""
            SELECT r FROM Review r
            JOIN FETCH r.tourist
            WHERE r.comment IS NOT NULL
              AND TRIM(r.comment) <> ''
              AND EXISTS (
                  SELECT b.id FROM Booking b
                  WHERE b.id = r.bookingId AND LOWER(b.status) = 'completed'
              )
            ORDER BY r.createdAt DESC
            """)
    List<Review> findRecentCompletedWrittenReviews(Pageable pageable);

    boolean existsByTouristIdAndBookingIdAndTargetType(Long touristId, String bookingId, String targetType);
}
