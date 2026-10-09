package com.voyara.tourguide.destinations;

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
@RequestMapping("/api/destinations")
public class DestinationController {
    private final DestinationService service;
    private final WeatherService weatherService;

    public DestinationController(DestinationService service, WeatherService weatherService) {
        this.service = service;
        this.weatherService = weatherService;
    }

    @GetMapping
    public List<Destination> all() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Destination one(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/{id}/weather")
    public WeatherForecast weather(@PathVariable Long id) {
        return weatherService.forecastForDestination(id);
    }

    @PostMapping
    public Destination create(@Valid @RequestBody Destination destination) {
        return service.save(destination);
    }

    @PutMapping("/{id}")
    public Destination update(@PathVariable Long id, @Valid @RequestBody Destination destination) {
        return service.update(id, destination);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
