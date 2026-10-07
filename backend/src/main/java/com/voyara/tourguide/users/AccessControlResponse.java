package com.voyara.tourguide.users;

import java.util.List;

public record AccessControlResponse(Long id, String roleName, List<PermissionResponse> permissions) {
    public record PermissionResponse(Long id, String code, String label) {}
}
