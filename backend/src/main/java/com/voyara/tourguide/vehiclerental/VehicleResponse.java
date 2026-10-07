package com.voyara.tourguide.vehiclerental;

import java.math.BigDecimal;
import java.util.List;

public record VehicleResponse(Long id, String name, String brand, String model, int year, String type, int capacity,
        int luggageCapacity, BigDecimal pricePerDay, double rating, int reviews, String status, String transmission, String fuel,
        List<String> features, String location, String image, int mileage, String plate,
        Long ownerUserId, String ownerName, String ownerEmail) {
    public static VehicleResponse from(Vehicle value) {
        return new VehicleResponse(value.getId(), value.getName(), value.getBrand(), value.getModel(), value.getYear(),
                value.getType(), value.getCapacity(), value.getLuggageCapacity(), value.getPricePerDay(), value.getRating(),
                value.getReviews(), value.getStatus(), value.getTransmission(), value.getFuel(), List.copyOf(value.getFeatures()),
                value.getLocation(), value.getImage(), value.getMileage(), value.getPlate(), value.getOwnerUserId(),
                value.getOwner() == null ? null : value.getOwner().getFullName(),
                value.getOwner() == null ? null : value.getOwner().getEmail());
    }
}
