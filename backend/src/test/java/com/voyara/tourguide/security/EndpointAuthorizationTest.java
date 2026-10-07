package com.voyara.tourguide.security;

import com.voyara.tourguide.bookings.*;
import com.voyara.tourguide.destinations.*;
import com.voyara.tourguide.users.AppUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {BookingController.class, DestinationController.class}, properties = {
        "app.security.enabled=true", "app.management.auth-required=false", "app.cors.allowed-origins=http://localhost:5173",
        "app.jwt.secret=c3fe624e516041c4a0d9b87acf401f3f915f78001c9b4496", "app.jwt.expiration-ms=60000"})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtService.class})
class EndpointAuthorizationTest {
    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @MockBean BookingService bookings;
    @MockBean DestinationService destinations;
    @MockBean CustomUserDetailsService users;

    String token(String... authorities) {
        AppUser account = new AppUser();
        account.setEmail("user@example.com");
        account.setPasswordHash("test-hash");
        when(users.loadUserByUsername(account.getEmail())).thenReturn(User.withUsername(account.getEmail())
                .password(account.getPasswordHash()).authorities(authorities).build());
        return jwt.generateToken(account);
    }

    @Test void anonymousCatalogReadsRemainPublic() throws Exception {
        mvc.perform(get("/api/destinations")).andExpect(status().isOk());
    }

    @Test void legacyOpenManagementSettingCannotEnableAnonymousWrites() throws Exception {
        mvc.perform(post("/api/destinations").contentType("application/json").content("{}")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/destinations/1")).andExpect(status().isUnauthorized());
        verifyNoInteractions(destinations);
    }

    @Test void touristCannotReadOtherCustomersBookings() throws Exception {
        String token = token("ROLE_TOURIST");
        mvc.perform(get("/api/bookings").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        mvc.perform(get("/api/bookings/BK-1").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        verifyNoInteractions(bookings);
    }

    @Test void permissionIsRequiredEvenForStaff() throws Exception {
        mvc.perform(get("/api/bookings").header("Authorization", "Bearer " + token("ROLE_TRAVEL_STAFF"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/bookings").header("Authorization", "Bearer " + token("ROLE_TRAVEL_STAFF", "PERM_BOOKINGS_MANAGE"))).andExpect(status().isOk());
    }
}
