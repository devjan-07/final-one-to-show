package com.voyara.tourguide.reviews;

import java.time.Instant;

public record TravelerStoryReview(
        Long id,
        String reviewerName,
        String reviewerInitials,
        String targetType,
        Long targetId,
        String resourceName,
        String destination,
        int rating,
        String comment,
        Instant createdAt
) {}
