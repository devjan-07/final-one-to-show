package com.voyara.tourguide.packages;

import jakarta.persistence.ElementCollection;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
public class TourPackage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    private String category;

    @ElementCollection
    private List<String> destinations = new ArrayList<>();

    private int duration;
    private BigDecimal price = BigDecimal.ZERO;
    private int maxGroup;
    private String difficulty = "Easy";
    private String status = "Draft";
    private double rating;
    private int reviews;
    private int bookings;
    @Column(columnDefinition = "nvarchar(max)")
    private String image;
    @jakarta.persistence.Column(name = "included_items")
    private String included;
    private String description;
}
