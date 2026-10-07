package com.voyara.tourguide.vehiclerental;
import jakarta.validation.constraints.NotNull;
public record VehicleOwnerRequest(@NotNull Long ownerUserId) {}
