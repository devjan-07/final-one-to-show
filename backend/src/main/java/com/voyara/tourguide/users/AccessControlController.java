package com.voyara.tourguide.users;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/access-control")
public class AccessControlController {
    private final AccessControlService service;

    public AccessControlController(AccessControlService service) {
        this.service = service;
    }

    @GetMapping("/roles")
    public List<AccessControlResponse> roles() { return service.all(); }

    @GetMapping("/permissions")
    public List<AccessControlResponse.PermissionResponse> permissions() { return service.permissions(); }

    @PostMapping("/roles")
    @ResponseStatus(HttpStatus.CREATED)
    public AccessControlResponse create(@Valid @RequestBody AccessControlUpdateRequest request) { return service.create(request); }

    @PutMapping("/roles/{id}")
    public AccessControlResponse update(@PathVariable Long id, @Valid @RequestBody AccessControlUpdateRequest request) { return service.update(id, request); }

    @DeleteMapping("/roles/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { service.delete(id); }
}
