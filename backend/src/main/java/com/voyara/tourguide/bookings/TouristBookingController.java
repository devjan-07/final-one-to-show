package com.voyara.tourguide.bookings;

import java.security.Principal;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tourist/bookings")
public class TouristBookingController {
    private final BookingService bookingService;
    private final boolean securityEnabled;

    public TouristBookingController(
            BookingService bookingService,
            @Value("${app.security.enabled:true}") boolean securityEnabled
    ) {
        this.bookingService = bookingService;
        this.securityEnabled = securityEnabled;
    }

    @GetMapping
    public List<Booking> myBookings(Principal principal) {
        if (!securityEnabled && !hasPrincipal(principal)) {
            return bookingService.findAll();
        }
        return bookingService.findTouristBookings(currentEmail(principal));
    }

    @GetMapping("/{id}")
    public Booking myBooking(@PathVariable String id, Principal principal) {
        if (!securityEnabled && !hasPrincipal(principal)) {
            return bookingService.findById(id);
        }
        return bookingService.findTouristBooking(currentEmail(principal), id);
    }

    @PostMapping
    public Booking create(@Valid @RequestBody TouristBookingRequest request, Principal principal) {
        if (!securityEnabled && !hasPrincipal(principal)) {
            return bookingService.createTouristBooking(request);
        }
        return bookingService.createTouristBooking(currentEmail(principal), request);
    }

    @PostMapping("/quote")
    public BookingQuoteResponse quote(@Valid @RequestBody TouristBookingRequest request) {
        return bookingService.quoteTouristBooking(request);
    }

    @PatchMapping("/{id}/cancel")
    public Booking cancel(@PathVariable String id, Principal principal) {
        if (!securityEnabled && !hasPrincipal(principal)) {
            return bookingService.cancelBooking(id);
        }
        return bookingService.cancelTouristBooking(currentEmail(principal), id);
    }

    private boolean hasPrincipal(Principal principal) {
        return principal != null && principal.getName() != null && !principal.getName().isBlank();
    }

    private String currentEmail(Principal principal) {
        if (!hasPrincipal(principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return principal.getName();
    }
}
