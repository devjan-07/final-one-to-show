package com.voyara.tourguide.bookings.strategy;

import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.vehiclerental.Vehicle;
import com.voyara.tourguide.vehiclerental.VehicleRepository;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class VehicleBookingStrategy implements BookingStrategy {
    private final VehicleRepository vehicleRepository;

    public VehicleBookingStrategy(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }

    @Override
    public String bookingType() {
        return "VEHICLE";
    }

    @Override
    public BigDecimal validateAndCalculate(
            Booking booking,
            String updatingId,
            boolean strictCustomerBooking,
            int days
    ) {
        if (booking.getVehicleId() == null) {
            if (strictCustomerBooking) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "A vehicle booking requires a valid vehicle");
            }
            return BigDecimal.ZERO;
        }

        Vehicle vehicle = vehicleRepository.findLockedById(booking.getVehicleId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Selected vehicle was not found"));

        if (!"Available".equalsIgnoreCase(vehicle.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Vehicle is not available for booking");
        }

        if (booking.getGuests() > vehicle.getCapacity()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Passenger count exceeds the selected vehicle capacity");
        }

        if (booking.getLuggageCount() > vehicle.getLuggageCapacity()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Luggage count exceeds the selected vehicle capacity");
        }

        if (strictCustomerBooking) {
            requireText(booking.getPickupLocation(), "Pickup location is required");
            requireText(booking.getPickupTime(), "Pickup time is required");
            requireText(booking.getReturnLocation(), "Return location is required");
            requireText(booking.getReturnTime(), "Return time is required");
        }

        booking.setVehicleResource(vehicle);
        booking.setVehicle(label(vehicle.getName(), vehicle.getBrand(), vehicle.getModel()));
        booking.setDestination(booking.getPickupLocation());

        BigDecimal price = vehicle.getPricePerDay() == null
                ? BigDecimal.ZERO
                : vehicle.getPricePerDay();

        return price.multiply(BigDecimal.valueOf(days));
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private String label(String... values) {
        return String.join(" · ", java.util.Arrays.stream(values)
                .filter(value -> value != null && !value.isBlank())
                .toList());
    }
}
