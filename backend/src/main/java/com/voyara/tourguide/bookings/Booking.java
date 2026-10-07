package com.voyara.tourguide.bookings;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.voyara.tourguide.accommodations.Accommodation;
import com.voyara.tourguide.packages.TourPackage;
import com.voyara.tourguide.tourguides.TourGuide;
import com.voyara.tourguide.users.AppUser;
import com.voyara.tourguide.vehiclerental.Vehicle;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
public class Booking {
    @Id
    private String id;

    @NotBlank
    private String guest;

    @Email
    private String email;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tourist_user_id")
    @JsonIgnore
    private AppUser tourist;

    private String bookingType = "PACKAGE";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "package_id", foreignKey = @ForeignKey(name = "fk_booking_package"))
    @JsonIgnore
    private TourPackage tourPackage;

    private String languagePreference;
    private String destination;

    @Column(name = "package_name_snapshot")
    private String pkg;

    @Column(name = "guide_name_snapshot")
    private String guide;

    private String guideSelectionType = "VOYARA";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guide_id", foreignKey = @ForeignKey(name = "fk_booking_guide"))
    @JsonIgnore
    private TourGuide tourGuide;

    @Column(name = "accommodation_name_snapshot")
    private String accommodation;

    private String accommodationSelectionType = "VOYARA";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accommodation_id", foreignKey = @ForeignKey(name = "fk_booking_accommodation"))
    @JsonIgnore
    private Accommodation accommodationResource;

    private String roomType;

    @Column(name = "vehicle_name_snapshot")
    private String vehicle;

    private String vehicleSelectionType = "VOYARA";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", foreignKey = @ForeignKey(name = "fk_booking_vehicle"))
    @JsonIgnore
    private Vehicle vehicleResource;

    private String pickupLocation;
    private String pickupTime;
    private String returnLocation;
    private String returnTime;
    private Boolean driverRequired = true;
    private Integer luggageCount = 0;
    private LocalDate checkIn;
    private LocalDate checkOut;

    @Min(1)
    private int guests = 1;

    @Min(1)
    private Integer rooms = 1;

    private BigDecimal total = BigDecimal.ZERO;
    private String status = "Pending";
    private String accommodationProviderStatus;
    private String vehicleProviderStatus;
    private String payment = "Pending";
    private Integer overallRating;
    private String overallRatingDescription;
    @Column(name = "overall_review", columnDefinition = "TEXT")
    private String overallReview;
    @Column(columnDefinition = "nvarchar(max)")
    private String notes;
    private LocalDate createdAt = LocalDate.now();

    @JsonProperty("packageId")
    public Long getPackageId() {
        return tourPackage == null ? null : tourPackage.getId();
    }

    @JsonProperty("packageId")
    public void setPackageId(Long packageId) {
        if (packageId == null) {
            this.tourPackage = null;
            return;
        }
        TourPackage selected = new TourPackage();
        selected.setId(packageId);
        this.tourPackage = selected;
    }

    @JsonProperty("guideId")
    public Long getGuideId() {
        return tourGuide == null ? null : tourGuide.getId();
    }

    @JsonProperty("guideId")
    public void setGuideId(Long guideId) {
        if (guideId == null) {
            this.tourGuide = null;
            return;
        }
        TourGuide selected = new TourGuide();
        selected.setId(guideId);
        this.tourGuide = selected;
    }

    @JsonProperty("accommodationId")
    public Long getAccommodationId() {
        return accommodationResource == null ? null : accommodationResource.getId();
    }

    @JsonProperty("accommodationId")
    public void setAccommodationId(Long accommodationId) {
        if (accommodationId == null) {
            this.accommodationResource = null;
            return;
        }
        Accommodation selected = new Accommodation();
        selected.setId(accommodationId);
        this.accommodationResource = selected;
    }

    @JsonProperty("vehicleId")
    public Long getVehicleId() {
        return vehicleResource == null ? null : vehicleResource.getId();
    }

    @JsonProperty("vehicleId")
    public void setVehicleId(Long vehicleId) {
        if (vehicleId == null) {
            this.vehicleResource = null;
            return;
        }
        Vehicle selected = new Vehicle();
        selected.setId(vehicleId);
        this.vehicleResource = selected;
    }
}
