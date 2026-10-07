# Voyara Tour Guide

See [the phased security and booking fixes](FIX_PHASES.md) for required environment settings, changed workflows, validation results, and remaining deployment checks.

Voyara is a Spring Boot and React tour-guide application developed by SLIIT team B3G1-03.

This document records the backend request pathways and the validation rules currently enforced by the codebase. All endpoint paths below are relative to `http://localhost:8080`.

## Project layout

```text
backend/   Spring Boot 3, Spring Security, Spring Data JPA, SQL Server
frontend/  React, TypeScript, Vite
```

## How backend validation works

There are two validation layers:

1. Jakarta Bean Validation annotations on request records/entities, activated by `@Valid` in controllers.
2. Service-level business validation, which checks database state, ownership, availability, dates, conflicts, and workflow rules.

Validation errors use this JSON shape:

```json
{
  "timestamp": "2026-09-18T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "plate must follow the Sri Lankan format ABC-1234"
}
```

The global handler is `backend/src/main/java/com/voyara/tourguide/common/ApiExceptionHandler.java`.

Typical status codes:

- `400 Bad Request`: malformed fields or invalid workflow state
- `401 Unauthorized`: missing or invalid authentication
- `403 Forbidden`: authenticated user lacks permission or ownership
- `404 Not Found`: requested resource does not exist
- `409 Conflict`: duplicate data, active references, or scheduling conflicts

## Authentication validation

### Register tourist — `POST /api/auth/register`

- `fullName`: required and non-blank
- `email`: required and valid email syntax
- `password`: required; minimum 8 characters
- `phone`: required Sri Lankan number matching `+94` followed by 9 digits; one optional space is allowed after `+94`
- `nationality` and `countryOfResidence`: required
- `languages`: at least one selection
- `termsAccepted`: must be `true`
- Email must not already be registered (`409`)

### Login — `POST /api/auth/login`

- `email`: required and valid email syntax
- `password`: required
- Email must be verified, account must be active, and credentials must be correct

### Email verification

- `POST /api/auth/verify-email`: valid email and exactly 6 digits; code must exist, be unused, unexpired, and correct
- `POST /api/auth/resend-verification-code`: required valid email and an existing user
- `GET /api/auth/me`: valid authenticated principal required

## Vehicle validation

Public reads: `GET /api/vehicles`, `GET /api/vehicles/{id}`

Admin management:

- `GET/POST /api/admin/vehicles`
- `PUT/DELETE /api/admin/vehicles/{id}`
- `PATCH /api/admin/vehicles/{id}/owner`

Transport-provider management:

- `GET/POST /api/stakeholder/vehicles`
- `PUT/DELETE /api/stakeholder/vehicles/{id}`

Create/update rules:

- `name`, `brand`, `model`, `location`, and `image`: required and non-blank
- `year`: at least 1900 and no later than next calendar year
- `type`: `Car`, `SUV`, `Van`, `Minibus`, `Motorbike`, or `Luxury`
- `capacity`: at least 1
- `pricePerDay`: required and greater than zero
- `status`: `Available`, `Rented`, `Maintenance`, `Pending Approval`, `Rejected`, or `Inactive`
- `transmission`: `Automatic` or `Manual`
- `fuel`: `Petrol`, `Diesel`, `Electric`, or `Hybrid`
- `mileage`: zero or greater
- `plate`: required; modern Sri Lankan format `ABC-1234`, case-insensitive
- Plates are trimmed, uppercased, and unique ignoring case
- Provider-created vehicles are forced to `Pending Approval`
- Providers may manage only their own vehicles
- Reassigned owner must have the `TRANSPORT_PROVIDER` role
- Permanent deletion is blocked when booking history references the vehicle (`409`); use `Inactive` instead

## Accommodation validation

Public reads:

- `GET /api/accommodations`
- `GET /api/accommodations/{id}`
- Search: `GET /api/accommodations?destinationId={id}` or `?destination={name}`

Admin management:

- `GET/POST /api/admin/accommodations`
- `PUT/DELETE /api/admin/accommodations/{id}`
- `PATCH /api/admin/accommodations/{id}/owner`

Hotel-partner management:

- `GET/POST /api/stakeholder/accommodations`
- `PUT/DELETE /api/stakeholder/accommodations/{id}`

Create/update rules:

- `name`, `location`, `country`, and `image`: required and non-blank
- `type`: `Hotel`, `Villa`, `Resort`, `Hostel`, or `Apartment`
- `destinationId`: required and must reference an existing destination
- `price`: required and greater than zero
- `rooms`: at least 1
- `status`: `Active`, `Inactive`, `Maintenance`, `Pending Approval`, or `Rejected`
- `occupancy`: zero or greater and cannot exceed room count
- Partner-created or updated listings are forced to `Pending Approval`
- Partners may manage only their own accommodations
- Reassigned owner must have the `HOTEL_PARTNER` role
- `DELETE` performs a soft delete by setting the accommodation status to `Inactive`, preserving booking history

Amenities are simple strings stored in the `accommodation_amenities` collection table.

## Tourist booking validation

Paths:

- `GET /api/tourist/bookings`
- `GET /api/tourist/bookings/{id}`
- `POST /api/tourist/bookings`
- `PATCH /api/tourist/bookings/{id}/cancel`

Rules:

