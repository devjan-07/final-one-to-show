# Tour Guide Backend

Spring Boot backend for the Voyara web tour guide platform.

## Packages

- `bookings`
- `accommodations`
- `tourguides`
- `vehiclerental`
- `packages`
- `destinations`
- `aichat`

## REST endpoints

Each management package exposes CRUD endpoints:

- `GET /api/bookings`
- `GET /api/bookings/{id}`
- `POST /api/bookings`
- `PUT /api/bookings/{id}`
- `DELETE /api/bookings/{id}`

The same CRUD pattern exists for:

- `/api/accommodations`
- `/api/tour-guides`
- `/api/vehicles`
- `/api/packages`
- `/api/destinations`

AI chat:

- `POST /api/ai-chat`

Request:

```json
{
  "message": "How do I book a tour?"
}
```

### Groq configuration

The AI chat service uses Groq's OpenAI-compatible API with the `openai/gpt-oss-120b` model. Configure these environment variables in the Spring Boot run configuration:

```text
GROQ_API_KEY=<your Groq API key>
AI_ENABLED=true
AI_MODEL=openai/gpt-oss-120b
AI_BASE_URL=https://api.groq.com/openai/v1
```

The key must remain a backend environment variable. Do not place it in React code or commit it to source control. If the key is absent or Groq is unavailable, voyAI uses its local fallback replies.

Response:

```json
{
  "reply": "..."
}
```

## Run

Set `JWT_SECRET` to at least 32 bytes of strong random secret material before starting. Existing tokens must be replaced by logging in again. See [FIX_PHASES.md](../FIX_PHASES.md) for all changed settings and workflows.

Install Maven, then run from this folder:

```bash
mvn spring-boot:run
```

The backend starts on `http://localhost:8080`.
