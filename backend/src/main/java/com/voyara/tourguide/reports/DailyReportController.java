package com.voyara.tourguide.reports;

import com.voyara.tourguide.accommodations.Accommodation;
import com.voyara.tourguide.accommodations.AccommodationRepository;
import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.bookings.BookingRepository;
import com.voyara.tourguide.destinations.DestinationRepository;
import com.voyara.tourguide.packages.TourPackageRepository;
import com.voyara.tourguide.tourguides.TourGuideRepository;
import com.voyara.tourguide.vehiclerental.VehicleRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class DailyReportController {
    private final BookingRepository bookingRepository;
    private final DestinationRepository destinationRepository;
    private final TourPackageRepository packageRepository;
    private final AccommodationRepository accommodationRepository;
    private final TourGuideRepository guideRepository;
    private final VehicleRepository vehicleRepository;

    public DailyReportController(BookingRepository bookingRepository, DestinationRepository destinationRepository,
                                 TourPackageRepository packageRepository, AccommodationRepository accommodationRepository,
                                 TourGuideRepository guideRepository, VehicleRepository vehicleRepository) {
        this.bookingRepository = bookingRepository;
        this.destinationRepository = destinationRepository;
        this.packageRepository = packageRepository;
        this.accommodationRepository = accommodationRepository;
        this.guideRepository = guideRepository;
        this.vehicleRepository = vehicleRepository;
    }

    @GetMapping("/daily")
    public DailyReport daily(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate reportDate = date == null ? LocalDate.now() : date;
        List<Booking> bookings = bookingRepository.findAll();
        List<BookingRow> activity = bookings.stream()
                .filter(booking -> reportDate.equals(booking.getCreatedAt())
                        || reportDate.equals(booking.getCheckIn())
                        || reportDate.equals(booking.getCheckOut()))
                .sorted(Comparator.comparing(Booking::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(booking -> new BookingRow(booking.getId(), booking.getGuest(), booking.getEmail(), booking.getPkg(),
                        booking.getDestination(), booking.getCheckIn(), booking.getCheckOut(), booking.getGuests(),
                        booking.getTotal(), booking.getStatus(), booking.getPayment(), booking.getGuide(),
                        booking.getAccommodation(), booking.getVehicle(), booking.getCreatedAt()))
                .toList();

        Map<String, Long> statusTotals = bookings.stream()
                .filter(booking -> Objects.nonNull(booking.getStatus()))
                .collect(Collectors.groupingBy(Booking::getStatus, Collectors.counting()));
        BigDecimal paidRevenue = bookings.stream()
                .filter(booking -> "Paid".equalsIgnoreCase(booking.getPayment()))
                .map(Booking::getTotal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DailyReport(reportDate, new Summary(activity.size(), bookings.size(),
                statusTotals.getOrDefault("Pending", 0L), statusTotals.getOrDefault("Confirmed", 0L),
                statusTotals.getOrDefault("Completed", 0L), statusTotals.getOrDefault("Cancelled", 0L), paidRevenue),
                new Resources(destinationRepository.count(), packageRepository.count(), accommodationRepository.count(),
                        accommodationRepository.findAll().stream().filter(item -> "Active".equalsIgnoreCase(item.getStatus())).count(),
                        guideRepository.count(), vehicleRepository.count()), activity);
    }

    public record DailyReport(LocalDate date, Summary summary, Resources resources, List<BookingRow> bookings) {}

    public record Summary(int activityCount, long totalBookings, long pending, long confirmed, long completed,
                          long cancelled, BigDecimal paidRevenue) {}

    public record Resources(long destinations, long packages, long accommodations, long activeAccommodations,
                            long guides, long vehicles) {}

    public record BookingRow(String id, String guest, String email, String packageName, String destination,
                             LocalDate checkIn, LocalDate checkOut, int guests, BigDecimal total, String status,
                             String payment, String guide, String accommodation, String vehicle, LocalDate createdAt) {}
}
