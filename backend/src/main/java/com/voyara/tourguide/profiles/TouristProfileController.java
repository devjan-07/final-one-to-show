package com.voyara.tourguide.profiles;

import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.users.AppUserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.security.Principal;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tourist/profile")
public class TouristProfileController {
    private final AppUserRepository userRepository;
    private final TouristProfileRepository profileRepository;
    private final boolean securityEnabled;

    public TouristProfileController(AppUserRepository userRepository, TouristProfileRepository profileRepository,
                                    @Value("${app.security.enabled:true}") boolean securityEnabled) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.securityEnabled = securityEnabled;
    }

    @GetMapping
    public ProfileResponse get(Principal principal) {
        AppUser user = currentUser(principal);
        TouristProfile profile = profileRepository.findById(user.getId()).orElse(null);
        return response(user, profile);
    }

    @PutMapping
    public ProfileResponse update(@Valid @RequestBody UpdateProfileRequest request, Principal principal) {
        AppUser user = currentUser(principal);
        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone());
        userRepository.save(user);

        TouristProfile profile = profileRepository.findById(user.getId()).orElseGet(TouristProfile::new);
        profile.setUser(user);
        profile.setNationality(request.nationality());
        profile.setPassportNumber(request.passportNumber());
        profile.setPreferences(request.preferences());
        profile.setLanguages(request.languages() == null ? List.of() : request.languages());
        profileRepository.save(profile);
        return response(user, profile);
    }

    private ProfileResponse response(AppUser user, TouristProfile profile) {
        return new ProfileResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(),
                profile == null ? null : profile.getNationality(),
                profile == null ? null : profile.getPassportNumber(),
                profile == null ? null : profile.getPreferences(),
                profile == null ? List.of() : profile.getLanguages());
    }

    private AppUser currentUser(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            if (!securityEnabled) return userRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No local user exists"));
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return userRepository.findByEmailIgnoreCase(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }

    public record ProfileResponse(Long id, String fullName, String email, String phone, String nationality,
                                  String passportNumber, String preferences, List<String> languages) {}

    public record UpdateProfileRequest(@NotBlank String fullName, String phone, String nationality,
                                       String passportNumber, String preferences, List<String> languages) {}
}
