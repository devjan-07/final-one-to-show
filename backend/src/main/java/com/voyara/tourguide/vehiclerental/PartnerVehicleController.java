package com.voyara.tourguide.vehiclerental;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stakeholder/vehicles")
@PreAuthorize("hasRole('TRANSPORT_PROVIDER')")
public class PartnerVehicleController {
    private final VehicleService service;
    public PartnerVehicleController(VehicleService service) { this.service = service; }
    @GetMapping public List<VehicleResponse> all(Authentication auth) { return service.findOwned(auth.getName()).stream().map(VehicleResponse::from).toList(); }
    @PostMapping public VehicleResponse create(Authentication auth, @Valid @RequestBody VehicleRequest request) { return VehicleResponse.from(service.saveOwned(auth.getName(), request.toEntity())); }
    @PutMapping("/{id}") public VehicleResponse update(Authentication auth, @PathVariable Long id, @Valid @RequestBody VehicleRequest request) { return VehicleResponse.from(service.updateOwned(auth.getName(), id, request.toEntity())); }
    @DeleteMapping("/{id}") public void delete(Authentication auth, @PathVariable Long id) { service.deleteOwned(auth.getName(), id); }
}
