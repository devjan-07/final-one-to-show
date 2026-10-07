package com.voyara.tourguide.accommodations;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stakeholder/accommodations")
@PreAuthorize("hasRole('HOTEL_PARTNER')")
public class PartnerAccommodationController {
    private final AccommodationService service;

    public PartnerAccommodationController(AccommodationService service) {
        this.service = service;
    }

    @GetMapping
    public List<AccommodationResponse> all(Authentication authentication) {
        return service.findOwned(authentication.getName()).stream().map(AccommodationResponse::from).toList();
    }

    @PostMapping
    public AccommodationResponse create(Authentication authentication, @Valid @RequestBody AccommodationRequest request) {
        return AccommodationResponse.from(service.saveOwned(authentication.getName(), request.toEntity()));
    }

    @PutMapping("/{id}")
    public AccommodationResponse update(Authentication authentication, @PathVariable Long id,
                                @Valid @RequestBody AccommodationRequest request) {
        return AccommodationResponse.from(service.updateOwned(authentication.getName(), id, request.toEntity()));
    }

    @DeleteMapping("/{id}")
    public void delete(Authentication authentication, @PathVariable Long id) {
        service.deleteOwned(authentication.getName(), id);
    }
}
