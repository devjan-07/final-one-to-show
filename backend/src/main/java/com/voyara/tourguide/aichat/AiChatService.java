package com.voyara.tourguide.aichat;

import java.util.List;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.stereotype.Service;

@Service
public class AiChatService {
    private static final String RESPONSE_GUIDE = """
            Answer quality rules:
            - Answer the user's exact question first in 1 to 3 short paragraphs or bullets.
            - Prefer Voyara-specific guidance over generic travel advice.
            - Use clear headings only when the answer has multiple parts.
            - Give practical next steps, such as what to click, what details to prepare, or what support needs.
            - If the user asks for private booking status, payment status, assigned guide, hotel confirmation, or live availability, explain that chat cannot access private/live records and direct them to My Bookings or support.
            - If required details are missing, ask one short follow-up question after giving the useful general answer.
            - Do not claim a booking, payment, refund, guide assignment, room assignment, or vehicle assignment is completed unless system data explicitly says so.
            - Keep answers under 160 words unless the user asks for a detailed itinerary or policy.
            """;

    private static final String VOYARA_KNOWLEDGE = """
            Voyara product knowledge:
            - Guests can browse destinations and packages, view details, and log in to book.
            - Tourist users can create bookings from trip detail pages, view bookings in My Bookings, cancel eligible bookings, and pay after the booking is created.
            - Booking flow: choose destination/package, select dates, travelers, optional vehicle, submit the booking, then complete payment from My Bookings.
            - Package details may include destination, price, duration, difficulty, max group size, included items, guide/transport/stay notes, and reviews.
            - Staff may assign guides, accommodation, and vehicles after reviewing the request.
            - Good Sri Lanka destination suggestions include Sigiriya, Ella, Kandy, Galle, Mirissa, Yala, Nuwara Eliya, Anuradhapura, Polonnaruwa, and Trincomalee.
            """;

    private static final String CANCELLATION_POLICY = """
            Voyara cancellation policy:
            - Hotel rooms: cancel up to 24 hours before check-in for a full refund to the original payment method. Some boutique properties may require 48 hours; confirm exact terms at booking.
            - Guided tours and day excursions: cancel up to 48 hours before the tour start for a full refund or re-booking credit. Large group tours may require 72 hours.
            - Multi-day packages including transport, accommodation, and activities: cancel up to 7 days before the first scheduled day for an 80% refund. Voyara keeps a 20% admin fee. Later cancellations may receive travel credit valid for 12 months.
            - Vehicle rentals: cancel up to 24 hours before pick-up for a full refund. Late cancellations may incur a 50% charge.
            - Custom itineraries: terms are agreed in the proposal, usually with a 5-day notice period.
            General rules: cancellation requests must be sent by email to cancellations@voyara.lk or through the booking portal. Approved refunds are issued within 5 to 7 business days. Promotional or pay-now no-refund offers may be excluded. For force-majeure events such as natural disasters, pandemics, or government travel bans, Voyara works with partners to provide refunds or re-booking credits regardless of the standard window.
            """;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String model;
    private final String apiKey;
    private final boolean enabled;

