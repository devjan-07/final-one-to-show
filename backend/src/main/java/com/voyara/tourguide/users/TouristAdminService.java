package com.voyara.tourguide.users;

import com.voyara.tourguide.auth.EmailVerificationOtpRepository;
import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.bookings.BookingRepository;
import com.voyara.tourguide.notifications.NotificationRepository;
import com.voyara.tourguide.payments.PaymentRepository;
import com.voyara.tourguide.profiles.TouristProfile;
import com.voyara.tourguide.profiles.TouristProfileRepository;
import com.voyara.tourguide.reviews.ReviewRatingService;
import com.voyara.tourguide.reviews.ReviewRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TouristAdminService {
    private final AppUserRepository userRepository;
    private final TouristProfileRepository profileRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final ReviewRepository reviewRepository;
    private final ReviewRatingService reviewRatingService;
    private final NotificationRepository notificationRepository;
    private final EmailVerificationOtpRepository otpRepository;

    public TouristAdminService(
            AppUserRepository userRepository,
            TouristProfileRepository profileRepository,
            BookingRepository bookingRepository,
            PaymentRepository paymentRepository,
            ReviewRepository reviewRepository,
            ReviewRatingService reviewRatingService,
            NotificationRepository notificationRepository,
            EmailVerificationOtpRepository otpRepository
    ) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.reviewRepository = reviewRepository;
        this.reviewRatingService = reviewRatingService;
        this.notificationRepository = notificationRepository;
        this.otpRepository = otpRepository;
    }

    @Transactional(readOnly = true)
    public List<TouristAdminResponse> findAll() {
        return userRepository.findByRoleNameOrderByCreatedAtDesc("TOURIST")
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public TouristAdminResponse update(Long id, TouristAdminUpdateRequest request) {
        AppUser user = findTourist(id);
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        userRepository.findByEmailIgnoreCase(email).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
            }
        });
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPhone(request.phone());
        user.setActive(request.active());
        TouristProfile profile = profileRepository.findById(id).orElseGet(() -> {
            TouristProfile created = new TouristProfile();
            created.setUser(user);
            return created;
        });
        profile.setNationality(request.nationality());
        profile.setPassportNumber(request.passportNumber());
        profile.setPreferences(request.preferences());
        profileRepository.save(profile);
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void delete(Long id) {
        AppUser user = findTourist(id);
        List<Booking> bookings = bookingRepository.findByTouristId(id);
        if (!bookings.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tourists with booking history cannot be deleted. Deactivate the account instead.");
        }
        bookingRepository.deleteAll(bookings);
        reviewRepository.deleteAll(reviewRepository.findByTouristId(id));
        notificationRepository.deleteByUserId(id);
        otpRepository.deleteByUserId(id);
        profileRepository.deleteById(id);
        userRepository.delete(user);
        reviewRatingService.reconcileAllResources();
    }

    private AppUser findTourist(Long id) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tourist not found"));
        boolean tourist = user.getRoles().stream().anyMatch(role -> "TOURIST".equalsIgnoreCase(role.getRoleName()));
        if (!tourist) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tourist not found");
        }
        return user;
    }

    private TouristAdminResponse toResponse(AppUser user) {
        TouristProfile profile = profileRepository.findById(user.getId()).orElse(null);
        return new TouristAdminResponse(
                user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), user.isActive(),
                user.isEmailVerified(), profile == null ? null : profile.getNationality(),
                profile == null ? null : profile.getPassportNumber(),
                profile == null ? null : profile.getPreferences(), user.getCreatedAt());
    }
}
