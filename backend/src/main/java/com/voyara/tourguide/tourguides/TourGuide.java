package com.voyara.tourguide.tourguides;

import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
public class TourGuide {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    @Email
    private String email;
    @Pattern(regexp = "^$|^[+]?[0-9][0-9 ()-]{6,19}$", message = "must contain only a valid phone number")
    private String phone;

    private String nationality;
    @jakarta.persistence.Column(columnDefinition = "TEXT")
    private String profilePhoto;

    private Long userId;

    private String initials;
    private String color = "#6b7280";
    private String location;
    private String country;

    @ElementCollection
    private List<String> specialties = new ArrayList<>();

    @ElementCollection
    private List<String> languages = new ArrayList<>();

    private double rating;
    private int reviews;
    private BigDecimal pricePerDay = BigDecimal.ZERO;
    private int experience;
    private String status = "Available";
    private String bio;
    private int toursCompleted;
}
