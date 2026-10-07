package com.voyara.tourguide.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ResendVerificationRequest(@Email @NotBlank String email) {
}
