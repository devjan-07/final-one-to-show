package com.voyara.tourguide.bookings.strategy;

import com.voyara.tourguide.bookings.Booking;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CustomBookingStrategy implements BookingStrategy {
    @Override
    public String bookingType() {
        return "CUSTOM";
    }

    @Override
    public BigDecimal validateAndCalculate(
            Booking booking,
            String updatingId,
            boolean strictCustomerBooking,
            int days
    ) {
        if (strictCustomerBooking
                && (booking.getDestination() == null || booking.getDestination().isBlank())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Destination is required");
        }
        return BigDecimal.ZERO;
    }
}
