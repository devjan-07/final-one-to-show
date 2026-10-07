package com.voyara.tourguide.users;

import java.util.List;

public record StakeholderProfileResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        String profilePhoto,
        String stakeholderType,
        String accountStatus,
        List<String> roles
) {
}
