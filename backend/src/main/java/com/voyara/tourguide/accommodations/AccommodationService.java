package com.voyara.tourguide.accommodations;

import com.voyara.tourguide.common.ResourceNotFoundException;
import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.bookings.BookingRepository;
import com.voyara.tourguide.destinations.Destination;
import com.voyara.tourguide.destinations.DestinationRepository;
import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.users.AppUserRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.time.LocalDate;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccommodationService {
    private final AccommodationRepository repository;
    private final DestinationRepository destinationRepository;
    private final BookingRepository bookingRepository;
    private final AppUserRepository userRepository;

    public AccommodationService(AccommodationRepository repository, DestinationRepository destinationRepository,
                                BookingRepository bookingRepository, AppUserRepository userRepository) {
        this.repository = repository;
        this.destinationRepository = destinationRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<Accommodation> findAll() {
        List<Accommodation> accommodations = repository.findAll();
        accommodations.forEach(this::initializeCollections);
        return accommodations;
    }

    @Transactional(readOnly = true)
    public List<Accommodation> findPublic() {
        List<Accommodation> accommodations = repository.findByStatusIgnoreCase("Active");
        accommodations.forEach(this::initializeCollections);
        return accommodations;
    }

    @Transactional(readOnly = true)
    public List<Accommodation> findPublicAvailable(Long destinationId, String destination,
                                                   LocalDate checkIn, LocalDate checkOut, Integer rooms) {
        List<Accommodation> accommodations = (destinationId != null || (destination != null && !destination.isBlank()))
                ? findByDestination(destinationId, destination)
                : findPublic();
        int requestedRooms = rooms == null ? 1 : Math.max(1, rooms);
        if (checkIn != null || checkOut != null) {
            validateAvailabilityDates(checkIn, checkOut);
            accommodations = accommodations.stream()
                    .filter(accommodation -> hasRoomsAvailable(accommodation, checkIn, checkOut, requestedRooms, null))
                    .toList();
        } else {
            accommodations = accommodations.stream()
                    .filter(accommodation -> availableRooms(accommodation) >= requestedRooms)
                    .toList();
        }
        accommodations.forEach(this::initializeCollections);
        return accommodations;
    }

    @Transactional(readOnly = true)
    public List<Accommodation> findByDestination(Long destinationId, String destination) {
        List<Accommodation> accommodations;
        if (destinationId != null) {
            accommodations = findByDestinationIdOrName(destinationId);
        } else if (destination != null && !destination.isBlank()) {
            accommodations = findByDestinationName(destination);
        } else {
            accommodations = repository.findAll();
        }
        accommodations = accommodations.stream()
                .filter(item -> "Active".equalsIgnoreCase(item.getStatus()))
                .toList();
        accommodations.forEach(this::initializeCollections);
        return accommodations;
    }

    @Transactional(readOnly = true)
    public Accommodation findById(Long id) {
        Accommodation accommodation = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Accommodation", id));
        initializeCollections(accommodation);
        return accommodation;
    }

    @Transactional(readOnly = true)
    public Accommodation findPublicById(Long id) {
        Accommodation accommodation = findById(id);
        if (!"Active".equalsIgnoreCase(accommodation.getStatus())) {
            throw new ResourceNotFoundException("Accommodation", id);
        }
        return accommodation;
    }

    public void validateAvailabilityDates(LocalDate checkIn, LocalDate checkOut) {
        if ((checkIn == null && checkOut == null)) {
            return;
        }
        if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check-in and check-out dates are required for availability search");
        }
    }

    @Transactional(readOnly = true)
    public int availableRoomsFor(Accommodation accommodation, LocalDate checkIn, LocalDate checkOut) {
        int available = availableRooms(accommodation);
        if (checkIn == null || checkOut == null) {
            return available;
        }
        return Math.max(0, available - bookedAccommodationRooms(accommodation.getId(), checkIn, checkOut, null));
    }

    @Transactional(readOnly = true)
    public List<Accommodation> findOwned(String email) {
        AppUser owner = requireUser(email);
        List<Accommodation> accommodations = repository.findByOwnerIdOrderByIdDesc(owner.getId());
        accommodations.forEach(this::initializeCollections);
        return accommodations;
    }

    @Transactional
    public Accommodation saveOwned(String email, Accommodation accommodation) {
        AppUser owner = requireUser(email);
        validateAccommodation(accommodation);
        accommodation.setId(null);
        accommodation.setOwner(owner);
        accommodation.setStatus("Pending Approval");
        accommodation.setRating(0.0);
        accommodation.setReviews(0);
        accommodation.setOccupancy(0);
        Accommodation saved = repository.save(accommodation);
        initializeCollections(saved);
        return saved;
    }

    @Transactional
    public Accommodation updateOwned(String email, Long id, Accommodation accommodation) {
        AppUser owner = requireUser(email);
        validateAccommodation(accommodation);
        Accommodation existing = requireOwned(owner.getId(), id);
        copyEditableFields(existing, accommodation);
        existing.setStatus("Pending Approval");
        initializeCollections(existing);
        return existing;
    }

    @Transactional
    public void deleteOwned(String email, Long id) {
        AppUser owner = requireUser(email);
        Accommodation accommodation = requireOwned(owner.getId(), id);
        deleteIfUnused(accommodation);
    }

    @Transactional
    public Accommodation save(Accommodation accommodation) {
        validateAccommodation(accommodation);
        accommodation.setRating(0.0);
        accommodation.setReviews(0);
        Accommodation saved = repository.save(accommodation);
        initializeCollections(saved);
        return saved;
    }

    @Transactional
    public Accommodation update(Long id, Accommodation accommodation) {
        validateAccommodation(accommodation);
        Accommodation existing = repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Accommodation", id));

        copyEditableFields(existing, accommodation);
        existing.setStatus(accommodation.getStatus());
        existing.setOccupancy(accommodation.getOccupancy());

        initializeCollections(existing);
        return existing;
    }

    @Transactional
    public void delete(Long id) {
        Accommodation accommodation = findById(id);
        deleteIfUnused(accommodation);
    }

    @Transactional
    public Accommodation reassignOwner(Long id, Long ownerUserId) {
        Accommodation accommodation = findById(id);
        if (ownerUserId == null) {
            accommodation.setOwner(null);
            return accommodation;
        }
        AppUser owner = userRepository.findById(ownerUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hotel partner account not found"));
        boolean hotelPartner = owner.getRoles().stream()
                .anyMatch(role -> "HOTEL_PARTNER".equalsIgnoreCase(role.getRoleName()));
        if (!hotelPartner) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected account is not a hotel partner");
        }
        accommodation.setOwner(owner);
        return accommodation;
    }

    private void deleteIfUnused(Accommodation accommodation) {
        if (bookingRepository.existsByAccommodationResourceId(accommodation.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This accommodation has booking history and cannot be deleted. Set its status to Inactive instead.");
        }
        repository.delete(accommodation);
    }

    private void initializeCollections(Accommodation accommodation) {
        if (accommodation.getAmenities() != null) {
            accommodation.getAmenities().size();
        }
    }

    private boolean hasRoomsAvailable(Accommodation accommodation, LocalDate checkIn, LocalDate checkOut,
                                      int requestedRooms, String updatingBookingId) {
        return bookedAccommodationRooms(accommodation.getId(), checkIn, checkOut, updatingBookingId) + requestedRooms <= availableRooms(accommodation);
    }

    private int bookedAccommodationRooms(Long accommodationId, LocalDate checkIn, LocalDate checkOut, String updatingBookingId) {
        java.util.TreeMap<LocalDate, Integer> changes = new java.util.TreeMap<>();
        bookingRepository.findOverlapping(checkIn, checkOut).stream()
                .filter(existing -> !Objects.equals(existing.getId(), updatingBookingId))
                .filter(existing -> Objects.equals(accommodationId, existing.getAccommodationId()))
                .filter(existing -> !"OWN".equalsIgnoreCase(existing.getAccommodationSelectionType()))
                .forEach(existing -> {
                    LocalDate start = existing.getCheckIn().isBefore(checkIn) ? checkIn : existing.getCheckIn();
                    LocalDate end = existing.getCheckOut().isAfter(checkOut) ? checkOut : existing.getCheckOut();
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

    private int availableRooms(Accommodation accommodation) {
        return Math.max(0, accommodation.getRooms() - accommodation.getOccupancy());
    }

    private List<Accommodation> findByDestinationName(String destination) {
        String normalized = destination.trim();
        String normalizedSearch = normalizeDestinationName(normalized);
        List<Destination> destinations = destinationRepository.findAll().stream()
                .filter(item -> matchesDestinationName(item.getName(), normalizedSearch))
                .toList();
        if (!destinations.isEmpty()) {
            List<Long> destinationIds = destinations.stream().map(Destination::getId).toList();
            List<Accommodation> byStructuredDestination = repository.findAll().stream()
                    .filter(item -> item.getDestinationId() != null && destinationIds.contains(item.getDestinationId()))
                    .toList();
            if (!byStructuredDestination.isEmpty()) {
                return byStructuredDestination;
            }
        }
        return repository.findByLocationContainingIgnoreCase(normalized);
    }

    private List<Accommodation> findByDestinationIdOrName(Long destinationId) {
        LinkedHashMap<Long, Accommodation> matches = new LinkedHashMap<>();
        repository.findByDestinationId(destinationId)
                .forEach(item -> matches.put(item.getId(), item));
        destinationRepository.findById(destinationId)
                .map(Destination::getName)
                .filter(name -> !name.isBlank())
                .map(this::findByLocationName)
                .ifPresent(items -> items.stream()
                        .filter(item -> item.getDestinationId() == null)
                        .forEach(item -> matches.putIfAbsent(item.getId(), item)));
        return new ArrayList<>(matches.values());
    }

    private List<Accommodation> findByLocationName(String destination) {
        return repository.findByLocationContainingIgnoreCase(destination.trim());
    }

    private boolean matchesDestinationName(String destinationName, String normalizedSearch) {
        if (destinationName == null || normalizedSearch.isBlank()) {
            return false;
        }
        String normalizedName = normalizeDestinationName(destinationName);
        return normalizedName.equals(normalizedSearch)
                || normalizedName.contains(normalizedSearch)
                || normalizedSearch.contains(normalizedName);
    }

    private String normalizeDestinationName(String value) {
        return value == null ? "" : value.toLowerCase(java.util.Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim()
                .replaceAll("\\s+", " ");
    }

    private void validateDestination(Long destinationId) {
        if (destinationId == null || !destinationRepository.existsById(destinationId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a valid destination");
        }
    }

    private void validateAccommodation(Accommodation accommodation) {
        validateDestination(accommodation.getDestinationId());
        if (accommodation.getPrice() == null || accommodation.getPrice().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price must be greater than zero");
        }
        if (accommodation.getRooms() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Room count must be at least one");
        }
        if (accommodation.getOccupancy() < 0 || accommodation.getOccupancy() > accommodation.getRooms()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Occupancy must be between zero and the room count");
        }
    }

    private AppUser requireUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }

    private Accommodation requireOwned(Long ownerUserId, Long accommodationId) {
        Accommodation accommodation = repository.findById(accommodationId)
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation", accommodationId));
        if (accommodation.getOwner() == null || !ownerUserId.equals(accommodation.getOwner().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only manage your own accommodations");
        }
        return accommodation;
    }

    private void copyEditableFields(Accommodation target, Accommodation source) {
        target.setName(source.getName());
        target.setType(source.getType());
        target.setDestinationId(source.getDestinationId());
        target.setLocation(source.getLocation());
        target.setCountry(source.getCountry());
        target.setPrice(source.getPrice());
        target.setRooms(source.getRooms());
        target.setImage(source.getImage());
        target.getAmenities().clear();
        if (source.getAmenities() != null) {
            target.getAmenities().addAll(new ArrayList<>(source.getAmenities()));
        }
    }
}
