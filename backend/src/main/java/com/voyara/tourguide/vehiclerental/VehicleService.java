package com.voyara.tourguide.vehiclerental;

import com.voyara.tourguide.common.ResourceNotFoundException;
import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.bookings.BookingRepository;
import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.users.AppUserRepository;
import java.time.LocalDate;
import java.time.Year;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VehicleService {
    private final VehicleRepository repository;
    private final AppUserRepository userRepository;
    private final BookingRepository bookingRepository;

    public VehicleService(VehicleRepository repository, AppUserRepository userRepository,
                          BookingRepository bookingRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
    }

    @Transactional(readOnly = true)
    public List<Vehicle> findAll() { return initialize(repository.findAll()); }
    @Transactional(readOnly = true)
    public List<Vehicle> findPublic() { return initialize(repository.findByStatusIgnoreCase("Available")); }
    @Transactional(readOnly = true)
    public List<Vehicle> findPublicAvailable(LocalDate checkIn, LocalDate checkOut, Integer guests) {
        validateAvailabilityDates(checkIn, checkOut);
        int requestedGuests = guests == null ? 1 : Math.max(1, guests);
        List<Vehicle> vehicles = findPublic().stream()
                .filter(vehicle -> vehicle.getCapacity() >= requestedGuests)
                .toList();
        if (checkIn == null) {
            return initialize(vehicles);
        }
        List<Booking> overlapping = bookingRepository.findOverlapping(checkIn, checkOut);
        return initialize(vehicles.stream()
                .filter(vehicle -> overlapping.stream().noneMatch(booking -> sameBookedVehicle(vehicle, booking)))
                .toList());
    }
    @Transactional(readOnly = true)
    public Vehicle findById(Long id) {
        Vehicle value = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Vehicle", id));
        value.getFeatures().size(); return value;
    }
    @Transactional(readOnly = true)
    public Vehicle findPublicById(Long id) {
        Vehicle value = findById(id);
        if (!"Available".equalsIgnoreCase(value.getStatus())) throw new ResourceNotFoundException("Vehicle", id);
        return value;
    }
    @Transactional(readOnly = true)
    public List<Vehicle> findOwned(String email) { return initialize(repository.findByOwnerIdOrderByIdDesc(requireUser(email).getId())); }

    @Transactional
    public Vehicle save(Vehicle vehicle) { validate(vehicle, null); vehicle.setRating(0); vehicle.setReviews(0); return repository.save(vehicle); }
    @Transactional
    public Vehicle saveOwned(String email, Vehicle vehicle) {
        validate(vehicle, null); vehicle.setId(null); vehicle.setOwner(requireUser(email));
        vehicle.setStatus("Pending Approval"); vehicle.setRating(0); vehicle.setReviews(0); return repository.save(vehicle);
    }
    @Transactional
    public Vehicle update(Long id, Vehicle input) {
        validate(input, id); Vehicle existing = findById(id); copyEditable(existing, input); existing.setStatus(input.getStatus()); return existing;
    }
    @Transactional
    public Vehicle updateOwned(String email, Long id, Vehicle input) {
        validate(input, id); Vehicle existing = requireOwned(requireUser(email).getId(), id);
        copyEditable(existing, input); existing.setStatus("Pending Approval"); return existing;
    }
    @Transactional
    public void delete(Long id) { deleteIfUnused(findById(id)); }
    @Transactional
    public void deleteOwned(String email, Long id) { deleteIfUnused(requireOwned(requireUser(email).getId(), id)); }
    @Transactional
    public Vehicle reassignOwner(Long id, Long ownerUserId) {
        Vehicle vehicle = findById(id);
        AppUser owner = userRepository.findById(ownerUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transport provider account not found"));
        boolean provider = owner.getRoles().stream().anyMatch(role -> "TRANSPORT_PROVIDER".equalsIgnoreCase(role.getRoleName()));
        if (!provider) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected account is not a transport provider");
        vehicle.setOwner(owner); return vehicle;
    }

    private void validateAvailabilityDates(LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null && checkOut == null) return;
        if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check-in and check-out dates are required for availability search");
        }
    }

    private boolean sameBookedVehicle(Vehicle vehicle, Booking booking) {
        return Objects.equals(vehicle.getId(), booking.getVehicleId())
                && !"OWN".equalsIgnoreCase(booking.getVehicleSelectionType())
                && !"Cancelled".equalsIgnoreCase(booking.getStatus());
    }

    private void validate(Vehicle value, Long updatingId) {
        if (value.getYear() > Year.now().getValue() + 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Model year cannot be in the future");
        if (value.getPricePerDay() == null || value.getPricePerDay().signum() <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Daily price must be greater than zero");
        validateImageUrl(value.getImage());
        boolean duplicate = updatingId == null ? repository.existsByPlateIgnoreCase(value.getPlate()) : repository.existsByPlateIgnoreCaseAndIdNot(value.getPlate(), updatingId);
        if (duplicate) throw new ResponseStatusException(HttpStatus.CONFLICT, "Registration plate is already registered");
    }
    private void validateImageUrl(String image) {
        if (image == null || image.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image URL is required");
        try {
            URI uri = new URI(image.trim());
            String scheme = uri.getScheme();
            if (uri.getHost() == null || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image must be a valid URL");
            }
        } catch (URISyntaxException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image must be a valid URL");
        }
    }
    private AppUser requireUser(String email) {
        return userRepository.findByEmailIgnoreCase(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }
    private Vehicle requireOwned(Long ownerId, Long id) {
        Vehicle value = findById(id);
        if (value.getOwner() == null || !ownerId.equals(value.getOwner().getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only manage your own vehicles");
        return value;
    }
    private void deleteIfUnused(Vehicle vehicle) {
        if (bookingRepository.existsByVehicleResourceId(vehicle.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This vehicle has booking history and cannot be permanently deleted. Set its status to Inactive instead.");
        }
        repository.delete(vehicle);
    }
    private void copyEditable(Vehicle target, Vehicle source) {
        target.setName(source.getName()); target.setBrand(source.getBrand()); target.setModel(source.getModel()); target.setYear(source.getYear());
        target.setType(source.getType()); target.setCapacity(source.getCapacity()); target.setPricePerDay(source.getPricePerDay());
        target.setTransmission(source.getTransmission()); target.setFuel(source.getFuel()); target.setLocation(source.getLocation());
        target.setImage(source.getImage()); target.setMileage(source.getMileage()); target.setPlate(source.getPlate());
        target.getFeatures().clear(); target.getFeatures().addAll(new ArrayList<>(source.getFeatures()));
    }
    private List<Vehicle> initialize(List<Vehicle> values) { values.forEach(value -> value.getFeatures().size()); return values; }
}
