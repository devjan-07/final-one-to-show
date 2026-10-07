package com.voyara.tourguide.config;

import com.voyara.tourguide.bookings.BookingService;
import com.voyara.tourguide.users.AppUserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class BookingOwnershipBackfill implements CommandLineRunner {
    private final AppUserRepository userRepository;
    private final BookingService bookingService;

    public BookingOwnershipBackfill(AppUserRepository userRepository, BookingService bookingService) {
        this.userRepository = userRepository;
        this.bookingService = bookingService;
    }

    @Override
    public void run(String... args) {
        userRepository.findAll().forEach(bookingService::backfillTouristOwnershipFor);
    }
}
