package com.voyara.tourguide.destinations;

import jakarta.persistence.ElementCollection;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
public class Destination {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    private String country;
    private String continent;

    @ElementCollection
    private List<String> categories = new ArrayList<>();

    private String description;
    @Column(columnDefinition = "nvarchar(max)")
    private String image;
    private String status = "Active";
    private double rating;
    private int reviews;
    private String bestSeason;
    private String highlights;
}
