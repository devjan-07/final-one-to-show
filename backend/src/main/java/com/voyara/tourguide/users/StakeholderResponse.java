package com.voyara.tourguide.users;

import java.time.Instant;

public record StakeholderResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        String stakeholderType,
        Long roleId,
        String accessProfile,
        String accountStatus,
        Instant createdAt
) {
}
