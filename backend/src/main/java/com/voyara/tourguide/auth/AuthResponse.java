package com.voyara.tourguide.auth;

public record AuthResponse(UserSummary user, String token) {
}
