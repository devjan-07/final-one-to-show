package com.voyara.tourguide.reviews;

import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.bookings.BookingService;
import com.voyara.tourguide.notifications.NotificationService;
import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.users.AppUserRepository;
import jakarta.validation.Valid;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tourist")
public class ReviewController {
    private final ReviewRepository repository;
    private final ReviewRatingService reviewRatingService;
    private final BookingService bookingService;
    private final AppUserRepository userRepository;
    private final NotificationService notificationService;
    private final boolean securityEnabled;

    public ReviewController(ReviewRepository repository, ReviewRatingService reviewRatingService,
                            BookingService bookingService, AppUserRepository userRepository,
                            NotificationService notificationService,
                            @Value("${app.security.enabled:true}") boolean securityEnabled) {
        this.repository = repository;
        this.reviewRatingService = reviewRatingService;
        this.bookingService = bookingService;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.securityEnabled = securityEnabled;
    }

    @GetMapping("/reviews")
    public List<Review> mine(Principal principal) {
        AppUser user = currentUser(principal);
        return repository.findByTouristIdOrderByCreatedAtDesc(user.getId());
    }

    @Transactional
    @PostMapping("/bookings/{bookingId}/reviews")
    public Review create(@PathVariable String bookingId, @Valid @RequestBody Review request, Principal principal) {
        AppUser user = currentUser(principal);
        Booking booking = bookingService.findLockedById(bookingId);
        if (booking.getTourist() == null || !booking.getTourist().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        validateReviewWindow(booking);
        String targetType = normalizeTargetType(request.getTargetType());
        validateReviewTarget(booking, targetType, request.getTargetId());
        if (repository.existsByTouristIdAndBookingIdAndTargetType(user.getId(), bookingId, targetType)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already reviewed this booking item");
        }
        request.setId(null);
        request.setBookingId(bookingId);
        request.setTargetType(targetType);
        request.setTourist(user);
        Review saved = repository.save(request);
        boolean wasCompleted = "Completed".equalsIgnoreCase(booking.getStatus());
        if ("BOOKING".equals(saved.getTargetType())) {
            updateBookingOverallReview(booking, saved);
        }
        completeBookingWhenAllReviewsSubmitted(booking, user.getId());
        if ("Completed".equalsIgnoreCase(booking.getStatus())) {
            reviewRatingService.refreshBookingResources(booking);
        }
        notificationService.notifyBookingUser(booking, "Review submitted",
                targetLabel(saved.getTargetType()) + " rating for " + booking.getId() + " was saved.", "REVIEW_SUBMITTED");
        notificationService.notifyAdmins("New booking review",
                booking.getId() + " received a " + saved.getRating() + "-star " + targetLabel(saved.getTargetType()).toLowerCase() + " rating.",
                "REVIEW_SUBMITTED", booking.getId());
        if (!wasCompleted && "Completed".equalsIgnoreCase(booking.getStatus())) {
            notificationService.notifyBookingUser(booking, "Booking completed",
                    "All reviews for " + booking.getId() + " are complete. Thank you for your feedback.", "BOOKING_COMPLETED");
            notificationService.notifyAssignedGuide(booking, "Trip completed",
                    "Booking " + booking.getId() + " is complete and its feedback is available.", "BOOKING_COMPLETED");
            notificationService.notifyAdmins("Booking completed",
                    booking.getId() + " is complete and all ratings were submitted.", "BOOKING_COMPLETED", booking.getId());
        }
        return saved;
    }

    private void validateReviewWindow(Booking booking) {
        if ((!"Confirmed".equals(booking.getStatus()) && !"Completed".equals(booking.getStatus()))
                || !"Paid".equals(booking.getPayment())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only paid confirmed or completed bookings can be reviewed");
        }
        if ("Cancelled".equalsIgnoreCase(booking.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cancelled bookings cannot be reviewed");
        }
        if (booking.getCheckOut() == null || booking.getCheckOut().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reviews are available after the checkout date");
        }
    }

    private String normalizeTargetType(String targetType) {
        if (targetType == null || targetType.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Review target is required");
        }
        return targetType.trim().toUpperCase();
    }

    private void validateReviewTarget(Booking booking, String targetType, Long targetId) {
        switch (targetType) {
            case "GUIDE" -> requireMatchingTarget("guide", booking.getGuideId(), targetId);
            case "ACCOMMODATION" -> requireMatchingTarget("accommodation", booking.getAccommodationId(), targetId);
            case "VEHICLE" -> requireMatchingTarget("vehicle", booking.getVehicleId(), targetId);
            case "BOOKING" -> {
                return;
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported review target");
        }
    }

    private void updateBookingOverallReview(Booking booking, Review review) {
        booking.setOverallRating(review.getRating());
        booking.setOverallRatingDescription(ratingDescription(review.getRating()));
        booking.setOverallReview(review.getComment());
        bookingService.saveExisting(booking);
    }

    private void completeBookingWhenAllReviewsSubmitted(Booking booking, Long touristId) {
        if (!hasReview(touristId, booking.getId(), "BOOKING")) return;
        if (booking.getGuideId() != null && !hasReview(touristId, booking.getId(), "GUIDE")) return;
        if (booking.getAccommodationId() != null && !hasReview(touristId, booking.getId(), "ACCOMMODATION")) return;
        if (booking.getVehicleId() != null && !hasReview(touristId, booking.getId(), "VEHICLE")) return;

        booking.setStatus("Completed");
        bookingService.saveExisting(booking);
    }

    private boolean hasReview(Long touristId, String bookingId, String targetType) {
        return repository.existsByTouristIdAndBookingIdAndTargetType(touristId, bookingId, targetType);
    }

    private String ratingDescription(int rating) {
        return switch (rating) {
            case 5 -> "Excellent";
            case 4 -> "Very good";
            case 3 -> "Good";
            case 2 -> "Needs improvement";
            default -> "Poor";
        };
    }

    private String targetLabel(String targetType) {
        return switch (targetType) {
            case "GUIDE" -> "Tour guide";
            case "ACCOMMODATION" -> "Accommodation";
            case "VEHICLE" -> "Vehicle";
            default -> "Overall trip";
        };
    }

    private void requireMatchingTarget(String label, Long bookingTargetId, Long requestTargetId) {
        if (bookingTargetId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This booking has no " + label + " to review");
        }
        if (!bookingTargetId.equals(requestTargetId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Review target does not match this booking");
        }
    }

    private AppUser currentUser(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            if (!securityEnabled) {
                return userRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No local user exists"));
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return userRepository.findByEmailIgnoreCase(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }
}
