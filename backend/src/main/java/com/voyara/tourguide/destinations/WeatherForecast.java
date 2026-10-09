package com.voyara.tourguide.destinations;

import java.util.List;

public record WeatherForecast(
        Long destinationId,
        String destinationName,
        String location,
        double latitude,
        double longitude,
        String timezone,
        double currentTemperatureC,
        int currentWeatherCode,
        String currentCondition,
        List<WeatherDay> forecast,
        String source
) {
}