    public AiChatService(ObjectMapper objectMapper,
                         @Value("${app.ai.base-url:https://api.groq.com/openai/v1}") String baseUrl,
                         @Value("${app.ai.model:openai/gpt-oss-120b}") String model,
                         @Value("${app.ai.api-key:}") String apiKey,
                         @Value("${app.ai.enabled:true}") boolean enabled) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        this.objectMapper = objectMapper;
        this.model = model;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.enabled = enabled;
    }

    public String welcome() {
        return "Hi! I'm voyAI, your personal Voyara travel assistant. Ask me anything about destinations, tours, or bookings!";
    }

    public List<String> suggestions() {
        return List.of(
                "Best places to visit in Sri Lanka?",
                "How do I book a tour?",
                "What's included in a package?",
                "Cancellation policy?"
        );
    }

    public String reply(String message) {
        if (enabled && !apiKey.isBlank()) {
            try {
                return askGroq(message);
            } catch (RestClientException | IllegalStateException ex) {
                // Keep the assistant usable during local development if the provider is unavailable.
                return fallbackReply(message);
            }
        }
        return fallbackReply(message);
    }

    private String askGroq(String message) {
        var body = java.util.Map.of(
                "model", model,
                "temperature", 0.4,
                "max_tokens", 700,
                "messages", List.of(
                        java.util.Map.of("role", "system", "content", systemPrompt()),
                        java.util.Map.of("role", "user", "content", message.trim())
                )
        );
        String response = restClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + apiKey)
                .body(body)
                .retrieve()
                .body(String.class);
        try {
            JsonNode content = objectMapper.readTree(response).path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.asText().isBlank()) {
                throw new IllegalStateException("AI provider returned no message");
            }
            return content.asText().trim();
        } catch (Exception ex) {
            throw new IllegalStateException("Could not parse AI provider response", ex);
        }
    }

    private String systemPrompt() {
        return "You are voyAI, the Voyara travel assistant. Voyara manages tourism in Sri Lanka. "
                + RESPONSE_GUIDE
                + VOYARA_KNOWLEDGE
                + "For cancellation, refund, re-booking credit, or policy questions, answer from this policy only. "
                + "Mention the relevant booking type and deadline, then tell the user how to request cancellation. "
                + "If the booking type or start/check-in/pick-up date is missing, ask for it briefly after giving the general rule. "
                + CANCELLATION_POLICY;
    }

    private String fallbackReply(String message) {
        String q = message.toLowerCase();
        if (q.contains("cancel") || q.contains("refund") || q.contains("credit")) {
            return cancellationReply(q);
        }
        if (q.contains("payment") || q.contains("pay") || q.contains("card")) {
            return "Payment in Voyara is available after your booking is created.\n\n"
                    + "Open My Bookings, select the booking, and use the payment action if the payment is still Pending.\n\n"
                    + "If you already paid but the status did not update, contact support with your booking ID and transaction reference.";
        }
        if (q.contains("book") || q.contains("reserve")) {
            return "To book a Voyara trip:\n\n"
                    + "1. Open a destination or package detail page.\n"
                    + "2. Log in as a tourist.\n"
                    + "3. Click Book this trip.\n"
                    + "4. Choose dates, travelers, and optional vehicle details.\n"
                    + "5. Submit the request.\n\n"
                    + "After the booking is created, open My Bookings to complete payment.";
        }
        if (q.contains("package") || q.contains("included")) {
            return "Voyara packages can include different combinations of guide service, transport, accommodation, activities, entrance fees, and meals.\n\n"
                    + "Check the package detail page for price, duration, difficulty, group size, destinations, and included items before booking.\n\n"
                    + "If something is not listed, treat it as pending until Voyara staff confirms it.";
        }
        if (q.contains("guide")) {
            return "Voyara guide assignment is usually confirmed after you submit a booking request.\n\n"
                    + "Guides can vary by location, language, specialty, price, rating, and availability. If you need a specific language or travel style, add it in the booking notes.";
        }
        if (q.contains("hotel") || q.contains("room") || q.contains("accommodation") || q.contains("stay")) {
            return "Accommodation details may be included in a package or assigned after staff review.\n\n"
                    + "For a booking you already made, open My Bookings and check the booking detail page. If the accommodation says Pending, Voyara staff has not finalized it yet.";
        }
        if (q.contains("vehicle") || q.contains("car") || q.contains("rent")) {
            return "Vehicle options can include cars, vans, SUVs, minibuses, or buses depending on group size and availability.\n\n"
                    + "When booking, choose a listed vehicle if available. Voyara staff can also assign transport after reviewing the request.";
        }
        if (q.contains("sri lanka") || q.contains("srilanka") || q.contains("place") || q.contains("destination") || q.contains("visit")) {
            return "For a balanced Sri Lanka trip, consider:\n\n"
                    + "- Sigiriya and Dambulla for history\n"
                    + "- Kandy for culture\n"
                    + "- Ella and Nuwara Eliya for hills and scenery\n"
                    + "- Yala for wildlife\n"
                    + "- Galle, Mirissa, or Trincomalee for coast\n\n"
                    + "Tell me your travel dates, group size, and whether you prefer beaches, wildlife, culture, or hiking, and I can suggest a route.";
        }
        if (q.contains("support") || q.contains("help") || q.contains("contact")) {
            return "For help with a specific booking, open My Bookings and keep your booking ID ready.\n\n"
                    + "For cancellation requests, email cancellations@voyara.lk or use the booking portal. For general trip questions, tell me the destination, dates, and group size.";
        }
        return "I can help with Voyara destinations, packages, bookings, payments, cancellations, guides, accommodation, and vehicles.\n\n"
                + "Ask me something like: best places for 3 days, how booking works, what is included in a package, or how to cancel a tour.";
    }

    private String cancellationReply(String q) {
        if (q.contains("hotel") || q.contains("room") || q.contains("check-in") || q.contains("check in")) {
            return "Hotel room cancellations: you can cancel up to 24 hours before check-in for a full refund to the original payment method.\n\n"
                    + "Some boutique properties may require 48 hours, so Voyara confirms the exact terms at booking.\n\n"
                    + "To cancel, send a written request to cancellations@voyara.lk or use the booking portal. Approved refunds are processed within 5 to 7 business days.";
        }
        if (q.contains("tour") || q.contains("excursion") || q.contains("day")) {
            return "Guided tours and day-excursions: cancel up to 48 hours before the tour start time for a full refund or re-booking credit.\n\n"
                    + "Large group tours may require 72 hours' notice.\n\n"
                    + "To cancel, send a written request to cancellations@voyara.lk or use the booking portal.";
        }
        if (q.contains("package") || q.contains("multi-day") || q.contains("multiday")) {
            return "Multi-day packages: cancel up to 7 days before the first scheduled day for an 80% refund. A 20% admin fee applies.\n\n"
                    + "If you cancel later, Voyara can offer travel credit valid for 12 months.\n\n"
                    + "To cancel, send a written request to cancellations@voyara.lk or use the booking portal.";
        }
        if (q.contains("vehicle") || q.contains("car") || q.contains("van") || q.contains("bus") || q.contains("rental")) {
            return "Vehicle rentals: cancel up to 24 hours before pick-up for a full refund.\n\n"
                    + "Late cancellations may incur a 50% charge.\n\n"
                    + "To cancel, send a written request to cancellations@voyara.lk or use the booking portal.";
        }
        if (q.contains("custom") || q.contains("itinerary")) {
            return "Custom itinerary cancellations are handled according to the terms agreed in your proposal, usually with around 5 days' notice.\n\n"
                    + "Refund terms are confirmed case-by-case. Send your request to cancellations@voyara.lk or through the booking portal.";
        }
        return "Voyara cancellation policy depends on the booking type:\n\n"
                + "- Hotels: 24 hours before check-in for a full refund; some boutique stays may require 48 hours.\n"
                + "- Guided tours/day excursions: 48 hours before start for a full refund or re-booking credit; large groups may require 72 hours.\n"
                + "- Multi-day packages: 7 days before the first day for an 80% refund; later cancellations may receive 12-month travel credit.\n"
                + "- Vehicle rentals: 24 hours before pick-up for a full refund; late cancellations may incur a 50% charge.\n"
                + "- Custom itineraries: terms are agreed in the proposal.\n\n"
                + "Please send cancellation requests to cancellations@voyara.lk or use the booking portal. Approved refunds are processed within 5 to 7 business days.\n\n"
                + "What type of booking do you want to cancel?";
    }
}
