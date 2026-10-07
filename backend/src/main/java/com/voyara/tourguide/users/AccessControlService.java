package com.voyara.tourguide.users;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccessControlService {
    private static final String[] DEFAULT_PERMISSION_CODES = {
            "TOURISTS_VIEW", "TOURISTS_EDIT", "TOURISTS_DELETE", "BOOKINGS_MANAGE",
            "INVENTORY_MANAGE", "DESTINATIONS_MANAGE", "PACKAGES_MANAGE", "REPORTS_VIEW"
    };

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AppUserRepository userRepository;

    public AccessControlService(RoleRepository roleRepository, PermissionRepository permissionRepository, AppUserRepository userRepository) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
    }

    public static String[] defaultPermissionCodes() {
        return DEFAULT_PERMISSION_CODES.clone();
    }

    @Transactional(readOnly = true)
    public List<AccessControlResponse> all() {
        return roleRepository.findAll().stream().map(this::response).toList();
    }

    @Transactional
    public AccessControlResponse create(AccessControlUpdateRequest request) {
        String name = normalizeName(request.roleName());
        if (roleRepository.findByRoleName(name).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role already exists");
        }
        Role role = new Role();
        role.setRoleName(name);
        applyPermissions(role, request.permissionIds());
        return response(roleRepository.save(role));
    }

    @Transactional
    public AccessControlResponse update(Long id, AccessControlUpdateRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        String name = normalizeName(request.roleName());
        boolean builtIn = java.util.Arrays.stream(AppRole.values()).anyMatch(value -> value.name().equals(role.getRoleName()));
        if (builtIn && !role.getRoleName().equals(name)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Built-in roles cannot be renamed");
        }
        roleRepository.findByRoleName(name).ifPresent(existing -> {
            if (!Objects.equals(existing.getId(), id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Role already exists");
            }
        });
        role.setRoleName(name);
        applyPermissions(role, request.permissionIds());
        return response(roleRepository.save(role));
    }

    @Transactional
    public void delete(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        if ("ADMIN".equalsIgnoreCase(role.getRoleName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The ADMIN role cannot be deleted");
        }
        if (userRepository.existsByRolesId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Remove this role from its users before deleting it");
        }
        roleRepository.delete(role);
    }

    @Transactional(readOnly = true)
    public List<AccessControlResponse.PermissionResponse> permissions() {
        return permissionRepository.findAll().stream()
                .map(permission -> new AccessControlResponse.PermissionResponse(permission.getId(), permission.getCode(), permission.getLabel()))
                .toList();
    }

    private void applyPermissions(Role role, List<Long> permissionIds) {
        role.getPermissions().clear();
        if (permissionIds != null && !permissionIds.isEmpty()) {
            role.getPermissions().addAll(new HashSet<>(permissionRepository.findAllById(permissionIds)));
        }
    }

    private AccessControlResponse response(Role role) {
        return new AccessControlResponse(role.getId(), role.getRoleName(), role.getPermissions().stream()
                .map(permission -> new AccessControlResponse.PermissionResponse(permission.getId(), permission.getCode(), permission.getLabel()))
                .sorted((a, b) -> a.code().compareTo(b.code()))
                .toList());
    }

    private String normalizeName(String value) {
        return value.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "_");
    }
}
