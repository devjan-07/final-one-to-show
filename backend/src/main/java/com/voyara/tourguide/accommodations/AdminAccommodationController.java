package com.voyara.tourguide.accommodations;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/accommodations")
public class AdminAccommodationController {
    private final AccommodationService service;

    public AdminAccommodationController(AccommodationService service) {
        this.service = service;
    }

    @GetMapping
    public List<AccommodationResponse> all() { return service.findAll().stream().map(AccommodationResponse::from).toList(); }

    @PostMapping
    public AccommodationResponse create(@Valid @RequestBody AccommodationRequest request) {
        return AccommodationResponse.from(service.save(request.toEntity()));
    }

    @PutMapping("/{id}")
    public AccommodationResponse update(@PathVariable Long id, @Valid @RequestBody AccommodationRequest request) {
        return AccommodationResponse.from(service.update(id, request.toEntity()));
    }

    @PatchMapping("/{id}/owner")
    public AccommodationResponse reassignOwner(@PathVariable Long id, @Valid @RequestBody AccommodationOwnerRequest request) {
        return AccommodationResponse.from(service.reassignOwner(id, request.ownerUserId()));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.delete(id); }
}
