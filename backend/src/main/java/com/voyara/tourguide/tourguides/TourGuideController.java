package com.voyara.tourguide.tourguides;

import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tour-guides")
public class TourGuideController {
    private final TourGuideService service;

    public TourGuideController(TourGuideService service) {
        this.service = service;
    }

    @GetMapping
    public List<TourGuide> all(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String location
    ) {
        return service.findPublicAvailable(checkIn, checkOut, language, location);
    }

    @GetMapping("/{id}")
    public TourGuide one(@PathVariable Long id) {
        return service.findPublicById(id);
    }
}
