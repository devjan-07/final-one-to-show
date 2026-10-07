package com.voyara.tourguide.users;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record AccessControlUpdateRequest(@NotBlank String roleName, List<Long> permissionIds) {
}
