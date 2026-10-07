package com.voyara.tourguide.users;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

public record StakeholderCreateRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email,
        @NotBlank @Pattern(regexp = "^[+]?[0-9][0-9 ()-]{6,19}$", message = "must contain only a valid phone number") String phone,
        @NotBlank @Size(min = 8, message = "must be at least 8 characters") String password,
        @NotBlank String stakeholderType,
        @NotNull Long roleId,
        @NotBlank @Pattern(regexp = "Active|Pending Invitation|Suspended", message = "must be Active, Pending Invitation, or Suspended") String accountStatus
) {
}
