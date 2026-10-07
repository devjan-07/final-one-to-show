package com.voyara.tourguide.bookings;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final BookingService service;

    public BookingController(BookingService service) {
        this.service = service;
    }

    @GetMapping
    public List<Booking> all() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Booking one(@PathVariable String id) {
        return service.findById(id);
    }

    @PostMapping
    public Booking create(@Valid @RequestBody Booking booking) {
        return service.create(booking);
    }

    @PutMapping("/{id}")
    public Booking update(@PathVariable String id, @Valid @RequestBody Booking booking) {
        return service.update(id, booking);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        service.delete(id);
    }
}
