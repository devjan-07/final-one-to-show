package com.voyara.tourguide.profiles;

import com.voyara.tourguide.users.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "tour_guide_profiles")
public class TourGuideProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "guide_id")
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private AppUser user;

    private String bio;

    @Column(name = "experience_years")
    private int experienceYears;

    @Column(name = "price_per_day")
    private BigDecimal pricePerDay = BigDecimal.ZERO;

    private String availability = "AVAILABLE";
}
