package com.voyara.tourguide.bookings.strategy;

import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.packages.TourPackage;
import com.voyara.tourguide.packages.TourPackageRepository;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class PackageBookingStrategy implements BookingStrategy {
    private final TourPackageRepository packageRepository;

    public PackageBookingStrategy(TourPackageRepository packageRepository) {
        this.packageRepository = packageRepository;
    }

    @Override
    public String bookingType() {
        return "PACKAGE";
    }

    @Override
    public BigDecimal validateAndCalculate(
            Booking booking,
            String updatingId,
            boolean strictCustomerBooking,
            int days
    ) {
        if (booking.getPackageId() == null) {
            if (strictCustomerBooking) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "A package booking requires a valid package"
                );
            }
            return BigDecimal.ZERO;
        }

        TourPackage tourPackage = packageRepository.findById(booking.getPackageId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Selected package was not found"));

        if (!"Active".equalsIgnoreCase(tourPackage.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Package is not available for booking");
        }

        if (tourPackage.getMaxGroup() > 0 && booking.getGuests() > tourPackage.getMaxGroup()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Guest count exceeds the selected package maximum group size");
        }

        booking.setTourPackage(tourPackage);
        booking.setPkg(tourPackage.getName());

        if (booking.getDestination() == null || booking.getDestination().isBlank()) {
            booking.setDestination(String.join(", ", tourPackage.getDestinations()));
        }

        BigDecimal price = tourPackage.getPrice() == null
                ? BigDecimal.ZERO
                : tourPackage.getPrice();

        return price.multiply(BigDecimal.valueOf(booking.getGuests()));
    }
}
