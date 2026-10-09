package com.voyara.tourguide.destinations;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class WeatherCodeMapperTest {
    @Test
    void mapsClearSky() {
        assertEquals("Clear sky", WeatherCodeMapper.condition(0));
    }

    @Test
    void mapsRainCodes() {
        assertEquals("Rain", WeatherCodeMapper.condition(63));
        assertEquals("Rain showers", WeatherCodeMapper.condition(80));
    }

    @Test
    void mapsThunderstormCodes() {
        assertEquals("Thunderstorm", WeatherCodeMapper.condition(95));
        assertEquals("Thunderstorm with hail", WeatherCodeMapper.condition(99));
    }

    @Test
    void handlesUnknownCodes() {
        assertEquals("Conditions unavailable", WeatherCodeMapper.condition(-1));
    }
}
