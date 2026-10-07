package com.voyara.tourguide.bookings;

import jakarta.validation.constraints.Min;
import java.time.LocalDate;

public record TouristBookingRequest(
        String bookingType,
        Long packageId,
        String languagePreference,
        String destination,
        String guideSelectionType,
        Long guideId,
        String accommodationSelectionType,
        Long accommodationId,
        String roomType,
        String vehicleSelectionType,
        Long vehicleId,
        String pickupLocation,
        String pickupTime,
        String returnLocation,
        String returnTime,
        Boolean driverRequired,
        Integer luggageCount,
        LocalDate checkIn,
        LocalDate checkOut,
        @Min(value = 1, message = "Guest count must be at least 1") Integer guests,
        @Min(value = 1, message = "Room count must be at least 1") Integer rooms,
        String notes
) {
}
