package com.voyara.tourguide.security;

import com.voyara.tourguide.users.AppUser;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {
    private final JwtService service = new JwtService("c3fe624e516041c4a0d9b87acf401f3f915f78001c9b4496", 60000);

    @Test void missingOrWeakSecretFailsStartup() {
        assertThrows(IllegalStateException.class, () -> new JwtService("", 60000));
        assertThrows(IllegalStateException.class, () -> new JwtService("short", 60000));
        assertThrows(IllegalStateException.class, () -> new JwtService("voyara-development-only-jwt-secret-change-later", 60000));
    }

    @Test void disabledAccountsAndChangedPasswordsInvalidateTokens() {
        AppUser account = new AppUser();
        account.setEmail("tourist@example.com");
        account.setPasswordHash("original-password-hash");
        String token = service.generateToken(account);
        assertTrue(service.isTokenValid(token, User.withUsername(account.getEmail()).password(account.getPasswordHash()).roles("TOURIST").build()));
        assertFalse(service.isTokenValid(token, User.withUsername(account.getEmail()).password(account.getPasswordHash()).roles("TOURIST").disabled(true).build()));
        assertFalse(service.isTokenValid(token, User.withUsername(account.getEmail()).password("changed-password-hash").roles("TOURIST").build()));
    }
}
