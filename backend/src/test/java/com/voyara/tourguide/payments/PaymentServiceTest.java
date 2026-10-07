package com.voyara.tourguide.payments;

import com.voyara.tourguide.bookings.*;
import com.voyara.tourguide.notifications.NotificationService;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PaymentServiceTest {
    final PaymentRepository payments = mock(PaymentRepository.class);
    final BookingService bookings = mock(BookingService.class);
    final NotificationService notifications = mock(NotificationService.class);

    PaymentService service(boolean demo, String profile) {
        MockEnvironment environment = new MockEnvironment(); environment.setActiveProfiles(profile);
        return new PaymentService(payments, bookings, notifications, demo, environment);
    }

    DemoPaymentRequest card() {
        return new DemoPaymentRequest("Card", "Voyara Traveler", "4242 4242 4242 4242", "12", "2099", "123");
    }

    Booking booking() {
        Booking booking = new Booking(); booking.setId("BK-1"); booking.setTotal(BigDecimal.TEN);
        when(bookings.findLockedById("BK-1")).thenReturn(Optional.of(booking).orElseThrow());
        return booking;
    }

    @Test void cardPaymentsRequireExplicitFlag() {
        assertTrue(service(true, "production").isDemoEnabled());
        assertFalse(service(false, "dev").isDemoEnabled());
        assertThrows(ResponseStatusException.class, () -> service(false, "dev").pay(new Booking(), card()));
        verifyNoInteractions(payments);
    }

    @Test void pendingBookingIsNotConfirmedByPayment() {
        Booking booking = booking();
        assertThrows(ResponseStatusException.class, () -> service(true, "dev").pay(booking, card()));
        assertEquals("Pending", booking.getStatus());
    }

    @Test void confirmedDemoPaymentPreservesBookingStateAndAmount() {
        Booking booking = booking(); booking.setStatus("Confirmed");
        when(payments.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        Payment payment = service(true, "dev").pay(booking, card());
        assertEquals(BigDecimal.TEN, payment.getAmount());
        assertEquals("Paid", booking.getPayment());
        assertEquals("Confirmed", booking.getStatus());
        assertThrows(ResponseStatusException.class, () -> service(true, "dev").pay(booking, card()));
    }
}
