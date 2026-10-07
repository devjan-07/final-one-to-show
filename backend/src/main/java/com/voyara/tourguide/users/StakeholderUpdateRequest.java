package com.voyara.tourguide.users;

import jakarta.validation.constraints.NotNull;

public record StakeholderUpdateRequest(
        @NotNull Long roleId,
        String password
) {
}
