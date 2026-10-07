package com.voyara.tourguide.auth;

import com.voyara.tourguide.bookings.BookingService;
import com.voyara.tourguide.profiles.TouristProfileRepository;
import com.voyara.tourguide.security.JwtService;
import com.voyara.tourguide.security.RequestThrottleFilter;
import com.voyara.tourguide.users.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthSecurityRegressionTest {
    private final AppUserRepository users = mock(AppUserRepository.class);
    private final JwtService jwt = mock(JwtService.class);
    private final EmailVerificationOtpRepository otps = mock(EmailVerificationOtpRepository.class);
    private final AuthService service = new AuthService(users, mock(RoleRepository.class), mock(TouristProfileRepository.class),
            mock(PasswordEncoder.class), mock(AuthenticationManager.class), jwt, otps,
            mock(EmailVerificationService.class), mock(BookingService.class), new RequestThrottleFilter());

    @Test void verifiedAccountCannotObtainTokenThroughVerificationEndpoint() {
        AppUser user = new AppUser();
        user.setEmailVerified(true);
        when(users.findLockedByEmail("admin@example.com")).thenReturn(Optional.of(user));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.verifyEmail(new VerifyEmailRequest("admin@example.com", "123456")));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verifyNoInteractions(jwt, otps);
    }

    @Test void verificationCannotReactivateDisabledVerifiedAccount() {
        AppUser user = new AppUser();
        user.setEmailVerified(true);
        user.setActive(false);
        when(users.findLockedByEmail("disabled@example.com")).thenReturn(Optional.of(user));
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.verifyEmail(new VerifyEmailRequest("disabled@example.com", "123456"))).getStatusCode());
        verifyNoInteractions(jwt, otps);
    }

    @Test void verificationAttemptsAreLimitedPerAccount() {
        when(users.findLockedByEmail(anyString())).thenReturn(Optional.empty());
        for (int i = 0; i < 5; i++) assertThrows(ResponseStatusException.class,
                () -> service.verifyEmail(new VerifyEmailRequest("unknown@example.com", "000000")));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, assertThrows(ResponseStatusException.class,
                () -> service.verifyEmail(new VerifyEmailRequest("unknown@example.com", "000000"))).getStatusCode());
    }
}
