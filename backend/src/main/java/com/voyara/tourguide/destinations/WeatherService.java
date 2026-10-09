package com.voyara.tourguide.destinations;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.voyara.tourguide.common.ResourceNotFoundException;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WeatherService {
    private static final String GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
    private static final String FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
    private static final Map<String, String> CANONICAL_DESTINATIONS = Map.of(
            "sigiriya rock fortress", "Sigiriya",
            "ella highlands", "Ella",
            "mirissa beach", "Mirissa",
            "galle fort", "Galle",
            "yala national park", "Yala"
    );

    private final DestinationRepository destinationRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public WeatherService(DestinationRepository destinationRepository, ObjectMapper objectMapper) {
        this.destinationRepository = destinationRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public WeatherForecast forecastForDestination(Long destinationId) {
        Destination destination = destinationRepository.findById(destinationId)
                .orElseThrow(() -> new ResourceNotFoundException("Destination", destinationId));

        GeoLocation location = resolveLocation(destination);
        JsonNode response = getJson(buildForecastUri(location));
        try {
            JsonNode current = response.path("current");
            JsonNode daily = response.path("daily");
            if (current.isMissingNode() || daily.isMissingNode()) {
                throw new IllegalStateException("Weather provider returned an incomplete forecast.");
            }

            List<WeatherDay> days = new ArrayList<>();
            JsonNode dates = daily.path("time");
            for (int i = 0; i < dates.size(); i++) {
                days.add(new WeatherDay(
                        dates.get(i).asText(),
                        valueAt(daily.path("temperature_2m_min"), i),
                        valueAt(daily.path("temperature_2m_max"), i),
                        (int) valueAt(daily.path("precipitation_probability_max"), i),
                        (int) valueAt(daily.path("weather_code"), i),
                        WeatherCodeMapper.condition((int) valueAt(daily.path("weather_code"), i)),
                        textAt(daily.path("sunrise"), i),
                        textAt(daily.path("sunset"), i)
                ));
            }

            int currentCode = current.path("weather_code").asInt(-1);
            return new WeatherForecast(
                    destination.getId(),
                    destination.getName(),
                    location.name(),
                    response.path("latitude").asDouble(location.latitude()),
                    response.path("longitude").asDouble(location.longitude()),
                    response.path("timezone").asText("auto"),
                    current.path("temperature_2m").asDouble(),
                    currentCode,
                    WeatherCodeMapper.condition(currentCode),
                    List.copyOf(days),
                    "Open-Meteo"
            );
        } catch (RuntimeException exception) {
            if (exception instanceof ResponseStatusException responseStatusException) {
                throw responseStatusException;
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "The weather provider returned an invalid forecast.", exception);
        }
    }

    private GeoLocation resolveLocation(Destination destination) {
        String name = destination.getName() == null ? "" : destination.getName().trim();
        String canonicalName = CANONICAL_DESTINATIONS.getOrDefault(name.toLowerCase(), name);
        String query = canonicalName;
        if (destination.getCountry() != null && !destination.getCountry().isBlank()) {
            query += ", " + destination.getCountry().trim();
        }

        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
        URI uri = URI.create(GEOCODING_URL + "?name=" + encodedQuery + "&count=1&language=en&format=json");
        JsonNode response = getJson(uri);
        JsonNode first = response.path("results").path(0);
        if (first.isMissingNode() || !first.has("latitude") || !first.has("longitude")) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Weather is not available because this destination could not be located.");
        }

        double latitude = first.path("latitude").asDouble(Double.NaN);
        double longitude = first.path("longitude").asDouble(Double.NaN);
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "The location provider returned invalid coordinates.");
        }

        String locationName = first.path("name").asText(canonicalName);
        String country = first.path("country").asText(
                destination.getCountry() == null ? "" : destination.getCountry());
        return new GeoLocation(latitude, longitude,
                country.isBlank() ? locationName : locationName + ", " + country);
    }

    private URI buildForecastUri(GeoLocation location) {
        return URI.create(FORECAST_URL
                + "?latitude=" + location.latitude()
                + "&longitude=" + location.longitude()
                + "&current=temperature_2m%2Cweather_code"
                + "&daily=weather_code%2Ctemperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_probability_max%2Csunrise%2Csunset"
                + "&forecast_days=7&timezone=auto");
    }

    private JsonNode getJson(URI uri) {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(8))
                .header("Accept", "application/json")
                .GET()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "The weather provider is temporarily unavailable.");
            }
            return objectMapper.readTree(response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The weather request was interrupted.", exception);
        } catch (IOException | IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Unable to retrieve weather data at this time.", exception);
        }
    }

    private static double valueAt(JsonNode array, int index) {
        if (!array.isArray() || index >= array.size() || array.get(index).isNull()) {
            return 0;
        }
        return array.get(index).asDouble();
    }

    private static String textAt(JsonNode array, int index) {
        if (!array.isArray() || index >= array.size() || array.get(index).isNull()) {
            return "";
        }
        return array.get(index).asText();
    }

    private record GeoLocation(double latitude, double longitude, String name) {
    }
}
