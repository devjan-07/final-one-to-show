import { API_BASE_URL } from "./api";

export interface WeatherDay {
  date: string;
  minimumTemperatureC: number;
  maximumTemperatureC: number;
  precipitationProbability: number;
  weatherCode: number;
  condition: string;
  sunrise: string;
  sunset: string;
}

export interface WeatherForecast {
  destinationId: number;
  destinationName: string;
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
  currentTemperatureC: number;
  currentWeatherCode: number;
  currentCondition: string;
  forecast: WeatherDay[];
  source: string;
}

export const destinationsWeatherApi = {
  get: async (destinationId: number): Promise<WeatherForecast> => {
    const response = await fetch(
      `${API_BASE_URL}/destinations/${destinationId}/weather`,
      { headers: { Accept: "application/json" } },
    );

    if (!response.ok) {
      let message = `Weather request failed with status ${response.status}`;
      try {
        const body = await response.json() as { message?: string; error?: string };
        message = body.message || body.error || message;
      } catch {
        // Keep the status-based message when the response is not JSON.
      }
      throw new Error(message);
    }

    return response.json() as Promise<WeatherForecast>;
  },
};
