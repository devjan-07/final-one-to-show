package com.voyara.tourguide.bookings;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stakeholder/vehicle-bookings")
@PreAuthorize("hasRole('TRANSPORT_PROVIDER')")
public class TransportProviderBookingController {
    private final BookingService service;
    public TransportProviderBookingController(BookingService service) { this.service = service; }
    @GetMapping public List<Booking> all(Authentication auth) { return service.findTransportProviderBookings(auth.getName()); }
}
