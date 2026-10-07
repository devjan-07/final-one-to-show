package com.voyara.tourguide.config;

import com.voyara.tourguide.users.AppRole;
import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.users.AppUserRepository;
import com.voyara.tourguide.users.Role;
import com.voyara.tourguide.users.RoleRepository;
import com.voyara.tourguide.users.Permission;
import com.voyara.tourguide.users.PermissionRepository;
import com.voyara.tourguide.users.AccessControlService;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AuthDataSeeder implements CommandLineRunner {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;
    private final String adminFullName;

    public AuthDataSeeder(
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            AppUserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.admin-email}") String adminEmail,
            @Value("${app.bootstrap.admin-password}") String adminPassword,
            @Value("${app.bootstrap.admin-full-name}") String adminFullName
    ) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.adminFullName = adminFullName;
    }

    @Override
    public void run(String... args) {
        boolean newAdminRole = roleRepository.findByRoleName(AppRole.ADMIN.name()).isEmpty();
        Arrays.stream(AppRole.values()).forEach(roleName ->
                roleRepository.findByRoleName(roleName.name()).orElseGet(() -> {
                    Role role = new Role();
                    role.setRoleName(roleName.name());
                    return roleRepository.save(role);
                })
        );

        Arrays.stream(AccessControlService.defaultPermissionCodes()).forEach(code -> {
            if (permissionRepository.findByCode(code).isEmpty()) {
                Permission permission = new Permission();
                permission.setCode(code);
                permission.setLabel(code.replace('_', ' '));
                permissionRepository.save(permission);
            }
        });
        Role adminRole = roleRepository.findByRoleName(AppRole.ADMIN.name()).orElseThrow();
        if (newAdminRole) {
            adminRole.getPermissions().addAll(permissionRepository.findAll());
            roleRepository.save(adminRole);
        }

        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            return;
        }

        String normalizedEmail = adminEmail.trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            return;
        }

        AppUser admin = new AppUser();
        admin.setFullName(adminFullName == null || adminFullName.isBlank() ? "Voyara Admin" : adminFullName.trim());
        admin.setEmail(normalizedEmail);
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setEmailVerified(true);
        admin.getRoles().add(adminRole);
        userRepository.save(admin);
    }
}
