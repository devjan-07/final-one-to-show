package com.voyara.tourguide.notifications;

import com.voyara.tourguide.bookings.Booking;
import com.voyara.tourguide.bookings.BookingRepository;
import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.users.AppUserRepository;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationService {
    private static final Set<String> TOURIST_NOTIFICATION_TYPES = Set.of(
            "BOOKING_CREATED",
            "BOOKING_STATUS",
            "BOOKING_CANCELLED",
            "PAYMENT_RECEIVED",
            "REVIEW_SUBMITTED",
            "BOOKING_COMPLETED"
    );

    private final NotificationRepository notificationRepository;
    private final AppUserRepository userRepository;
    private final BookingRepository bookingRepository;

    public NotificationService(NotificationRepository notificationRepository, AppUserRepository userRepository,
                               BookingRepository bookingRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
    }

    @Transactional(readOnly = true)
    public List<Notification> findForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<Notification> findForTourist(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(notification -> isTouristNotification(notification, userId))
                .toList();
    }

    @Transactional
    public Notification markRead(Long notificationId, Long userId) {
        Notification notification = ownedNotification(notificationId, userId);
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    @Transactional
    public List<Notification> markAllRead(Long userId) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notifications.forEach(notification -> notification.setRead(true));
        return notificationRepository.saveAll(notifications);
    }

    @Transactional
    public List<Notification> markAllTouristRead(Long userId) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notifications.stream()
                .filter(notification -> isTouristNotification(notification, userId))
                .forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(notifications);
        return findForTourist(userId);
    }

    @Transactional
    public void notifyBookingUser(Booking booking, String title, String message, String type) {
        bookingUser(booking).ifPresent(user -> create(user, title, message, type, booking.getId()));
    }

    @Transactional
    public void notifyAdmins(String title, String message, String type, String referenceId) {
        userRepository.findByRoleNameOrderByCreatedAtDesc("ADMIN")
                .forEach(user -> create(user, title, message, type, referenceId));
    }

    @Transactional
    public void notifyAssignedGuide(Booking booking, String title, String message, String type) {
        if (booking.getTourGuide() == null || booking.getTourGuide().getUserId() == null) return;
        userRepository.findById(booking.getTourGuide().getUserId())
                .ifPresent(user -> create(user, title, message, type, booking.getId()));
    }

    private java.util.Optional<AppUser> bookingUser(Booking booking) {
        if (booking.getTourist() != null && booking.getTourist().getId() != null) {
            return userRepository.findById(booking.getTourist().getId());
        }
        if (booking.getEmail() != null && !booking.getEmail().isBlank()) {
            return userRepository.findByEmailIgnoreCase(booking.getEmail());
        }
        return java.util.Optional.empty();
    }

    private Notification create(AppUser user, String title, String message, String type, String referenceId) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setReferenceId(referenceId);
        return notificationRepository.save(notification);
    }

    private boolean isTouristNotification(Notification notification, Long userId) {
        String type = notification.getType() == null ? "" : notification.getType().trim().toUpperCase();
        if (!TOURIST_NOTIFICATION_TYPES.contains(type)) {
            return false;
        }
        String referenceId = notification.getReferenceId();
        return referenceId == null || referenceId.isBlank() || bookingRepository.existsByIdAndTouristId(referenceId, userId);
    }

    private Notification ownedNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!notification.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return notification;
    }
}
