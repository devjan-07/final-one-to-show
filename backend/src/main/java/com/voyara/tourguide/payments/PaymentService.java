package com.voyara.tourguide.payments;

import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.bookings.BookingService;
import com.voyara.tourguide.notifications.NotificationService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final BookingService bookingService;
    private final NotificationService notificationService;
    private final boolean demoEnabled;

    public PaymentService(PaymentRepository paymentRepository, BookingService bookingService,
                          NotificationService notificationService,
                          @org.springframework.beans.factory.annotation.Value("${app.payments.demo-enabled:false}") boolean demoEnabled,
                          org.springframework.core.env.Environment environment) {
        this.paymentRepository = paymentRepository;
        this.bookingService = bookingService;
        this.notificationService = notificationService;
        this.demoEnabled = demoEnabled;
    }

    public boolean isDemoEnabled() { return demoEnabled; }

    @Transactional(readOnly = true)
    public Payment findForBooking(Booking booking) {
        return paymentRepository.findByBookingId(booking.getId()).orElse(null);
    }

    @Transactional
    public Payment pay(Booking booking, DemoPaymentRequest request) {
        if (!demoEnabled) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Online payments are not configured");
        }
        booking = bookingService.findLockedById(booking.getId());
        if (!"Confirmed".equals(booking.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking must be confirmed before payment");
        }
        Payment payment = paymentRepository.findByBookingId(booking.getId()).orElse(null);
        if ("Paid".equals(booking.getPayment()) || (payment != null && "Paid".equalsIgnoreCase(payment.getStatus()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This booking has already been paid");
        }
        if (booking.getTotal() == null || booking.getTotal().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A positive booking total is required");
        }
        DemoCard card = validateDemoCard(request);
        if (card.number().endsWith("0000")) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Card declined");
        }

        if (payment == null) {
            payment = new Payment();
            payment.setBooking(booking);
        }
        payment.setAmount(booking.getTotal() == null ? BigDecimal.ZERO : booking.getTotal());
        payment.setPaymentMethod("Card");
        payment.setCardBrand("Card");
        payment.setCardLast4(card.number().substring(card.number().length() - 4));
        boolean pending = card.number().endsWith("1111");
        payment.setStatus(pending ? "Pending" : "Paid");
        payment.setTransactionReference("VYR-DEMO-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase());
        payment.setPaidAt(Instant.now());
        if (!pending) {
            booking.setPayment("Paid");
        }
        bookingService.saveExisting(booking);
        Payment saved = paymentRepository.save(payment);
        if (pending) {
            notificationService.notifyBookingUser(booking, "Payment pending",
                    "Payment for booking " + booking.getId() + " is pending review.", "PAYMENT_PENDING");
            notificationService.notifyAdmins("Payment pending",
                    booking.getId() + " has a pending payment.", "PAYMENT_PENDING", booking.getId());
        } else {
            notificationService.notifyBookingUser(booking, "Payment received",
                    "Payment for booking " + booking.getId() + " was successful.", "PAYMENT_RECEIVED");
            notificationService.notifyAdmins("Booking payment received",
                    booking.getId() + " has been paid and confirmed.", "PAYMENT_RECEIVED", booking.getId());
        }
        return saved;
    }

    private DemoCard validateDemoCard(DemoPaymentRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment details are required");
        }
        String paymentMethod = request.paymentMethod() == null ? "" : request.paymentMethod().trim();
        if (!"Card".equals(paymentMethod) && !"Card (demo)".equals(paymentMethod)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported payment method");
        }
        if (request.cardholderName() == null || request.cardholderName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cardholder name is required");
        }
        String number = request.cardNumber() == null ? "" : request.cardNumber().replaceAll("\\s+", "");
        if (!number.matches("\\d{13,19}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid card number");
        }
        String cvv = request.cvv() == null ? "" : request.cvv().trim();
        if (!cvv.matches("\\d{3,4}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid CVV");
        }
        int month;
        int year;
        try {
            month = Integer.parseInt(request.expiryMonth() == null ? "" : request.expiryMonth().trim());
            year = Integer.parseInt(request.expiryYear() == null ? "" : request.expiryYear().trim());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid expiry date");
        }
        if (month < 1 || month > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid expiry month");
        }
        if (year < 100) {
            year += 2000;
        }
        if (YearMonth.of(year, month).isBefore(YearMonth.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Card has expired");
        }
        return new DemoCard(number);
    }

    private record DemoCard(String number) {}
}
