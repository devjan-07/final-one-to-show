package com.voyara.tourguide.reviews;

import com.voyara.tourguide.accommodations.Accommodation;
import com.voyara.tourguide.accommodations.AccommodationRepository;
import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.tourguides.TourGuide;
import com.voyara.tourguide.tourguides.TourGuideRepository;
import com.voyara.tourguide.vehiclerental.Vehicle;
import com.voyara.tourguide.vehiclerental.VehicleRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReviewRatingService {
    private final ReviewRepository reviewRepository;
    private final TourGuideRepository guideRepository;
    private final AccommodationRepository accommodationRepository;
    private final VehicleRepository vehicleRepository;

    public ReviewRatingService(ReviewRepository reviewRepository, TourGuideRepository guideRepository,
                               AccommodationRepository accommodationRepository, VehicleRepository vehicleRepository) {
        this.reviewRepository = reviewRepository;
        this.guideRepository = guideRepository;
        this.accommodationRepository = accommodationRepository;
        this.vehicleRepository = vehicleRepository;
    }

    @Transactional(readOnly = true)
    public ReviewSummary summarizeCompleted(String targetType, Long targetId) {
        String normalizedType = normalizeResourceType(targetType);
        List<Review> reviews = reviewRepository.findCompletedByTargetTypeAndTargetId(normalizedType, targetId);
        int count = reviews.size();
        double average = count == 0 ? 0.0 : reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        int writtenCount = (int) reviews.stream()
                .filter(review -> review.getComment() != null && !review.getComment().isBlank())
                .count();
        return new ReviewSummary(roundRating(average), count, writtenCount, reviews);
    }

    @Transactional
    public void refreshBookingResources(Booking booking) {
        if (booking.getGuideId() != null) refreshGuide(booking.getGuideId());
        if (booking.getAccommodationId() != null) refreshAccommodation(booking.getAccommodationId());
        if (booking.getVehicleId() != null) refreshVehicle(booking.getVehicleId());
    }

    @Transactional
    public void reconcileAllResources() {
        guideRepository.findAll().forEach(guide -> apply(guide, summarizeCompleted("GUIDE", guide.getId())));
        accommodationRepository.findAll().forEach(accommodation -> apply(accommodation, summarizeCompleted("ACCOMMODATION", accommodation.getId())));
        vehicleRepository.findAll().forEach(vehicle -> apply(vehicle, summarizeCompleted("VEHICLE", vehicle.getId())));
    }

    private void refreshGuide(Long id) {
        guideRepository.findById(id).ifPresent(guide -> apply(guide, summarizeCompleted("GUIDE", id)));
    }

    private void refreshAccommodation(Long id) {
        accommodationRepository.findById(id).ifPresent(accommodation -> apply(accommodation, summarizeCompleted("ACCOMMODATION", id)));
    }

    private void refreshVehicle(Long id) {
        vehicleRepository.findById(id).ifPresent(vehicle -> apply(vehicle, summarizeCompleted("VEHICLE", id)));
    }

    private void apply(TourGuide guide, ReviewSummary summary) {
        guide.setRating(summary.averageRating());
        guide.setReviews(summary.ratingCount());
        guideRepository.save(guide);
    }

    private void apply(Accommodation accommodation, ReviewSummary summary) {
        accommodation.setRating(summary.averageRating());
        accommodation.setReviews(summary.ratingCount());
        accommodationRepository.save(accommodation);
    }

    private void apply(Vehicle vehicle, ReviewSummary summary) {
        vehicle.setRating(summary.averageRating());
        vehicle.setReviews(summary.ratingCount());
        vehicleRepository.save(vehicle);
    }

    private String normalizeResourceType(String targetType) {
        String normalized = targetType == null ? "" : targetType.trim().toUpperCase();
        if (!List.of("GUIDE", "ACCOMMODATION", "VEHICLE").contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported review target");
        }
        return normalized;
    }

    private double roundRating(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
