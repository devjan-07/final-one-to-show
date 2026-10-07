package com.voyara.tourguide.auth;

import com.voyara.tourguide.users.AppUser;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmailVerificationService {
    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationOtpRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final Duration expiry;
    private final String fromAddress;
    private final boolean mailEnabled;
    private final String smtpHost;

    public EmailVerificationService(
            EmailVerificationOtpRepository otpRepository,
            PasswordEncoder passwordEncoder,
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.email.verification.expiration-minutes:10}") long expiryMinutes,
            @Value("${app.mail.from:no-reply@voyara.local}") String fromAddress,
            @Value("${app.mail.enabled:false}") boolean mailEnabled,
            @Value("${spring.mail.host:}") String smtpHost
    ) {
        this.otpRepository = otpRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSenderProvider = mailSenderProvider;
        this.expiry = Duration.ofMinutes(expiryMinutes);
        this.fromAddress = fromAddress;
        this.mailEnabled = mailEnabled;
        this.smtpHost = smtpHost;
    }

    @Transactional
    public void issueOtp(AppUser user) {
        expireOpenOtps(user);
        String otp = generateOtp();

        EmailVerificationOtp verificationOtp = new EmailVerificationOtp();
        verificationOtp.setUser(user);
        verificationOtp.setOtpHash(passwordEncoder.encode(otp));
        verificationOtp.setExpiresAt(Instant.now().plus(expiry));
        otpRepository.save(verificationOtp);

        sendOtpEmail(user, otp);
    }

    public boolean matches(EmailVerificationOtp otp, String rawCode) {
        return rawCode != null && passwordEncoder.matches(rawCode, otp.getOtpHash());
    }

    @Transactional
    public void expireOpenOtps(AppUser user) {
        Instant now = Instant.now();
        otpRepository.findByUserAndUsedAtIsNull(user).forEach(otp -> {
            otp.setUsedAt(now);
            otpRepository.save(otp);
        });
    }

    private String generateOtp() {
        return String.valueOf(100000 + RANDOM.nextInt(900000));
    }

    private void sendOtpEmail(AppUser user, String otp) {
        if (!mailEnabled || smtpHost == null || smtpHost.isBlank()) {
            throw deliveryFailure();
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw deliveryFailure();
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(user.getEmail());
            message.setSubject("Your Voyara verification code");
            message.setText("""
                    Welcome to Voyara.

                    Your email verification code is: %s

                    This code expires in %d minutes.
                    """.formatted(otp, expiry.toMinutes()));
            mailSender.send(message);
        } catch (RuntimeException ex) {
            log.warn("Verification email delivery failed. Check SMTP configuration.");
            throw deliveryFailure();
        }
    }

    private org.springframework.web.server.ResponseStatusException deliveryFailure() {
        return new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                "Verification email could not be sent. Please try again later.");
    }
}
