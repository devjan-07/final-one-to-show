package com.voyara.tourguide.vehiclerental;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.users.AppUserRepository;
import com.voyara.tourguide.bookings.BookingRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class VehicleServiceTest {
    @Mock VehicleRepository repository;
    @Mock AppUserRepository userRepository;
    @Mock BookingRepository bookingRepository;
    VehicleService service;

    @BeforeEach void setUp() { service = new VehicleService(repository, userRepository, bookingRepository); }

    @Test void providerCannotUpdateAnotherProvidersVehicle() {
        AppUser actor = user(1L, "a@voyara.com"); Vehicle existing = validVehicle();
        existing.setId(10L); existing.setOwner(user(2L, "b@voyara.com"));
        when(userRepository.findByEmailIgnoreCase(actor.getEmail())).thenReturn(Optional.of(actor));
        when(repository.findById(10L)).thenReturn(Optional.of(existing));
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.updateOwned(actor.getEmail(), 10L, validVehicle()));
        assertEquals(403, error.getStatusCode().value());
    }

    @Test void publicCatalogContainsOnlyAvailableVehicles() {
        Vehicle available = validVehicle(); when(repository.findByStatusIgnoreCase("Available")).thenReturn(List.of(available));
        assertEquals(List.of(available), service.findPublic());
    }

    @Test void providerCannotSelfApproveVehicle() {
        AppUser owner = user(1L, "provider@voyara.com"); Vehicle request = validVehicle(); request.setStatus("Available");
        when(userRepository.findByEmailIgnoreCase(owner.getEmail())).thenReturn(Optional.of(owner));
        when(repository.save(request)).thenReturn(request);
        assertEquals("Pending Approval", service.saveOwned(owner.getEmail(), request).getStatus());
    }

    @Test void duplicatePlateIsRejected() {
        Vehicle request = validVehicle(); when(repository.existsByPlateIgnoreCase(request.getPlate())).thenReturn(true);
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.save(request));
        assertEquals(409, error.getStatusCode().value()); verify(repository, never()).save(request);
    }

    @Test void longImageUrlIsAccepted() {
        Vehicle request = validVehicle();
        request.setImage("https://images.example.com/vehicles/zonda-r/gallery/" + "a".repeat(500) + ".jpg?auto=format&fit=crop&w=1600&q=80");
        when(repository.save(request)).thenReturn(request);
        assertEquals(request, service.save(request));
        verify(repository).save(request);
    }

    @Test void invalidImageUrlIsRejectedBeforeSave() {
        Vehicle request = validVehicle(); request.setImage("not an image url");
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.save(request));
        assertEquals(400, error.getStatusCode().value()); verify(repository, never()).save(request);
    }

    @Test void unusedVehicleIsPermanentlyDeleted() {
        Vehicle existing = validVehicle(); existing.setId(10L); when(repository.findById(10L)).thenReturn(Optional.of(existing));
        service.delete(10L); verify(repository).delete(existing);
    }

    @Test void vehicleWithBookingHistoryCannotBeDeleted() {
        Vehicle existing = validVehicle(); existing.setId(10L); when(repository.findById(10L)).thenReturn(Optional.of(existing));
        when(bookingRepository.existsByVehicleResourceId(10L)).thenReturn(true);
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.delete(10L));
        assertEquals(409, error.getStatusCode().value()); verify(repository, never()).delete(existing);
    }

    private Vehicle validVehicle() {
        Vehicle value = new Vehicle(); value.setName("Test Van"); value.setBrand("Toyota"); value.setModel("Hiace");
        value.setYear(2024); value.setType("Van"); value.setCapacity(10); value.setPricePerDay(new BigDecimal("100"));
        value.setStatus("Available"); value.setTransmission("Automatic"); value.setFuel("Diesel"); value.setFeatures(List.of());
        value.setLocation("Colombo"); value.setImage("https://example.com/van.jpg"); value.setMileage(1000); value.setPlate("WP-TEST-1"); return value;
    }
    private AppUser user(Long id, String email) { AppUser value = new AppUser(); value.setId(id); value.setEmail(email); return value; }
}
