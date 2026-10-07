package com.voyara.tourguide.destinations;

import com.voyara.tourguide.common.ResourceNotFoundException;
import com.voyara.tourguide.accommodations.AccommodationRepository;
import com.voyara.tourguide.packages.TourPackageRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DestinationService {
    private final DestinationRepository repository;
    private final AccommodationRepository accommodationRepository;
    private final TourPackageRepository packageRepository;

    public DestinationService(DestinationRepository repository, AccommodationRepository accommodationRepository,
                              TourPackageRepository packageRepository) {
        this.repository = repository;
        this.accommodationRepository = accommodationRepository;
        this.packageRepository = packageRepository;
    }

    @Transactional(readOnly = true)
    public List<Destination> findAll() {
        List<Destination> destinations = repository.findAll();
        destinations.forEach(this::initializeCollections);
        return destinations;
    }

    @Transactional(readOnly = true)
    public Destination findById(Long id) {
        Destination destination = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Destination", id));
        initializeCollections(destination);
        return destination;
    }

    @Transactional
    public Destination save(Destination destination) {
        clearUnsupportedRatings(destination);
        Destination saved = repository.save(destination);
        initializeCollections(saved);
        return saved;
    }

    @Transactional
    public Destination update(Long id, Destination destination) {
        Destination existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destination", id));
        existing.setName(destination.getName());
        existing.setCountry(destination.getCountry());
        existing.setContinent(destination.getContinent());
        existing.setDescription(destination.getDescription());
        existing.setImage(destination.getImage());
        existing.setStatus(destination.getStatus());
        clearUnsupportedRatings(existing);
        existing.setBestSeason(destination.getBestSeason());
        existing.setHighlights(destination.getHighlights());
        existing.getCategories().clear();
        if (destination.getCategories() != null) {
            existing.getCategories().addAll(new ArrayList<>(destination.getCategories()));
        }
        initializeCollections(existing);
        return existing;
    }

    @Transactional
    public void delete(Long id) {
        Destination destination = findById(id);
        if (accommodationRepository.existsByDestinationId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This destination is used by accommodations. Hide it instead.");
        }
        if (packageRepository.existsByDestinationName(destination.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This destination is used by tour packages. Hide it instead.");
        }
        repository.delete(destination);
    }

    private void initializeCollections(Destination destination) {
        if (destination.getCategories() != null) {
            destination.getCategories().size();
        }
    }

    private void clearUnsupportedRatings(Destination destination) {
        destination.setRating(0);
        destination.setReviews(0);
    }
}
