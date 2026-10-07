package com.voyara.tourguide.accommodations;

import java.math.BigDecimal;
import java.util.List;

public record AccommodationResponse(Long id, String name, String type, Long destinationId, String location,
        String country, BigDecimal price, int rooms, int availableRooms, double rating, int reviews, String status,
        List<String> amenities, String image, int occupancy, Long ownerUserId, String ownerName, String ownerEmail) {
    public static AccommodationResponse from(Accommodation value) {
        return from(value, Math.max(0, value.getRooms() - value.getOccupancy()));
    }

    public static AccommodationResponse from(Accommodation value, int availableRooms) {
        return new AccommodationResponse(value.getId(), value.getName(), value.getType(), value.getDestinationId(),
                value.getLocation(), value.getCountry(), value.getPrice(), value.getRooms(),
                Math.max(0, availableRooms), value.getRating(),
                value.getReviews(), value.getStatus(), List.copyOf(value.getAmenities()), value.getImage(),
                value.getOccupancy(), value.getOwnerUserId(), value.getOwner() == null ? null : value.getOwner().getFullName(),
                value.getOwner() == null ? null : value.getOwner().getEmail());
    }
}
