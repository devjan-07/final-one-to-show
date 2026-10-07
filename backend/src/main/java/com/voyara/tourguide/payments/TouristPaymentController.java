package com.voyara.tourguide.payments;

import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.bookings.BookingService;
import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.users.AppUserRepository;
import java.security.Principal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tourist/bookings/{bookingId}/payment")
public class TouristPaymentController {
    private final BookingService bookingService;
    private final PaymentService paymentService;
    private final AppUserRepository userRepository;
    private final boolean securityEnabled;

    public TouristPaymentController(BookingService bookingService, PaymentService paymentService,
                                    AppUserRepository userRepository,
                                    @Value("${app.security.enabled:true}") boolean securityEnabled) {
        this.bookingService = bookingService;
        this.paymentService = paymentService;
        this.userRepository = userRepository;
        this.securityEnabled = securityEnabled;
    }

    @GetMapping
    public Payment get(@PathVariable String bookingId, Principal principal) {
        Booking booking = authorizedBooking(bookingId, principal);
        return paymentService.findForBooking(booking);
    }

    @PostMapping
    public Payment pay(@PathVariable String bookingId, @RequestBody DemoPaymentRequest request, Principal principal) {
        Booking booking = authorizedBooking(bookingId, principal);
        return paymentService.pay(booking, request);
    }

    @GetMapping("/options")
    public java.util.Map<String, Boolean> options(@PathVariable String bookingId, Principal principal) {
        authorizedBooking(bookingId, principal);
        return java.util.Map.of("demoEnabled", paymentService.isDemoEnabled());
    }

    private Booking authorizedBooking(String bookingId, Principal principal) {
        if (securityEnabled && principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            return bookingService.findTouristBooking(principal.getName(), bookingId);
        }
        if (securityEnabled) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return bookingService.findById(bookingId);
    }
}
