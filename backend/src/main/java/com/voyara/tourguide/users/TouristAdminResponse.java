package com.voyara.tourguide.users;

import java.time.Instant;

public record TouristAdminResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        boolean active,
        boolean emailVerified,
        String nationality,
        String passportNumber,
        String preferences,
        Instant createdAt
) {
}
