package com.voyara.tourguide.bookings;

import com.voyara.tourguide.accommodations.*;
import com.voyara.tourguide.vehiclerental.*;
import com.voyara.tourguide.notifications.NotificationService;
import com.voyara.tourguide.reviews.ReviewRatingService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:booking_concurrency;MODE=MSSQLServer;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect", "spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(BookingService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ConcurrentBookingTest {
    @Autowired BookingService service;
    @Autowired VehicleRepository vehicles;
    @Autowired AccommodationRepository accommodations;
    @MockBean NotificationService notifications;
    @MockBean ReviewRatingService ratings;

    @Test void simultaneousVehicleRequestsAllowOnlyOneReservation() throws Exception {
        Vehicle vehicle = new Vehicle(); vehicle.setName("Concurrent vehicle"); vehicle.setPlate("TST-1234");
        vehicle.setCapacity(4); vehicle.setPricePerDay(BigDecimal.TEN); vehicle.setStatus("Available");
        Long id = vehicles.saveAndFlush(vehicle).getId();
        assertSingleWinner(() -> { Booking b = booking(); b.setVehicleSelectionType("VOYARA"); b.setVehicleId(id); return service.create(b); });
    }

    @Test void simultaneousRequestsCannotReserveTheLastRoomTwice() throws Exception {
        Accommodation accommodation = new Accommodation(); accommodation.setName("One room hotel");
        accommodation.setRooms(1); accommodation.setPrice(BigDecimal.TEN); accommodation.setStatus("Active");
        Long id = accommodations.saveAndFlush(accommodation).getId();
        assertSingleWinner(() -> { Booking b = booking(); b.setAccommodationSelectionType("VOYARA"); b.setAccommodationId(id); return service.create(b); });
    }

    Booking booking() {
        Booking b = new Booking(); b.setGuest("Concurrent tourist"); b.setBookingType("CUSTOM");
        b.setGuideSelectionType("OWN"); b.setAccommodationSelectionType("OWN"); b.setVehicleSelectionType("OWN");
        b.setCheckIn(LocalDate.now().plusDays(10)); b.setCheckOut(LocalDate.now().plusDays(12));
        return b;
    }

    void assertSingleWinner(Callable<Booking> create) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<Boolean> attempt = () -> {
            ready.countDown();
            if (!start.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Start timed out");
            try { create.call(); return true; }
            catch (ResponseStatusException ex) {
                assertEquals(409, ex.getStatusCode().value());
                return false;
            }
        };
        try {
            List<Future<Boolean>> results = List.of(executor.submit(attempt), executor.submit(attempt));
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();
            int successes = 0;
            for (Future<Boolean> result : results) if (result.get(20, TimeUnit.SECONDS)) successes++;
            assertEquals(1, successes);
        } finally { start.countDown(); executor.shutdownNow(); }
    }
}
