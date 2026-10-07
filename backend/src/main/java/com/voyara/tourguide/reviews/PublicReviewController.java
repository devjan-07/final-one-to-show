package com.voyara.tourguide.reviews;

import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.bookings.BookingRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reviews")
public class PublicReviewController {
    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final ReviewRatingService reviewRatingService;

    public PublicReviewController(ReviewRepository reviewRepository, BookingRepository bookingRepository,
                                  ReviewRatingService reviewRatingService) {
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
        this.reviewRatingService = reviewRatingService;
    }

    @GetMapping
    public List<TravelerStoryReview> recent() {
        List<Review> reviews = reviewRepository.findRecentCompletedWrittenReviews(PageRequest.of(0, 6));
        Map<String, Booking> bookingsById = new HashMap<>();
        bookingRepository.findAllById(reviews.stream().map(Review::getBookingId).filter(Objects::nonNull).toList())
                .forEach(booking -> bookingsById.put(booking.getId(), booking));
        return reviews.stream()
                .map(review -> toTravelerStory(review, bookingsById.get(review.getBookingId())))
                .toList();
    }

    @GetMapping("/{targetType}/{targetId}")
    public ReviewSummary byTarget(@PathVariable String targetType, @PathVariable Long targetId) {
        return reviewRatingService.summarizeCompleted(targetType, targetId);
    }

    private TravelerStoryReview toTravelerStory(Review review, Booking booking) {
        String fullName = review.getTourist().getFullName();
        return new TravelerStoryReview(
                review.getId(),
                displayName(fullName),
                initials(fullName),
                review.getTargetType(),
                review.getTargetId(),
                resourceName(review, booking),
                booking == null ? "" : valueOrBlank(booking.getDestination()),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }

    private String resourceName(Review review, Booking booking) {
        if (booking == null) return titleCase(review.getTargetType());
        return switch (review.getTargetType().toUpperCase()) {
            case "GUIDE" -> valueOrDefault(booking.getGuide(), "Tour guide");
            case "ACCOMMODATION" -> valueOrDefault(booking.getAccommodation(), "Accommodation");
            case "VEHICLE" -> valueOrDefault(booking.getVehicle(), "Vehicle rental");
            case "BOOKING" -> valueOrDefault(booking.getPkg(), valueOrDefault(booking.getDestination(), "Voyara trip"));
            default -> titleCase(review.getTargetType());
        };
    }

    private String displayName(String fullName) {
        String cleaned = valueOrDefault(fullName, "Traveler").trim();
        String[] parts = cleaned.split("\\s+");
        if (parts.length == 1) return parts[0];
        return parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
    }

    private String initials(String fullName) {
        String cleaned = valueOrDefault(fullName, "Traveler").trim();
        String[] parts = cleaned.split("\\s+");
        String first = parts[0].substring(0, 1);
        String second = parts.length > 1 ? parts[parts.length - 1].substring(0, 1) : "";
        return (first + second).toUpperCase();
    }

    private String titleCase(String value) {
        String cleaned = valueOrDefault(value, "Review").replace('_', ' ').toLowerCase();
        return Character.toUpperCase(cleaned.charAt(0)) + cleaned.substring(1);
    }

    private String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String valueOrBlank(String value) {
        return value == null ? "" : value;
    }
}
