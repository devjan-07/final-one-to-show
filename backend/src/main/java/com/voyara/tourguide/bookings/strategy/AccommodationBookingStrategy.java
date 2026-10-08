package com.voyara.tourguide.bookings.strategy;

import com.voyara.tourguide.accommodations.Accommodation;
import com.voyara.tourguide.accommodations.AccommodationRepository;
import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.bookings.BookingRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AccommodationBookingStrategy implements BookingStrategy {
    private final AccommodationRepository accommodationRepository;
    private final BookingRepository bookingRepository;

    public AccommodationBookingStrategy(
            AccommodationRepository accommodationRepository,
            BookingRepository bookingRepository
    ) {
        this.accommodationRepository = accommodationRepository;
        this.bookingRepository = bookingRepository;
    }

    @Override
    public String bookingType() {
        return "ACCOMMODATION";
    }

    @Override
    public BigDecimal validateAndCalculate(
            Booking booking,
            String updatingId,
            boolean strictCustomerBooking,
            int days
    ) {
        if (booking.getAccommodationId() == null) {
            if (strictCustomerBooking) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "An accommodation booking requires a valid accommodation");
            }
            return BigDecimal.ZERO;
        }

        Accommodation accommodation = accommodationRepository.findLockedById(booking.getAccommodationId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Selected accommodation was not found"));

        if (!"Active".equalsIgnoreCase(accommodation.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Accommodation is not available for booking");
        }

        if (strictCustomerBooking && (booking.getRoomType() == null || booking.getRoomType().isBlank())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Room type is required");
        }

        int requestedRooms = booking.getRooms() == null ? 1 : Math.max(1, booking.getRooms());
        int availableRooms = Math.max(0, accommodation.getRooms() - accommodation.getOccupancy());

        if (requestedRooms > availableRooms) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Requested rooms exceed available rooms at this accommodation");
        }

        int maxGuestsForRooms = roomTypeCapacity(booking.getRoomType()) * requestedRooms;
        if (booking.getGuests() > maxGuestsForRooms) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Guest count exceeds selected room capacity");
        }

        int bookedRooms = bookedAccommodationRooms(booking, updatingId);
        if (bookedRooms + requestedRooms > availableRooms) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "The selected accommodation does not have enough rooms for these dates");
        }

        booking.setAccommodationResource(accommodation);
        booking.setAccommodation(accommodation.getName());

        BigDecimal price = accommodation.getPrice() == null
                ? BigDecimal.ZERO
                : accommodation.getPrice();

        return price
                .multiply(BigDecimal.valueOf(days))
                .multiply(BigDecimal.valueOf(requestedRooms));
    }

    private int bookedAccommodationRooms(Booking candidate, String updatingId) {
        java.util.TreeMap<LocalDate, Integer> changes = new java.util.TreeMap<>();

        bookingRepository.findOverlapping(candidate.getCheckIn(), candidate.getCheckOut()).stream()
                .filter(existing -> !Objects.equals(existing.getId(), updatingId))
                .filter(existing -> Objects.equals(candidate.getAccommodationId(), existing.getAccommodationId()))
                .filter(existing -> !"OWN".equalsIgnoreCase(existing.getAccommodationSelectionType()))
                .forEach(existing -> {
                    LocalDate start = existing.getCheckIn().isBefore(candidate.getCheckIn())
                            ? candidate.getCheckIn() : existing.getCheckIn();
                    LocalDate end = existing.getCheckOut().isAfter(candidate.getCheckOut())
                            ? candidate.getCheckOut() : existing.getCheckOut();
                    changes.merge(start, bookingRooms(existing), Integer::sum);
                    changes.merge(end, -bookingRooms(existing), Integer::sum);
                });

        int current = 0;
        int peak = 0;
        for (int delta : changes.values()) {
            current += delta;
            peak = Math.max(peak, current);
        }
        return peak;
    }

    private int bookingRooms(Booking booking) {
        return booking.getRooms() == null ? 1 : Math.max(1, booking.getRooms());
    }

    private int roomTypeCapacity(String roomType) {
        if (roomType == null) {
            return 2;
        }
        return switch (roomType.trim().toLowerCase()) {
            case "single" -> 1;
            case "family", "suite" -> 4;
            default -> 2;
        };
    }
}
