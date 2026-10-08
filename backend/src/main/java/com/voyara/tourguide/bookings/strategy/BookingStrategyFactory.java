package com.voyara.tourguide.bookings.strategy;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class BookingStrategyFactory {
    private final Map<String, BookingStrategy> strategies;

    public BookingStrategyFactory(List<BookingStrategy> strategies) {
        this.strategies = strategies.stream()
                .collect(Collectors.toUnmodifiableMap(
                        BookingStrategy::bookingType,
                        Function.identity()));
    }

    public BookingStrategy getStrategy(String bookingType) {
        return strategies.get(bookingType);
    }
}
