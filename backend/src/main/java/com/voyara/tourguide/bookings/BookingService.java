package com.voyara.tourguide.bookings;

import com.voyara.tourguide.accommodations.Accommodation;
import com.voyara.tourguide.accommodations.AccommodationRepository;
import com.voyara.tourguide.common.ResourceNotFoundException;
import com.voyara.tourguide.notifications.NotificationService;
import com.voyara.tourguide.payments.PaymentRepository;
import com.voyara.tourguide.packages.TourPackage;
import com.voyara.tourguide.packages.TourPackageRepository;
import com.voyara.tourguide.reviews.ReviewRatingService;
import com.voyara.tourguide.reviews.ReviewRepository;
import com.voyara.tourguide.tourguides.TourGuide;
import com.voyara.tourguide.tourguides.TourGuideRepository;
import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.users.AppUserRepository;
import com.voyara.tourguide.vehiclerental.Vehicle;
import com.voyara.tourguide.vehiclerental.VehicleRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingService {
    private final BookingRepository repository;
    private final AppUserRepository userRepository;
    private final TourPackageRepository packageRepository;
    private final TourGuideRepository guideRepository;
    private final AccommodationRepository accommodationRepository;
    private final VehicleRepository vehicleRepository;
    private final PaymentRepository paymentRepository;
    private final ReviewRepository reviewRepository;
    private final ReviewRatingService reviewRatingService;
    private final NotificationService notificationService;

    public BookingService(
            BookingRepository repository,
            AppUserRepository userRepository,
            TourPackageRepository packageRepository,
            TourGuideRepository guideRepository,
            AccommodationRepository accommodationRepository,
            VehicleRepository vehicleRepository,
            PaymentRepository paymentRepository,
            ReviewRepository reviewRepository,
            ReviewRatingService reviewRatingService,
            NotificationService notificationService
    ) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.packageRepository = packageRepository;
        this.guideRepository = guideRepository;
        this.accommodationRepository = accommodationRepository;
        this.vehicleRepository = vehicleRepository;
        this.paymentRepository = paymentRepository;
        this.reviewRepository = reviewRepository;
        this.reviewRatingService = reviewRatingService;
        this.notificationService = notificationService;
    }

    public List<Booking> findAll() {
        return repository.findAll();
    }

    public List<Booking> findByGuestEmail(String email) {
        return repository.findByEmailIgnoreCaseOrderByCreatedAtDesc(email);
    }

    @Transactional(readOnly = true)
    public List<Booking> findTouristBookings(String email) {
        AppUser tourist = findUser(email);
        return repository.findByTouristIdOrderByCreatedAtDesc(tourist.getId());
    }

    @Transactional(readOnly = true)
    public List<Booking> findHotelPartnerBookings(String email) {
        AppUser partner = findUser(email);
        return repository.findByAccommodationResourceOwnerIdOrderByCreatedAtDesc(partner.getId());
    }

    @Transactional(readOnly = true)
    public List<Booking> findTransportProviderBookings(String email) {
        return repository.findByVehicleResourceOwnerIdOrderByCreatedAtDesc(findUser(email).getId());
    }

    @Transactional(readOnly = true)
    public Booking findTouristBooking(String email, String id) {
        AppUser tourist = findUser(email);
        Booking booking = findById(id);
        if (booking.getTourist() == null || !booking.getTourist().getId().equals(tourist.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        return booking;
    }

    @Transactional
    public Booking cancelTouristBooking(String email, String id) {
        Booking booking = findLockedById(id);
        if (booking.getTourist() == null || !booking.getTourist().getId().equals(findUser(email).getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        return cancelBookingRecord(booking, "Cancelled by tourist on " + LocalDate.now());
    }

    @Transactional
    public Booking cancelBooking(String id) {
        Booking booking = findLockedById(id);
        return cancelBookingRecord(booking, "Cancelled on " + LocalDate.now());
    }

    private Booking cancelBookingRecord(Booking booking, String note) {
        if (!"Pending".equals(booking.getStatus()) && !"Confirmed".equals(booking.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This booking cannot be cancelled");
        }
        if ("Paid".equalsIgnoreCase(booking.getPayment())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Paid bookings cannot be cancelled without a refund process");
        }
        booking.setStatus("Cancelled");
        booking.setNotes(appendNote(booking.getNotes(), note));
        Booking saved = repository.save(booking);
        notificationService.notifyBookingUser(saved, "Booking cancelled",
                "Your booking " + saved.getId() + " has been cancelled.", "BOOKING_CANCELLED");
        notificationService.notifyAssignedGuide(saved, "Trip cancelled",
                "Assigned booking " + saved.getId() + " has been cancelled.", "BOOKING_CANCELLED");
        notificationService.notifyAdmins("Booking cancelled",
                saved.getId() + " for " + saved.getGuest() + " was cancelled.", "BOOKING_CANCELLED", saved.getId());
        return saved;
    }

    @Transactional
    public Booking createTouristBooking(String email, TouristBookingRequest request) {
        AppUser tourist = findUser(email);
        Booking booking = toBooking(request);
        booking.setTourist(tourist);
        booking.setGuest(tourist.getFullName());
        booking.setEmail(tourist.getEmail());
        booking.setStatus("Confirmed");
        booking.setPayment("Pending");
        Booking saved = createCustomerBooking(booking);
        notifyBookingCreated(saved);
        return saved;
    }

    @Transactional
    public Booking createTouristBooking(TouristBookingRequest request) {
        Booking booking = toBooking(request);
        booking.setGuest("Voyara Tourist");
        booking.setStatus("Confirmed");
        booking.setPayment("Pending");
        Booking saved = createCustomerBooking(booking);
        notifyBookingCreated(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public BookingQuoteResponse quoteTouristBooking(TouristBookingRequest request) {
        Booking booking = toBooking(request);
        booking.setStatus("Pending");
        booking.setPayment("Pending");
        validateAndPriceBooking(booking, null, true);
        return new BookingQuoteResponse(
                booking.getTotal(),
                booking.getBookingType(),
                bookingRooms(booking),
                booking.getGuests(),
                bookingDays(booking)
        );
    }

    public Booking findById(String id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Booking", id));
    }

    @Transactional
    public Booking saveExisting(Booking booking) {
        return repository.save(booking);
    }

    @Transactional
    public Booking create(Booking booking) {
        booking.setId(null);
        booking.setStatus("Confirmed");
        booking.setPayment("Pending");
        booking.setAccommodationProviderStatus(null);
        booking.setVehicleProviderStatus(null);
        booking.setOverallRating(null);
        booking.setOverallRatingDescription(null);
        booking.setOverallReview(null);
        Booking saved = saveNewBooking(booking, false);
        notifyBookingCreated(saved);
        return saved;
    }

    private Booking createCustomerBooking(Booking booking) {
        return saveNewBooking(booking, true);
    }

    private Booking toBooking(TouristBookingRequest request) {
        Booking booking = new Booking();
        booking.setBookingType(request.bookingType());
        booking.setPackageId(request.packageId());
        booking.setLanguagePreference(request.languagePreference());
        booking.setDestination(request.destination());
        booking.setGuideSelectionType(request.guideSelectionType());
        booking.setGuideId(request.guideId());
        booking.setAccommodationSelectionType(request.accommodationSelectionType());
        booking.setAccommodationId(request.accommodationId());
        booking.setRoomType(request.roomType());
        booking.setVehicleSelectionType(request.vehicleSelectionType());
        booking.setVehicleId(request.vehicleId());
        booking.setPickupLocation(request.pickupLocation());
        booking.setPickupTime(request.pickupTime());
        booking.setReturnLocation(request.returnLocation());
        booking.setReturnTime(request.returnTime());
        booking.setDriverRequired(request.driverRequired());
        booking.setLuggageCount(request.luggageCount());
        booking.setCheckIn(request.checkIn());
        booking.setCheckOut(request.checkOut());
        booking.setGuests(request.guests() == null ? 1 : request.guests());
        booking.setRooms(request.rooms());
        booking.setNotes(request.notes());
        return booking;
    }

    private Booking saveNewBooking(Booking booking, boolean strictCustomerBooking) {
        if (booking.getId() == null || booking.getId().isBlank()) {
            booking.setId("BK-" + java.util.UUID.randomUUID());
        }
        if (booking.getBookingType() == null || booking.getBookingType().isBlank()) {
            booking.setBookingType("PACKAGE");
        }
        if (booking.getCreatedAt() == null) {
            booking.setCreatedAt(LocalDate.now());
        }
        validateAndPriceBooking(booking, null, strictCustomerBooking);
        assignTouristByEmailIfPossible(booking);
        return repository.save(booking);
    }

    @Transactional
    public Booking findLockedById(String id) {
        return repository.findLockedById(id).orElseThrow(() -> new ResourceNotFoundException("Booking", id));
    }

    @Transactional
    public Booking update(String id, Booking request) {
        Booking existing = findLockedById(id);
        String previousStatus = existing.getStatus();
        String nextStatus = request.getStatus();
        if (!List.of("Pending", "Confirmed", "Cancelled", "Completed").contains(nextStatus == null ? "" : nextStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported booking status");
        }
        if (!Objects.equals(existing.getPayment(), request.getPayment())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment status can only change through the payment workflow");
        }
        boolean changed = priceOrInventoryChanged(existing, request);
        if (("Cancelled".equals(previousStatus) || "Completed".equals(previousStatus))
                && (changed || !previousStatus.equals(nextStatus))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Finalized bookings cannot be reopened or rescheduled");
        }
        if (changed && ("Paid".equals(existing.getPayment()) || !"Pending".equals(previousStatus))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only unpaid pending bookings can be rescheduled");
        }
        if ("Cancelled".equals(nextStatus) && !"Cancelled".equals(previousStatus)) {
            if (changed) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancel separately from changes to the reservation");
            return cancelBookingRecord(existing, "Cancelled by staff on " + LocalDate.now());
        }
        if ("Confirmed".equals(previousStatus) && "Pending".equals(nextStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Confirmed bookings cannot return to pending");
        }
        if ("Completed".equals(nextStatus) && !"Completed".equals(previousStatus)
                && (!"Confirmed".equals(previousStatus) || !"Paid".equals(existing.getPayment())
                    || existing.getCheckOut().isAfter(LocalDate.now()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only paid confirmed bookings after checkout can be completed");
        }
        if (changed) {
            request.setStatus("Confirmed");
            nextStatus = "Confirmed";
            validateAndPriceBooking(request, id, false);
            existing.setTotal(request.getTotal());
            existing.setAccommodationProviderStatus(null);
            existing.setVehicleProviderStatus(null);
        }
        existing.setGuest(request.getGuest());
        existing.setEmail(request.getEmail());
        existing.setBookingType(request.getBookingType());
        existing.setLanguagePreference(request.getLanguagePreference());
        existing.setDestination(request.getDestination());
        existing.setPkg(request.getPkg());
        existing.setGuide(request.getGuide());
        existing.setGuideSelectionType(request.getGuideSelectionType());
        existing.setAccommodation(request.getAccommodation());
        existing.setAccommodationSelectionType(request.getAccommodationSelectionType());
        existing.setRoomType(request.getRoomType());
        existing.setVehicle(request.getVehicle());
        existing.setVehicleSelectionType(request.getVehicleSelectionType());
        existing.setPickupLocation(request.getPickupLocation());
        existing.setPickupTime(request.getPickupTime());
        existing.setReturnLocation(request.getReturnLocation());
        existing.setReturnTime(request.getReturnTime());
        existing.setDriverRequired(request.getDriverRequired());
        existing.setLuggageCount(request.getLuggageCount());
        existing.setCheckIn(request.getCheckIn());
        existing.setCheckOut(request.getCheckOut());
        existing.setGuests(request.getGuests());
        existing.setRooms(request.getRooms());
        existing.setNotes(request.getNotes());
        if (changed) {
            existing.setTourGuide(request.getTourGuide());
            existing.setAccommodationResource(request.getAccommodationResource());
            existing.setVehicleResource(request.getVehicleResource());
            existing.setTourPackage(request.getTourPackage());
        }
        existing.setStatus(nextStatus);
        Booking saved = repository.save(existing);
        if (!Objects.equals(previousStatus, nextStatus)) {
            reviewRatingService.refreshBookingResources(saved);
            notificationService.notifyBookingUser(saved, "Booking status updated",
                    "Booking " + id + " is now " + nextStatus + ".", "BOOKING_STATUS");
            notificationService.notifyAssignedGuide(saved, "Trip status updated",
                    "Booking " + id + " is now " + nextStatus + ".", "BOOKING_STATUS");
        }
        return saved;
    }

    private boolean priceOrInventoryChanged(Booking a, Booking b) {
        return !Objects.equals(a.getBookingType(), b.getBookingType())
                || !Objects.equals(a.getPackageId(), b.getPackageId())
                || !Objects.equals(a.getGuideId(), b.getGuideId())
                || !Objects.equals(a.getVehicleId(), b.getVehicleId())
                || !Objects.equals(a.getAccommodationId(), b.getAccommodationId())
                || !Objects.equals(a.getGuideSelectionType(), b.getGuideSelectionType())
                || !Objects.equals(a.getVehicleSelectionType(), b.getVehicleSelectionType())
                || !Objects.equals(a.getAccommodationSelectionType(), b.getAccommodationSelectionType())
                || !Objects.equals(a.getCheckIn(), b.getCheckIn())
                || !Objects.equals(a.getCheckOut(), b.getCheckOut())
                || !Objects.equals(a.getRooms(), b.getRooms())
                || !Objects.equals(a.getRoomType(), b.getRoomType())
                || !Objects.equals(a.getLuggageCount(), b.getLuggageCount())
                || a.getGuests() != b.getGuests();
    }

    @Transactional
    public void delete(String id) {
        Booking booking = findLockedById(id);
        if ("Paid".equals(booking.getPayment()) || paymentRepository.findByBookingId(id).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bookings with payment history cannot be deleted");
        }
        reviewRepository.deleteByBookingId(id);
        repository.delete(booking);
        reviewRatingService.refreshBookingResources(booking);
    }

    @Transactional
    public void backfillTouristOwnershipFor(AppUser user) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        List<Booking> bookings = repository.findByTouristIsNullAndEmailIgnoreCase(user.getEmail());
        bookings.forEach(booking -> booking.setTourist(user));
        repository.saveAll(bookings);
    }

    private AppUser findUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }

    private void assignTouristByEmailIfPossible(Booking booking) {
        if (booking.getTourist() != null || booking.getEmail() == null || booking.getEmail().isBlank()) {
            return;
        }
        userRepository.findByEmailIgnoreCase(booking.getEmail()).ifPresent(booking::setTourist);
    }

    private String appendNote(String existing, String note) {
        if (existing == null || existing.isBlank()) {
            return note;
        }
        return existing + "\n" + note;
    }

    private void notifyBookingCreated(Booking booking) {
        notificationService.notifyBookingUser(booking, "Booking submitted",
                "Your booking " + booking.getId() + " was received and is pending confirmation.", "BOOKING_CREATED");
        notificationService.notifyAssignedGuide(booking, "New trip assignment",
                "You were assigned to booking " + booking.getId() + ".", "BOOKING_CREATED");
        notificationService.notifyAdmins("New booking received",
                booking.getId() + " was created for " + booking.getGuest() + ".", "BOOKING_CREATED", booking.getId());
    }

    private void validateAndPriceBooking(Booking candidate, String updatingId, boolean strictCustomerBooking) {
        normalizeBooking(candidate);
        if (candidate.getCheckIn() == null || candidate.getCheckOut() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check-in and check-out dates are required");
        }
        if (strictCustomerBooking && candidate.getCheckIn().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check-in date cannot be in the past");
        }
        if (!candidate.getCheckOut().isAfter(candidate.getCheckIn())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check-out date must be after check-in date");
        }
        validateBookingType(candidate.getBookingType());
        if ("Cancelled".equalsIgnoreCase(candidate.getStatus())) {
            return;
        }
        validateLinkedResourceSelection(candidate.getGuideSelectionType(), candidate.getGuideId(), "guide");
        validateLinkedResourceSelection(candidate.getAccommodationSelectionType(), candidate.getAccommodationId(), "accommodation");
        validateLinkedResourceSelection(candidate.getVehicleSelectionType(), candidate.getVehicleId(), "vehicle");

        int days = bookingDays(candidate);
        BigDecimal total = BigDecimal.ZERO;
        boolean pricedFromResources = false;

        TourPackage tourPackage = selectedPackage(candidate);
        if (tourPackage != null) {
            validateActive("Package", tourPackage.getStatus(), "Active");
            if (tourPackage.getMaxGroup() > 0 && candidate.getGuests() > tourPackage.getMaxGroup()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Guest count exceeds the selected package maximum group size");
            }
            candidate.setPkg(tourPackage.getName());
            if (candidate.getDestination() == null || candidate.getDestination().isBlank()) {
                candidate.setDestination(String.join(", ", tourPackage.getDestinations()));
            }
            total = total.add(nonNull(tourPackage.getPrice()).multiply(BigDecimal.valueOf(candidate.getGuests())));
            pricedFromResources = true;
        } else if (strictCustomerBooking && "PACKAGE".equalsIgnoreCase(candidate.getBookingType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A package booking requires a valid package");
        }
        if (strictCustomerBooking && "CUSTOM".equalsIgnoreCase(candidate.getBookingType())) {
            requireText(candidate.getDestination(), "Destination is required");
        }

        TourGuide guide = selectedGuide(candidate);
        if (guide != null) {
            validateActive("Tour guide", guide.getStatus(), "Available");
            candidate.setGuide(label(guide.getName(), guide.getLocation()));
            total = total.add(nonNull(guide.getPricePerDay()).multiply(BigDecimal.valueOf(days)));
            pricedFromResources = true;
        }

        Accommodation accommodation = selectedAccommodation(candidate);
        if (accommodation != null) {
            validateActive("Accommodation", accommodation.getStatus(), "Active");
            if (strictCustomerBooking && "ACCOMMODATION".equalsIgnoreCase(candidate.getBookingType())) {
                requireText(candidate.getRoomType(), "Room type is required");
            }
            int requestedRooms = bookingRooms(candidate);
            int availableRooms = availableAccommodationRooms(accommodation);
            if (requestedRooms > availableRooms) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Requested rooms exceed available rooms at this accommodation");
            }
            int maxGuestsForRooms = roomTypeCapacity(candidate.getRoomType()) * requestedRooms;
            if (candidate.getGuests() > maxGuestsForRooms) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guest count exceeds selected room capacity");
            }
            int bookedRooms = bookedAccommodationRooms(candidate, updatingId);
            if (bookedRooms + requestedRooms > availableRooms) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "The selected accommodation does not have enough rooms for these dates");
            }
            candidate.setAccommodation(accommodation.getName());
            total = total.add(nonNull(accommodation.getPrice()).multiply(BigDecimal.valueOf(days)).multiply(BigDecimal.valueOf(requestedRooms)));
            pricedFromResources = true;
        } else if (strictCustomerBooking && "ACCOMMODATION".equalsIgnoreCase(candidate.getBookingType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An accommodation booking requires a valid accommodation");
        }

        Vehicle vehicle = selectedVehicle(candidate);
        if (vehicle != null) {
            validateActive("Vehicle", vehicle.getStatus(), "Available");
            if (candidate.getGuests() > vehicle.getCapacity()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passenger count exceeds the selected vehicle capacity");
            }
            if (candidate.getLuggageCount() > vehicle.getLuggageCapacity()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Luggage count exceeds the selected vehicle capacity");
            }
            candidate.setVehicle(label(vehicle.getName(), vehicle.getBrand(), vehicle.getModel()));
            if ("VEHICLE".equalsIgnoreCase(candidate.getBookingType())) {
                candidate.setDestination(candidate.getPickupLocation());
            }
            total = total.add(nonNull(vehicle.getPricePerDay()).multiply(BigDecimal.valueOf(days)));
            pricedFromResources = true;
        } else if (strictCustomerBooking && "VEHICLE".equalsIgnoreCase(candidate.getBookingType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A vehicle booking requires a valid vehicle");
        }
        if (strictCustomerBooking && vehicle != null && (candidate.getPickupLocation() == null || candidate.getPickupLocation().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pickup location is required");
        }
        if (strictCustomerBooking && vehicle != null) {
            requireText(candidate.getPickupTime(), "Pickup time is required");
            requireText(candidate.getReturnLocation(), "Return location is required");
            requireText(candidate.getReturnTime(), "Return time is required");
        }

        if (strictCustomerBooking && "VEHICLE".equalsIgnoreCase(candidate.getBookingType()) && (candidate.getPickupLocation() == null || candidate.getPickupLocation().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pickup location is required");
        }
        if (strictCustomerBooking && "VEHICLE".equalsIgnoreCase(candidate.getBookingType())) {
            requireText(candidate.getPickupTime(), "Pickup time is required");
            requireText(candidate.getReturnLocation(), "Return location is required");
            requireText(candidate.getReturnTime(), "Return time is required");
        }

        List<Booking> existingBookings = repository.findOverlapping(candidate.getCheckIn(), candidate.getCheckOut());
        boolean conflict = existingBookings.stream()
                .filter(existing -> !Objects.equals(existing.getId(), updatingId))
                .filter(existing -> !"Cancelled".equalsIgnoreCase(existing.getStatus()))
                .filter(existing -> existing.getCheckIn() != null && existing.getCheckOut() != null)
                .filter(existing -> candidate.getCheckIn().isBefore(existing.getCheckOut())
                        && candidate.getCheckOut().isAfter(existing.getCheckIn()))
                .anyMatch(existing -> sameResource(
                                candidate.getGuideSelectionType(), candidate.getGuideId(), candidate.getGuide(),
                                existing.getGuideSelectionType(), existing.getGuideId(), existing.getGuide())
                        || sameResource(
                                candidate.getVehicleSelectionType(), candidate.getVehicleId(), candidate.getVehicle(),
                                existing.getVehicleSelectionType(), existing.getVehicleId(), existing.getVehicle()));

        if (conflict) {
            String message = "VEHICLE".equalsIgnoreCase(candidate.getBookingType())
                    ? "The selected vehicle is unavailable for these dates"
                    : "One of the selected guide or vehicle is unavailable for these dates";
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    message);
        }

        if (strictCustomerBooking || pricedFromResources) {
            candidate.setTotal(total);
        }
    }

    private void normalizeBooking(Booking booking) {
        if ("OWN".equalsIgnoreCase(booking.getGuideSelectionType())) booking.setGuideId(null);
        if ("OWN".equalsIgnoreCase(booking.getAccommodationSelectionType())) booking.setAccommodationId(null);
        if ("OWN".equalsIgnoreCase(booking.getVehicleSelectionType())) booking.setVehicleId(null);
        if (booking.getGuests() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guest count must be at least 1");
        }
        if (booking.getRooms() == null || booking.getRooms() < 1) {
            booking.setRooms(1);
        }
        if (booking.getBookingType() != null) {
            booking.setBookingType(booking.getBookingType().trim().toUpperCase());
        }
        if (booking.getStatus() == null || booking.getStatus().isBlank()) {
            booking.setStatus("Pending");
        }
        if (booking.getPayment() == null || booking.getPayment().isBlank()) {
            booking.setPayment("Pending");
        }
        if ("VEHICLE".equalsIgnoreCase(booking.getBookingType()) && (booking.getPickupLocation() == null || booking.getPickupLocation().isBlank())) {
            booking.setPickupLocation(booking.getDestination());
        }
        if (booking.getReturnLocation() == null || booking.getReturnLocation().isBlank()) {
            booking.setReturnLocation(booking.getPickupLocation());
        }
        if (booking.getDriverRequired() == null) {
            booking.setDriverRequired(true);
        }
        if (booking.getLuggageCount() == null) {
            booking.setLuggageCount(0);
        }
        if (booking.getLuggageCount() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Luggage count cannot be negative");
        }
    }

    private TourPackage selectedPackage(Booking booking) {
        if (booking.getPackageId() == null) {
            return null;
        }
        TourPackage tourPackage = packageRepository.findById(booking.getPackageId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected package was not found"));
        booking.setTourPackage(tourPackage);
        return tourPackage;
    }

    private TourGuide selectedGuide(Booking booking) {
        if ("OWN".equalsIgnoreCase(booking.getGuideSelectionType()) || booking.getGuideId() == null) {
            return null;
        }
        TourGuide guide = guideRepository.findLockedById(booking.getGuideId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected guide was not found"));
        booking.setTourGuide(guide);
        return guide;
    }

    private Accommodation selectedAccommodation(Booking booking) {
        if ("OWN".equalsIgnoreCase(booking.getAccommodationSelectionType()) || booking.getAccommodationId() == null) {
            return null;
        }
        Accommodation accommodation = accommodationRepository.findLockedById(booking.getAccommodationId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected accommodation was not found"));
        booking.setAccommodationResource(accommodation);
        return accommodation;
    }

    private Vehicle selectedVehicle(Booking booking) {
        if ("OWN".equalsIgnoreCase(booking.getVehicleSelectionType()) || booking.getVehicleId() == null) {
            return null;
        }
        Vehicle vehicle = vehicleRepository.findLockedById(booking.getVehicleId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected vehicle was not found"));
        booking.setVehicleResource(vehicle);
        return vehicle;
    }

    private void validateActive(String label, String actual, String expected) {
        if (!expected.equalsIgnoreCase(actual)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " is not available for booking");
        }
    }

    private void validateBookingType(String bookingType) {
        if (!List.of("PACKAGE", "ACCOMMODATION", "VEHICLE", "CUSTOM").contains(bookingType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported booking type");
        }
    }

    private void validateLinkedResourceSelection(String selectionType, Long resourceId, String label) {
        if ("VOYARA".equalsIgnoreCase(selectionType) && resourceId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Select a Voyara " + label + " or choose own " + label);
        }
    }

    private int bookedAccommodationRooms(Booking candidate, String updatingId) {
        java.util.TreeMap<LocalDate, Integer> changes = new java.util.TreeMap<>();
        repository.findOverlapping(candidate.getCheckIn(), candidate.getCheckOut()).stream()
                .filter(existing -> !Objects.equals(existing.getId(), updatingId))
                .filter(existing -> Objects.equals(candidate.getAccommodationId(), existing.getAccommodationId()))
                .filter(existing -> !"OWN".equalsIgnoreCase(existing.getAccommodationSelectionType()))
                .forEach(existing -> {
                    LocalDate start = existing.getCheckIn().isBefore(candidate.getCheckIn()) ? candidate.getCheckIn() : existing.getCheckIn();
                    LocalDate end = existing.getCheckOut().isAfter(candidate.getCheckOut()) ? candidate.getCheckOut() : existing.getCheckOut();
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

    private int availableAccommodationRooms(Accommodation accommodation) {
        return Math.max(0, accommodation.getRooms() - accommodation.getOccupancy());
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private int bookingDays(Booking booking) {
        long days = ChronoUnit.DAYS.between(booking.getCheckIn(), booking.getCheckOut());
        return (int) Math.max(1, days);
    }

    private BigDecimal nonNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String label(String... values) {
        return String.join(" · ", Arrays.stream(values)
                .filter(value -> value != null && !value.isBlank())
                .toList());
    }

    private boolean sameResource(
            String candidateType,
            Long candidateResourceId,
            String candidate,
            String existingType,
            Long existingResourceId,
            String existing
    ) {
        if ("OWN".equalsIgnoreCase(candidateType) || "OWN".equalsIgnoreCase(existingType)) {
            return false;
        }
        // Once either record has a resource ID, compare the canonical IDs only.
        // Falling back to display names here makes legacy bookings with missing
        // IDs collide with a newly selected resource by accident.
        if (candidateResourceId != null || existingResourceId != null) {
            return candidateResourceId != null && existingResourceId != null
                    && candidateResourceId.equals(existingResourceId);
        }
        return candidate != null && !candidate.isBlank() && existing != null
                && !existing.isBlank() && candidate.trim().equalsIgnoreCase(existing.trim());
    }
}
