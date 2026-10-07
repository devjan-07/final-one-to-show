package com.voyara.tourguide.auth;

import com.voyara.tourguide.users.AppUser;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationOtpRepository extends JpaRepository<EmailVerificationOtp, Long> {
    Optional<EmailVerificationOtp> findTopByUserEmailIgnoreCaseAndUsedAtIsNullOrderByCreatedAtDesc(String email);

    List<EmailVerificationOtp> findByUserAndUsedAtIsNull(AppUser user);
    void deleteByUserId(Long userId);
}
