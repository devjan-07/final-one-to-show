package com.voyara.tourguide.aichat;

import jakarta.validation.constraints.NotBlank;

public record ChatRequest(@NotBlank @jakarta.validation.constraints.Size(max = 4000) String message) {
}
