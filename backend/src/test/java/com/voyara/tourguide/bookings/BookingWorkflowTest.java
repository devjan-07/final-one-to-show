package com.voyara.tourguide.bookings;

import com.voyara.tourguide.accommodations.*;
import com.voyara.tourguide.packages.TourPackageRepository;
import com.voyara.tourguide.tourguides.TourGuideRepository;
import com.voyara.tourguide.vehiclerental.VehicleRepository;
import com.voyara.tourguide.users.*;
import com.voyara.tourguide.payments.PaymentRepository;
import com.voyara.tourguide.reviews.*;
import com.voyara.tourguide.notifications.NotificationService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingWorkflowTest {
    @Mock BookingRepository repository;
    @Mock AppUserRepository users;
    @Mock TourPackageRepository packages;
    @Mock TourGuideRepository guides;
    @Mock AccommodationRepository accommodations;
    @Mock VehicleRepository vehicles;
    @Mock PaymentRepository payments;
    @Mock ReviewRepository reviews;
    @Mock ReviewRatingService ratings;
    @Mock NotificationService notifications;
    @InjectMocks BookingService service;

    @BeforeEach void setup() {
        lenient().when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(repository.findOverlapping(any(), any())).thenReturn(List.of());
    }

    Booking booking() {
        Booking b = new Booking();
        b.setId("BK-1");
        b.setGuest("Test Tourist");
        b.setBookingType("CUSTOM");
        b.setGuideSelectionType("OWN");
        b.setAccommodationSelectionType("OWN");
        b.setVehicleSelectionType("OWN");
        b.setCheckIn(LocalDate.now().plusDays(3));
        b.setCheckOut(LocalDate.now().plusDays(5));
        b.setTotal(new BigDecimal("100.00"));
        return b;
    }

    @Test void editingNotesPreservesApprovalsReviewAndBookedPrice() {
        Booking existing = booking();
        existing.setAccommodationProviderStatus("Confirmed");
        existing.setOverallRating(5);
        existing.setOverallReview("Excellent");
        existing.setStatus("Confirmed");
        existing.setPayment("Paid");
        Booking incoming = booking();
        incoming.setStatus("Confirmed");
        incoming.setPayment("Paid");
        incoming.setTotal(BigDecimal.ONE);
        incoming.setNotes("Updated note");
        when(repository.findLockedById("BK-1")).thenReturn(Optional.of(existing));
        Booking saved = service.update("BK-1", incoming);
        assertSame(existing, saved);
        assertEquals("Confirmed", saved.getAccommodationProviderStatus());
        assertEquals(5, saved.getOverallRating());
        assertEquals("Excellent", saved.getOverallReview());
        assertEquals(new BigDecimal("100.00"), saved.getTotal());
        assertEquals("Updated note", saved.getNotes());
    }

    @Test void paidBookingCannotBeRescheduledOrMarkedUnpaid() {
        Booking existing = booking(); existing.setPayment("Paid");
        when(repository.findLockedById("BK-1")).thenReturn(Optional.of(existing));
        assertThrows(ResponseStatusException.class, () -> service.update("BK-1", booking()));
        Booking incoming = booking(); incoming.setPayment("Paid"); incoming.setCheckOut(incoming.getCheckOut().plusDays(1));
        assertThrows(ResponseStatusException.class, () -> service.update("BK-1", incoming));
        verify(repository, never()).save(any());
    }

    @Test void staffCannotCancelPaidBookingThroughGenericUpdate() {
        Booking existing = booking(); existing.setPayment("Paid"); existing.setStatus("Confirmed");
        when(repository.findLockedById("BK-1")).thenReturn(Optional.of(existing));
        Booking incoming = booking(); incoming.setPayment("Paid"); incoming.setStatus("Cancelled");
        assertThrows(ResponseStatusException.class, () -> service.update("BK-1", incoming));
        assertEquals("Confirmed", existing.getStatus());
        verify(repository, never()).save(any());
    }

    @Test void paidBookingCannotBeDeleted() {
        Booking existing = booking(); existing.setPayment("Paid");
        when(repository.findLockedById("BK-1")).thenReturn(Optional.of(existing));
        assertThrows(ResponseStatusException.class, () -> service.delete("BK-1"));
        verify(repository, never()).delete(any());
    }

    @Test void accommodationUsesPeakOccupancyInsteadOfSummingDifferentNights() {
        Accommodation accommodation = new Accommodation();
        accommodation.setId(1L); accommodation.setRooms(2); accommodation.setStatus("Active"); accommodation.setPrice(BigDecimal.TEN);
        when(accommodations.findLockedById(1L)).thenReturn(Optional.of(accommodation));
        Booking candidate = booking(); candidate.setAccommodationSelectionType("VOYARA"); candidate.setAccommodationId(1L);
        Booking firstNight = booking(); firstNight.setId("OLD-1"); firstNight.setAccommodationId(1L);
        firstNight.setCheckOut(candidate.getCheckIn().plusDays(1));
        Booking secondNight = booking(); secondNight.setId("OLD-2"); secondNight.setAccommodationId(1L);
        secondNight.setCheckIn(firstNight.getCheckOut());
        when(repository.findOverlapping(any(), any())).thenReturn(List.of(firstNight, secondNight));
        Booking saved = service.create(candidate);
        assertEquals(new BigDecimal("20"), saved.getTotal());
        assertTrue(saved.getId().matches("BK-[a-f0-9-]{36}"));
        verify(accommodations).findLockedById(1L);
    }

    @Test void quoteUsesSameAccommodationRoomPricingWithoutSaving() {
        Accommodation accommodation = new Accommodation();
        accommodation.setId(1L); accommodation.setRooms(5); accommodation.setStatus("Active"); accommodation.setPrice(BigDecimal.TEN);
        when(accommodations.findLockedById(1L)).thenReturn(Optional.of(accommodation));
        TouristBookingRequest request = new TouristBookingRequest("ACCOMMODATION", null, null, "Ella",
                "OWN", null, "VOYARA", 1L, "Double", "OWN", null,
                null, null, null, null, true, 0,
                LocalDate.now().plusDays(3), LocalDate.now().plusDays(5), 2, 3, "Quote me");

        BookingQuoteResponse quote = service.quoteTouristBooking(request);

        assertEquals(new BigDecimal("60"), quote.total());
        assertEquals("ACCOMMODATION", quote.bookingType());
        assertEquals(3, quote.rooms());
        assertEquals(2, quote.guests());
        assertEquals(2, quote.nights());
        verify(repository, never()).save(any());
        verify(notifications, never()).notifyAdmins(any(), any(), any(), any());
    }

    @Test void accommodationOccupancyReducesAvailableRooms() {
        Accommodation accommodation = new Accommodation();
        accommodation.setId(1L); accommodation.setRooms(2); accommodation.setOccupancy(1); accommodation.setStatus("Active"); accommodation.setPrice(BigDecimal.TEN);
        when(accommodations.findLockedById(1L)).thenReturn(Optional.of(accommodation));
        Booking candidate = booking(); candidate.setAccommodationSelectionType("VOYARA"); candidate.setAccommodationId(1L); candidate.setRooms(2);
        assertThrows(ResponseStatusException.class, () -> service.create(candidate));
        verify(repository, never()).save(any());
    }

    @Test void overlappingRoomsStillRejectOverCapacity() {
        Accommodation accommodation = new Accommodation();
        accommodation.setId(1L); accommodation.setRooms(1); accommodation.setStatus("Active"); accommodation.setPrice(BigDecimal.TEN);
        when(accommodations.findLockedById(1L)).thenReturn(Optional.of(accommodation));
        Booking candidate = booking(); candidate.setAccommodationSelectionType("VOYARA"); candidate.setAccommodationId(1L);
        Booking occupied = booking(); occupied.setId("OLD"); occupied.setAccommodationSelectionType("VOYARA"); occupied.setAccommodationId(1L);
        when(repository.findOverlapping(any(), any())).thenReturn(List.of(occupied));
        assertThrows(ResponseStatusException.class, () -> service.create(candidate));
        verify(repository, never()).save(any());
    }

    @Test void doubleRoomAllowsTwoGuestsPerRoom() {
        when(accommodations.findLockedById(1L)).thenReturn(Optional.of(accommodation(1L, 3)));
        Booking candidate = accommodationBooking(1L, "Double", 1, 2);

        Booking saved = service.create(candidate);

        assertEquals(2, saved.getGuests());
        assertEquals(new BigDecimal("20"), saved.getTotal());
    }

    @Test void doubleRoomRejectsMoreThanTwoGuestsPerRoom() {
        when(accommodations.findLockedById(1L)).thenReturn(Optional.of(accommodation(1L, 3)));
        Booking candidate = accommodationBooking(1L, "Double", 1, 3);

        assertThrows(ResponseStatusException.class, () -> service.create(candidate));
        verify(repository, never()).save(any());
    }

    @Test void twoDoubleRoomsAllowFourGuests() {
        when(accommodations.findLockedById(1L)).thenReturn(Optional.of(accommodation(1L, 3)));
        Booking candidate = accommodationBooking(1L, "Double", 2, 4);

        Booking saved = service.create(candidate);

        assertEquals(4, saved.getGuests());
        assertEquals(2, saved.getRooms());
    }

    @Test void singleRoomRejectsTwoGuests() {
        when(accommodations.findLockedById(1L)).thenReturn(Optional.of(accommodation(1L, 3)));
        Booking candidate = accommodationBooking(1L, "Single", 1, 2);

        assertThrows(ResponseStatusException.class, () -> service.create(candidate));
        verify(repository, never()).save(any());
    }

    @Test void familyRoomAllowsFourGuests() {
        when(accommodations.findLockedById(1L)).thenReturn(Optional.of(accommodation(1L, 3)));
        Booking candidate = accommodationBooking(1L, "Family", 1, 4);

        Booking saved = service.create(candidate);

        assertEquals(4, saved.getGuests());
    }

    @Test void quoteRejectsGuestsOverRoomCapacity() {
        when(accommodations.findLockedById(1L)).thenReturn(Optional.of(accommodation(1L, 3)));
        TouristBookingRequest request = new TouristBookingRequest("ACCOMMODATION", null, null, "Ella",
                "OWN", null, "VOYARA", 1L, "Double", "OWN", null,
                null, null, null, null, true, 0,
                LocalDate.now().plusDays(3), LocalDate.now().plusDays(5), 3, 1, "Too many guests");

        assertThrows(ResponseStatusException.class, () -> service.quoteTouristBooking(request));
        verify(repository, never()).save(any());
    }

    @Test void vehicleBookingAllowsLuggageUpToHalfSeatCapacity() {
        var vehicle = vehicle(1L, 5);
        when(vehicles.findLockedById(1L)).thenReturn(Optional.of(vehicle));
        Booking candidate = vehicleBooking(1L);
        candidate.setGuests(2);
        candidate.setLuggageCount(2);

        Booking saved = service.create(candidate);

        assertEquals(2, saved.getLuggageCount());
        assertEquals(new BigDecimal("20"), saved.getTotal());
    }

    @Test void vehicleBookingRejectsLuggageOverDerivedCapacity() {
        var vehicle = vehicle(1L, 2);
        when(vehicles.findLockedById(1L)).thenReturn(Optional.of(vehicle));
        Booking candidate = vehicleBooking(1L);
        candidate.setGuests(2);
        candidate.setLuggageCount(2);

        assertThrows(ResponseStatusException.class, () -> service.create(candidate));
        verify(repository, never()).save(any());
    }

    @Test void vehicleBookingStillRejectsPassengersOverCapacity() {
        var vehicle = vehicle(1L, 2);
        when(vehicles.findLockedById(1L)).thenReturn(Optional.of(vehicle));
        Booking candidate = vehicleBooking(1L);
        candidate.setGuests(3);
        candidate.setLuggageCount(1);

        assertThrows(ResponseStatusException.class, () -> service.create(candidate));
        verify(repository, never()).save(any());
    }

    private com.voyara.tourguide.vehiclerental.Vehicle vehicle(Long id, int capacity) {
        var vehicle = new com.voyara.tourguide.vehiclerental.Vehicle();
        vehicle.setId(id);
        vehicle.setName("Test Vehicle");
        vehicle.setBrand("Voyara");
        vehicle.setModel("VX");
        vehicle.setStatus("Available");
        vehicle.setCapacity(capacity);
        vehicle.setPricePerDay(BigDecimal.TEN);
        return vehicle;
    }

    private Accommodation accommodation(Long id, int rooms) {
        Accommodation accommodation = new Accommodation();
        accommodation.setId(id);
        accommodation.setName("Test Stay");
        accommodation.setRooms(rooms);
        accommodation.setStatus("Active");
        accommodation.setPrice(BigDecimal.TEN);
        return accommodation;
    }

    private Booking accommodationBooking(Long accommodationId, String roomType, int rooms, int guests) {
        Booking candidate = booking();
        candidate.setBookingType("ACCOMMODATION");
        candidate.setAccommodationSelectionType("VOYARA");
        candidate.setAccommodationId(accommodationId);
        candidate.setRoomType(roomType);
        candidate.setRooms(rooms);
        candidate.setGuests(guests);
        return candidate;
    }

    private Booking vehicleBooking(Long vehicleId) {
        Booking candidate = booking();
        candidate.setBookingType("VEHICLE");
        candidate.setVehicleSelectionType("VOYARA");
        candidate.setVehicleId(vehicleId);
        candidate.setPickupLocation("Colombo");
        candidate.setPickupTime("09:00");
        candidate.setReturnLocation("Colombo");
        candidate.setReturnTime("18:00");
        return candidate;
    }
}
