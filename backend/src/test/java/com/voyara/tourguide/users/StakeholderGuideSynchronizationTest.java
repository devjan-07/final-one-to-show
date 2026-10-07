package com.voyara.tourguide.users;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.voyara.tourguide.auth.EmailVerificationOtpRepository;
import com.voyara.tourguide.notifications.NotificationRepository;
import com.voyara.tourguide.tourguides.TourGuide;
import com.voyara.tourguide.tourguides.TourGuideRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class StakeholderGuideSynchronizationTest {
    @Mock AppUserRepository userRepository;
    @Mock RoleRepository roleRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock NotificationRepository notificationRepository;
    @Mock EmailVerificationOtpRepository otpRepository;
    @Mock TourGuideRepository guideRepository;

    private StakeholderService stakeholderService;

    @BeforeEach
    void setUp() {
        stakeholderService = new StakeholderService(userRepository, roleRepository, passwordEncoder,
                notificationRepository, otpRepository, guideRepository);
    }

    @Test
    void creatingTourGuideStakeholderCreatesLinkedGuide() {
        Role role = new Role();
        role.setId(7L);
        role.setRoleName("TOUR_GUIDE");
        when(roleRepository.findById(7L)).thenReturn(Optional.of(role));
        when(userRepository.existsByEmailIgnoreCase("guide@voyara.com")).thenReturn(false);
        when(passwordEncoder.encode("password1")).thenReturn("encoded");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser user = invocation.getArgument(0);
            user.setId(42L);
            return user;
        });
        when(guideRepository.findByUserId(42L)).thenReturn(Optional.empty());

        stakeholderService.create(new StakeholderCreateRequest(
                "Nimal Perera", "guide@voyara.com", "+94771234567", "password1",
                "TOUR_GUIDE", 7L, "Active"));

        ArgumentCaptor<TourGuide> guideCaptor = ArgumentCaptor.forClass(TourGuide.class);
        verify(guideRepository).save(guideCaptor.capture());
        TourGuide guide = guideCaptor.getValue();
        assertEquals(42L, guide.getUserId());
        assertEquals("Nimal Perera", guide.getName());
        assertEquals("guide@voyara.com", guide.getEmail());
        assertEquals("NP", guide.getInitials());
        assertEquals("Available", guide.getStatus());
    }

    @Test
    void profileUpdateSynchronizesLinkedGuide() {
        StakeholderProfileService profileService = new StakeholderProfileService(userRepository, guideRepository);
        AppUser user = new AppUser();
        user.setId(42L);
        user.setEmail("guide@voyara.com");
        TourGuide guide = new TourGuide();
        guide.setUserId(42L);
        when(userRepository.findByEmailIgnoreCase("guide@voyara.com")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        when(guideRepository.findByUserId(42L)).thenReturn(Optional.of(guide));

        profileService.update("guide@voyara.com",
                new StakeholderProfileUpdateRequest("Updated Guide", "+94770000000", "photo-url"));

        assertEquals("Updated Guide", guide.getName());
        assertEquals("+94770000000", guide.getPhone());
        assertEquals("photo-url", guide.getProfilePhoto());
        verify(guideRepository).save(guide);
    }
}
