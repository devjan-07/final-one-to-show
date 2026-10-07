package com.voyara.tourguide.config;

import com.voyara.tourguide.reviews.ReviewRatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(200)
@RequiredArgsConstructor
public class ReviewRatingReconciliationRunner implements ApplicationRunner {
    private final ReviewRatingService reviewRatingService;

    @Override
    public void run(ApplicationArguments args) {
        reviewRatingService.reconcileAllResources();
    }
}
