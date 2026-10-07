package com.voyara.tourguide.accommodations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.bookings.BookingRepository;
import com.voyara.tourguide.destinations.Destination;
import com.voyara.tourguide.destinations.DestinationRepository;
import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.users.AppUserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AccommodationServiceTest {
    @Mock AccommodationRepository repository;
    @Mock DestinationRepository destinationRepository;
    @Mock BookingRepository bookingRepository;
    @Mock AppUserRepository userRepository;
    AccommodationService service;

    @BeforeEach
    void setUp() {
        service = new AccommodationService(repository, destinationRepository, bookingRepository, userRepository);
    }

    @Test
    void partnerCannotUpdateAnotherPartnersProperty() {
        AppUser actor = user(1L, "a@voyara.com");
        Accommodation existing = validAccommodation();
        existing.setId(10L);
        existing.setOwner(user(2L, "b@voyara.com"));
        when(userRepository.findByEmailIgnoreCase(actor.getEmail())).thenReturn(Optional.of(actor));
        when(destinationRepository.existsById(5L)).thenReturn(true);
        when(repository.findById(10L)).thenReturn(Optional.of(existing));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.updateOwned(actor.getEmail(), 10L, validAccommodation()));
        assertEquals(403, error.getStatusCode().value());
    }

    @Test
    void publicCatalogRequestsOnlyActiveProperties() {
        Accommodation active = validAccommodation();
        active.setStatus("Active");
        when(repository.findByStatusIgnoreCase("Active")).thenReturn(List.of(active));
        assertEquals(List.of(active), service.findPublic());
        verify(repository).findByStatusIgnoreCase("Active");
    }

    @Test
    void responseIncludesRoomsAvailableAfterOccupancy() {
        Accommodation active = validAccommodation();
        active.setRooms(10);
        active.setOccupancy(3);

        assertEquals(7, AccommodationResponse.from(active).availableRooms());
    }

    @Test
    void publicAvailabilitySearchExcludesOverbookedProperties() {
        LocalDate checkIn = LocalDate.now().plusDays(3);
        LocalDate checkOut = LocalDate.now().plusDays(5);
        Accommodation active = validAccommodation();
        active.setId(10L);
        active.setRooms(2);
        active.setOccupancy(1);
        active.setStatus("Active");
        Booking existing = new Booking();
        existing.setId("BK-OLD");
        existing.setAccommodationId(10L);
        existing.setAccommodationSelectionType("VOYARA");
        existing.setCheckIn(checkIn);
        existing.setCheckOut(checkOut);
        existing.setRooms(1);

        when(repository.findByStatusIgnoreCase("Active")).thenReturn(List.of(active));
        when(bookingRepository.findOverlapping(checkIn, checkOut)).thenReturn(List.of(existing));

        assertEquals(List.of(), service.findPublicAvailable(null, null, checkIn, checkOut, 1));
    }

    @Test
    void availableRoomsForDatesSubtractsOverlappingBookings() {
        LocalDate checkIn = LocalDate.now().plusDays(3);
        LocalDate checkOut = LocalDate.now().plusDays(5);
        Accommodation active = validAccommodation();
        active.setId(10L);
        active.setRooms(5);
        active.setOccupancy(1);
        Booking existing = new Booking();
        existing.setId("BK-OLD");
        existing.setAccommodationId(10L);
        existing.setAccommodationSelectionType("VOYARA");
        existing.setCheckIn(checkIn);
        existing.setCheckOut(checkOut);
        existing.setRooms(2);

        when(bookingRepository.findOverlapping(checkIn, checkOut)).thenReturn(List.of(existing));

        assertEquals(2, service.availableRoomsFor(active, checkIn, checkOut));
    }

    @Test
    void destinationNameSearchAllowsReasonablePartialMatches() {
        Destination destination = new Destination();
        destination.setId(5L);
        destination.setName("Ella Highlands");
        Accommodation active = validAccommodation();
        active.setStatus("Active");
        when(destinationRepository.findAll()).thenReturn(List.of(destination));
        when(repository.findAll()).thenReturn(List.of(active));

        assertEquals(List.of(active), service.findByDestination(null, "Ella"));
    }

    @Test
    void destinationIdSearchAlsoIncludesLocationMatches() {
        Destination destination = new Destination();
        destination.setId(5L);
        destination.setName("Ella");
        Accommodation linked = validAccommodation();
        linked.setId(10L);
        linked.setDestinationId(5L);
        linked.setStatus("Active");
        Accommodation locationMatched = validAccommodation();
        locationMatched.setId(11L);
        locationMatched.setDestinationId(null);
        locationMatched.setLocation("Ella");
        locationMatched.setStatus("Active");
        when(repository.findByDestinationId(5L)).thenReturn(List.of(linked));
        when(destinationRepository.findById(5L)).thenReturn(Optional.of(destination));
        when(repository.findByLocationContainingIgnoreCase("Ella")).thenReturn(List.of(locationMatched));

        assertEquals(List.of(linked, locationMatched), service.findByDestination(5L, null));
    }

    @Test
    void destinationIdLocationFallbackStillExcludesInactiveProperties() {
        Destination destination = new Destination();
        destination.setId(5L);
        destination.setName("Ella");
        Accommodation inactive = validAccommodation();
        inactive.setId(11L);
        inactive.setDestinationId(null);
        inactive.setLocation("Ella");
        inactive.setStatus("Inactive");
        when(repository.findByDestinationId(5L)).thenReturn(List.of());
        when(destinationRepository.findById(5L)).thenReturn(Optional.of(destination));
        when(repository.findByLocationContainingIgnoreCase("Ella")).thenReturn(List.of(inactive));

        assertEquals(List.of(), service.findByDestination(5L, null));
    }

    @Test
    void destinationIdLocationFallbackIgnoresPropertiesLinkedElsewhere() {
        Destination destination = new Destination();
        destination.setId(5L);
        destination.setName("Ella");
        Accommodation linkedElsewhere = validAccommodation();
        linkedElsewhere.setId(11L);
        linkedElsewhere.setDestinationId(99L);
        linkedElsewhere.setLocation("Ella");
        linkedElsewhere.setStatus("Active");
        when(repository.findByDestinationId(5L)).thenReturn(List.of());
        when(destinationRepository.findById(5L)).thenReturn(Optional.of(destination));
        when(repository.findByLocationContainingIgnoreCase("Ella")).thenReturn(List.of(linkedElsewhere));

        assertEquals(List.of(), service.findByDestination(5L, null));
    }

    @Test
    void partnerCannotSelfApproveProperty() {
        AppUser owner = user(1L, "partner@voyara.com");
        Accommodation request = validAccommodation();
        request.setStatus("Active");
        when(userRepository.findByEmailIgnoreCase(owner.getEmail())).thenReturn(Optional.of(owner));
        when(destinationRepository.existsById(5L)).thenReturn(true);
        when(repository.save(request)).thenReturn(request);
        assertEquals("Pending Approval", service.saveOwned(owner.getEmail(), request).getStatus());
    }

    @Test
    void invalidDestinationIsRejected() {
        Accommodation request = validAccommodation();
        when(destinationRepository.existsById(5L)).thenReturn(false);
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.save(request));
        assertEquals(400, error.getStatusCode().value());
        verify(repository, never()).save(request);
    }

    @Test
    void deleteRemovesAccommodationWithoutBookingHistory() {
        Accommodation existing = validAccommodation();
        existing.setId(10L);
        when(repository.findById(10L)).thenReturn(Optional.of(existing));
        service.delete(10L);
        verify(repository).delete(existing);
    }

    @Test
    void deleteRejectsAccommodationWithBookingHistory() {
        Accommodation existing = validAccommodation();
        existing.setId(10L);
        when(repository.findById(10L)).thenReturn(Optional.of(existing));
        when(bookingRepository.existsByAccommodationResourceId(10L)).thenReturn(true);
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.delete(10L));
        assertEquals(409, error.getStatusCode().value());
        verify(repository, never()).delete(existing);
    }

    private Accommodation validAccommodation() {
        Accommodation value = new Accommodation();
        value.setName("Test Hotel");
        value.setType("Hotel");
        value.setDestinationId(5L);
        value.setLocation("Ella");
        value.setCountry("Sri Lanka");
        value.setPrice(new BigDecimal("100.00"));
        value.setRooms(10);
        value.setOccupancy(0);
        value.setImage("https://example.com/hotel.jpg");
        value.setAmenities(List.of());
        return value;
    }

    private AppUser user(Long id, String email) {
        AppUser value = new AppUser();
        value.setId(id);
        value.setEmail(email);
        return value;
    }
}
