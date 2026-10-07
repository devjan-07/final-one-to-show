package com.voyara.tourguide.auth;

import com.voyara.tourguide.users.AppUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmailDeliveryTest {
    @Test void missingSmtpIsReportedAsUnavailableRatherThanSuccess() {
        EmailVerificationOtpRepository repository = mock(EmailVerificationOtpRepository.class);
        @SuppressWarnings("unchecked") ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        EmailVerificationService service = new EmailVerificationService(repository, mock(PasswordEncoder.class), provider,
                10, "no-reply@example.com", false, "");
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE,
                assertThrows(ResponseStatusException.class, () -> service.issueOtp(new AppUser())).getStatusCode());
    }
}
