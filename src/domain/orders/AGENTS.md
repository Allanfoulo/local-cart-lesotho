# Order Domain

## Purpose

Own order pricing, quantity invariants, and backend-agnostic order event contracts.

## Contracts

- Validate requested quantities against stock and weight/whole-unit behavior.
- Calculate totals from backend-authoritative product prices.
- Keep helpers deterministic and free of database, network, or UI effects.
- Event payloads must be versioned and exclude customer contact and destination data.
