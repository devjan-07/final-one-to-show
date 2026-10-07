package com.voyara.tourguide.tourguides;

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
@RequestMapping("/api/admin/tour-guides")
public class AdminTourGuideController {
    private final TourGuideService service;

    public AdminTourGuideController(TourGuideService service) {
        this.service = service;
    }

    @GetMapping
    public List<TourGuide> all() {
        return service.findAll();
    }

    @PostMapping
    public TourGuide create(@Valid @RequestBody TourGuide guide) {
        return service.save(guide);
    }

    @PutMapping("/{id}")
    public TourGuide update(@PathVariable Long id, @Valid @RequestBody TourGuide guide) {
        return service.update(id, guide);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
