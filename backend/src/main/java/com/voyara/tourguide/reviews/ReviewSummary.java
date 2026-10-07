package com.voyara.tourguide.reviews;

import java.util.List;

public record ReviewSummary(
        double averageRating,
        int ratingCount,
        int writtenReviewCount,
        List<Review> reviews
) {}
