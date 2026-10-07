package com.voyara.tourguide.users;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record TouristAdminUpdateRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email,
        String phone,
        boolean active,
        String nationality,
        String passportNumber,
        String preferences
) {
}
