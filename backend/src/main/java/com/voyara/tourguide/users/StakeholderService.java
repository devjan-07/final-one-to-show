package com.voyara.tourguide.users;

import com.voyara.tourguide.auth.EmailVerificationOtpRepository;
import com.voyara.tourguide.notifications.NotificationRepository;
import com.voyara.tourguide.tourguides.TourGuide;
import com.voyara.tourguide.tourguides.TourGuideRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StakeholderService {
    private final AppUserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationRepository notificationRepository;
    private final EmailVerificationOtpRepository otpRepository;
    private final TourGuideRepository guideRepository;

    public StakeholderService(AppUserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder,
                              NotificationRepository notificationRepository, EmailVerificationOtpRepository otpRepository,
                              TourGuideRepository guideRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationRepository = notificationRepository;
        this.otpRepository = otpRepository;
        this.guideRepository = guideRepository;
    }

    @Transactional(readOnly = true)
    public List<StakeholderResponse> findAll() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream().noneMatch(role -> "ADMIN".equalsIgnoreCase(role.getRoleName()) || "TOURIST".equalsIgnoreCase(role.getRoleName())))
                .map(this::response)
                .toList();
    }

    @Transactional
    public StakeholderResponse create(StakeholderCreateRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Access profile not found"));
        if ("ADMIN".equalsIgnoreCase(role.getRoleName()) || "TOURIST".equalsIgnoreCase(role.getRoleName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This role cannot be used for a stakeholder");
        }
        AppUser user = new AppUser();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPhone(request.phone().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        boolean active = "Active".equalsIgnoreCase(request.accountStatus());
        user.setActive(active);
        user.setEmailVerified(active);
        user.setStakeholderType(request.stakeholderType());
        user.setAccountStatus(request.accountStatus());
        user.getRoles().add(role);
        AppUser saved = userRepository.save(user);
        synchronizeTourGuide(saved, role);
        return response(saved);
    }

    @Transactional
    public StakeholderResponse update(Long id, StakeholderUpdateRequest request) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Stakeholder not found"));
        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Access profile not found"));
        if ("ADMIN".equalsIgnoreCase(role.getRoleName()) || "TOURIST".equalsIgnoreCase(role.getRoleName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This role cannot be used for a stakeholder");
        }
        boolean passwordChanged = request.password() != null && !request.password().isBlank();
        if (passwordChanged) {
            if (request.password().length() < 8) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
            }
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            // Setting a password from the stakeholder management screen completes
            // the pending invitation, allowing the stakeholder to log in.
            user.setActive(true);
            user.setEmailVerified(true);
            user.setAccountStatus("Active");
        }
        user.getRoles().clear();
        user.getRoles().add(role);
        user.setStakeholderType(role.getRoleName());
        AppUser saved = userRepository.save(user);
        synchronizeTourGuide(saved, role);
        return response(saved);
    }

    @Transactional
    public void delete(Long id) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Stakeholder not found"));
        boolean protectedAccount = user.getRoles().stream()
                .anyMatch(role -> "ADMIN".equalsIgnoreCase(role.getRoleName()) || "TOURIST".equalsIgnoreCase(role.getRoleName()));
        if (protectedAccount) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This account cannot be deleted as a stakeholder");
        }

        guideRepository.findByUserId(id).ifPresent(guide -> {
            guide.setUserId(null);
            guide.setStatus("Unavailable");
            guideRepository.save(guide);
        });
        notificationRepository.deleteByUserId(id);
        otpRepository.deleteByUserId(id);
        userRepository.delete(user);
    }

    private void synchronizeTourGuide(AppUser user, Role role) {
        boolean tourGuideRole = "TOUR_GUIDE".equalsIgnoreCase(role.getRoleName());
        TourGuide guide = guideRepository.findByUserId(user.getId()).orElse(null);
        if (!tourGuideRole) {
            if (guide != null) {
                guide.setStatus("Unavailable");
                guideRepository.save(guide);
            }
            return;
        }

        boolean newGuide = guide == null;
        if (newGuide) {
            guide = new TourGuide();
            guide.setUserId(user.getId());
            guide.setStatus("Available");
            guide.setRating(0);
            guide.setReviews(0);
        }
        guide.setName(user.getFullName());
        guide.setEmail(user.getEmail());
        guide.setPhone(user.getPhone());
        guide.setProfilePhoto(user.getProfilePhoto());
        guide.setInitials(initials(user.getFullName()));
        if (!newGuide && "Unavailable".equalsIgnoreCase(guide.getStatus())) {
            guide.setStatus("Available");
        }
        guideRepository.save(guide);
    }

    private String initials(String fullName) {
        if (fullName == null || fullName.isBlank()) return "TG";
        return java.util.Arrays.stream(fullName.trim().split("\\s+"))
                .filter(part -> !part.isBlank())
                .limit(2)
                .map(part -> part.substring(0, 1).toUpperCase(Locale.ROOT))
                .reduce("", String::concat);
    }

    private StakeholderResponse response(AppUser user) {
        Role role = user.getRoles().stream().findFirst().orElse(null);
        String status = user.getAccountStatus() == null || user.getAccountStatus().isBlank()
                ? (user.isActive() ? "Active" : "Pending Invitation") : user.getAccountStatus();
        return new StakeholderResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(),
                user.getStakeholderType() == null || user.getStakeholderType().isBlank() ? "Other" : user.getStakeholderType(), role == null ? null : role.getId(),
                role == null ? "No access profile" : role.getRoleName(), status, user.getCreatedAt());
    }
}
