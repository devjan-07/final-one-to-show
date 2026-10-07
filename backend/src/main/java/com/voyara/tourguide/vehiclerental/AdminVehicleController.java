package com.voyara.tourguide.vehiclerental;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/vehicles")
public class AdminVehicleController {
    private final VehicleService service;
    public AdminVehicleController(VehicleService service) { this.service = service; }
    @GetMapping public List<VehicleResponse> all() { return service.findAll().stream().map(VehicleResponse::from).toList(); }
    @PostMapping public VehicleResponse create(@Valid @RequestBody VehicleRequest request) { return VehicleResponse.from(service.save(request.toEntity())); }
    @PutMapping("/{id}") public VehicleResponse update(@PathVariable Long id, @Valid @RequestBody VehicleRequest request) { return VehicleResponse.from(service.update(id, request.toEntity())); }
    @PatchMapping("/{id}/owner") public VehicleResponse owner(@PathVariable Long id, @Valid @RequestBody VehicleOwnerRequest request) { return VehicleResponse.from(service.reassignOwner(id, request.ownerUserId())); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { service.delete(id); }
}
