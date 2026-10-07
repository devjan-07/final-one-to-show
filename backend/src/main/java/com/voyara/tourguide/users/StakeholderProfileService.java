package com.voyara.tourguide.users;

import com.voyara.tourguide.tourguides.TourGuideRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StakeholderProfileService {
    private final AppUserRepository userRepository;
    private final TourGuideRepository guideRepository;

    public StakeholderProfileService(AppUserRepository userRepository, TourGuideRepository guideRepository) {
        this.userRepository = userRepository;
        this.guideRepository = guideRepository;
    }

    @Transactional(readOnly = true)
    public StakeholderProfileResponse get(String email) {
        return response(findUser(email));
    }

    @Transactional
    public StakeholderProfileResponse update(String email, StakeholderProfileUpdateRequest request) {
        AppUser user = findUser(email);
        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone() == null ? "" : request.phone().trim());
        user.setProfilePhoto(request.profilePhoto());
        AppUser saved = userRepository.save(user);
        guideRepository.findByUserId(saved.getId()).ifPresent(guide -> {
            guide.setName(saved.getFullName());
            guide.setEmail(saved.getEmail());
            guide.setPhone(saved.getPhone());
            guide.setProfilePhoto(saved.getProfilePhoto());
            guideRepository.save(guide);
        });
        return response(saved);
    }

    private AppUser findUser(String email) {
        return userRepository.findByEmailIgnoreCase(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Stakeholder profile not found"));
    }

    private StakeholderProfileResponse response(AppUser user) {
        List<String> roles = user.getRoles().stream().map(Role::getRoleName).sorted(Comparator.naturalOrder()).toList();
        String status = user.getAccountStatus() == null || user.getAccountStatus().isBlank()
                ? (user.isActive() ? "Active" : "Pending Invitation") : user.getAccountStatus();
        return new StakeholderProfileResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), user.getProfilePhoto(),
                user.getStakeholderType(), status, roles);
    }
}
