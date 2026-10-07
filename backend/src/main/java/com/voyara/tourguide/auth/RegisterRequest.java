package com.voyara.tourguide.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import java.util.List;

public record RegisterRequest(
        @NotBlank String fullName,
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8, message = "must be at least 8 characters") String password,
        @NotBlank @Pattern(regexp = "\\+94\\s?[0-9]{9}", message = "must use a valid +94 phone number") String phone,
        @NotBlank String nationality,
        @NotBlank String countryOfResidence,
        String passportNumber,
        String preferences,
        @NotEmpty(message = "select at least one preferred language") List<String> languages,
        @AssertTrue(message = "Terms of Service and Privacy Policy must be accepted") boolean termsAccepted
) {
}