- User must be authenticated and may access only their own bookings
- `bookingType`: `PACKAGE`, `ACCOMMODATION`, `VEHICLE`, or `CUSTOM`
- `guests` and `rooms`: at least 1
- `luggageCount`: cannot be negative
- Check-in and check-out are required; check-in cannot be in the past; check-out must be later
- Supplied package, guide, accommodation, and vehicle IDs must exist
- Selected guide and vehicle must be `Available`; selected accommodation must be `Active`
- Required resource must be present for package-, accommodation-, and vehicle-only bookings
- Requested rooms cannot exceed total or date-adjusted room availability
- Passenger count cannot exceed vehicle capacity
- Vehicle bookings require a pickup location
- Guide/vehicle scheduling conflicts return `409`
- Cancellation must be permitted by current status and trip date

Management CRUD is under `/api/bookings` and requires `BOOKINGS_MANAGE`. Existing prices, provider decisions, and review fields are preserved on ordinary edits. Paid bookings cannot be rescheduled, cancelled, or deleted through management CRUD.

### Provider booking decisions

- Hotel partner: `GET /api/stakeholder/accommodation-bookings`, `PATCH /api/stakeholder/accommodation-bookings/{id}/decision`
- Transport provider: `GET /api/stakeholder/vehicle-bookings`, `PATCH /api/stakeholder/vehicle-bookings/{id}/decision`
- `decision` must be `CONFIRM` or `REJECT`
- Only pending bookings can be decided
- Provider must own the assigned accommodation or vehicle

## Payment validation

Paths: `GET/POST /api/tourist/bookings/{bookingId}/payment`

- Tourist may access only their own booking
- Booking must be `Confirmed`, with every assigned provider approved
- Booking cannot already be paid
- Payments are disabled unless demo mode is explicitly enabled under the `dev` or `test` profile; the only supported method is `Card (demo)`
- A real payment gateway has not been integrated; demo payments do not charge money

## Review validation

Paths:

- `GET /api/tourist/reviews`
- `POST /api/tourist/bookings/{bookingId}/reviews`
- `GET /api/reviews/{targetType}/{targetId}` for public summaries

Rules:

- `targetType`: required; guide, accommodation, and vehicle are supported
- `rating`: integer from 1 through 5
- Booking must belong to the authenticated tourist
- Cancelled bookings cannot be reviewed
- Reviews are allowed only after checkout
- Target must exist on and match the booking
- The same booking target cannot be reviewed twice (`409`)

## Tour-guide validation

Paths: `/api/tour-guides`, `/api/tour-guides/{id}`

- `name`: required and non-blank
- `email`: valid syntax when supplied
- `phone`: empty or a valid 7-20 character international-style number
- Linked account email must be unique
- `TOUR_GUIDE` access profile must exist when linking an account
- Deletion is blocked when bookings reference the guide; mark the guide unavailable instead

## Tour-package validation

Paths: `/api/packages`, `/api/packages/{id}`

- `name`: required and non-blank
- Package rating and review counts are reset to zero because packages are not review targets
- Deletion is blocked when a booking references the package; archive it instead

Current gap: category, destinations, duration, price, maximum group, difficulty, status, image, included items, and description have no Bean Validation constraints.

## Destination validation

Paths: `/api/destinations`, `/api/destinations/{id}`

- `name`: required and non-blank
- Deletion is blocked when accommodations reference the destination
- Deletion is blocked when a package contains the destination name
- Referenced destinations should be hidden rather than deleted

Current gap: country, continent, categories, description, image, status, season, and highlights have no Bean Validation constraints.

## User and access-control validation

### Admin stakeholder management — `/api/admin/stakeholders`

- Create requires full name, valid unique email, valid phone, password of at least 8 characters, stakeholder type, role ID, and account status
- Account status: `Active`, `Pending Invitation`, or `Suspended`
- Role must exist and cannot be `ADMIN` or `TOURIST`
- Assigning `TOUR_GUIDE` creates or updates one linked public guide record using the stakeholder user ID
- Shared guide name, email, phone, and profile photo are synchronized from stakeholder profile updates
- Changing away from `TOUR_GUIDE` marks the linked guide unavailable instead of deleting booking history
- Update requires a role ID; optional replacement password must have at least 8 characters
- Admin and tourist accounts cannot be deleted through stakeholder management

### Stakeholder profile — `GET/PUT /api/stakeholder/profile`

- Full name is required
- Phone may be empty or a valid international-style number

### Admin tourist management — `/api/admin/tourists`

- Full name and valid email are required for updates
- Email must remain unique
- Target account must have the `TOURIST` role

### Roles and permissions — `/api/admin/access-control`

- Role name is required and normalized to uppercase with spaces changed to underscores
- Role names must be unique and permission IDs must exist
- `ADMIN` cannot be deleted
- A role assigned to users cannot be deleted

## Other validation

- `PUT /api/tourist/profile`: authenticated tourist and non-blank full name required; other fields currently lack format constraints
- `POST /api/ai-chat`: non-blank `message` required
- Notifications require authentication; a notification may be marked read only by its owner

## Security pathways

- Public catalog reads: destinations, packages, accommodations, tour guides, vehicles, public reviews, and AI welcome/suggestions
- `/api/tourist/**`: `TOURIST`
- `/api/stakeholder/**`: authenticated stakeholder, with additional role/ownership checks
- `/api/bookings/**`: `BOOKINGS_MANAGE` permission, including reads
- `/api/admin/**`: `ADMIN`, except permission-specific tourist and inventory management
- `/api/reports/**`: `REPORTS_VIEW` permission
- Catalog writes require the relevant destination, package, or inventory permission; public reads remain available
- `JWT_SECRET` must be supplied externally; authentication cannot be disabled

## Running the project

Backend:

```bash
cd backend
mvn spring-boot:run
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend URL: `http://localhost:8080`

Frontend URL: `http://localhost:5173`

Database connection settings are in `backend/src/main/resources/application.properties`. Use `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` environment variables rather than committing credentials.
