package com.voyara.tourguide.bookings;

import java.math.BigDecimal;

public record BookingQuoteResponse(
        BigDecimal total,
        String bookingType,
        int rooms,
        int guests,
        int nights
) {
}
