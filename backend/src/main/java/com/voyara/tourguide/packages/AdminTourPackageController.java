package com.voyara.tourguide.packages;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/packages")
public class AdminTourPackageController {
    private final TourPackageService service;

    public AdminTourPackageController(TourPackageService service) {
        this.service = service;
    }

    @GetMapping
    public List<TourPackage> all() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public TourPackage one(@PathVariable Long id) {
        return service.findById(id);
    }
}
