package com.voyara.tourguide.tourguides;

import com.voyara.tourguide.common.ResourceNotFoundException;
import com.voyara.tourguide.auth.EmailVerificationOtpRepository;
import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.bookings.BookingRepository;
import com.voyara.tourguide.notifications.NotificationRepository;
import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.users.AppUserRepository;
import com.voyara.tourguide.users.Role;
import com.voyara.tourguide.users.RoleRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TourGuideService {
    private final TourGuideRepository repository;
    private final AppUserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final BookingRepository bookingRepository;
    private final NotificationRepository notificationRepository;
    private final EmailVerificationOtpRepository otpRepository;

    public TourGuideService(TourGuideRepository repository, AppUserRepository userRepository, RoleRepository roleRepository,
                            PasswordEncoder passwordEncoder, BookingRepository bookingRepository,
                            NotificationRepository notificationRepository, EmailVerificationOtpRepository otpRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.bookingRepository = bookingRepository;
        this.notificationRepository = notificationRepository;
        this.otpRepository = otpRepository;
    }

    @Transactional(readOnly = true)
    public List<TourGuide> findAll() {
        List<TourGuide> guides = repository.findAll();
        guides.forEach(this::initializeCollections);
        return guides;
    }

    @Transactional(readOnly = true)
    public List<TourGuide> findPublicAvailable(LocalDate checkIn, LocalDate checkOut, String language, String location) {
        validateAvailabilityDates(checkIn, checkOut);
        List<TourGuide> guides = findAll().stream()
                .filter(guide -> "Available".equalsIgnoreCase(guide.getStatus()))
                .filter(guide -> matchesLanguage(guide, language))
                .filter(guide -> matchesLocation(guide, location))
                .toList();
        if (checkIn == null) {
            return guides;
        }
        List<Booking> overlapping = bookingRepository.findOverlapping(checkIn, checkOut);
        return guides.stream()
                .filter(guide -> overlapping.stream().noneMatch(booking -> sameBookedGuide(guide, booking)))
                .toList();
    }

    @Transactional(readOnly = true)
    public TourGuide findById(Long id) {
        TourGuide guide = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Tour guide", id));
        initializeCollections(guide);
        return guide;
    }

    @Transactional(readOnly = true)
    public TourGuide findPublicById(Long id) {
        TourGuide guide = findById(id);
        if (!"Available".equalsIgnoreCase(guide.getStatus())) {
            throw new ResourceNotFoundException("Tour guide", id);
        }
        return guide;
    }

    @Transactional
    public TourGuide save(TourGuide guide) {
        guide.setRating(0.0);
        guide.setReviews(0);
        TourGuide saved = repository.save(guide);
        ensureStakeholderAccount(saved);
        saved = repository.save(saved);
        initializeCollections(saved);
        return saved;
    }

    @Transactional
    public TourGuide update(Long id, TourGuide guide) {
        TourGuide existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tour guide", id));
        copyEditable(existing, guide);
        ensureStakeholderAccount(existing);
        initializeCollections(existing);
        return existing;
    }

    @Transactional(readOnly = true)
    public TourGuide findOwned(String email) {
        AppUser user = requireUser(email);
        TourGuide guide = repository.findByUserId(user.getId())
                .orElseGet(() -> repository.findAll().stream()
                        .filter(item -> item.getEmail() != null && item.getEmail().equalsIgnoreCase(user.getEmail()))
                        .findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("Tour guide", user.getId())));
        initializeCollections(guide);
        return guide;
    }

    @Transactional
    public TourGuide updateOwned(String email, TourGuide guide) {
        TourGuide existing = findOwned(email);
        guide.setEmail(existing.getEmail());
        copyEditable(existing, guide);
        ensureStakeholderAccount(existing);
        initializeCollections(existing);
        return existing;
    }

    @Transactional
    public void delete(Long id) {
        TourGuide guide = findById(id);
        if (bookingRepository.existsByTourGuideId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This tour guide is referenced by existing bookings. Mark the guide unavailable instead.");
        }
        Long userId = guide.getUserId();
        repository.delete(guide);
        if (userId != null) {
            userRepository.findById(userId).ifPresent(user -> {
                notificationRepository.deleteByUserId(userId);
                otpRepository.deleteByUserId(userId);
                userRepository.delete(user);
            });
        }
    }

    private void initializeCollections(TourGuide guide) {
        if (guide.getSpecialties() != null) guide.getSpecialties().size();
        if (guide.getLanguages() != null) guide.getLanguages().size();
    }

    private AppUser requireUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }

    private void copyEditable(TourGuide existing, TourGuide guide) {
        existing.setName(guide.getName());
        existing.setEmail(guide.getEmail());
        existing.setPhone(guide.getPhone());
        existing.setNationality(guide.getNationality());
        existing.setProfilePhoto(guide.getProfilePhoto());
        existing.setInitials(guide.getInitials());
        existing.setColor(guide.getColor());
        existing.setLocation(guide.getLocation());
        existing.setCountry(guide.getCountry());
        existing.setPricePerDay(guide.getPricePerDay());
        existing.setExperience(guide.getExperience());
        existing.setStatus(guide.getStatus());
        existing.setBio(guide.getBio());
        existing.setToursCompleted(guide.getToursCompleted());
        existing.getSpecialties().clear();
        existing.getLanguages().clear();
        if (guide.getSpecialties() != null) existing.getSpecialties().addAll(new ArrayList<>(guide.getSpecialties()));
        if (guide.getLanguages() != null) existing.getLanguages().addAll(new ArrayList<>(guide.getLanguages()));
    }

    private void validateAvailabilityDates(LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null && checkOut == null) return;
        if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check-in and check-out dates are required for availability search");
        }
    }

    private boolean matchesLanguage(TourGuide guide, String language) {
        if (language == null || language.isBlank()) return true;
        return guide.getLanguages().stream().anyMatch(item -> item.equalsIgnoreCase(language.trim()));
    }

    private boolean matchesLocation(TourGuide guide, String location) {
        if (location == null || location.isBlank()) return true;
        String needle = location.trim().toLowerCase(Locale.ROOT);
        String haystack = String.join(" ", guide.getLocation() == null ? "" : guide.getLocation(),
                guide.getCountry() == null ? "" : guide.getCountry()).toLowerCase(Locale.ROOT);
        return haystack.contains(needle) || needle.contains(haystack.trim());
    }

    private boolean sameBookedGuide(TourGuide guide, Booking booking) {
        return Objects.equals(guide.getId(), booking.getGuideId())
                && !"OWN".equalsIgnoreCase(booking.getGuideSelectionType())
                && !"Cancelled".equalsIgnoreCase(booking.getStatus());
    }

    private void ensureStakeholderAccount(TourGuide guide) {
        if (guide.getEmail() == null || guide.getEmail().isBlank()) return;
        String email = guide.getEmail().trim().toLowerCase(Locale.ROOT);
        AppUser account = guide.getUserId() == null
                ? userRepository.findByEmailIgnoreCase(email).orElse(null)
                : userRepository.findById(guide.getUserId()).orElse(null);
        if (account == null) {
            account = new AppUser();
            account.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            account.setActive(false);
            account.setEmailVerified(false);
            account.setAccountStatus("Pending Invitation");
        } else if (!email.equalsIgnoreCase(account.getEmail())) {
            AppUser other = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (other != null && !other.getId().equals(account.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
            }
        }
        Role guideRole = roleRepository.findByRoleName("TOUR_GUIDE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tour Guide access profile not found"));
        account.setFullName(guide.getName().trim());
        account.setEmail(email);
        account.setPhone(guide.getPhone());
        account.setStakeholderType("TOUR_GUIDE");
        account.setProfilePhoto(guide.getProfilePhoto());
        account.getRoles().clear();
        account.getRoles().add(guideRole);
        if (account.getAccountStatus() == null || account.getAccountStatus().isBlank()) account.setAccountStatus("Pending Invitation");
        guide.setUserId(userRepository.save(account).getId());
    }
}
