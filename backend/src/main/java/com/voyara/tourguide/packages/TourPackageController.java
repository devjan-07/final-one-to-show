package com.voyara.tourguide.packages;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/packages")
public class TourPackageController {
    private final TourPackageService service;

    public TourPackageController(TourPackageService service) {
        this.service = service;
    }

    @GetMapping
    public List<TourPackage> all()
    {
        return service.findPublicActive();
    }

    @GetMapping("/{id}")
    public TourPackage one(@PathVariable Long id) {
        return service.findPublicActiveById(id);
    }

    @PostMapping
    public TourPackage create(@Valid @RequestBody TourPackage tourPackage) {
        return service.save(tourPackage);
    }

    @PutMapping("/{id}")
    public TourPackage update(@PathVariable Long id, @Valid @RequestBody TourPackage tourPackage) {
        return service.update(id, tourPackage);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
