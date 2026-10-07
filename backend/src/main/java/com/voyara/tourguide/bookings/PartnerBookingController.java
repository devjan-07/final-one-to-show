package com.voyara.tourguide.bookings;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stakeholder/accommodation-bookings")
@PreAuthorize("hasRole('HOTEL_PARTNER')")
public class PartnerBookingController {
    private final BookingService service;

    public PartnerBookingController(BookingService service) { this.service = service; }

    @GetMapping
    public List<Booking> all(Authentication authentication) {
        return service.findHotelPartnerBookings(authentication.getName());
    }
}
