package com.voyara.tourguide.tourguides;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stakeholder/guide-profile")
public class StakeholderTourGuideController {
    private final TourGuideService service;

    public StakeholderTourGuideController(TourGuideService service) {
        this.service = service;
    }

    @GetMapping
    public TourGuide one(Authentication authentication) {
        return service.findOwned(authentication.getName());
    }

    @PutMapping
    public TourGuide update(Authentication authentication, @Valid @RequestBody TourGuide guide) {
        return service.updateOwned(authentication.getName(), guide);
    }
}
