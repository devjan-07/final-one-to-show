package com.voyara.tourguide.users;

import com.voyara.tourguide.bookings.*;
import com.voyara.tourguide.payments.PaymentRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TouristHistoryRetentionTest {
    @Test void deletingAccountCannotEraseBookingAndPaymentHistory() {
        AppUserRepository users = mock(AppUserRepository.class);
        BookingRepository bookings = mock(BookingRepository.class);
        PaymentRepository payments = mock(PaymentRepository.class);
        AppUser user = new AppUser(); user.setId(1L);
        Role role = new Role(); role.setRoleName("TOURIST"); user.getRoles().add(role);
        when(users.findById(1L)).thenReturn(Optional.of(user));
        when(bookings.findByTouristId(1L)).thenReturn(List.of(new Booking()));
        TouristAdminService service = new TouristAdminService(users, null, bookings, payments, null, null, null, null);
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class, () -> service.delete(1L)).getStatusCode());
        verify(users, never()).delete(any());
        verify(bookings, never()).deleteAll(any(Iterable.class));
        verifyNoInteractions(payments);
    }
}
