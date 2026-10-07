package com.voyara.tourguide.accommodations;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.destinations.Destination;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.ConstraintMode;
import jakarta.persistence.ForeignKey;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
public class Accommodation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    private String type = "Hotel";
    @JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_user_id")
    private AppUser owner;
    @Column(name = "destination_id")
    private Long destinationId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private Destination destination;
    private String location;
    private String country;
    private BigDecimal price = BigDecimal.ZERO;
    private int rooms;
    private double rating;
    private int reviews;
    private String status = "Active";

    @ElementCollection
    @CollectionTable(name = "accommodation_amenities", joinColumns = @JoinColumn(name = "accommodation_id"))
    @Column(name = "amenities")
    private List<String> amenities = new ArrayList<>();

    @Column(columnDefinition = "nvarchar(max)")
    private String image;
    private int occupancy;

    @JsonProperty("ownerUserId")
    public Long getOwnerUserId() {
        return owner == null ? null : owner.getId();
    }
}
