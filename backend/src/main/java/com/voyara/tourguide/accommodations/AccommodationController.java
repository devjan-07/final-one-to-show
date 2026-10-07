package com.voyara.tourguide.accommodations;

import java.util.List;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/accommodations")
public class AccommodationController {
    private final AccommodationService service;

    public AccommodationController(AccommodationService service) {
        this.service = service;
    }

    @GetMapping
    public List<AccommodationResponse> all(
            @RequestParam(required = false) Long destinationId,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam(required = false) Integer rooms
    ) {
        return service.findPublicAvailable(destinationId, destination, checkIn, checkOut, rooms).stream()
                .map(accommodation -> AccommodationResponse.from(accommodation,
                        service.availableRoomsFor(accommodation, checkIn, checkOut)))
                .toList();
    }

    @GetMapping("/{id}")
    public AccommodationResponse one(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    ) {
        Accommodation accommodation = service.findPublicById(id);
        service.validateAvailabilityDates(checkIn, checkOut);
        return AccommodationResponse.from(accommodation, service.availableRoomsFor(accommodation, checkIn, checkOut));
    }
}
