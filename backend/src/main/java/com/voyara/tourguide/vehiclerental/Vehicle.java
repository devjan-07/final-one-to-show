package com.voyara.tourguide.vehiclerental;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.voyara.tourguide.users.AppUser;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

@Getter
@Setter
@Entity
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_user_id")
    private AppUser owner;

    @NotBlank
    private String name;

    private String brand;
    private String model;
    @Column(name = "model_year")
    private int year;
    private String type = "Car";
    private int capacity;
    private BigDecimal pricePerDay = BigDecimal.ZERO;
    private String status = "Available";
    private String transmission = "Automatic";
    private String fuel = "Petrol";
    @Column(nullable = false)
    @ColumnDefault("0")
    private double rating;
    @Column(nullable = false)
    @ColumnDefault("0")
    private int reviews;

    @ElementCollection
    private List<String> features = new ArrayList<>();

    private String location;
    @Column(columnDefinition = "nvarchar(max)")
    private String image;
    private int mileage;
    @Column(unique = true, nullable = false)
    private String plate;

    @JsonProperty("ownerUserId")
    public Long getOwnerUserId() { return owner == null ? null : owner.getId(); }

    @JsonProperty("luggageCapacity")
    public int getLuggageCapacity() {
        return Math.max(1, capacity / 2);
    }
}
