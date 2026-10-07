package com.voyara.tourguide.users;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record StakeholderProfileUpdateRequest(
        @NotBlank String fullName,
        @Pattern(regexp = "^$|^[+]?[0-9][0-9 ()-]{6,19}$", message = "must contain only a valid phone number") String phone,
        String profilePhoto
) {
}
