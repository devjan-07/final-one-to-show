package com.voyara.tourguide.vehiclerental;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.util.List;

public record VehicleRequest(@NotBlank String name, @NotBlank String brand, @NotBlank String model,
        @Min(1900) int year, @Pattern(regexp = "Car|SUV|Van|Minibus|Motorbike|Luxury") String type,
        @Min(1) int capacity, @NotNull @DecimalMin("0.01") BigDecimal pricePerDay,
        @Pattern(regexp = "Available|Rented|Maintenance|Pending Approval|Rejected|Inactive") String status,
        @Pattern(regexp = "Automatic|Manual") String transmission,
        @Pattern(regexp = "Petrol|Diesel|Electric|Hybrid") String fuel,
        List<String> features, @NotBlank String location, @NotBlank String image,
        @Min(0) int mileage,
        @NotBlank
        @Pattern(regexp = "(?i)^[A-Z]{3}-[0-9]{4}$",
                message = "must follow the Sri Lankan format ABC-1234")
        String plate) {
    public Vehicle toEntity() {
        Vehicle value = new Vehicle();
        value.setName(name.trim()); value.setBrand(brand.trim()); value.setModel(model.trim()); value.setYear(year);
        value.setType(type); value.setCapacity(capacity); value.setPricePerDay(pricePerDay); value.setStatus(status);
        value.setTransmission(transmission); value.setFuel(fuel); value.setFeatures(features == null ? List.of() : features);
        value.setLocation(location.trim()); value.setImage(image.trim()); value.setMileage(mileage);
        value.setPlate(plate.trim().toUpperCase());
        return value;
    }
}
