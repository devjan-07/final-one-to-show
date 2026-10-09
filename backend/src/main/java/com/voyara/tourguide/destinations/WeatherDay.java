package com.voyara.tourguide.destinations;

public record WeatherDay(
        String date,
        double minimumTemperatureC,
        double maximumTemperatureC,
        int precipitationProbability,
        int weatherCode,
        String condition,
        String sunrise,
        String sunset
) {
}
