package com.voyara.tourguide.accommodations;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.util.List;

public record AccommodationRequest(
        @NotBlank String name,
        @NotBlank @Pattern(regexp = "Hotel|Villa|Resort|Hostel|Apartment") String type,
        @NotNull Long destinationId,
        @NotBlank String location,
        @NotBlank String country,
        @NotNull @DecimalMin(value = "0.01") BigDecimal price,
        @Min(1) int rooms,
        @Pattern(regexp = "Active|Inactive|Maintenance|Pending Approval|Rejected") String status,
        List<String> amenities,
        @NotBlank String image,
        @Min(0) int occupancy
) {
    public Accommodation toEntity() {
        Accommodation value = new Accommodation();
        value.setName(name.trim()); value.setType(type); value.setDestinationId(destinationId);
        value.setLocation(location.trim()); value.setCountry(country.trim()); value.setPrice(price);
        value.setRooms(rooms); value.setStatus(status); value.setAmenities(amenities == null ? List.of() : amenities);
        value.setImage(image.trim()); value.setOccupancy(occupancy);
        return value;
    }
}
