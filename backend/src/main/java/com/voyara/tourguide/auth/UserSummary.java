package com.voyara.tourguide.auth;

import java.util.List;

public record UserSummary(Long id, String fullName, String email, String phone, List<String> roles, List<String> permissions) {
}
