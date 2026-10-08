package com.voyara.tourguide.bookings.strategy;

import com.voyara.tourguide.bookings.Booking;
import java.math.BigDecimal;

public interface BookingStrategy {
    String bookingType();

    BigDecimal validateAndCalculate(
            Booking booking,
            String updatingId,
            boolean strictCustomerBooking,
            int days
    );
}
