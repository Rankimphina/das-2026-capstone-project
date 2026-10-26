# Build 3: Architecture and booking state machine

## 1. Application layers

```mermaid
flowchart TD
  Browser[Browser / HTTP client] --> Routes[HTTP routes]
  Routes --> Services[Application services]
  Services --> Rules[Domain rules]
  Services --> Repositories[Repositories / data access]
  Repositories --> Data[(In-memory store / database)]
  Rules --> Data
```

- **Routes / HTTP:** interpret requests, validate transport format, call services, and shape HTTP responses; they must not contain business rules or access storage directly.
- **Services:** coordinate a use case and call domain rules and repositories; they must not depend on HTTP request/response objects.
- **Domain rules:** enforce business invariants and state transitions; they must not perform network, filesystem, or HTTP work.
- **Repositories / data access:** read and write data; they must not decide business policy.
- **Data:** stores application records; it does not call other layers.

## 2. Data model

```mermaid
erDiagram
  USERS ||--o{ EVENTS : organizes
  EVENTS ||--|{ TICKET_TIERS : offers
  EVENTS ||--o{ BOOKINGS : receives
  USERS ||--o{ BOOKINGS : makes
  TICKET_TIERS ||--o{ BOOKINGS : covers
  USERS {
    string id
    string email
    string role
  }
  EVENTS {
    string id
    string title
    string city
    string venue
    datetime startsAt
    string status
    string organizerId
  }
  TICKET_TIERS {
    string id
    string eventId
    string name
    int priceCents
    int capacity
    int sold
  }
  BOOKINGS {
    string id
    string userId
    string tierId
    int quantity
    int amountCents
    string status
  }
```

## 3. Booking life cycle

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> paid
  pending --> cancelled
  paid --> checked_in
  paid --> refunded
  paid --> cancelled
  cancelled --> [*]
  refunded --> [*]
  checked_in --> [*]
```

Only the transitions shown are permitted. `cancelled`, `refunded`, and `checked_in` are final states.
