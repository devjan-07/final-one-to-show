package com.voyara.tourguide.users;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stakeholder/profile")
public class StakeholderProfileController {
    private final StakeholderProfileService service;

    public StakeholderProfileController(StakeholderProfileService service) {
        this.service = service;
    }

    @GetMapping
    public StakeholderProfileResponse get(Authentication authentication) {
        return service.get(authentication.getName());
    }

    @PutMapping
    public StakeholderProfileResponse update(Authentication authentication, @Valid @RequestBody StakeholderProfileUpdateRequest request) {
        return service.update(authentication.getName(), request);
    }
}
